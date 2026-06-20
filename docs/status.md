# Current status

## Implemented
- React + Vite frontend runs locally at http://localhost:5173
- FastAPI backend runs locally at http://localhost:8000
- Home page exists
- Food Miner hero has been moved to the top of home page
- Button text should be Play now
- Miner flow exists:
  Home -> Miner -> Catch -> Deal reveal -> Claim -> Restaurant
- Backend dynamically generates 6 Gems from recommendation logic
- Gem labels must use allowed Uber Eats category labels
- Single-catch rule is implemented
- Claim redirects to restaurant page
- Demo reset endpoint exists

## Recent issue
Chrome Console does not show API calls because API requests appear in the Network tab, under Fetch/XHR.

## Current next tasks
1. Confirm frontend and backend both run locally.
2. Check Home hero UI and text.
3. Check API calls in Network tab.
4. Improve UI according to designer Figma.
5. Replace placeholder assets with designer assets.
6. Prepare deploy to Render and Vercel.

## Do not do
- Do not add points.
- Do not add multiple catches.
- Do not add reroll.
- Do not add user filter chips.
- Do not let user claim any deal except the caught one.