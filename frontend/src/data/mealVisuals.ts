export interface MealVisual {
  emoji: string;
  gradient: string;
}

const DEFAULT_VISUAL: MealVisual = {
  emoji: "🍽️",
  gradient: "linear-gradient(135deg, #fff3d6, #ffd88a)",
};

const VISUALS: Record<string, MealVisual> = {
  food_korean_chicken_bowl: {
    emoji: "🍲",
    gradient: "linear-gradient(135deg, #ffe0b2, #ff8a65)",
  },
  food_japanese_protein_bento: {
    emoji: "🍱",
    gradient: "linear-gradient(135deg, #fff3e0, #ffb74d)",
  },
  food_thai_grilled_chicken: {
    emoji: "🍛",
    gradient: "linear-gradient(135deg, #ffe082, #ef6c00)",
  },
  food_italian_matchday_pizza: {
    emoji: "🍕",
    gradient: "linear-gradient(135deg, #ffecb3, #ef5350)",
  },
  food_matchday_wings: {
    emoji: "🍗",
    gradient: "linear-gradient(135deg, #ffe0b2, #d84315)",
  },
  food_bbq_protein_box: {
    emoji: "🍖",
    gradient: "linear-gradient(135deg, #d7ccc8, #8d6e63)",
  },
  food_kickoff_burger: {
    emoji: "🍔",
    gradient: "linear-gradient(135deg, #fff59d, #f57f17)",
  },
  food_mexican_tacos: {
    emoji: "🌮",
    gradient: "linear-gradient(135deg, #fff3b0, #f57c00)",
  },
  food_vietnamese_pho: {
    emoji: "🍜",
    gradient: "linear-gradient(135deg, #e8f5e9, #ffb74d)",
  },
  food_salmon_poke: {
    emoji: "🍚",
    gradient: "linear-gradient(135deg, #c8e6c9, #ff8a80)",
  },
  food_salmon_sushi: {
    emoji: "🍣",
    gradient: "linear-gradient(135deg, #ffebee, #ef5350)",
  },
  food_chinese_noodles: {
    emoji: "🥡",
    gradient: "linear-gradient(135deg, #ffccbc, #ef5350)",
  },
  food_protein_salad: {
    emoji: "🥗",
    gradient: "linear-gradient(135deg, #dcedc8, #66bb6a)",
  },
  food_greek_gyro: {
    emoji: "🥙",
    gradient: "linear-gradient(135deg, #fff8e1, #81c784)",
  },
  food_indian_curry: {
    emoji: "🍛",
    gradient: "linear-gradient(135deg, #ffe0b2, #ff7043)",
  },
  food_vegan_power_bowl: {
    emoji: "🌱",
    gradient: "linear-gradient(135deg, #e8f5e9, #43a047)",
  },
  food_berry_icecream: {
    emoji: "🍦",
    gradient: "linear-gradient(135deg, #f8bbd0, #ce93d8)",
  },
  food_matcha_boba: {
    emoji: "🧋",
    gradient: "linear-gradient(135deg, #dcedc8, #ef9a9a)",
  },
};

export function getMealVisual(assetId: string): MealVisual {
  return VISUALS[assetId] ?? DEFAULT_VISUAL;
}
