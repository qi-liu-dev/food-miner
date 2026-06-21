from __future__ import annotations

import secrets
import uuid
from datetime import date, datetime, timezone

from ..errors import NotFoundError
from ..models import (
    CatchResponse,
    ClaimResponse,
    FoodGem,
    GamePayload,
    GameSessionResponse,
    PublicUser,
    SessionStatus,
    StoredGameSession,
)
from ..repositories.mock_repository import MockRepository
from ..repositories.order_repository import OrderRepository
from ..repositories.session_repository import SessionRepository
from ..taxonomy import category_slug
from .checkout_engine import CheckoutEngine
from .gem_label_generator import GemLabelGenerator
from .profile_builder import build_user_profile
from .recommender import build_deal, hard_filter, score_candidates, select_diverse_candidates


class GameEngine:
    def __init__(
        self,
        data_repository: MockRepository,
        session_repository: SessionRepository,
        order_repository: OrderRepository,
        demo_day: str | None = None,
    ):
        self.data = data_repository
        self.sessions = session_repository
        self.orders = order_repository
        self.checkout = CheckoutEngine(session_repository, order_repository)
        self.demo_day = demo_day
        allowed_labels = {item.label.value for item in self.data.get_category_catalog()}
        self.label_generator = GemLabelGenerator(allowed_labels)

    def _today(self) -> date:
        return date.fromisoformat(self.demo_day) if self.demo_day else date.today()

    def _personalization_summary(self, profile) -> list[str]:
        top_categories = sorted(
            profile.category_affinity.items(), key=lambda item: (-item[1], item[0])
        )
        specific = [name for name, _ in top_categories if name != "Asian"][:3]
        summary = []
        if specific:
            summary.append(", ".join(specific))
        if profile.tag_affinity.get("high_protein", 0) > 0:
            summary.append("High-protein meals")
        summary.append(f"Usually around €{profile.average_order_value_eur:.0f}")
        summary.append(
            f"Usually delivered within {profile.usual_max_delivery_minutes} minutes"
        )
        return summary

    def create_or_restore(self, user_id: str) -> GameSessionResponse:
        user = self.data.get_user(user_id)
        if user is None:
            raise NotFoundError("User not found")

        day_key = self._today().isoformat()
        existing = self.sessions.get_by_user_day(user_id, day_key)
        if existing:
            return self._to_response(existing, user.display_name)

        # Seed history comes from JSON. Successfully placed demo orders come
        # from SQLite and are included in future profile construction.
        history = [
            *self.data.get_orders(user_id),
            *self.orders.get_history_records(user_id),
        ]
        profile = build_user_profile(user, history, self._today())
        restaurants = self.data.get_restaurants()
        restaurants_by_id = {item.restaurant_id: item for item in restaurants}
        eligible_meals = hard_filter(profile, self.data.get_meals(), restaurants_by_id)
        candidates = score_candidates(
            profile, eligible_meals, restaurants_by_id, self.data.get_campaign()
        )
        selected = select_diverse_candidates(
            candidates,
            self.data.get_game_config().gems_per_game,
            self.data.get_campaign(),
        )

        gems: list[FoodGem] = []
        deals_by_gem = {}
        for index, (candidate, gem_type) in enumerate(selected, start=1):
            deal = build_deal(profile, candidate)
            label = self.label_generator.generate(candidate.meal.primary_category)
            gem_id = f"gem_{index:02d}_{category_slug(label)}"
            gem = FoodGem(
                gem_id=gem_id,
                label=label,
                gem_type=gem_type,
                category_id=category_slug(label),
                icon_asset_id=self.data.get_category_asset_id(label.value),
            )
            gems.append(gem)
            deals_by_gem[gem_id] = deal

        session = StoredGameSession(
            game_id=f"game_{uuid.uuid4().hex[:16]}",
            user_id=user_id,
            day_key=day_key,
            status=SessionStatus.READY,
            payload=GamePayload(
                personalization_summary=self._personalization_summary(profile),
                gems=gems,
                deals_by_gem=deals_by_gem,
            ),
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        stored = self.sessions.create(session)
        return self._to_response(stored, user.display_name)

    def get_cart(self, game_id: str):
        return self.checkout.get_cart(game_id)

    def place_order(self, game_id: str):
        return self.checkout.place_order(game_id)

    def get_order_history(self, user_id: str):
        return [
            *self.data.get_orders(user_id),
            *self.orders.get_history_records(user_id),
        ]

    def catch(self, game_id: str, gem_id: str, request_id: str) -> CatchResponse:
        session = self.sessions.catch(game_id, gem_id, request_id)
        if session.caught_gem_id is None:
            raise RuntimeError("Caught session is missing a gem id")
        deal = session.payload.deals_by_gem[session.caught_gem_id]
        return CatchResponse(
            game_id=session.game_id,
            status=session.status,
            caught_gem_id=session.caught_gem_id,
            deal=deal,
        )

    def claim(self, game_id: str) -> ClaimResponse:
        current = self.sessions.get_by_game_id(game_id)
        token = current.discount_token or f"fm_{secrets.token_urlsafe(16)}"
        session = self.sessions.claim(game_id, token)
        if session.caught_gem_id is None or session.discount_token is None:
            raise RuntimeError("Claimed session is incomplete")
        deal = session.payload.deals_by_gem[session.caught_gem_id]
        redirect_path = (
            f"/restaurants/{deal.restaurant_id}"
            f"?deal={session.discount_token}&game={session.game_id}"
        )
        return ClaimResponse(
            game_id=session.game_id,
            status=session.status,
            restaurant_id=deal.restaurant_id,
            discount_token=session.discount_token,
            redirect_path=redirect_path,
        )

    def _to_response(self, session: StoredGameSession, display_name: str) -> GameSessionResponse:
        revealed = None
        redirect = None
        if session.caught_gem_id:
            revealed = session.payload.deals_by_gem[session.caught_gem_id]
        if (
            session.status in {SessionStatus.CLAIMED, SessionStatus.ORDERED}
            and revealed
            and session.discount_token
        ):
            redirect = (
                f"/restaurants/{revealed.restaurant_id}"
                f"?deal={session.discount_token}&game={session.game_id}"
            )
        return GameSessionResponse(
            game_id=session.game_id,
            status=session.status,
            user=PublicUser(user_id=session.user_id, display_name=display_name),
            personalization_summary=session.payload.personalization_summary,
            gems=session.payload.gems,
            revealed_deal=revealed,
            redirect_path=redirect,
        )
