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
