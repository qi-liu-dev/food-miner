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
