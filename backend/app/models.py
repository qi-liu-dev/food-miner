from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class CategoryLabel(str, Enum):
    SUSHI = "Sushi"
    ASIAN = "Asian"
    CHICKEN = "Chicken"
    HEALTHY = "Healthy"
    MEXICAN = "Mexican"
    PIZZA = "Pizza"
    BURGERS = "Burgers"
    FAST_FOOD = "Fast Food"
    CHINESE = "Chinese"
    ICE_CREAM = "Ice Cream"
    WINGS = "Wings"
    VIETNAMESE = "Vietnamese"
    THAI = "Thai"
    GREEK = "Greek"
    DESSERTS = "Desserts"
    POKE = "Poke"
    COFFEE = "Coffee"
    INDIAN = "Indian"
    KOREAN = "Korean"
    ITALIAN = "Italian"
    JAPANESE = "Japanese"
    BAKERY = "Bakery"
    BUBBLE_TEA = "Bubble Tea"
    TAIWANESE = "Taiwanese"
    HALAL = "Halal"
    SOUP = "Soup"
    VEGAN = "Vegan"
    AMERICAN = "American"
    BBQ = "BBQ"
    BREAKFAST = "Breakfast"
    SALADS = "Salads"
    SEAFOOD = "Seafood"
    SANDWICHES = "Sandwiches"
    STREET_FOOD = "Street Food"
    COMFORT_FOOD = "Comfort Food"
    CARIBBEAN = "Caribbean"
    HAWAIIAN = "Hawaiian"


class GemType(str, Enum):
    HISTORY = "history"
    CAMPAIGN = "campaign"
    RESTAURANT_BOOST = "restaurant_boost"
    EXPLORATION = "exploration"


class SessionStatus(str, Enum):
    READY = "READY"
    CAUGHT = "CAUGHT"
    CLAIMED = "CLAIMED"


class User(BaseModel):
    user_id: str
    display_name: str
    dietary_requirements: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)
    delivery_zone: str = "central"


class OrderHistoryRecord(BaseModel):
    order_id: str
    user_id: str
    primary_category: CategoryLabel
    tags: list[str] = Field(default_factory=list)
    amount_eur: float
    delivery_minutes: int
    ordered_at: str


class Restaurant(BaseModel):
    restaurant_id: str
    name: str
    primary_category: CategoryLabel
    available: bool = True
    status: Literal["quiet", "normal", "busy"] = "normal"
    is_new: bool = False
    campaign_tags: list[str] = Field(default_factory=list)
    max_discount_percent: int = 10
    service_zones: list[str] = Field(default_factory=lambda: ["central"])


class Meal(BaseModel):
    meal_id: str
    restaurant_id: str
    name: str
    primary_category: CategoryLabel
    categories: list[CategoryLabel]
    tags: list[str] = Field(default_factory=list)
    price_eur: float
    delivery_minutes: int
    dietary: list[str] = Field(default_factory=list)
    allergens: list[str] = Field(default_factory=list)
    image_asset_id: str
    available: bool = True


class Campaign(BaseModel):
    campaign_id: str
    boosted_categories: list[CategoryLabel] = Field(default_factory=list)
    boost_new_categories: list[CategoryLabel] = Field(default_factory=list)
    boost_quiet_hour_restaurants: bool = True
    active_tags: list[str] = Field(default_factory=list)


class GameConfig(BaseModel):
    gems_per_game: int = 6
    max_catches_per_user_per_day: int = 1
    max_claims_per_session: int = 1
    guaranteed_catch: bool = True


class CategoryCatalogItem(BaseModel):
    label: CategoryLabel
    asset_id: str
    family: str
    placeholder_emoji: str


class BuiltUserProfile(BaseModel):
    user_id: str
    display_name: str
    category_affinity: dict[str, float]
    tag_affinity: dict[str, float]
    average_order_value_eur: float
    usual_max_delivery_minutes: int
    dietary_requirements: list[str]
    allergens: list[str]
    delivery_zone: str


class ScoreBreakdown(BaseModel):
    history_affinity: float
    campaign_fit: float
    restaurant_need: float
    price_fit: float
    delivery_fit: float
    total: float


class CandidateDeal(BaseModel):
    deal_id: str
    meal_id: str
    restaurant_id: str
    meal_name: str
    restaurant_name: str
    primary_category: CategoryLabel
    categories: list[CategoryLabel]
    tags: list[str]
    image_asset_id: str
    price_before: float
    price_after: float
    discount_percent: int
    delivery_minutes: int
    score: ScoreBreakdown
    why_this: list[str]
    restaurant_reason: str


class FoodGem(BaseModel):
    gem_id: str
    label: CategoryLabel
    gem_type: GemType
    category_id: str
    icon_asset_id: str


class GamePayload(BaseModel):
    personalization_summary: list[str]
    gems: list[FoodGem]
    deals_by_gem: dict[str, CandidateDeal]


class StoredGameSession(BaseModel):
    game_id: str
    user_id: str
    day_key: str
    status: SessionStatus
    catch_request_id: str | None = None
    caught_gem_id: str | None = None
    revealed_deal_id: str | None = None
    claimed_at: str | None = None
    discount_token: str | None = None
    payload: GamePayload
    created_at: str


class CreateGameRequest(BaseModel):
    user_id: str


class CatchRequest(BaseModel):
    gem_id: str
    request_id: str = Field(min_length=8, max_length=120)


class DemoResetRequest(BaseModel):
    user_id: str = "emma"


class PublicUser(BaseModel):
    user_id: str
    display_name: str


class GameSessionResponse(BaseModel):
    game_id: str
    status: SessionStatus
    user: PublicUser
    personalization_summary: list[str]
    gems: list[FoodGem]
    revealed_deal: CandidateDeal | None = None
    redirect_path: str | None = None


class CatchResponse(BaseModel):
    game_id: str
    status: SessionStatus
    caught_gem_id: str
    deal: CandidateDeal


class ClaimResponse(BaseModel):
    game_id: str
    status: SessionStatus
    restaurant_id: str
    discount_token: str
    redirect_path: str


class RestaurantMenuItem(BaseModel):
    meal_id: str
    name: str
    image_asset_id: str
    price_eur: float
    discounted_price_eur: float | None = None
    is_recommended: bool = False


class RestaurantPageResponse(BaseModel):
    restaurant_id: str
    restaurant_name: str
    primary_category: CategoryLabel
    discount_percent: int | None = None
    discount_applied: bool = False
    recommended_meal_id: str | None = None
    menu: list[RestaurantMenuItem]


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
