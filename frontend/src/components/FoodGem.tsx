import type { CSSProperties } from "react";
import type { FoodGem as FoodGemType } from "../api/types";
import { CATEGORY_EMOJI } from "../data/categoryVisuals";
import { resolveCategoryAsset } from "../assets/assetRegistry";

interface FoodGemProps {
  gem: FoodGemType;
  position: { x: number; y: number; scale?: number };
  hidden?: boolean;
}

export default function FoodGem({ gem, position, hidden = false }: FoodGemProps) {
  const style: CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%) scale(${position.scale ?? 1})`,
  };

  const iconUrl = resolveCategoryAsset(gem.icon_asset_id);

  return (
    <div
      className={`food-gem gem-${gem.gem_type} ${hidden ? "gem-hidden" : ""}`}
      style={style}
      data-gem-id={gem.gem_id}
      aria-label={`${gem.label} food gem`}
    >
      <div className="gem-orb">
        {iconUrl ? (
          <img className="gem-icon-image" src={iconUrl} alt="" aria-hidden="true" />
        ) : (
          <span className="gem-emoji" aria-hidden="true">
            {CATEGORY_EMOJI[gem.label]}
          </span>
        )}
      </div>
      <span className="gem-label">{gem.label}</span>
    </div>
  );
}
