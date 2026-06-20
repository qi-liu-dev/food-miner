import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getRestaurant } from "../api/client";
import type { RestaurantPageResponse } from "../api/types";
import ErrorState from "../components/ErrorState";
import MobileShell from "../components/MobileShell";
import { CATEGORY_EMOJI } from "../data/categoryVisuals";
import { getMealVisual } from "../data/mealVisuals";
import { resolveFoodAsset } from "../assets/assetRegistry";

export default function RestaurantPage() {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const [restaurant, setRestaurant] = useState<RestaurantPageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    void getRestaurant(restaurantId, searchParams.get("deal"))
      .then(setRestaurant)
      .catch((caughtError) =>
        setError(caughtError instanceof Error ? caughtError.message : "Unable to load restaurant"),
      );
  }, [restaurantId, searchParams]);

  if (error) {
    return (
      <MobileShell>
        <ErrorState message={error} onHome={() => navigate("/")} />
      </MobileShell>
    );
  }

  if (!restaurant) {
    return (
      <MobileShell>
        <div className="restaurant-loading">Loading restaurant…</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <header className="restaurant-header">
        <button className="icon-button" onClick={() => navigate("/")} aria-label="Back">←</button>
        <button className="icon-button" aria-label="Favourite">♡</button>
      </header>

      <section className="restaurant-hero">
        <span>{CATEGORY_EMOJI[restaurant.primary_category]}</span>
        <div>
          <p className="eyebrow">{restaurant.primary_category}</p>
          <h1>{restaurant.restaurant_name}</h1>
          <p>4.7 ★ · 0.8 km · 20–30 min</p>
        </div>
      </section>

      {restaurant.discount_applied && (
        <section className="discount-applied-banner">
          <span>✓</span>
          <div>
            <strong>Food Miner discount applied</strong>
            <p>{restaurant.discount_percent}% off Emma&apos;s recommended meal.</p>
          </div>
        </section>
      )}

      <section className="menu-section">
        <h2>Menu</h2>
        {restaurant.menu.map((meal) => {
          const visual = getMealVisual(meal.image_asset_id);
          const imageUrl = resolveFoodAsset(meal.image_asset_id);
          return (
            <article
              key={meal.meal_id}
              className={`menu-item ${meal.is_recommended ? "recommended" : ""}`}
            >
              <div className="menu-copy">
                {meal.is_recommended && <span className="recommended-badge">Your Food Miner pick</span>}
                <h3>{meal.name}</h3>
                <p>Popular · prepared fresh</p>
                <div className="menu-price">
                  {meal.discounted_price_eur != null ? (
                    <>
                      <strong>€{meal.discounted_price_eur.toFixed(2)}</strong>
                      <del>€{meal.price_eur.toFixed(2)}</del>
                    </>
                  ) : (
                    <strong>€{meal.price_eur.toFixed(2)}</strong>
                  )}
                </div>
                <button className="add-button">Add</button>
              </div>
              <div className="menu-image" style={{ background: visual.gradient }}>
                {imageUrl ? (
                  <img src={imageUrl} alt={meal.name} />
                ) : (
                  <span>{visual.emoji}</span>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <button
        className="sticky-order-button"
        onClick={() => window.alert("Mock checkout: the Food Miner discount remains applied.")}
      >
        View order
      </button>
    </MobileShell>
  );
}
