import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetDemo } from "../api/client";
import type { CategoryLabel } from "../api/types";
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

export default function HomePage() {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const showDemoControls = import.meta.env.VITE_DEMO_CONTROLS !== "false";

  async function handleReset() {
    setResetting(true);
    setResetMessage(null);
    try {
      await resetDemo("emma");
      localStorage.removeItem("foodMinerGameId");
      setResetMessage("Emma's daily Food Miner session was reset.");
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  return (
    <MobileShell>
      <header className="home-header">
        <div>
          <p className="status-time">2:02</p>
          <h1>Home⌄</h1>
        </div>
        <button className="icon-button" aria-label="Notifications">♢</button>
      </header>

      <section className="food-miner-hero" aria-labelledby="food-miner-hero-title">
        <div>
          <p className="eyebrow">PERSONALIZED FOOD DISCOVERY</p>
          <h2 id="food-miner-hero-title">Food Miner</h2>
          <p>One catch. One personalized meal deal built from your order history.</p>
          <button className="dark-button" onClick={() => navigate("/miner")}>
            Play now
          </button>
        </div>
        <div className="food-miner-hero-art" aria-hidden="true">
          <span>🪝</span>
          <span>🍲</span>
          <span>🍕</span>
        </div>
      </section>

      <nav className="service-tabs" aria-label="Services">
        <button className="selected">🛍️ All</button>
        <button>🚗 Rides</button>
        <button>🍌 Grocery</button>
      </nav>

      <section className="category-strip" aria-label="Food categories">
        {FEATURED_CATEGORIES.map((category) => (
          <button key={category} className="category-item">
            <span>{CATEGORY_EMOJI[category]}</span>
            <small>{category}</small>
          </button>
        ))}
      </section>


      <section className="filter-row" aria-label="Order filters">
        <span>Pickup</span>
        <span>Delivery fee⌄</span>
        <span>Under 30 min</span>
      </section>

      <section className="restaurant-preview">
        <h2>Popular near Emma</h2>
        <div className="restaurant-placeholder-grid">
          <article><span>🍲</span><strong>Seoul Kickoff Kitchen</strong><small>24 min · Korean</small></article>
          <article><span>🍕</span><strong>Forza Pizza</strong><small>28 min · Italian</small></article>
        </div>
      </section>

      {showDemoControls && (
        <section className="demo-controls">
          <p><strong>Demo control</strong> — reset Emma so judges can replay.</p>
          <button onClick={handleReset} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset daily session"}
          </button>
          {resetMessage && <small>{resetMessage}</small>}
        </section>
      )}
    </MobileShell>
  );
}
