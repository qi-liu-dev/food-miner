from __future__ import annotations

import pytest

from app.errors import ConflictError
from app.models import OrderStatus, SessionStatus


def test_cart_requires_claim(engine, checkout):
    session = engine.create_or_restore("emma")

    with pytest.raises(ConflictError):
        checkout.get_cart(session.game_id)

    caught = engine.catch(
        session.game_id,
        session.gems[0].gem_id,
        "request-checkout-0001",
    )
    assert caught.status == SessionStatus.CAUGHT

    with pytest.raises(ConflictError):
        checkout.get_cart(session.game_id)


def test_place_order_is_idempotent_and_becomes_history(
    engine,
    checkout,
    order_repository,
):
    session = engine.create_or_restore("emma")
    caught = engine.catch(
        session.game_id,
        session.gems[0].gem_id,
        "request-checkout-0002",
    )
    claimed = engine.claim(session.game_id)
    assert claimed.status == SessionStatus.CLAIMED

    cart = checkout.get_cart(session.game_id)
    assert cart.item.meal_id == caught.deal.meal_id
    assert cart.item.quantity == 1
    assert cart.total == caught.deal.price_after

    placed = checkout.place_order(session.game_id)
    assert placed.status == OrderStatus.ORDERED
    assert placed.meal_name == caught.deal.meal_name

    # Rapid double click / retry returns the original order.
    placed_again = checkout.place_order(session.game_id)
    assert placed_again.order_id == placed.order_id

    history = order_repository.get_history_records("emma")
    assert len(history) == 1
    assert history[0].primary_category == caught.deal.primary_category
    assert history[0].amount_eur == caught.deal.price_after

    restored = engine.create_or_restore("emma")
    assert restored.status == SessionStatus.ORDERED
    assert restored.redirect_path is not None
