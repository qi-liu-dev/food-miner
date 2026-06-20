from __future__ import annotations

import pytest

from app.errors import ConflictError
from app.models import SessionStatus


def test_single_catch_and_single_claim(engine):
    session = engine.create_or_restore("emma")
    assert session.status == SessionStatus.READY
    assert len(session.gems) == 6
    assert len({gem.label for gem in session.gems}) == 6

    chosen = session.gems[0]
    caught = engine.catch(session.game_id, chosen.gem_id, "request-12345678")
    assert caught.status == SessionStatus.CAUGHT
    assert caught.deal.primary_category == chosen.label

    # Idempotent retry with the same request id returns the same deal.
    retry = engine.catch(session.game_id, chosen.gem_id, "request-12345678")
    assert retry.deal.deal_id == caught.deal.deal_id

    with pytest.raises(ConflictError):
        engine.catch(session.game_id, session.gems[1].gem_id, "request-different")

    claimed = engine.claim(session.game_id)
    assert claimed.status == SessionStatus.CLAIMED
    assert claimed.restaurant_id == caught.deal.restaurant_id
    assert claimed.redirect_path.startswith(f"/restaurants/{caught.deal.restaurant_id}")

    # Claim is idempotent and returns the same token.
    claimed_again = engine.claim(session.game_id)
    assert claimed_again.discount_token == claimed.discount_token
