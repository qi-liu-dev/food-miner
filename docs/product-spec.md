# Food Miner MVP — Frozen Product Spec

## Persona

Emma

- History: Korean / Japanese / Thai
- Frequent goal signal: high protein
- Average order value: about €14
- Typical delivery tolerance: under 30 minutes

## Current campaign

- World Cup Matchday categories: Pizza, Wings, BBQ, Fast Food, Burgers
- Boost quiet-hour restaurants
- Boost newly launched Italian restaurants

## User flow

```text
Uber Eats Home
→ optional Food Miner entry
→ 1–2 second personalized generating state
→ six dynamic category Gems
→ one guaranteed catch
→ one concrete meal/restaurant discount reveal
→ claim that exact discount
→ corresponding restaurant page with discount applied
```

## Frozen rules

- No points.
- No filter selection.
- No text input.
- No reroll.
- One catch per user per day.
- Catch always succeeds.
- Every displayed Gem is backed by an eligible concrete deal.
- Gem labels must be exact values from the approved taxonomy.
- Claim endpoint does not accept an arbitrary deal ID.
- Claim redirects only to the restaurant bound to the caught Gem.
