from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    data_dir: Path = BASE_DIR / "app" / "data"
    db_path: Path = Path(os.getenv("DB_PATH", str(BASE_DIR / "food_miner.db")))
    frontend_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    )
    demo_day: str | None = os.getenv("DEMO_DAY") or None


settings = Settings()
