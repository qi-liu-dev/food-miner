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
READY → CAUGHT → CLAIMED
```
