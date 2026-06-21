import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCart, placeOrder } from "../api/client";
import type { CartResponse, PlaceOrderResponse } from "../api/types";
import ErrorState from "../components/ErrorState";
import MobileShell from "../components/MobileShell";
import { resolveFoodAsset } from "../assets/assetRegistry";
import { getMealVisual } from "../data/mealVisuals";

function formatMoney(value: number) {
  return `€${value.toFixed(2)}`;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const redirectTimer = useRef<number | null>(null);

  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<PlaceOrderResponse | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current != null) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gameId) {
      setError("Missing Food Miner game id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    void getCart(gameId)
      .then(setCart)
      .catch((caughtError) =>
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load cart",
        ),
      )
      .finally(() => setLoading(false));
  }, [gameId]);

  async function handlePlaceOrder() {
    if (!gameId || placing) return;

    setPlacing(true);
    setError(null);

    try {
      const response = await placeOrder(gameId);
      setConfirmation(response);
      localStorage.removeItem("foodMinerGameId");

      redirectTimer.current = window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 1600);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to place order",
      );
    } finally {
      setPlacing(false);
    }
  }

  if (error && !cart) {
    return (
      <MobileShell>
        <ErrorState message={error} onHome={() => navigate("/")} />
      </MobileShell>
    );
  }

  if (loading || !cart) {
    return (
      <MobileShell>
        <div className="cart-loading">Loading your cart…</div>
      </MobileShell>
    );
  }
  if (confirmation) {
  return (
    <MobileShell className="order-confirmation-shell">
      <main
        className="order-confirmation-only"
        role="status"
        aria-live="polite"
      >
        <div
          className="order-confirmation-check"
          aria-hidden="true"
        >
          ✓
        </div>

        <p className="order-confirmation-title">
          ORDER CONFIRMED
        </p>
      </main>
    </MobileShell>
  );
}

  const visual = getMealVisual(cart.item.image_asset_id);
  const imageUrl = resolveFoodAsset(cart.item.image_asset_id);

  return (
    <MobileShell className="cart-shell">
      <header className="cart-header">
        <button
          className="icon-button"
          onClick={() => navigate(-1)}
          aria-label="Back to restaurant"
        >
          ←
        </button>
        <div>
          <h1>Order Summary</h1>
          <p>{cart.restaurant.name}</p>
        </div>
        <span className="cart-header-spacer" aria-hidden="true" />
      </header>

      <main className="cart-content">
        <article className="cart-item-card">
          <div
            className="cart-item-image"
            style={{ background: visual.gradient }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt={cart.item.name} />
            ) : (
              <span>{visual.emoji}</span>
            )}
          </div>

          <div className="cart-item-copy">
            <h2>{cart.item.name}</h2>
            <p>Food Miner recommendation</p>
            <strong>{formatMoney(cart.item.price_after)}</strong>
            <del>{formatMoney(cart.item.price_before)}</del>
          </div>

          <div className="cart-quantity-pill" aria-label="Quantity 1">
            <span>1</span>
          </div>
        </article>

        <section className="cart-savings-banner">
          <svg
            aria-hidden="true"
            className="cart-savings-icon"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path
              d="M4.5 5.8C4.5 5.08 5.08 4.5 5.8 4.5h6.7c.34 0 .66.13.9.37l6.23 6.23a1.3 1.3 0 0 1 0 1.84l-6.69 6.69a1.3 1.3 0 0 1-1.84 0L4.87 13.4a1.3 1.3 0 0 1-.37-.9V5.8Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinejoin="round"
            />
            <circle cx="8.4" cy="8.4" r="1.45" fill="currentColor" />
          </svg>
          <strong>
            Saving {formatMoney(cart.item.discount_amount)} with Food Miner
          </strong>
        </section>

        <section className="cart-totals" aria-label="Order totals">
          <h2>Summary</h2>

          <dl>
            <div>
              <dt>Item subtotal</dt>
              <dd>{formatMoney(cart.item.price_before)}</dd>
            </div>
            <div className="discount-line">
              <dt>Food Miner discount ({cart.item.discount_percent}%)</dt>
              <dd>−{formatMoney(cart.item.discount_amount)}</dd>
            </div>
            <div>
              <dt>Delivery fee</dt>
              <dd>{formatMoney(cart.fees.delivery_fee)}</dd>
            </div>
            <div>
              <dt>Service fee</dt>
              <dd>{formatMoney(cart.fees.service_fee)}</dd>
            </div>
            <div className="cart-grand-total">
              <dt>Total</dt>
              <dd>{formatMoney(cart.total)}</dd>
            </div>
          </dl>
        </section>

        {error && (
          <div className="page-error" role="alert">
            {error}
          </div>
        )}
      </main>

      <footer className="place-order-dock">
        <button
          className="place-order-button"
          disabled={placing || confirmation != null}
          onClick={() => void handlePlaceOrder()}
        >
          {placing
            ? "Placing order…"
            : confirmation
              ? "Order placed"
              : "Place order"}
        </button>
      </footer>

    </MobileShell>
  );
}
