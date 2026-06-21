import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { CatchResponse, FoodGem } from "../api/types";
import catchFieldUrl from "../assets/game/catch-field.svg";
import catIdleUrl from "../assets/game/cat-idle.svg";
import catExcitedUrl from "../assets/game/cat-excited.svg";
import gemCardDefaultUrl from "../assets/gems/gem-card-default.svg";
import gemCardSelectedUrl from "../assets/gems/gem-card-selected.svg";
import { resolveCategoryAsset } from "../assets/assetRegistry";
import { CATEGORY_EMOJI } from "../data/categoryVisuals";
import FoodGemView from "./FoodGem";
import hookHeadUrl from "../assets/game/hook-head.svg";

interface GameCanvasProps {
  gems: FoodGem[];
  onCatch: (
    gemId: string,
    requestId: string,
  ) => Promise<CatchResponse>;
  onReveal: (response: CatchResponse) => void;
}

// Designer layout: three cards on the first row, one in the middle,
// and two cards on the bottom row. Positions are percentages of the
// complete game canvas and therefore remain responsive.
const GEM_POSITIONS = [
  { x: 24, y: 43, scale: 0.88 },
  { x: 76, y: 43, scale: 0.88 },

  { x: 24, y: 64, scale: 0.88 },
  { x: 76, y: 64, scale: 0.88 },

  { x: 24, y: 84, scale: 0.88 },
  { x: 76, y: 84, scale: 0.88 },
];

const INITIAL_ROPE_LENGTH = 68;
const HOOK_SWING_DEGREES = 50;
const HOOK_SWING_DURATION_MS = 1900;
const HOOK_CAPTURE_PADDING = 12;
const MAX_MAGNET_DISTANCE = 84;

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

interface GemGeometry {
  gem: FoodGem;
  centerX: number;
  centerY: number;
  radius: number;
  angle: number;
  distance: number;
}

interface GemTarget {
  gem: FoodGem;
  angle: number;
  ropeLength: number;
}

interface PathCandidate extends GemGeometry {
  alongPath: number;
  distanceToPath: number;
  captureRadius: number;
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
      // Cancel any unfinished async animation sequence after unmount.
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
      const angle =
        HOOK_SWING_DEGREES *
        Math.sin(
          ((now - start) / HOOK_SWING_DURATION_MS) * Math.PI * 2,
        );

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

  function getHookOrigin() {
    const canvas = canvasRef.current;
    const hookArm = hookArmRef.current;

    if (!canvas || !hookArm) {
      throw new Error("Game canvas is not ready");
    }

    const canvasRect = canvas.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(hookArm);

    // Read the untransformed CSS pivot. getBoundingClientRect() would return
    // the rotated bounding box and therefore move the apparent origin while
    // the hook swings.
    const originX =
      Number.parseFloat(computedStyle.left) || canvasRect.width / 2;
    const originY =
  Number.parseFloat(computedStyle.top) || 120;

    return {
      canvas,
      canvasRect,
      originX,
      originY,
    };
  }

  function getGemGeometry(gem: FoodGem): GemGeometry {
    const { canvas, canvasRect, originX, originY } = getHookOrigin();
    const entry = gemEntries.find(
      (item) => item.gem.gem_id === gem.gem_id,
    );

    if (!entry) {
      throw new Error("The selected food Gem is no longer available");
    }

    // Measure the actual designer card rather than assuming that the wrapper's
    // percentage point is its visual centre. This keeps collision detection in
    // sync with gem-card-default.svg and with responsive scaling.
    const card = canvas.querySelector<HTMLElement>(
      `[data-gem-id="${gem.gem_id}"] .gem-card-hitbox`,
    );

    let centerX: number;
    let centerY: number;
    let radius: number;

    if (card) {
      const cardRect = card.getBoundingClientRect();
      centerX = cardRect.left - canvasRect.left + cardRect.width / 2;
      centerY = cardRect.top - canvasRect.top + cardRect.height / 2;
      radius = Math.min(cardRect.width, cardRect.height) * 0.42;
    } else {
      centerX = (entry.position.x / 100) * canvasRect.width;
      centerY = (entry.position.y / 100) * canvasRect.height;
      radius = 40 * (entry.position.scale ?? 1);
    }

    const dx = centerX - originX;
    const dy = centerY - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return {
      gem: entry.gem,
      centerX,
      centerY,
      radius,
      // CSS positive rotation turns a downward rope toward the LEFT.
      // Therefore a target on the right needs a negative CSS angle.
      angle: -(Math.atan2(dx, dy) * 180) / Math.PI,
      distance,
    };
  }

  function targetForGem(gem: FoodGem): GemTarget {
    const geometry = getGemGeometry(gem);

    return {
      gem: geometry.gem,
      angle: geometry.angle,
      // Stop before the card centre because the hook head and the visible card
      // both extend beyond the end of the rope.
      ropeLength: Math.max(
        INITIAL_ROPE_LENGTH,
        geometry.distance - Math.max(30, geometry.radius * 0.72),
      ),
    };
  }

  function findClosestGem(): GemTarget {
    if (gemEntries.length === 0) {
      throw new Error("No food Gems are available");
    }

    const { originX, originY } = getHookOrigin();
    const radians = (angleRef.current * Math.PI) / 180;

    // The unrotated rope points straight down. With CSS rotation theta,
    // screen-space direction is (-sin(theta), cos(theta)).
    const directionX = -Math.sin(radians);
    const directionY = Math.cos(radians);

    const candidates: PathCandidate[] = gemEntries.map(({ gem }) => {
      const geometry = getGemGeometry(gem);
      const vectorX = geometry.centerX - originX;
      const vectorY = geometry.centerY - originY;

      const alongPath =
        vectorX * directionX + vectorY * directionY;

      const distanceToPath = Math.abs(
        vectorX * directionY - vectorY * directionX,
      );

      const captureRadius = geometry.radius + HOOK_CAPTURE_PADDING;
      const intersectsPath =
        alongPath >= INITIAL_ROPE_LENGTH * 0.55 &&
        distanceToPath <= captureRadius;

      const firstContactDistance = intersectsPath
        ? alongPath -
          Math.sqrt(
            Math.max(
              0,
              captureRadius * captureRadius -
                distanceToPath * distanceToPath,
            ),
          )
        : Number.POSITIVE_INFINITY;

      return {
        ...geometry,
        alongPath,
        distanceToPath,
        captureRadius,
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

    // Gold-miner rule: if the hook ray intersects one or more cards, catch the
    // first card encountered while extending.
    const directHits = inFront
      .filter((candidate) => candidate.intersectsPath)
      .sort(
        (a, b) =>
          a.firstContactDistance - b.firstContactDistance,
      );

    const selected =
      directHits[0] ??
      // Guaranteed-catch assist: if the hook narrowly misses all cards, attach
      // to the card closest to the real hook path, not to a distant card whose
      // centre merely has a similar angle.
      inFront
        .filter(
          (candidate) =>
            candidate.distanceToPath <= MAX_MAGNET_DISTANCE,
        )
        .sort((a, b) => {
          const pathDifference =
            a.distanceToPath - b.distanceToPath;

          if (Math.abs(pathDifference) > 0.5) {
            return pathDifference;
          }

          return a.alongPath - b.alongPath;
        })[0] ??
      inFront.sort((a, b) => {
        const pathDifference =
          a.distanceToPath - b.distanceToPath;

        if (Math.abs(pathDifference) > 0.5) {
          return pathDifference;
        }

        return a.alongPath - b.alongPath;
      })[0];

    if (import.meta.env.DEV) {
      console.debug("[Food Miner] catch target", {
        clickedCssAngle: Number(angleRef.current.toFixed(1)),
        selected: selected.gem.label,
        directHit: selected.intersectsPath,
        distanceToPath: Number(selected.distanceToPath.toFixed(1)),
      });
    }

    return targetForGem(selected.gem);
  }

  function findTargetForGem(gemId: string): GemTarget {
    const entry = gemEntries.find(
      (item) => item.gem.gem_id === gemId,
    );

    if (!entry) {
      throw new Error("The selected food Gem is no longer available");
    }

    return targetForGem(entry.gem);
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

    // Start the API request and the animation at the same time. The same
    // requestId is reused on Retry, so a temporary network failure cannot
    // consume the user's single catch twice.
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
      await wait(motion.lock);
      ensureCurrentRun();

      setRopeLength(target.ropeLength);
      setPhase("extending");
      await wait(motion.extend);
      ensureCurrentRun();

      setAttached(true);
      setPhase("attached");
      await wait(motion.attach);
      ensureCurrentRun();

      setRopeLength(INITIAL_ROPE_LENGTH);
      setPhase("retracting");
      await wait(motion.retract);
      ensureCurrentRun();

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

  const selectedGem = gems.find(
    (gem) => gem.gem_id === selectedGemId,
  );

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
        // Keep the captured card upright while the complete hook arm is angled.
        transform: `translateX(-50%) rotate(${-targetAngle}deg)`,
      }
    : undefined;

  // Switch the cat as soon as the game locks onto a cuisine, matching the
  // selected-state artwork from the designer mock-up.
  const catIsExcited = selectedGemId !== null && phase !== "ready";

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
        <img
          src={catchFieldUrl}
          alt=""
          className="catch-field-art"
          aria-hidden="true"
          draggable={false}
        />

        <img
          src={catIdleUrl}
          alt=""
          className={[
            "miner-cat-art",
            "miner-cat-idle",
            catIsExcited ? "is-hidden" : "is-visible",
          ].join(" ")}
          aria-hidden="true"
          draggable={false}
        />

        <img
          src={catExcitedUrl}
          alt=""
          className={[
            "miner-cat-art",
            "miner-cat-excited",
            catIsExcited ? "is-visible" : "is-hidden",
          ].join(" ")}
          aria-hidden="true"
          draggable={false}
        />

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
            <div className="hook-head">
  <img
    src={hookHeadUrl}
    alt=""
    className="hook-head-image"
    aria-hidden="true"
    draggable={false}
  />
</div>

            {attached && selectedGem && (
              <>
                <span className="capture-sparkles">
                  <i>✦</i>
                  <i>✦</i>
                  <i>✦</i>
                </span>

                <span
                  className={`captured-gem-anchor captured-${selectedGem.gem_type}`}
                  style={capturedAnchorStyle}
                >
                  <span className="captured-gem-card">
                    <img
                      src={gemCardSelectedUrl}
                      alt=""
                      className="captured-gem-frame"
                      aria-hidden="true"
                      draggable={false}
                    />

                    <span className="captured-gem-icon" aria-hidden="true">
                      {selectedIconUrl ? (
                        <img
                          className="captured-gem-image"
                          src={selectedIconUrl}
                          alt=""
                          draggable={false}
                        />
                      ) : (
                        <span>
                          {CATEGORY_EMOJI[selectedGem.label]}
                        </span>
                      )}
                    </span>

                    <span className="captured-gem-label">
                      {selectedGem.label}
                    </span>
                  </span>
                </span>
              </>
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
