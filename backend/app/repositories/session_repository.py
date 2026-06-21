from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from ..errors import ConflictError, NotFoundError, ValidationError
from ..models import GamePayload, SessionStatus, StoredGameSession


class SessionRepository:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_db(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS game_sessions (
                    game_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    day_key TEXT NOT NULL,
                    status TEXT NOT NULL,
                    catch_request_id TEXT,
                    caught_gem_id TEXT,
                    revealed_deal_id TEXT,
                    claimed_at TEXT,
                    discount_token TEXT,
                    payload_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(user_id, day_key)
                )
                """
            )

    @staticmethod
    def _row_to_session(row: sqlite3.Row) -> StoredGameSession:
        return StoredGameSession(
            game_id=row["game_id"],
            user_id=row["user_id"],
            day_key=row["day_key"],
            status=SessionStatus(row["status"]),
            catch_request_id=row["catch_request_id"],
            caught_gem_id=row["caught_gem_id"],
            revealed_deal_id=row["revealed_deal_id"],
            claimed_at=row["claimed_at"],
            discount_token=row["discount_token"],
            payload=GamePayload.model_validate_json(row["payload_json"]),
            created_at=row["created_at"],
        )

    def get_by_user_day(self, user_id: str, day_key: str) -> StoredGameSession | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM game_sessions WHERE user_id = ? AND day_key = ?",
                (user_id, day_key),
            ).fetchone()
        return self._row_to_session(row) if row else None

    def get_by_game_id(self, game_id: str) -> StoredGameSession:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM game_sessions WHERE game_id = ?", (game_id,)
            ).fetchone()
        if row is None:
            raise NotFoundError("Game session not found")
        return self._row_to_session(row)

    def get_by_discount_token(self, token: str) -> StoredGameSession | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM game_sessions WHERE discount_token = ?", (token,)
            ).fetchone()
        return self._row_to_session(row) if row else None

    def create(self, session: StoredGameSession) -> StoredGameSession:
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO game_sessions (
                        game_id, user_id, day_key, status, catch_request_id,
                        caught_gem_id, revealed_deal_id, claimed_at,
                        discount_token, payload_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        session.game_id,
                        session.user_id,
                        session.day_key,
                        session.status.value,
                        session.catch_request_id,
                        session.caught_gem_id,
                        session.revealed_deal_id,
                        session.claimed_at,
                        session.discount_token,
                        session.payload.model_dump_json(),
                        session.created_at,
                    ),
                )
        except sqlite3.IntegrityError:
            existing = self.get_by_user_day(session.user_id, session.day_key)
            if existing is None:
                raise
            return existing
        return session

    def catch(self, game_id: str, gem_id: str, request_id: str) -> StoredGameSession:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT * FROM game_sessions WHERE game_id = ?", (game_id,)
            ).fetchone()
            if row is None:
                raise NotFoundError("Game session not found")
            session = self._row_to_session(row)

            if session.status == SessionStatus.CAUGHT:
                if session.catch_request_id == request_id and session.caught_gem_id == gem_id:
                    connection.commit()
                    return session
                raise ConflictError("This user has already used today's catch")

            if session.status in {SessionStatus.CLAIMED, SessionStatus.ORDERED}:
                raise ConflictError("This game session can no longer be caught")

            if gem_id not in session.payload.deals_by_gem:
                raise ValidationError("The selected gem is not part of this game")

            deal = session.payload.deals_by_gem[gem_id]
            connection.execute(
                """
                UPDATE game_sessions
                SET status = ?, catch_request_id = ?, caught_gem_id = ?, revealed_deal_id = ?
                WHERE game_id = ?
                """,
                (
                    SessionStatus.CAUGHT.value,
                    request_id,
                    gem_id,
                    deal.deal_id,
                    game_id,
                ),
            )
            connection.commit()
            return self.get_by_game_id(game_id)
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def claim(self, game_id: str, discount_token: str) -> StoredGameSession:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT * FROM game_sessions WHERE game_id = ?", (game_id,)
            ).fetchone()
            if row is None:
                raise NotFoundError("Game session not found")
            session = self._row_to_session(row)

            if session.status == SessionStatus.READY:
                raise ConflictError("Catch a gem before claiming a discount")

            # Claim is idempotent, including after the order has been placed.
            if session.status in {SessionStatus.CLAIMED, SessionStatus.ORDERED}:
                connection.commit()
                return session

            claimed_at = datetime.now(timezone.utc).isoformat()
            connection.execute(
                """
                UPDATE game_sessions
                SET status = ?, claimed_at = ?, discount_token = ?
                WHERE game_id = ?
                """,
                (
                    SessionStatus.CLAIMED.value,
                    claimed_at,
                    discount_token,
                    game_id,
                ),
            )
            connection.commit()
            return self.get_by_game_id(game_id)
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def reset_user(self, user_id: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM game_sessions WHERE user_id = ?", (user_id,))
