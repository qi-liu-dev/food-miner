# AGENTS.md — Food Miner project

## Project summary
This is a Hack4Her Uber Eats Oracle prototype.

The product is Food Miner: an optional Uber Eats homepage game entry. The user is Emma. The backend generates 6 personalized Food Gems from Emma's order history, Uber campaign priorities, and restaurant-side needs. Each Gem label must be one of the existing Uber Eats food/category labels only.

## Final product rules
- Keep the current flow unchanged.
- No points.
- No reroll.
- No filters.
- No text input from the user.
- One user can catch only once per daily session.
- The catch is guaranteed to succeed.
- The backend generates 6 dynamic Gems before the game starts.
- Each Gem is pre-bound to exactly one concrete deal: meal + restaurant + feasible discount.
- The user catches one Gem.
- After catch, reveal only that Gem's bound meal deal.
- The user can only claim that revealed discount.
- Claim redirects to the corresponding restaurant page with the discount applied.
- Do not add multi-deal selection unless asked.
- Do not reintroduce points or multiple catches.

## Demo persona
User: Emma

History:
- Favorite cuisines: Korean, Japanese, Thai
- Frequently chooses high-protein meals
- Average spend: about €14
- Usually accepts delivery within 30 minutes

Uber campaign:
- Matchday deals: Pizza, Wings, BBQ, Fast Food
- Boost quiet-hour restaurants
- Boost newly launched Italian restaurants

## Allowed Gem labels
Gem labels must be exactly one of:
Sushi, Asian, Chicken, Healthy, Mexican, Pizza, Burgers, Fast Food, Chinese, Ice Cream, Wings, Vietnamese, Thai, Greek, Desserts, Poke, Coffee, Indian, Korean, Italian, Japanese, Bakery, Bubble Tea, Taiwanese, Halal, Soup, Vegan, American, BBQ, Breakfast, Salads, Seafood, Sandwiches, Street Food, Comfort Food, Caribbean, Hawaiian.

Do not invent labels like “Korean Kickoff” or “Protein Asian” unless the user explicitly changes this rule.

## Recommendation logic
The recommendation happens before the game screen is shown:
1. Load all concrete meals and restaurants.
2. Hard filter unavailable meals/restaurants and hard dietary constraints.
3. Score concrete meal + restaurant + discount candidates.
4. Select 6 diverse candidates.
5. Convert each candidate to a Food Gem with one allowed category label.
6. Store gem_id -> deal mapping server-side.

The catch endpoint should not run a new recommendation. It only reveals the deal already bound to the caught gem.

## Scoring logic
Use the current lightweight recommender:
meal_score =
0.45 * history_affinity
+ 0.20 * campaign_fit
+ 0.15 * restaurant_need
+ 0.10 * price_fit
+ 0.10 * delivery_fit

## Tech stack
Frontend:
- React + Vite
- Local dev: npm run dev
- Build: npm run build

Backend:
- FastAPI
- Local dev: uvicorn app.main:app --reload --port 8000
- Tests: pytest

## Important files
Read these before changing behavior:
- docs/product-spec.md
- docs/api-contract.md
- docs/data-dictionary.md
- backend/app/services/recommender.py
- backend/app/services/game_engine.py
- backend/app/services/gem_label_generator.py
- frontend/src/pages/HomePage.tsx
- frontend/src/pages/MinerPage.tsx

## Current UI requirement
Food Miner should be the top hero card on the home page, replacing the old Matchday Deals hero.
The hero button should say “Play now”, not “Order now”.

## Development rules
- Keep changes small and reviewable.
- Do not modify product rules without asking.
- After backend changes, run pytest.
- After frontend changes, run npm run build.
- If changing API response shape, update docs/api-contract.md and frontend types.
- Do not commit node_modules, .venv, .env, SQLite database files, or local logs.