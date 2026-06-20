import type { CandidateDeal } from "../api/types";
import { getMealVisual } from "../data/mealVisuals";
import { resolveFoodAsset } from "../assets/assetRegistry";

interface DealRevealSheetProps {
  deal: CandidateDeal;
  claiming: boolean;
  onClaim: () => void;
  onExit: () => void;
}

export default function DealRevealSheet({
  deal,
  claiming,
  onClaim,
  onExit,
}: DealRevealSheetProps) {
  const visual = getMealVisual(deal.image_asset_id);
  const imageUrl = resolveFoodAsset(deal.image_asset_id);
  return (
    <div className="sheet-backdrop">
      <section className="deal-sheet" aria-labelledby="deal-title">
        <div
          className="meal-hero"
          style={{ background: visual.gradient }}
          aria-label={deal.meal_name}
        >
          {imageUrl ? (
            <img className="meal-hero-image" src={imageUrl} alt={deal.meal_name} />
          ) : (
            <span>{visual.emoji}</span>
          )}
          <div className="discount-sticker">-{deal.discount_percent}%</div>
        </div>
        <p className="eyebrow">YOU CAUGHT {deal.primary_category.toUpperCase()}</p>
        <h2 id="deal-title">{deal.meal_name}</h2>
        <p className="restaurant-name">{deal.restaurant_name}</p>
        <div className="deal-facts">
          <span>{deal.delivery_minutes} min</span>
          <span>€{deal.price_after.toFixed(2)}</span>
          <del>€{deal.price_before.toFixed(2)}</del>
        </div>

        <div className="why-card">
          <h3>Why this fits Emma</h3>
          {deal.why_this.map((reason) => (
            <p key={reason}>✓ {reason}</p>
          ))}
        </div>

        <p className="restaurant-reason">{deal.restaurant_reason}</p>

        <button className="primary-button" disabled={claiming} onClick={onClaim}>
          {claiming ? "Applying discount…" : "Claim this discount"}
        </button>
        <button className="text-button" disabled={claiming} onClick={onExit}>
          Back to Uber Eats
        </button>
      </section>
    </div>
  );
}
