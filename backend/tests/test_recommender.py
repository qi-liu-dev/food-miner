from __future__ import annotations

from datetime import date
from pathlib import Path

from app.models import CategoryLabel
from app.repositories.mock_repository import MockRepository
from app.services.profile_builder import build_user_profile
from app.services.recommender import hard_filter, score_candidates, select_diverse_candidates


def test_recommender_returns_six_unique_allowed_categories():
    data_dir = Path(__file__).resolve().parents[1] / "app" / "data"
    repository = MockRepository(data_dir)
    user = repository.get_user("emma")
    assert user is not None
    profile = build_user_profile(user, repository.get_orders("emma"), date(2026, 6, 20))
    restaurants = {item.restaurant_id: item for item in repository.get_restaurants()}
    meals = hard_filter(profile, repository.get_meals(), restaurants)
    candidates = score_candidates(profile, meals, restaurants, repository.get_campaign())
    selected = select_diverse_candidates(candidates, 6, repository.get_campaign())

    labels = [candidate.meal.primary_category for candidate, _ in selected]
    assert len(labels) == 6
    assert len(set(labels)) == 6
    assert all(isinstance(label, CategoryLabel) for label in labels)
    assert CategoryLabel.KOREAN in labels
    assert any(label in {CategoryLabel.PIZZA, CategoryLabel.WINGS, CategoryLabel.BBQ, CategoryLabel.ITALIAN} for label in labels)
