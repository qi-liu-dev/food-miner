import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useLottie } from "lottie-react";

import animationData from "../assets/lottie/food-mine-loading.json";

interface MineGeneratingOverlayProps {
  onComplete: () => void;
  onBack: () => void;
}

interface LottieMetadata {
  fr?: number;
  ip?: number;
  op?: number;
}

const ANIMATION_SPEED = 2;
const REDUCED_MOTION_DELAY_MS = 450;
const FALLBACK_BUFFER_MS = 800;

function getAnimationDurationMs(): number {
  const metadata =
    animationData as unknown as LottieMetadata;

  const frameRate = metadata.fr ?? 30;
  const startFrame = metadata.ip ?? 0;
  const endFrame = metadata.op ?? 150;

  if (
    frameRate <= 0 ||
    endFrame <= startFrame
  ) {
    return 4_000;
  }

  const durationAtNormalSpeed =
    ((endFrame - startFrame) / frameRate) *
    1_000;

  return durationAtNormalSpeed / ANIMATION_SPEED;
}

export default function MineGeneratingOverlay({
  onComplete,
  onBack,
}: MineGeneratingOverlayProps) {
  const completedRef = useRef(false);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
    [],
  );

  const completeOnce = useCallback(() => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  const options = useMemo(
    () => ({
      animationData,
      autoplay: !prefersReducedMotion,
      loop: false,

      // 让 lottie-react 自己管理 complete listener。
      onComplete: completeOnce,

      rendererSettings: {
        preserveAspectRatio:
          "xMidYMid slice",
      },
    }),
    [
      completeOnce,
      prefersReducedMotion,
    ],
  );

  const {
    View,
    setSpeed,
    goToAndStop,
  } = useLottie(options, {
    width: "100%",
    height: "100%",
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      goToAndStop(0, true);
      return;
    }

    setSpeed(ANIMATION_SPEED);
  }, [
    goToAndStop,
    prefersReducedMotion,
    setSpeed,
  ]);

  /*
   * 后备计时器：
   * 即使某些浏览器没有触发 Lottie complete，
   * 页面也会自动进入游戏，不会一直停留。
   *
   * completeOnce 会防止 callback 被调用两次。
   */
  useEffect(() => {
    const delay = prefersReducedMotion
      ? REDUCED_MOTION_DELAY_MS
      : getAnimationDurationMs() +
        FALLBACK_BUFFER_MS;

    const timer = window.setTimeout(
      completeOnce,
      delay,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    completeOnce,
    prefersReducedMotion,
  ]);

  return (
    <section
      className="mine-loading-screen"
      aria-label="Building Emma's Food Mine"
    >
      <div
        className="mine-loading-animation"
        aria-hidden="true"
      >
        {View}
      </div>

      <button
        className="mine-loading-back-hitbox"
        type="button"
        onClick={onBack}
        aria-label="Back to Uber Eats"
      >
        <span className="sr-only">
          Back to Uber Eats
        </span>
      </button>

      <p
        className="sr-only"
        role="status"
        aria-live="polite"
      >
        Building Emma&apos;s personalized
        Food Mine.
      </p>
    </section>
  );
}