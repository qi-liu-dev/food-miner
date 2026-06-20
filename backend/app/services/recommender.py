from __future__ import annotations

import hashlib
from dataclasses import dataclass

from ..models import (
    BuiltUserProfile,
    Campaign,
    CandidateDeal,
    CategoryLabel,
    GemType,
    Meal,
    Restaurant,
    ScoreBreakdown,
)
from .discount_engine import calculate_discount


@dataclass(frozen=True)
class ScoredCandidate:
    meal: Meal
    restaurant: Restaurant
    score: ScoreBreakdown


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _history_affinity(profile: BuiltUserProfile, meal: Meal) -> float:
    # Exact cuisine/category history carries the most weight. Broad categories such as
    # "Asian" are deliberately weak signals so that every Asian cuisine does not
    # become equally relevant simply because Emma often orders Korean/Japanese/Thai.
    primary_score = profile.category_affinity.get(meal.primary_category.value, 0.0)

    broad_categories = {CategoryLabel.ASIAN, CategoryLabel.HEALTHY, CategoryLabel.COMFORT_FOOD}
    specific_secondary = [
        profile.category_affinity.get(category.value, 0.0)
        for category in meal.categories
        if category != meal.primary_category and category not in broad_categories
    ]
    secondary_score = max(specific_secondary, default=0.0)

    broad_score = 0.0
    if CategoryLabel.ASIAN in meal.categories or meal.primary_category == CategoryLabel.ASIAN:
        broad_score = profile.category_affinity.get(CategoryLabel.ASIAN.value, 0.0)

    matching_tag_values = [
        profile.tag_affinity.get(tag, 0.0)
        for tag in meal.tags
        if tag in profile.tag_affinity and tag != "asian"
    ]
    tag_score = max(matching_tag_values, default=0.0)

    return _clamp(
        0.70 * primary_score
        + 0.10 * secondary_score
        + 0.05 * broad_score
        + 0.15 * tag_score
    )


def _campaign_fit(campaign: Campaign, meal: Meal, restaurant: Restaurant) -> float:
    score = 0.0
    meal_categories = {meal.primary_category, *meal.categories}
    if meal_categories.intersection(campaign.boosted_categories):
        score += 0.55
    if restaurant.is_new and meal.primary_category in campaign.boost_new_categories:
        score += 0.65
    if set(meal.tags).intersection(campaign.active_tags):
        score += 0.35
    if set(restaurant.campaign_tags).intersection(campaign.active_tags):
        score += 0.25
    return _clamp(score)


def _restaurant_need(campaign: Campaign, restaurant: Restaurant) -> float:
    score = {"quiet": 0.85, "normal": 0.25, "busy": 0.0}[restaurant.status]
    if restaurant.is_new:
        score += 0.25
    if campaign.boost_quiet_hour_restaurants and restaurant.status == "quiet":
        score += 0.15
    return _clamp(score)


def _price_fit(target: float, price: float) -> float:
    if target <= 0:
        return 1.0
    return _clamp(1 - abs(price - target) / target)


def _delivery_fit(target_minutes: int, delivery_minutes: int) -> float:
    if delivery_minutes <= target_minutes:
        return 1.0
    return _clamp(1 - (delivery_minutes - target_minutes) / 20)


def _stable_id(prefix: str, value: str) -> str:
    digest = hashlib.sha1(value.encode("utf-8"), usedforsecurity=False).hexdigest()[:12]
    return f"{prefix}_{digest}"


def hard_filter(
    profile: BuiltUserProfile,
    meals: list[Meal],
    restaurants_by_id: dict[str, Restaurant],
) -> list[Meal]:
    eligible: list[Meal] = []
    required_dietary = set(profile.dietary_requirements)
    user_allergens = set(profile.allergens)

    for meal in meals:
        restaurant = restaurants_by_id.get(meal.restaurant_id)
        if restaurant is None or not restaurant.available or not meal.available:
            continue
        if profile.delivery_zone not in restaurant.service_zones:
            continue
        if required_dietary and not required_dietary.issubset(set(meal.dietary)):
            continue
        if user_allergens.intersection(meal.allergens):
            continue
        if restaurant.max_discount_percent <= 0:
            continue
        eligible.append(meal)

    return eligible


def score_candidates(
    profile: BuiltUserProfile,
    meals: list[Meal],
    restaurants_by_id: dict[str, Restaurant],
    campaign: Campaign,
) -> list[ScoredCandidate]:
    scored: list[ScoredCandidate] = []
    for meal in meals:
        restaurant = restaurants_by_id[meal.restaurant_id]
        history = _history_affinity(profile, meal)
        campaign_fit = _campaign_fit(campaign, meal, restaurant)
        restaurant_need = _restaurant_need(campaign, restaurant)
        price_fit = _price_fit(profile.average_order_value_eur, meal.price_eur)
        delivery_fit = _delivery_fit(
            profile.usual_max_delivery_minutes, meal.delivery_minutes
        )
        total = (
            0.45 * history
            + 0.20 * campaign_fit
            + 0.15 * restaurant_need
            + 0.10 * price_fit
            + 0.10 * delivery_fit
        )
        scored.append(
            ScoredCandidate(
                meal=meal,
                restaurant=restaurant,
                score=ScoreBreakdown(
                    history_affinity=round(history, 4),
                    campaign_fit=round(campaign_fit, 4),
                    restaurant_need=round(restaurant_need, 4),
                    price_fit=round(price_fit, 4),
                    delivery_fit=round(delivery_fit, 4),
                    total=round(total, 4),
                ),
            )
        )
    return scored


def _candidate_sort_key(candidate: ScoredCandidate, metric: str) -> tuple[float, float, str]:
    metric_value = getattr(candidate.score, metric)
    return (-metric_value, -candidate.score.total, candidate.meal.meal_id)


def select_diverse_candidates(
    candidates: list[ScoredCandidate],
    limit: int,
    campaign: Campaign,
) -> list[tuple[ScoredCandidate, GemType]]:
    selected: list[tuple[ScoredCandidate, GemType]] = []
    used_meals: set[str] = set()
    used_categories: set[CategoryLabel] = set()

    def pick(metric: str, count: int, gem_type: GemType, minimum: float = 0.0) -> None:
        pool = sorted(candidates, key=lambda item: _candidate_sort_key(item, metric))
        for candidate in pool:
            if len([item for item in selected if item[1] == gem_type]) >= count:
                return
            if getattr(candidate.score, metric) < minimum:
                continue
            if candidate.meal.meal_id in used_meals:
                continue
            if candidate.meal.primary_category in used_categories:
                continue
            selected.append((candidate, gem_type))
            used_meals.add(candidate.meal.meal_id)
            used_categories.add(candidate.meal.primary_category)

    pick("history_affinity", 3, GemType.HISTORY, minimum=0.15)

    # Reserve one campaign slot for an explicitly boosted new cuisine when one is
    # available, then fill the second campaign slot from the broader Matchday pool.
    new_campaign_pool = sorted(
        [
            candidate
            for candidate in candidates
            if candidate.restaurant.is_new
            and candidate.meal.primary_category in campaign.boost_new_categories
        ],
        key=lambda item: _candidate_sort_key(item, "campaign_fit"),
    )
    for candidate in new_campaign_pool:
        if candidate.meal.meal_id in used_meals:
            continue
        if candidate.meal.primary_category in used_categories:
            continue
        selected.append((candidate, GemType.CAMPAIGN))
        used_meals.add(candidate.meal.meal_id)
        used_categories.add(candidate.meal.primary_category)
        break

    pick("campaign_fit", 2, GemType.CAMPAIGN, minimum=0.15)
    pick("restaurant_need", 1, GemType.RESTAURANT_BOOST, minimum=0.4)

    if len(selected) < limit:
        for candidate in sorted(candidates, key=lambda item: _candidate_sort_key(item, "total")):
            if len(selected) >= limit:
                break
            if candidate.meal.meal_id in used_meals:
                continue
            if candidate.meal.primary_category in used_categories:
                continue
            selected.append((candidate, GemType.EXPLORATION))
            used_meals.add(candidate.meal.meal_id)
            used_categories.add(candidate.meal.primary_category)

    if len(selected) < limit:
        raise ValueError(
            f"Only {len(selected)} unique eligible categories are available; {limit} are required"
        )
    return selected[:limit]


def build_deal(
    profile: BuiltUserProfile,
    candidate: ScoredCandidate,
) -> CandidateDeal:
    meal = candidate.meal
    restaurant = candidate.restaurant
    percent, price_after, discount_reasons, restaurant_reason = calculate_discount(
        meal.price_eur, restaurant, candidate.score
    )

    why_this: list[str] = []
    if candidate.score.history_affinity >= 0.55:
        why_this.append(
            f"Matches {profile.display_name}'s recent {meal.primary_category.value} ordering pattern"
        )
    if "high_protein" in meal.tags and profile.tag_affinity.get("high_protein", 0) > 0:
        why_this.append("Fits her frequent high-protein choices")
    if meal.price_eur <= profile.average_order_value_eur * 1.1:
        why_this.append(
            f"Close to her usual €{profile.average_order_value_eur:.0f} spend"
        )
    if meal.delivery_minutes <= profile.usual_max_delivery_minutes:
        why_this.append(
            f"Delivered within her usual {profile.usual_max_delivery_minutes}-minute window"
        )
    if candidate.score.campaign_fit >= 0.5:
        why_this.append("Fits today's Matchday or restaurant-discovery campaign")
    if restaurant.status == "quiet":
        why_this.append("Helps a relevant restaurant during a quieter period")
    if restaurant.is_new:
        why_this.append("Introduces a newly launched restaurant that matches her profile")

    why_this.extend(
        reason.replace("_", " ").capitalize() for reason in discount_reasons[:1]
    )
    why_this = list(dict.fromkeys(why_this))[:4]

    return CandidateDeal(
        deal_id=_stable_id("deal", f"{meal.meal_id}:{restaurant.restaurant_id}"),
        meal_id=meal.meal_id,
        restaurant_id=restaurant.restaurant_id,
        meal_name=meal.name,
        restaurant_name=restaurant.name,
        primary_category=meal.primary_category,
        categories=meal.categories,
        tags=meal.tags,
        image_asset_id=meal.image_asset_id,
        price_before=round(meal.price_eur, 2),
        price_after=price_after,
        discount_percent=percent,
        delivery_minutes=meal.delivery_minutes,
        score=candidate.score,
        why_this=why_this,
        restaurant_reason=restaurant_reason,
    )
