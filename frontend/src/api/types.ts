export type CategoryLabel =
  | "Sushi"
  | "Asian"
  | "Chicken"
  | "Healthy"
  | "Mexican"
  | "Pizza"
  | "Burgers"
  | "Fast Food"
  | "Chinese"
  | "Ice Cream"
  | "Wings"
  | "Vietnamese"
  | "Thai"
  | "Greek"
  | "Desserts"
  | "Poke"
  | "Coffee"
  | "Indian"
  | "Korean"
  | "Italian"
  | "Japanese"
  | "Bakery"
  | "Bubble Tea"
  | "Taiwanese"
  | "Halal"
  | "Soup"
  | "Vegan"
  | "American"
  | "BBQ"
  | "Breakfast"
  | "Salads"
  | "Seafood"
  | "Sandwiches"
  | "Street Food"
  | "Comfort Food"
  | "Caribbean"
  | "Hawaiian";

export type GemType =
  | "history"
  | "campaign"
  | "restaurant_boost"
  | "exploration";

export type SessionStatus = "READY" | "CAUGHT" | "CLAIMED";

export interface FoodGem {
  gem_id: string;
  label: CategoryLabel;
  gem_type: GemType;
  category_id: string;
  icon_asset_id: string;
}

export interface ScoreBreakdown {
  history_affinity: number;
  campaign_fit: number;
  restaurant_need: number;
  price_fit: number;
  delivery_fit: number;
  total: number;
}

export interface CandidateDeal {
  deal_id: string;
  meal_id: string;
  restaurant_id: string;
  meal_name: string;
  restaurant_name: string;
  primary_category: CategoryLabel;
  categories: CategoryLabel[];
  tags: string[];
  image_asset_id: string;
  price_before: number;
  price_after: number;
  discount_percent: number;
  delivery_minutes: number;
  score: ScoreBreakdown;
  why_this: string[];
  restaurant_reason: string;
}

export interface GameSessionResponse {
  game_id: string;
  status: SessionStatus;
  user: {
    user_id: string;
    display_name: string;
  };
  personalization_summary: string[];
  gems: FoodGem[];
  revealed_deal: CandidateDeal | null;
  redirect_path: string | null;
}

export interface CatchResponse {
  game_id: string;
  status: SessionStatus;
  caught_gem_id: string;
  deal: CandidateDeal;
}

export interface ClaimResponse {
  game_id: string;
  status: SessionStatus;
  restaurant_id: string;
  discount_token: string;
  redirect_path: string;
}

export interface RestaurantPageResponse {
  restaurant_id: string;
  restaurant_name: string;
  primary_category: CategoryLabel;
  discount_percent: number | null;
  discount_applied: boolean;
  recommended_meal_id: string | null;
  menu: Array<{
    meal_id: string;
    name: string;
    image_asset_id: string;
    price_eur: number;
    discounted_price_eur: number | null;
    is_recommended: boolean;
  }>;
}
