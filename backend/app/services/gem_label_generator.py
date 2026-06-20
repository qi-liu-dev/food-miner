from __future__ import annotations

from ..models import CategoryLabel


class GemLabelGenerator:
    """Gem text is always one exact Uber Eats category label."""

    def __init__(self, allowed_labels: set[str]):
        self.allowed_labels = allowed_labels

    def generate(self, category: CategoryLabel) -> CategoryLabel:
        if category.value not in self.allowed_labels:
            raise ValueError(f"Unsupported Food Miner category: {category.value}")
        return category
