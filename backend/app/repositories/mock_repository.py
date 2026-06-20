from __future__ import annotations

import json
from pathlib import Path

from ..models import (
    Campaign,
    CategoryCatalogItem,
    GameConfig,
    Meal,
    OrderHistoryRecord,
    Restaurant,
    User,
)


class MockRepository:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self._users = [User.model_validate(item) for item in self._load("users.json")]
        self._orders = [
            OrderHistoryRecord.model_validate(item) for item in self._load("order_history.json")
        ]
        self._restaurants = [
            Restaurant.model_validate(item) for item in self._load("restaurants.json")
        ]
        self._meals = [Meal.model_validate(item) for item in self._load("meals.json")]
        self._campaign = Campaign.model_validate(self._load("campaigns.json"))
        self._game_config = GameConfig.model_validate(self._load("game_config.json"))
        self._category_catalog = [
            CategoryCatalogItem.model_validate(item)
            for item in self._load("category_catalog.json")
        ]

    def _load(self, filename: str):
        path = self.data_dir / filename
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def get_user(self, user_id: str) -> User | None:
        return next((user for user in self._users if user.user_id == user_id), None)

    def get_orders(self, user_id: str) -> list[OrderHistoryRecord]:
        return [order for order in self._orders if order.user_id == user_id]

    def get_restaurants(self) -> list[Restaurant]:
        return list(self._restaurants)

    def get_restaurant(self, restaurant_id: str) -> Restaurant | None:
        return next(
            (restaurant for restaurant in self._restaurants if restaurant.restaurant_id == restaurant_id),
            None,
        )

    def get_meals(self) -> list[Meal]:
        return list(self._meals)

    def get_meals_for_restaurant(self, restaurant_id: str) -> list[Meal]:
        return [meal for meal in self._meals if meal.restaurant_id == restaurant_id]

    def get_campaign(self) -> Campaign:
        return self._campaign

    def get_game_config(self) -> GameConfig:
        return self._game_config

    def get_category_catalog(self) -> list[CategoryCatalogItem]:
        return list(self._category_catalog)

    def get_category_asset_id(self, label: str) -> str:
        item = next((item for item in self._category_catalog if item.label.value == label), None)
        if item is None:
            raise KeyError(f"No category asset configured for {label}")
        return item.asset_id
