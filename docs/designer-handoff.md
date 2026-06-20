# Designer → Developer Handoff Checklist

Designer 不需要写 HTML、React 或 CSS。请交付 developer-ready design package。

## 1. Figma pages

```text
00_Cover
01_User_Flow
02_Wireframes
03_High_Fidelity_Screens
04_Components
05_Design_System
06_Motion_Spec
07_Exportable_Assets
08_Developer_Handoff
```

Mobile frame 统一使用 `390 × 844`。

## 2. Required frames/states

```text
H01_Home_With_FoodMiner_Entry
L01_Mine_Generating
G01_Game_Ready
G02_Game_Catching
G03_Game_Gem_Attached
R01_Deal_Revealed
R02_Deal_Claiming
R03_Claim_Success
P01_Restaurant_Discount_Applied
E01_API_Error
E02_Image_Fallback
```

## 3. Dynamic Gem rule

Designer **不能**把 `Korean`、`Pizza` 等文字画死进 PNG。

每个 Gem 组件必须拆成：

```text
Gem frame
category icon slot
React-rendered text slot
optional source badge
```

Backend 会动态返回 exact category label。

Variants：

```text
FoodGem / History
FoodGem / Campaign
FoodGem / RestaurantBoost
FoodGem / Exploration
FoodGem / Caught
```

## 4. Required exported files

```text
designer-handoff/
  figma-link.txt
  prototype-demo.mp4
  design/
    design-tokens.json
    motion-spec.csv
    copydeck.csv
    asset-manifest.csv
    developer-handoff.md
  assets/
    categories/
    food/
    game/
    gems/
    icons/
    backgrounds/
```

## 5. Naming rule

Use asset IDs from backend data, converted to kebab-case:

```text
category_korean       → category-korean.svg
category_japanese     → category-japanese.svg
food_korean_chicken_bowl → food-korean-chicken-bowl.webp
```

Frontend auto-discovers these assets.

## 6. Formats

- SVG: category icons, hook, rope, gem frames, simple icons
- WebP/JPG: meal photos
- WebP/PNG: large background or transparent complex illustration
- Do not export whole UI screens as implementation assets
- Do not send font files

## 7. `asset-manifest.csv`

```csv
asset_id,file_path,usage,alt_text
category_korean,assets/categories/category-korean.svg,category_icon,Korean food
food_korean_chicken_bowl,assets/food/food-korean-chicken-bowl.webp,meal_image,Korean chicken bowl
hook,assets/game/hook.svg,game_object,Food Miner hook
```

## 8. `motion-spec.csv`

```csv
interaction,duration_ms,easing,notes
mine_loading,1300,ease-out,gems appear progressively
hook_swing,1800,ease-in-out,loop between -47 and +47 degrees
hook_extend,560,ease-out,extend to selected gem
hook_return,760,ease-in,pull attached gem upward
deal_reveal,280,ease-out,bottom sheet appears
```

## 9. Design tokens

Provide colors, typography names, sizes, spacing, radius, shadow and button states. Use Auto Layout for reusable UI components; free positioning is acceptable inside the game canvas.
