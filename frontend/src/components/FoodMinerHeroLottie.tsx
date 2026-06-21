import { useMemo } from "react";
import { useLottie } from "lottie-react";
import animationData from "../assets/lottie/food-miner.json";

export default function FoodMinerHeroLottie() {
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const options = {
    animationData,
    autoplay: !prefersReducedMotion,
    loop: !prefersReducedMotion,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid meet",
    },
  };

  const { View } = useLottie(options, {
    width: "100%",
    height: "100%",
  });

  return (
    <div
      className="food-miner-hero-animation"
      aria-hidden="true"
    >
      {View}
    </div>
  );
}