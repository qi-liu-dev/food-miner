import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { resetDemo } from "../api/client";
import type { CategoryLabel } from "../api/types";

import FoodMinerHeroLottie from "../components/FoodMinerHeroLottie";
import MobileShell from "../components/MobileShell";
import { CATEGORY_EMOJI } from "../data/categoryVisuals";

const FEATURED_CATEGORIES: CategoryLabel[] = [
  "Fast Food",
  "Pizza",
  "Healthy",
  "Wings",
  "Korean",
  "Japanese",
  "Thai",
  "Italian",
  "BBQ",
  "Sushi",
];

interface HomeLocationState {
  orderPlaced?: boolean;
  mealName?: string;
  estimatedDelivery?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [orderToast, setOrderToast] = useState<string | null>(null);

  const showDemoControls =
    import.meta.env.VITE_DEMO_CONTROLS !== "false";

  useEffect(() => {
    const state = location.state as HomeLocationState | null;

    if (!state?.orderPlaced) {
      return;
    }

    setOrderToast(
      `${state.mealName ?? "Order"} placed · arriving in ${
        state.estimatedDelivery ?? "20–30 min"
      }`,
    );

    // 清除 navigation state，避免刷新页面后重复显示 toast。
    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!orderToast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setOrderToast(null);
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [orderToast]);

  async function handleReset() {
    setResetting(true);
    setResetMessage(null);
    setOrderToast(null);

    try {
      await resetDemo("emma");

      localStorage.removeItem("foodMinerGameId");

      setResetMessage(
        "Emma's Food Miner session and demo order were reset.",
      );
    } catch (error) {
      setResetMessage(
        error instanceof Error
          ? error.message
          : "Reset failed",
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <MobileShell>
      {orderToast && (
        <div className="home-order-toast" role="status">
          <span aria-hidden="true">✓</span>
          <p>{orderToast}</p>
        </div>
      )}

      <section
        className="food-miner-hero food-miner-hero--animated"
        aria-labelledby="food-miner-hero-title"
      >
        <h1
          id="food-miner-hero-title"
          className="sr-only"
        >
          Food Miner
        </h1>

        <FoodMinerHeroLottie />

        <button
          className="food-miner-hero-play"
          type="button"
          onClick={() => navigate("/miner")}
          aria-label="Play Food Miner"
        >
          Play now
        </button>
      </section>

      <nav className="service-tabs" aria-label="Services">
        <button
          className="selected"
          type="button"
        >
          🛍️ All
        </button>

        <button type="button">
          🚗 Rides
        </button>

        <button type="button">
          🍌 Grocery
        </button>
      </nav>

      <section
        className="category-strip"
        aria-label="Food categories"
      >
        {FEATURED_CATEGORIES.map((category) => (
          <button
            key={category}
            className="category-item"
            type="button"
          >
            <span aria-hidden="true">
              {CATEGORY_EMOJI[category]}
            </span>

            <small>{category}</small>
          </button>
        ))}
      </section>

      <section
        className="filter-row"
        aria-label="Order filters"
      >
        <span>Pickup</span>
        <span>Delivery fee⌄</span>
        <span>Under 30 min</span>
      </section>

      <section className="restaurant-preview">
        <h2>Popular near Emma</h2>

        <div className="restaurant-placeholder-grid">
          <article>
            <span aria-hidden="true">🍲</span>
            <strong>Seoul Kickoff Kitchen</strong>
            <small>24 min · Korean</small>
          </article>

          <article>
            <span aria-hidden="true">🍕</span>
            <strong>Forza Pizza</strong>
            <small>28 min · Italian</small>
          </article>
        </div>
      </section>

      {showDemoControls && (
        <section className="demo-controls">
          <p>
            <strong>Demo control</strong>
            {" — "}
            reset Emma so judges can replay.
          </p>

          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
          >
            {resetting
              ? "Resetting…"
              : "Reset daily session"}
          </button>

          {resetMessage && (
            <small>{resetMessage}</small>
          )}
        </section>
      )}
    </MobileShell>
  );
}