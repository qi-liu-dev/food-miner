from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone

from ..errors import ConflictError
from ..models import (
    CartFees,
    CartItem,
    CartResponse,
    CartRestaurant,
    PlaceOrderResponse,
    SessionStatus,
    StoredOrder,
)
from ..repositories.order_repository import OrderRepository
from ..repositories.session_repository import SessionRepository


class CheckoutEngine:
    """Builds the one-item cart and records a completed Food Miner order."""

    def __init__(
        self,
        session_repository: SessionRepository,
        order_repository: OrderRepository,
    ):
        self.sessions = session_repository
        self.orders = order_repository

    @staticmethod
    def _deal_for_session(session):
        if session.caught_gem_id is None:
            raise ConflictError("Catch a Food Gem before opening the cart")
        return session.payload.deals_by_gem[session.caught_gem_id]

    @staticmethod
    def _delivery_window(delivery_minutes: int) -> str:
        lower = max(10, math.floor(max(0, delivery_minutes - 5) / 5) * 5)
        upper = max(lower + 5, math.ceil(delivery_minutes / 5) * 5)
        return f"{lower}–{upper} min"

    def get_cart(self, game_id: str) -> CartResponse:
        session = self.sessions.get_by_game_id(game_id)
        if session.status in {SessionStatus.READY, SessionStatus.CAUGHT}:
            raise ConflictError(
                "Claim the Food Miner discount before opening the cart"
            )

        deal = self._deal_for_session(session)
        discount_amount = round(deal.price_before - deal.price_after, 2)
        fees = CartFees(delivery_fee=0.0, service_fee=0.0)
        total = round(deal.price_after + fees.delivery_fee + fees.service_fee, 2)

        return CartResponse(
            game_id=session.game_id,
            status=session.status,
            restaurant=CartRestaurant(
                restaurant_id=deal.restaurant_id,
                name=deal.restaurant_name,
                primary_category=deal.primary_category,
            ),
            item=CartItem(
                meal_id=deal.meal_id,
                name=deal.meal_name,
                image_asset_id=deal.image_asset_id,
                quantity=1,
                price_before=deal.price_before,
                discount_percent=deal.discount_percent,
                discount_amount=discount_amount,
                price_after=deal.price_after,
            ),
            fees=fees,
            total=total,
        )

    def place_order(self, game_id: str) -> PlaceOrderResponse:
        existing = self.orders.get_by_game_id(game_id)
        if existing is not None:
            return self._to_response(existing)

        session = self.sessions.get_by_game_id(game_id)
        if session.status != SessionStatus.CLAIMED:
            if session.status == SessionStatus.ORDERED:
                existing = self.orders.get_by_game_id(game_id)
                if existing is not None:
                    return self._to_response(existing)
            raise ConflictError(
                "Claim the Food Miner discount before placing the order"
            )

        deal = self._deal_for_session(session)
        ordered_at = datetime.now(timezone.utc).isoformat()
        order = StoredOrder(
            order_id=f"order_{uuid.uuid4().hex[:16]}",
            game_id=session.game_id,
            user_id=session.user_id,
            meal_id=deal.meal_id,
            meal_name=deal.meal_name,
            restaurant_id=deal.restaurant_id,
            restaurant_name=deal.restaurant_name,
            primary_category=deal.primary_category,
            tags=deal.tags,
            quantity=1,
            price_before=deal.price_before,
            discount_percent=deal.discount_percent,
            discount_amount=round(deal.price_before - deal.price_after, 2),
            final_amount=deal.price_after,
            delivery_minutes=deal.delivery_minutes,
            ordered_at=ordered_at,
        )
        stored = self.orders.place_order(order)
        return self._to_response(stored)

    def _to_response(self, order: StoredOrder) -> PlaceOrderResponse:
        return PlaceOrderResponse(
            order_id=order.order_id,
            game_id=order.game_id,
            status=order.status,
            restaurant_name=order.restaurant_name,
            meal_name=order.meal_name,
            final_amount=order.final_amount,
            estimated_delivery=self._delivery_window(order.delivery_minutes),
            ordered_at=order.ordered_at,
        )
