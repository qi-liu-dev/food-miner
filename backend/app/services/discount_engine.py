from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from ..models import Restaurant, ScoreBreakdown


def _money(value: float) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_discount(
    price_eur: float,
    restaurant: Restaurant,
    score: ScoreBreakdown,
) -> tuple[int, float, list[str], str]:
    percent = 5
    discount_reasons: list[str] = []

    if restaurant.status == "quiet":
        percent += 3
        discount_reasons.append("quiet-hour restaurant support")
    if restaurant.is_new:
        percent += 2
        discount_reasons.append("new restaurant discovery")
    if score.campaign_fit >= 0.5:
        percent += 2
        discount_reasons.append("active Uber campaign")
    if score.history_affinity >= 0.75:
        percent += 2
        discount_reasons.append("strong personal relevance")

    percent = max(1, min(percent, restaurant.max_discount_percent))
    price_after = _money(price_eur * (1 - percent / 100))

    if restaurant.status == "quiet":
        restaurant_reason = (
            "This restaurant is currently in a quieter period, so the promotion can add "
            "incremental demand without requiring an unsustainable discount."
        )
    elif restaurant.is_new:
        restaurant_reason = (
            "This newly launched restaurant has set aside a discovery promotion to reach "
            "high-fit customers."
        )
    else:
        restaurant_reason = (
            "The restaurant participates in the active campaign and caps the offer within "
            "its configured promotion limit."
        )

    return percent, price_after, discount_reasons, restaurant_reason
