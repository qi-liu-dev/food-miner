from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, datetime

from ..models import BuiltUserProfile, OrderHistoryRecord, User
from ..taxonomy import CATEGORY_PARENTS


def _normalise(values: dict[str, float]) -> dict[str, float]:
    if not values:
        return {}
    maximum = max(values.values())
    if maximum <= 0:
        return {key: 0.0 for key in values}
    return {key: round(value / maximum, 4) for key, value in values.items()}


def _recency_weight(ordered_at: str, today: date) -> float:
    try:
        order_date = datetime.fromisoformat(ordered_at).date()
    except ValueError:
        return 1.0
    days = max((today - order_date).days, 0)
    return math.exp(-days / 45.0)


def build_user_profile(
    user: User,
    orders: list[OrderHistoryRecord],
    today: date,
) -> BuiltUserProfile:
    category_scores: defaultdict[str, float] = defaultdict(float)
    tag_scores: defaultdict[str, float] = defaultdict(float)

    for order in orders:
        weight = _recency_weight(order.ordered_at, today)
        category_scores[order.primary_category.value] += weight
        for parent in CATEGORY_PARENTS.get(order.primary_category, ()):
            category_scores[parent.value] += weight * 0.45
        for tag in order.tags:
            tag_scores[tag] += weight

    average_order_value = (
        sum(order.amount_eur for order in orders) / len(orders) if orders else 14.0
    )
    usual_delivery = (
        round(sum(order.delivery_minutes for order in orders) / len(orders))
        if orders
        else 30
    )

    return BuiltUserProfile(
        user_id=user.user_id,
        display_name=user.display_name,
        category_affinity=_normalise(dict(category_scores)),
        tag_affinity=_normalise(dict(tag_scores)),
        average_order_value_eur=round(average_order_value, 2),
        usual_max_delivery_minutes=max(usual_delivery, 20),
        dietary_requirements=user.dietary_requirements,
        allergens=user.allergens,
        delivery_zone=user.delivery_zone,
    )
