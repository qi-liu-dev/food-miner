from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .errors import ConflictError, NotFoundError, ValidationError
from .models import (
    CatchRequest,
    CatchResponse,
    ClaimResponse,
    CreateGameRequest,
    DemoResetRequest,
    GameSessionResponse,
    HealthResponse,
    RestaurantMenuItem,
    RestaurantPageResponse,
)
from .repositories.mock_repository import MockRepository
from .repositories.session_repository import SessionRepository
from .services.game_engine import GameEngine

app = FastAPI(title="Uber Eats Food Miner API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.frontend_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_repository = MockRepository(settings.data_dir)
session_repository = SessionRepository(settings.db_path)
game_engine = GameEngine(data_repository, session_repository, settings.demo_day)


@app.exception_handler(NotFoundError)
def not_found_handler(_, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
def conflict_handler(_, exc: ConflictError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(ValidationError)
def validation_handler(_, exc: ValidationError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", timestamp=datetime.now(timezone.utc))


@app.get("/api/categories")
def categories():
    return [item.model_dump(mode="json") for item in data_repository.get_category_catalog()]


@app.post("/api/game-sessions", response_model=GameSessionResponse)
def create_game(request: CreateGameRequest) -> GameSessionResponse:
    return game_engine.create_or_restore(request.user_id)


@app.post(
    "/api/game-sessions/{game_id}/catch",
    response_model=CatchResponse,
)
def catch_gem(game_id: str, request: CatchRequest) -> CatchResponse:
    return game_engine.catch(game_id, request.gem_id, request.request_id)


@app.post(
    "/api/game-sessions/{game_id}/claim",
    response_model=ClaimResponse,
)
def claim_discount(game_id: str) -> ClaimResponse:
    return game_engine.claim(game_id)


@app.get(
    "/api/restaurants/{restaurant_id}",
    response_model=RestaurantPageResponse,
)
def restaurant_page(
    restaurant_id: str,
    deal_token: str | None = Query(default=None, alias="deal"),
) -> RestaurantPageResponse:
    restaurant = data_repository.get_restaurant(restaurant_id)
    if restaurant is None:
        raise NotFoundError("Restaurant not found")

    session = session_repository.get_by_discount_token(deal_token) if deal_token else None
    discount_percent = None
    recommended_meal_id = None
    if session and session.caught_gem_id:
        deal = session.payload.deals_by_gem[session.caught_gem_id]
        if deal.restaurant_id == restaurant_id:
            discount_percent = deal.discount_percent
            recommended_meal_id = deal.meal_id

    menu = []
    for meal in data_repository.get_meals_for_restaurant(restaurant_id):
        discounted = None
        if discount_percent and meal.meal_id == recommended_meal_id:
            discounted = round(meal.price_eur * (1 - discount_percent / 100), 2)
        menu.append(
            RestaurantMenuItem(
                meal_id=meal.meal_id,
                name=meal.name,
                image_asset_id=meal.image_asset_id,
                price_eur=meal.price_eur,
                discounted_price_eur=discounted,
                is_recommended=meal.meal_id == recommended_meal_id,
            )
        )

    return RestaurantPageResponse(
        restaurant_id=restaurant.restaurant_id,
        restaurant_name=restaurant.name,
        primary_category=restaurant.primary_category,
        discount_percent=discount_percent,
        discount_applied=discount_percent is not None,
        recommended_meal_id=recommended_meal_id,
        menu=menu,
    )


@app.post("/api/demo/reset")
def reset_demo(request: DemoResetRequest):
    session_repository.reset_user(request.user_id)
    return {"status": "reset", "user_id": request.user_id}
