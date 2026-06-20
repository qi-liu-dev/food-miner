from __future__ import annotations

from .models import CategoryLabel

ASIAN_CATEGORIES = {
    CategoryLabel.SUSHI,
    CategoryLabel.ASIAN,
    CategoryLabel.CHINESE,
    CategoryLabel.VIETNAMESE,
    CategoryLabel.THAI,
    CategoryLabel.POKE,
    CategoryLabel.KOREAN,
    CategoryLabel.JAPANESE,
    CategoryLabel.BUBBLE_TEA,
    CategoryLabel.TAIWANESE,
}

CATEGORY_PARENTS: dict[CategoryLabel, tuple[CategoryLabel, ...]] = {
    category: (CategoryLabel.ASIAN,) for category in ASIAN_CATEGORIES if category != CategoryLabel.ASIAN
}


def category_slug(label: CategoryLabel | str) -> str:
    value = label.value if isinstance(label, CategoryLabel) else label
    return value.lower().replace(" ", "-")
