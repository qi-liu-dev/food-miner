# API Contract

## Create or restore today's game

```http
POST /api/game-sessions
Content-Type: application/json

{"user_id":"emma"}
```

Important response fields:

```json
{
  "game_id": "game_...",
  "status": "READY",
  "personalization_summary": ["Korean, Japanese, Thai"],
  "gems": [
    {
      "gem_id": "gem_01_korean",
      "label": "Korean",
      "gem_type": "history",
      "category_id": "korean",
      "icon_asset_id": "category_korean"
    }
  ]
}
```

The response intentionally does **not** reveal hidden meals/restaurants before catch.

## Catch once

```http
POST /api/game-sessions/{game_id}/catch
Content-Type: application/json

{
  "gem_id":"gem_01_korean",
  "request_id":"browser-generated-uuid"
}
```

The same `request_id + gem_id` may be retried safely after a network failure. A different second catch returns HTTP 409.

## Claim

```http
POST /api/game-sessions/{game_id}/claim
```

No `deal_id` is accepted. The server claims only the session's revealed deal.

## Restaurant

```http
GET /api/restaurants/{restaurant_id}?deal={discount_token}
```

## Demo reset

```http
POST /api/demo/reset

{"user_id":"emma"}
```

## Health

```http
GET /health
```

## Cart generated from the claimed deal

```http
GET /api/game-sessions/{game_id}/cart
```

The frontend does not submit a meal, price, or discount. The server derives the
single-item cart from the deal already bound to the caught Gem.

```json
{
  "game_id": "game_...",
  "status": "CLAIMED",
  "restaurant": {
    "restaurant_id": "r_bbq_01",
    "name": "Local Smokehouse",
    "primary_category": "BBQ"
  },
  "item": {
    "meal_id": "m_bbq_01",
    "name": "Quiet-Hour BBQ Protein Box",
    "quantity": 1,
    "price_before": 14.20,
    "discount_percent": 10,
    "discount_amount": 1.42,
    "price_after": 12.78
  },
  "fees": {
    "delivery_fee": 0,
    "service_fee": 0
  },
  "total": 12.78
}
```

## Place order

```http
POST /api/game-sessions/{game_id}/place-order
```

No client-controlled pricing fields are accepted. A successful request:

1. inserts one idempotent order into SQLite;
2. changes the game session from `CLAIMED` to `ORDERED`;
3. makes that order available to future user-profile construction.

```json
{
  "order_id": "order_...",
  "game_id": "game_...",
  "status": "ORDERED",
  "restaurant_name": "Local Smokehouse",
  "meal_name": "Quiet-Hour BBQ Protein Box",
  "final_amount": 12.78,
  "estimated_delivery": "20–30 min",
  "ordered_at": "2026-06-20T18:20:00+00:00"
}
```

Repeated requests for the same `game_id` return the original order rather than
creating a duplicate.
