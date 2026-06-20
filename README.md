# Uber Eats Food Miner — React + FastAPI MVP

这是一个可直接运行的 hackathon scaffold，实现了当前冻结的产品逻辑：

1. Food Miner 是 Uber Eats 首页的可选入口。
2. Backend 根据 Emma 的历史订单、Uber campaign、餐厅状态动态生成 6 个 Gem。
3. Gem label **只能**来自指定 Uber Eats 分类 taxonomy。
4. 每个 Gem 在游戏生成时已经绑定一个具体 `meal + restaurant + discount`。
5. 每位用户每天只能抓一次，且前端保证必定抓中。
6. 抓到后只能 claim 当前 reveal 的 deal。
7. Claim 后跳转到对应 restaurant 页面，并显示 discount 已应用。
8. 没有积分、reroll、filter 或文字输入。

## 技术栈

- Frontend: React 19 + TypeScript + Vite + React Router
- Backend: Python + FastAPI + Pydantic
- Demo persistence: SQLite（Python 标准库）
- Tests: pytest

## 目录

```text
food-miner/
  frontend/                  React/Vite UI + game animation
  backend/                   FastAPI + recommender + state machine
  docs/                      product/API/designer handoff specs
```

## 1. 本地启动 Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # 可选
uvicorn app.main:app --reload --port 8000
```

测试：

```bash
curl http://localhost:8000/health
```

API 文档：

```text
http://localhost:8000/docs
```

## 2. 本地启动 Frontend

新 terminal：

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

浏览器：

```text
http://localhost:5173
```

## 3. 完整 demo path

```text
Home
→ Play now
→ Building Emma's Food Mine
→ 6 dynamic category gems
→ Catch once
→ Reveal one concrete meal deal
→ Claim this discount
→ Restaurant page with discount applied
```

Home 页底部有 demo-only reset 按钮，方便评委重复体验。
生产展示前可设置：

```text
VITE_DEMO_CONTROLS=false
```

## 4. 推荐系统逻辑

Backend 对具体 meal/restaurant 组合先做 hard filter：

```text
meal unavailable
restaurant unavailable
outside delivery zone
required dietary label missing
allergen conflict
restaurant cannot fund any discount
```

再计算：

```text
meal_score =
0.45 × history_affinity
+ 0.20 × campaign_fit
+ 0.15 × restaurant_need
+ 0.10 × price_fit
+ 0.10 × delivery_fit
```

之后按动态 slot 做 diversification：

```text
3 history-led categories
1 explicitly boosted new cuisine
1 wider campaign category
1 restaurant-need category
```

这只是策略槽位，不是固定 label。Gem label 是最终被选中 meal 的 `primary_category`，例如：

```text
Korean / Japanese / Thai / Italian / BBQ / Salads
```

换 user history、campaign 或餐厅 availability 后，6 个 label 会变化。

## 5. 指定 taxonomy

唯一允许的 Gem label 在：

```text
backend/app/models.py -> CategoryLabel
backend/app/data/category_catalog.json
frontend/src/api/types.ts -> CategoryLabel
```

修改 taxonomy 时，这三处必须保持同步。

## 6. Designer assets 接入

Frontend 当前用 emoji 和 gradient placeholder，因此 designer 文件没到也可开发。

Designer 交付后，将文件放到：

```text
frontend/src/assets/categories/
frontend/src/assets/food/
frontend/src/assets/game/
frontend/src/assets/gems/
```

命名必须与 backend asset ID 一致，例如：

```text
category-korean.svg
category-japanese.svg
food-korean-chicken-bowl.webp
food-italian-matchday-pizza.webp
```

`assetRegistry.ts` 会自动发现这些文件；找不到时继续使用 placeholder。

详细要求见：

```text
docs/designer-handoff.md
```

## 7. 自动测试

```bash
cd backend
pytest -q
```

目前覆盖：

- 6 个 Gem label 合法且唯一
- 推荐结果含历史偏好与 campaign
- 一天只能 catch 一次
- 相同 request id 可安全 retry
- 只能 claim caught deal
- 重复 claim 保持 idempotent
- 刷新/重进可恢复当日 session

## 8. Production build

Frontend：

```bash
cd frontend
npm run build
```

Backend：

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 9. Deployment variables

Frontend：

```text
VITE_API_BASE_URL=https://<backend-domain>
VITE_DEMO_CONTROLS=true
```

Backend：

```text
FRONTEND_ORIGINS=https://<frontend-domain>
DB_PATH=/tmp/food_miner.db
DEMO_DAY=2026-06-20      # optional; 留空则使用真实日期
```

## 10. 当前 mock demo output

在 Emma 当前 history + Matchday campaign 下，典型 board 是：

```text
Korean
Japanese
Thai
Italian
BBQ
Salads
```

这不是硬编码结果。它来自当前 mock data 和 scoring/diversification；修改 data 后会动态变化。
