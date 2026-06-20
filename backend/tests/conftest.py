from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app.repositories.mock_repository import MockRepository
from app.repositories.session_repository import SessionRepository
from app.services.game_engine import GameEngine


@pytest.fixture
def engine(tmp_path: Path) -> GameEngine:
    data_dir = Path(__file__).resolve().parents[1] / "app" / "data"
    return GameEngine(
        MockRepository(data_dir),
        SessionRepository(tmp_path / "test.db"),
        demo_day="2026-06-20",
    )
