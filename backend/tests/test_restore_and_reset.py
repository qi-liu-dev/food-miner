from __future__ import annotations

from app.models import SessionStatus


def test_daily_session_is_restored(engine):
    first = engine.create_or_restore("emma")
    second = engine.create_or_restore("emma")
    assert first.game_id == second.game_id

    engine.catch(first.game_id, first.gems[0].gem_id, "restore-request-01")
    restored = engine.create_or_restore("emma")
    assert restored.status == SessionStatus.CAUGHT
    assert restored.revealed_deal is not None


def test_runtime_order_can_be_preserved_or_cleared(engine):
    session = engine.create_or_restore("emma")
    engine.catch(session.game_id, session.gems[0].gem_id, "restore-request-02")
    engine.claim(session.game_id)
    engine.place_order(session.game_id)

    assert engine.orders.get_by_game_id(session.game_id) is not None

    # Resetting only the session preserves completed order history.
    engine.sessions.reset_user("emma")
    assert engine.orders.get_by_game_id(session.game_id) is not None

    # Demo reset calls both repositories and removes runtime history too.
    engine.orders.reset_user("emma")
    assert engine.orders.get_by_game_id(session.game_id) is None

    replacement = engine.create_or_restore("emma")
    assert replacement.game_id != session.game_id
    assert replacement.status == SessionStatus.READY
