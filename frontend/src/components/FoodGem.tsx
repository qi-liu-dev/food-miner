import type { CSSProperties } from "react";
import type { FoodGem as FoodGemType } from "../api/types";
import gemCardDefaultUrl from "../assets/gems/gem-card-default.svg";
import gemCardSelectedUrl from "../assets/gems/gem-card-selected.svg";
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

type GemStyle = CSSProperties & {
  "--gem-scale": string;
  "--gem-delay": string;
};

export default function FoodGem({
  gem,
  position,
  floatDelayMs = 0,
  targeted = false,
  dimmed = false,
  hidden = false,
}: FoodGemProps) {
  const style: GemStyle = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    "--gem-scale": String(position.scale ?? 1),
    "--gem-delay": `${floatDelayMs}ms`,
  };

  const iconUrl = resolveCategoryAsset(gem.icon_asset_id);
  const frameUrl = targeted
    ? gemCardSelectedUrl
    : gemCardDefaultUrl;

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
      aria-label={`${gem.label} food deal`}
      aria-hidden={hidden}
    >
      <div className="gem-card-hitbox">
        <img
          src={frameUrl}
          alt=""
          className="gem-card-frame"
          aria-hidden="true"
          draggable={false}
        />

        <div className="gem-card-icon" aria-hidden="true">
          {iconUrl ? (
            <img
              className="gem-card-icon-image"
              src={iconUrl}
              alt=""
              draggable={false}
            />
          ) : (
            <span className="gem-card-emoji">
              {CATEGORY_EMOJI[gem.label]}
            </span>
          )}
        </div>

        <span className="gem-card-label">{gem.label}</span>
      </div>
    </div>
  );
}
