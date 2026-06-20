import type { CSSProperties } from "react";
import type { FoodGem as FoodGemType } from "../api/types";
import { resolveCategoryAsset } from "../assets/assetRegistry";
import { CATEGORY_EMOJI } from "../data/categoryVisuals";

interface FoodGemProps {
  gem: FoodGemType;
  position: { x: number; y: number; scale?: number };
  floatDelayMs?: number;
  targeted?: boolean;
  dimmed?: boolean;
  hidden?: boolean;
}

export default function FoodGem({
  gem,
  position,
  floatDelayMs = 0,
  targeted = false,
  dimmed = false,
  hidden = false,
}: FoodGemProps) {
  const style: CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%) scale(${position.scale ?? 1})`,
  };

  const orbStyle: CSSProperties = {
    animationDelay: `${floatDelayMs}ms`,
  };

  const iconUrl = resolveCategoryAsset(gem.icon_asset_id);

  const classNames = [
    "food-gem",
    `gem-${gem.gem_type}`,
    targeted ? "gem-targeted" : "",
    dimmed ? "gem-dimmed" : "",
    hidden ? "gem-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      style={style}
      data-gem-id={gem.gem_id}
      aria-label={`${gem.label} food gem`}
      aria-hidden={hidden}
    >
      <div className="gem-orb" style={orbStyle}>
        {iconUrl ? (
          <img
            className="gem-icon-image"
            src={iconUrl}
            alt=""
            aria-hidden="true"
          />
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
