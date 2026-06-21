# Data Dictionary

## CategoryLabel

Exact Uber Eats category taxonomy. Used as Gem text and meal primary category.

## Meal

- `meal_id`
- `restaurant_id`
- `name`
- `primary_category`: exact Gem label candidate
- `categories`: additional retrieval metadata
- `tags`: e.g. `high_protein`, `matchday`
- `price_eur`
- `delivery_minutes`
- `dietary`
- `allergens`
- `image_asset_id`
- `available`

## Restaurant

- `restaurant_id`
- `name`
- `primary_category`
- `available`
- `status`: quiet / normal / busy
- `is_new`
- `campaign_tags`
- `max_discount_percent`
- `service_zones`

## CandidateDeal

A scored, feasible combination of one meal, one restaurant, and one discount.

## FoodGem

Public game object:

- `gem_id`
- `label`: exact category taxonomy value
- `gem_type`: history / campaign / restaurant_boost / exploration
- `category_id`
- `icon_asset_id`

The private `gem_id → CandidateDeal` mapping remains server-side.

## GameSession

Daily state machine:

```text
READY → CAUGHT → CLAIMED → ORDERED
```

- `READY`: six personalized Gems have been generated.
- `CAUGHT`: the user used the one daily catch and one deal was revealed.
- `CLAIMED`: the revealed discount is active and the recommended meal is in cart.
- `ORDERED`: `Place order` succeeded and the completed order was persisted.

## Cart

Derived from the claimed game session; it is not a client-editable database row.

- exactly one restaurant
- exactly one recommended meal
- quantity `1`
- original price
- discount percentage and amount
- discounted price
- mock delivery/service fees
- total

## StoredOrder

A completed runtime order stored in SQLite only after `Place order` succeeds.

- `order_id`
- `game_id` (unique; prevents duplicate orders)
- `user_id`
- `meal_id`, `meal_name`
- `restaurant_id`, `restaurant_name`
- `primary_category`
- `tags`
- `quantity`
- `price_before`
- `discount_percent`, `discount_amount`
- `final_amount`
- `delivery_minutes`
- `status = ORDERED`
- `ordered_at`

Completed runtime orders are merged with seed `order_history.json` when the next user profile is built.
