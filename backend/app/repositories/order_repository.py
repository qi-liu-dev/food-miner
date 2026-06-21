from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from ..errors import ConflictError, NotFoundError
from ..models import (
    CategoryLabel,
    OrderHistoryRecord,
    OrderStatus,
    SessionStatus,
    StoredOrder,
)


class OrderRepository:
    """Persist completed Food Miner orders in SQLite.

    The JSON order history remains immutable seed data. Only a successful
    Place order action is written here.
    """

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
                CREATE TABLE IF NOT EXISTS orders (
                    order_id TEXT PRIMARY KEY,
                    game_id TEXT NOT NULL UNIQUE,
                    user_id TEXT NOT NULL,
                    meal_id TEXT NOT NULL,
                    meal_name TEXT NOT NULL,
                    restaurant_id TEXT NOT NULL,
                    restaurant_name TEXT NOT NULL,
                    primary_category TEXT NOT NULL,
                    tags_json TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    price_before REAL NOT NULL,
                    discount_percent INTEGER NOT NULL,
                    discount_amount REAL NOT NULL,
                    final_amount REAL NOT NULL,
                    delivery_minutes INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    ordered_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, ordered_at)"
            )

    @staticmethod
    def _row_to_order(row: sqlite3.Row) -> StoredOrder:
        return StoredOrder(
            order_id=row["order_id"],
            game_id=row["game_id"],
            user_id=row["user_id"],
            meal_id=row["meal_id"],
            meal_name=row["meal_name"],
            restaurant_id=row["restaurant_id"],
            restaurant_name=row["restaurant_name"],
            primary_category=CategoryLabel(row["primary_category"]),
            tags=json.loads(row["tags_json"]),
            quantity=row["quantity"],
            price_before=row["price_before"],
            discount_percent=row["discount_percent"],
            discount_amount=row["discount_amount"],
            final_amount=row["final_amount"],
            delivery_minutes=row["delivery_minutes"],
            status=OrderStatus(row["status"]),
            ordered_at=row["ordered_at"],
        )

    def get_by_game_id(self, game_id: str) -> StoredOrder | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM orders WHERE game_id = ?", (game_id,)
            ).fetchone()
        return self._row_to_order(row) if row else None

    def place_order(self, order: StoredOrder) -> StoredOrder:
        """Insert one order and mark the associated session ORDERED atomically."""

        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")

            existing_row = connection.execute(
                "SELECT * FROM orders WHERE game_id = ?", (order.game_id,)
            ).fetchone()
            if existing_row is not None:
                connection.commit()
                return self._row_to_order(existing_row)

            session_row = connection.execute(
                "SELECT status FROM game_sessions WHERE game_id = ?",
                (order.game_id,),
            ).fetchone()
            if session_row is None:
                raise NotFoundError("Game session not found")

            session_status = SessionStatus(session_row["status"])
            if session_status in {SessionStatus.READY, SessionStatus.CAUGHT}:
                raise ConflictError(
                    "Claim the Food Miner discount before placing the order"
                )
            if session_status == SessionStatus.ORDERED:
                raise ConflictError("This game session has already been ordered")

            connection.execute(
                """
                INSERT INTO orders (
                    order_id, game_id, user_id, meal_id, meal_name,
                    restaurant_id, restaurant_name, primary_category,
                    tags_json, quantity, price_before, discount_percent,
                    discount_amount, final_amount, delivery_minutes,
                    status, ordered_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    order.order_id,
                    order.game_id,
                    order.user_id,
                    order.meal_id,
                    order.meal_name,
                    order.restaurant_id,
                    order.restaurant_name,
                    order.primary_category.value,
                    json.dumps(order.tags),
                    order.quantity,
                    order.price_before,
                    order.discount_percent,
                    order.discount_amount,
                    order.final_amount,
                    order.delivery_minutes,
                    order.status.value,
                    order.ordered_at,
                ),
            )
            connection.execute(
                "UPDATE game_sessions SET status = ? WHERE game_id = ?",
                (SessionStatus.ORDERED.value, order.game_id),
            )
            connection.commit()
            return order
        except sqlite3.IntegrityError:
            connection.rollback()
            existing = self.get_by_game_id(order.game_id)
            if existing is not None:
                return existing
            raise
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    # Compatibility alias for older internal callers.
    def create(self, order: StoredOrder) -> StoredOrder:
        return self.place_order(order)

    def get_history_records(self, user_id: str) -> list[OrderHistoryRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY ordered_at",
                (user_id, OrderStatus.ORDERED.value),
            ).fetchall()

        return [
            OrderHistoryRecord(
                order_id=row["order_id"],
                user_id=row["user_id"],
                primary_category=CategoryLabel(row["primary_category"]),
                tags=json.loads(row["tags_json"]),
                amount_eur=row["final_amount"],
                delivery_minutes=row["delivery_minutes"],
                ordered_at=row["ordered_at"],
            )
            for row in rows
        ]

    def reset_user(self, user_id: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM orders WHERE user_id = ?", (user_id,))
