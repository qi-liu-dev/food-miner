interface ViewCartBarProps {
  itemCount: number;
  priceBefore: number;
  priceAfter: number;
  onClick: () => void;
  disabled?: boolean;
}

export default function ViewCartBar({
  itemCount,
  priceBefore,
  priceAfter,
  onClick,
  disabled = false,
}: ViewCartBarProps) {
  return (
    <button
      type="button"
      className="view-cart-bar"
      onClick={onClick}
      disabled={disabled}
      aria-label={`View cart with ${itemCount} item`}
    >
      <span className="view-cart-icon" aria-hidden="true">🛒</span>

      <span className="view-cart-copy">
        <strong>View cart</strong>
        <span className="view-cart-prices">
          <del>€{priceBefore.toFixed(2)}</del>
          <b>€{priceAfter.toFixed(2)}</b>
          <small>incl. fees</small>
        </span>
      </span>

      <span className="view-cart-count" aria-label={`${itemCount} item`}>
        {itemCount}
      </span>
    </button>
  );
}
