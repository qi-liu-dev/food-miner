import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CatchResponse, FoodGem } from "../api/types";
import { resolveCategoryAsset } from "../assets/assetRegistry";
import { CATEGORY_EMOJI } from "../data/categoryVisuals";
import FoodGemView from "./FoodGem";

interface GameCanvasProps {
  gems: FoodGem[];
  onCatch: (
    gemId: string,
    requestId: string,
  ) => Promise<CatchResponse>;
  onReveal: (response: CatchResponse) => void;
}

const GEM_POSITIONS = [
  { x: 12, y: 56, scale: 1.05 },
  { x: 29, y: 78, scale: 0.92 },
  { x: 43, y: 53, scale: 0.98 },
  { x: 59, y: 76, scale: 1.03 },
  { x: 75, y: 54, scale: 0.94 },
  { x: 90, y: 73, scale: 1.02 },
];

const INITIAL_ROPE_LENGTH = 74;
const HOOK_ORIGIN_Y = 20;

const NORMAL_MOTION = {
  lock: 130,
  extend: 470,
  attach: 170,
  retract: 1080,
  arrive: 170,
} as const;

const REDUCED_MOTION = {
  lock: 0,
  extend: 80,
  attach: 0,
  retract: 120,
  arrive: 0,
} as const;

type AnimationPhase =
  | "ready"
  | "locking"
  | "extending"
  | "attached"
  | "retracting"
  | "verifying"
  | "done";

interface PendingCatch {
  gem: FoodGem;
  requestId: string;
}

interface GemTarget {
  gem: FoodGem;
  angle: number;
  ropeLength: number;
}

interface PathCandidate extends GemTarget {
  alongPath: number;
  distanceToPath: number;
  hitRadius: number;
  intersectsPath: boolean;
  firstContactDistance: number;
}

const BUTTON_TEXT: Record<AnimationPhase, string> = {
  ready: "Catch",
  locking: "Locking on…",
  extending: "Dropping hook…",
  attached: "Got it!",
  retracting: "Pulling up your deal…",
  verifying: "Confirming your deal…",
  done: "Revealing deal…",
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `catch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function GameCanvas({
  gems,
  onCatch,
  onReveal,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const hookArmRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const animationRunRef = useRef(0);

  const [phase, setPhase] = useState<AnimationPhase>("ready");
  const [targetAngle, setTargetAngle] = useState(0);
  const [ropeLength, setRopeLength] = useState(INITIAL_ROPE_LENGTH);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [attached, setAttached] = useState(false);
  const [pendingCatch, setPendingCatch] = useState<PendingCatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const motion = prefersReducedMotion ? REDUCED_MOTION : NORMAL_MOTION;

  const gemEntries = useMemo(
    () =>
      gems.map((gem, index) => ({
        gem,
        position: GEM_POSITIONS[index % GEM_POSITIONS.length],
        floatDelayMs: index * -170,
      })),
    [gems],
  );

  useEffect(() => {
    return () => {
      // Invalidates any unfinished async animation sequence after unmount.
      animationRunRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (phase !== "ready") return;

    if (prefersReducedMotion) {
      angleRef.current = 0;
      if (hookArmRef.current) {
        hookArmRef.current.style.transform =
          "translateX(-50%) rotate(0deg)";
      }
      return;
    }

    let animationFrame = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const angle = 47 * Math.sin(((now - start) / 1800) * Math.PI * 2);
      angleRef.current = angle;

      if (hookArmRef.current) {
        hookArmRef.current.style.transform =
          `translateX(-50%) rotate(${angle}deg)`;
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [phase, prefersReducedMotion]);

  function targetForEntry(entry: (typeof gemEntries)[number]): GemTarget {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Game canvas is not ready");
    }

    const rect = canvas.getBoundingClientRect();
    const originX = rect.width / 2;
    const targetX = (entry.position.x / 100) * rect.width;
    const targetY = (entry.position.y / 100) * rect.height;
    const dx = targetX - originX;
    const dy = targetY - HOOK_ORIGIN_Y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      gem: entry.gem,
      // CSS positive rotation turns a downward rope toward the LEFT.
      // Therefore a target on the right needs a negative CSS angle.
      angle: -(Math.atan2(dx, dy) * 180) / Math.PI,
      // Stop slightly before the centre because the hook head extends below
      // the rope and visually overlaps the Gem orb.
      ropeLength: Math.max(INITIAL_ROPE_LENGTH, distance - 28),
    };
  }

  function findClosestGem(): GemTarget {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error("Game canvas is not ready");
    }

    if (gemEntries.length === 0) {
      throw new Error("No food Gems are available");
    }

    const rect = canvas.getBoundingClientRect();
    const originX = rect.width / 2;
    const originY = HOOK_ORIGIN_Y;

    // The unrotated rope points straight down. With CSS rotation theta,
    // its screen-space direction is (-sin(theta), cos(theta)).
    // This sign convention is important: a visually right-facing rope has
    // a negative CSS angle.
    const radians = (angleRef.current * Math.PI) / 180;
    const directionX = -Math.sin(radians);
    const directionY = Math.cos(radians);

    const candidates: PathCandidate[] = gemEntries.map((entry) => {
      const target = targetForEntry(entry);
      const targetX = (entry.position.x / 100) * rect.width;
      const targetY = (entry.position.y / 100) * rect.height;
      const vectorX = targetX - originX;
      const vectorY = targetY - originY;

      // Projection onto the hook ray. Positive values are in front of the
      // hook; negative values are behind it.
      const alongPath =
        vectorX * directionX + vectorY * directionY;

      // Magnitude of the 2D cross product. Because the direction vector is
      // normalized, this is the perpendicular pixel distance from the Gem
      // centre to the hook's travel path.
      const distanceToPath = Math.abs(
        vectorX * directionY - vectorY * directionX,
      );

      // The visible orb is approximately 64 x 56 px. Include part of the
      // hook head as a forgiving hit box so the daily catch still succeeds.
      const hitRadius = 40 * (entry.position.scale ?? 1);
      const intersectsPath =
        alongPath >= INITIAL_ROPE_LENGTH * 0.5 &&
        distanceToPath <= hitRadius;

      const firstContactDistance = intersectsPath
        ? alongPath -
          Math.sqrt(
            Math.max(
              0,
              hitRadius * hitRadius -
                distanceToPath * distanceToPath,
            ),
          )
        : Number.POSITIVE_INFINITY;

      return {
        ...target,
        alongPath,
        distanceToPath,
        hitRadius,
        intersectsPath,
        firstContactDistance,
      };
    });

    const inFront = candidates.filter(
      (candidate) => candidate.alongPath > 0,
    );

    if (inFront.length === 0) {
      throw new Error("No food Gems are in front of the hook");
    }

    // Physical rule: if the hook ray actually crosses one or more Gem hit
    // circles, catch the FIRST one encountered while the rope extends.
    const directHits = inFront
      .filter((candidate) => candidate.intersectsPath)
      .sort(
        (a, b) =>
          a.firstContactDistance - b.firstContactDistance,
      );

    if (directHits.length > 0) {
      return directHits[0];
    }

    // Guaranteed-catch assist: if the ray narrowly misses every orb, choose
    // the Gem whose centre is closest to the actual hook path. Only then use
    // distance along the path as a tie-breaker. The hook gently aligns to that
    // Gem during the short locking phase.
    return inFront.sort((a, b) => {
      const pathDifference =
        a.distanceToPath - b.distanceToPath;

      if (Math.abs(pathDifference) > 0.001) {
        return pathDifference;
      }

      return a.alongPath - b.alongPath;
    })[0];
  }

  function findTargetForGem(gemId: string): GemTarget {
    const entry = gemEntries.find((item) => item.gem.gem_id === gemId);

    if (!entry) {
      throw new Error("The selected food Gem is no longer available");
    }

    return targetForEntry(entry);
  }

  async function executeCatch(existing?: PendingCatch) {
    if (phase !== "ready") return;

    setError(null);

    let selected = existing;
    let target: GemTarget;

    try {
      if (selected) {
        target = findTargetForGem(selected.gem.gem_id);
      } else {
        target = findClosestGem();
        selected = {
          gem: target.gem,
          requestId: createRequestId(),
        };
        setPendingCatch(selected);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to aim the hook",
      );
      return;
    }

    const runId = animationRunRef.current + 1;
    animationRunRef.current = runId;

    setSelectedGemId(selected.gem.gem_id);
    setTargetAngle(target.angle);
    setAttached(false);
    setPhase("locking");

    // Attach rejection handling immediately so a quick network failure does not
    // become an unhandled Promise rejection while the animation is playing.
    const responsePromise = onCatch(
      selected.gem.gem_id,
      selected.requestId,
    ).then(
      (response) => ({ ok: true as const, response }),
      (caughtError: unknown) => ({ ok: false as const, caughtError }),
    );

    const ensureCurrentRun = () => {
      if (animationRunRef.current !== runId) {
        throw new Error("Catch animation was cancelled");
      }
    };

    try {
      // 1. Freeze and gently align to the chosen target.
      await wait(motion.lock);
      ensureCurrentRun();

      // 2. Drop quickly toward the selected Gem.
      setRopeLength(target.ropeLength);
      setPhase("extending");
      await wait(motion.extend);
      ensureCurrentRun();

      // 3. Snap the Gem onto the hook with a short visual pop.
      setAttached(true);
      setPhase("attached");
      await wait(motion.attach);
      ensureCurrentRun();

      // 4. Pull the captured Gem upward more slowly to create weight and
      // anticipation.
      setRopeLength(INITIAL_ROPE_LENGTH);
      setPhase("retracting");
      await wait(motion.retract);
      ensureCurrentRun();

      // 5. The hook has returned. If the API is still running, hold this state
      // briefly instead of skipping the animation.
      setPhase("verifying");
      const result = await responsePromise;
      ensureCurrentRun();

      if (!result.ok) {
        throw result.caughtError;
      }

      setPhase("done");
      await wait(motion.arrive);
      ensureCurrentRun();

      setPendingCatch(null);
      onReveal(result.response);
    } catch (caughtError) {
      if (animationRunRef.current !== runId) return;

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Catch failed. Please try again.";

      setError(message);
      setAttached(false);
      setSelectedGemId(null);
      setRopeLength(INITIAL_ROPE_LENGTH);
      setTargetAngle(angleRef.current);
      setPhase("ready");
    }
  }

  const selectedGem = gems.find((gem) => gem.gem_id === selectedGemId);
  const selectedIconUrl = selectedGem
    ? resolveCategoryAsset(selectedGem.icon_asset_id)
    : null;

  const armStyle =
    phase === "ready"
      ? undefined
      : {
          transform: `translateX(-50%) rotate(${targetAngle}deg)`,
        };

  const capturedAnchorStyle: CSSProperties | undefined = selectedGem
    ? {
        // Counter-rotate the prize so the food icon remains upright while the
        // complete hook arm is angled toward the Gem.
        transform: `translateX(-50%) rotate(${-targetAngle}deg)`,
      }
    : undefined;

  return (
    <section className="game-section" aria-labelledby="game-title">
      <header className="game-copy">
        <p className="eyebrow">PERSONALIZED FOR EMMA</p>
        <h1 id="game-title">Catch today&apos;s meal deal</h1>
        <p>Each category is backed by one eligible restaurant offer.</p>
      </header>

      <div
        className={`game-canvas game-phase-${phase}`}
        ref={canvasRef}
        aria-busy={phase !== "ready"}
      >
        <div className="mine-sky" aria-hidden="true">
          <span>⚽</span>
          <span>✨</span>
          <span>🏟️</span>
        </div>

        <div
          ref={hookArmRef}
          className={`hook-arm phase-${phase}`}
          style={armStyle}
          aria-hidden="true"
        >
          <div
            className="hook-rope"
            style={{ height: `${ropeLength}px` }}
          >
            <div className="hook-head">🪝</div>

            {attached && selectedGem && (
              <span
                className="captured-gem-anchor"
                style={capturedAnchorStyle}
              >
                <span className="captured-gem-orb">
                  {selectedIconUrl ? (
                    <img
                      className="captured-gem-image"
                      src={selectedIconUrl}
                      alt=""
                    />
                  ) : (
                    <span aria-hidden="true">
                      {CATEGORY_EMOJI[selectedGem.label]}
                    </span>
                  )}
                </span>
              </span>
            )}
          </div>
        </div>

        {gemEntries.map(({ gem, position, floatDelayMs }) => {
          const isSelected = selectedGemId === gem.gem_id;

          return (
            <FoodGemView
              key={gem.gem_id}
              gem={gem}
              position={position}
              floatDelayMs={floatDelayMs}
              targeted={isSelected && !attached}
              dimmed={selectedGemId !== null && !isSelected}
              hidden={attached && isSelected}
            />
          );
        })}

        <div className="mine-floor" aria-hidden="true" />
      </div>

      <p className="catch-status" aria-live="polite">
        {phase === "ready"
          ? "Watch the hook, then catch the category you want."
          : BUTTON_TEXT[phase]}
      </p>

      {error && (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => executeCatch(pendingCatch ?? undefined)}
          >
            Retry
          </button>
        </div>
      )}

      <button
        type="button"
        className="primary-button catch-button"
        data-phase={phase}
        disabled={phase !== "ready"}
        onClick={() => executeCatch(pendingCatch ?? undefined)}
      >
        {BUTTON_TEXT[phase]}
      </button>

      <p className="single-catch-note">
        One guaranteed catch. No rerolls.
      </p>
    </section>
  );
}
