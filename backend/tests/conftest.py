from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app.repositories.mock_repository import MockRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.session_repository import SessionRepository
from app.services.checkout_engine import CheckoutEngine
from app.services.game_engine import GameEngine


@pytest.fixture
def repositories(tmp_path: Path):
    data_dir = Path(__file__).resolve().parents[1] / "app" / "data"
    db_path = tmp_path / "test.db"
    data = MockRepository(data_dir)
    sessions = SessionRepository(db_path)
    orders = OrderRepository(db_path)
    return data, sessions, orders


@pytest.fixture
def engine(repositories) -> GameEngine:
    data, sessions, orders = repositories
    return GameEngine(
        data,
        sessions,
        orders,
        demo_day="2026-06-20",
    )


@pytest.fixture
def checkout(repositories) -> CheckoutEngine:
    _, sessions, orders = repositories
    return CheckoutEngine(sessions, orders)


@pytest.fixture
def order_repository(repositories) -> OrderRepository:
    return repositories[2]
