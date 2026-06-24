# Uber Eats Food Miner

A gamified, personalized meal-discovery prototype built for the **Hack4Her Uber Eats Oracle challenge**.

Food Miner helps an already logged-in Uber Eats user quickly decide what to eat. The backend generates six personalized food-category Gems from the user’s order history, Uber campaign priorities, restaurant availability, and restaurant-side promotion needs. The user watches the hook, catches one Gem, reveals one concrete restaurant deal, claims that deal, and completes a simplified order flow.

## Demo

[Watch the Food Miner demo on Google Drive](https://drive.google.com/file/d/1r0u-v4Y-Js3-Pr7K-YvIEEwhYUEG8i_g/view)

## Final Product Rules

1. Food Miner is an optional entry point on the Uber Eats home page.
2. The backend dynamically generates six personalized Food Gems.
3. Gem labels must come from the approved Uber Eats category taxonomy.
4. Every Gem is bound to one concrete `meal + restaurant + feasible discount` before the game starts.
5. Each user can catch only once per daily session.
6. The catch is guaranteed to succeed; there are no empty outcomes.
7. The user can only claim the deal attached to the caught Gem.
8. Claiming the deal opens the corresponding restaurant and adds the recommended item to the cart.
9. The user can review the cart, place the order, see a short confirmation, and return to the home page.
10. A successfully placed order is stored in runtime order history and can influence future recommendations.
11. There are no points, rerolls, filters, or text input.

## Demo Persona

The prototype simulates an existing Uber Eats user:

```text
User: Emma
Favorite cuisines: Korean, Japanese, Thai
Frequent preference: High-protein meals
Average order value: About €14
Usual delivery tolerance: Within 30 minutes
```

Current mock Uber campaign signals include:

```text
Matchday categories: Pizza, Wings, BBQ, Fast Food
Boost quiet-hour restaurants
Boost newly launched Italian restaurants
```

## End-to-End Demo Flow

```text
Home
→ Play now
→ Personalized loading animation
→ Six dynamic category Gems
→ Watch the hook and Catch once
→ Selected Gem animation
→ Reveal one concrete meal deal
→ Claim this discount
→ Restaurant page with the item already added
→ View cart
→ Order Summary
→ Place order
→ Order confirmed
→ Return to Home
```

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Lottie animations
- CSS-based hook movement, collision targeting, attachment, and retrieval animation

### Backend

- Python
- FastAPI
- Pydantic
- SQLite through the Python standard library
- Lightweight content-, context-, campaign-, and restaurant-aware recommendation logic

### Testing

- pytest
- TypeScript production build through `npm run build`

## Architecture

```text
React / Vite frontend
        ↓ HTTP API
FastAPI backend
        ↓
Recommendation and discount engines
        ↓
Static mock catalog JSON + SQLite runtime state
```

The current hackathon AWS target is:

```text
AWS Amplify Hosting
        ↓ HTTPS
Amazon ECS Express Mode
FastAPI container on Fargate
        ↓
SQLite in temporary task storage
```

SQLite is acceptable for the hackathon demo, but task replacement or redeployment can clear runtime state. A production version should move sessions and orders to DynamoDB.

## Recommendation Pipeline

The recommender operates on concrete meal and restaurant candidates before the game is displayed.

### 1. Build Emma’s preference profile

The backend combines seeded order history with completed runtime orders to estimate:

- cuisine affinity
- high-protein affinity
- price preference
- delivery-time preference
- recent category behavior

### 2. Apply hard filters

Candidates are removed when any of the following is true:

```text
meal unavailable
restaurant unavailable
outside delivery zone
required dietary label missing
allergen conflict
restaurant cannot fund a discount
```

### 3. Score eligible candidates

```text
meal_score =
0.45 × history_affinity
+ 0.20 × campaign_fit
+ 0.15 × restaurant_need
+ 0.10 × price_fit
+ 0.10 × delivery_fit
```

### 4. Diversify the board

The backend does not simply return the six highest-scoring meals. It selects a varied set of candidate deals, such as:

```text
history-led categories
high-protein match
history × campaign match
new promoted cuisine
quiet-hour restaurant
broader exploration or restaurant-need category
```

### 5. Create Gems

Each selected deal is converted into a Gem:

```text
Gem label shown to the user
→ hidden deal ID
→ meal ID
→ restaurant ID
→ feasible discount
```

The catch endpoint does not run recommendation again. It only reveals the deal already attached to the caught Gem.

## Approved Gem Taxonomy

Gem labels must be one of:

```text
Sushi
Asian
Chicken
Healthy
Mexican
Pizza
Burgers
Fast Food
Chinese
Ice Cream
Wings
Vietnamese
Thai
Greek
Desserts
Poke
Coffee
Indian
Korean
Italian
Japanese
Bakery
Bubble Tea
Taiwanese
Halal
Soup
Vegan
American
BBQ
Breakfast
Salads
Seafood
Sandwiches
Street Food
Comfort Food
Caribbean
Hawaiian
```

The taxonomy must remain synchronized across:

```text
backend/app/models.py
backend/app/data/category_catalog.json
frontend/src/api/types.ts
```

## Game and Order State Machine

```text
READY
→ CAUGHT
→ CLAIMED
→ ORDERED
```

- `READY`: The six Gems exist and the user has not caught one.
- `CAUGHT`: One Gem has been caught and its bound deal has been revealed.
- `CLAIMED`: The revealed discount has been activated and the item is available in the cart.
- `ORDERED`: The user placed the order successfully.

Repeated catch, claim, and place-order requests are handled safely to prevent duplicate actions.

## Project Structure

```text
food-miner/
├── README.md
├── docs/
│   ├── product-spec.md
│   ├── api-contract.md
│   ├── data-dictionary.md
│   ├── designer-handoff.md
│   ├── cart-order-flow.md
│   └── demo-script.md
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   │   ├── categories/
│   │   │   ├── food/
│   │   │   ├── game/
│   │   │   ├── gems/
│   │   │   └── lottie/
│   │   ├── components/
│   │   ├── data/
│   │   ├── pages/
│   │   ├── state/
│   │   └── styles/
│   └── package.json
│
└── backend/
    ├── app/
    │   ├── data/
    │   ├── repositories/
    │   ├── services/
    │   ├── main.py
    │   └── models.py
    ├── tests/
    └── requirements.txt
```

## Backend Data Files

Static mock business data lives in `backend/app/data/`.

| File | Purpose |
|---|---|
| `users.json` | Demo user identity and hard profile fields |
| `order_history.json` | Seed order history used to build Emma’s preferences |
| `meals.json` | Meal metadata, categories, tags, prices, images, and availability |
| `restaurants.json` | Restaurant status, delivery eligibility, promotion limits, and campaign metadata |
| `campaigns.json` | Current Uber campaign priorities |
| `game_config.json` | Number of Gems, single-catch rules, and claim limits |
| `category_catalog.json` | Valid Gem labels and category asset IDs |

Runtime sessions and completed orders are stored in SQLite. The JSON files are seed data and should not be modified during normal API requests.

## Local Prerequisites

- Python 3.12 or 3.13 recommended
- A recent Node.js version compatible with the installed Vite version
- npm

## Run the Backend Locally

On macOS or Linux:

```bash
cd backend

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

cp -n .env.example .env

python -m uvicorn app.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

## Run the Frontend Locally

Open another terminal:

```bash
cd frontend

npm install
cp -n .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:5173
```

## Environment Variables

### Frontend

Local example:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_DEMO_CONTROLS=true
```

For a public hackathon deployment:

```env
VITE_API_BASE_URL=https://<backend-domain>
VITE_DEMO_CONTROLS=false
```

All `VITE_` values are included in the browser bundle. Never place secrets in frontend environment variables.

### Backend

Local example:

```env
FRONTEND_ORIGINS=http://localhost:5173
DB_PATH=./food_miner.db
```

AWS demo example:

```env
FRONTEND_ORIGINS=https://<amplify-domain>
DB_PATH=/tmp/food-miner/food_miner.db
```

Optional deterministic demo date:

```env
DEMO_DAY=2026-06-20
```

Leave `DEMO_DAY` unset to use the actual date.

## Important API Endpoints

```text
GET  /health
POST /api/game-sessions
POST /api/game-sessions/{game_id}/catch
POST /api/game-sessions/{game_id}/claim
GET  /api/game-sessions/{game_id}/cart
POST /api/game-sessions/{game_id}/place-order
GET  /api/users/{user_id}/order-history
GET  /api/restaurants/{restaurant_id}
POST /api/demo/reset
```

## Reset the Demo

Emma can catch only once per daily session. Reset before a judging demo:

```bash
curl -X POST http://localhost:8000/api/demo/reset \
  -H "Content-Type: application/json" \
  -d '{"user_id":"emma"}'
```

The reset removes demo-created sessions and runtime orders while preserving the seeded history in `order_history.json`.

## Tests and Production Builds

### Backend tests

```bash
cd backend
source .venv/bin/activate
python -m pytest -q
```

Tests should cover:

- six valid and unique Gem labels
- recommendation relevance and diversity
- hard-filter behavior
- one catch per daily session
- safe retry with the same request ID
- claim restricted to the caught deal
- idempotent claim and order placement
- runtime order history updates

### Frontend production build

```bash
cd frontend
npm run build
```

The build output is generated in:

```text
frontend/dist/
```

## Designer Asset Integration

The frontend supports designer-provided assets with fallback visuals.

Recommended locations:

```text
frontend/src/assets/lottie/
  food-miner.json
  food-mine-loading.json

frontend/src/assets/game/
  catch-field.svg
  cat-idle.svg
  cat-excited.svg
  hook-head.svg

frontend/src/assets/gems/
  gem-card-default.svg
  gem-card-selected.svg

frontend/src/assets/categories/
  category-korean.png
  category-japanese.png
  category-thai.png
  ...

frontend/src/assets/food/
  food-korean-chicken-bowl.webp
  ...
```

Naming must match backend asset IDs. For example:

```text
category_korean
→ category-korean.png

food_korean_chicken_bowl
→ food-korean-chicken-bowl.webp
```

Gem labels must remain React text. Do not bake dynamic labels such as `Korean`, `Italian`, or `BBQ` directly into Gem SVG files.

## AWS Hackathon Deployment

The time-boxed demo deployment uses:

```text
Frontend: AWS Amplify Hosting
Backend: Amazon ECS Express Mode
Container image: Amazon ECR
Runtime state: SQLite in one ECS task
```

Recommended ECS settings:

```text
Container port: 8080
Health check: /health
Minimum tasks: 1
Maximum tasks: 1
DB_PATH: /tmp/food-miner/food_miner.db
```

This is a demo-only persistence strategy. A durable, multi-user production deployment should use DynamoDB for sessions and orders.

## Current Limitations

- The prototype assumes Emma is already authenticated; there is no separate login flow.
- Public viewers currently share the Emma persona unless viewer isolation is added.
- SQLite state can be lost when an ECS task is replaced or redeployed.
- Restaurant, campaign, meal, pricing, and delivery data are mock data.
- Checkout is a simplified prototype and does not process real payments.
- The reset endpoint is intended for demo use only.

## One-Sentence Pitch

> Food Miner turns Uber Eats decision fatigue into one fast, personalized game: the recommender builds six relevant restaurant deals, the user catches one, and the winning discount carries directly into checkout.
