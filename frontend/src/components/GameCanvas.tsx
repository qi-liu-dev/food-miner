import { useEffect, useMemo, useRef, useState } from "react";
import type { CatchResponse, FoodGem } from "../api/types";
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

type AnimationPhase = "ready" | "submitting" | "extending" | "retracting" | "done";

interface PendingCatch {
  gem: FoodGem;
  requestId: string;
}

export default function GameCanvas({ gems, onCatch, onReveal }: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const hookArmRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const [phase, setPhase] = useState<AnimationPhase>("ready");
  const [targetAngle, setTargetAngle] = useState(0);
  const [ropeLength, setRopeLength] = useState(INITIAL_ROPE_LENGTH);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [attached, setAttached] = useState(false);
  const [pendingCatch, setPendingCatch] = useState<PendingCatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const gemEntries = useMemo(
    () => gems.map((gem, index) => ({ gem, position: GEM_POSITIONS[index] })),
    [gems],
  );

  useEffect(() => {
    if (phase !== "ready") return;
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
  }, [phase]);

  function findClosestGem(): { gem: FoodGem; angle: number; distance: number } {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("Game canvas is not ready");
    const rect = canvas.getBoundingClientRect();
    const originX = rect.width / 2;
    const originY = 40;

    const candidates = gemEntries.map(({ gem, position }) => {
      const x = (position.x / 100) * rect.width;
      const y = (position.y / 100) * rect.height;
      const dx = x - originX;
      const dy = y - originY;
      const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return { gem, angle, distance };
    });

    return candidates.sort((a, b) => {
      const angleDifference = Math.abs(a.angle - angleRef.current) - Math.abs(b.angle - angleRef.current);
      if (Math.abs(angleDifference) > 0.001) return angleDifference;
      return a.distance - b.distance;
    })[0];
  }

  async function executeCatch(existing?: PendingCatch) {
    if (phase !== "ready") return;
    setError(null);

    let selected = existing;
    let target: ReturnType<typeof findClosestGem>;

    if (selected) {
      const entry = gemEntries.find((item) => item.gem.gem_id === selected!.gem.gem_id);
      if (!entry || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = (entry.position.x / 100) * rect.width - rect.width / 2;
      const dy = (entry.position.y / 100) * rect.height - 40;
      target = {
        gem: entry.gem,
        angle: (Math.atan2(dx, dy) * 180) / Math.PI,
        distance: Math.sqrt(dx * dx + dy * dy),
      };
    } else {
      target = findClosestGem();
      selected = {
        gem: target.gem,
        requestId: crypto.randomUUID(),
      };
      setPendingCatch(selected);
    }

    setTargetAngle(angleRef.current);
    setPhase("submitting");
    try {
      const response = await onCatch(
        selected.gem.gem_id,
        selected.requestId,
      );

      setSelectedGemId(selected.gem.gem_id);
      setTargetAngle(target.angle);
      setRopeLength(target.distance);
      setPhase("extending");

      window.setTimeout(() => {
        setAttached(true);
        setPhase("retracting");
        setRopeLength(INITIAL_ROPE_LENGTH);
      }, 560);

      window.setTimeout(() => {
        setPhase("done");
        setPendingCatch(null);
        onReveal(response);
      }, 1320);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Catch failed";
      setError(message);
      setPhase("ready");
    }
  }

  const selectedGem = gems.find((gem) => gem.gem_id === selectedGemId);
  const armStyle = phase === "ready"
    ? undefined
    : { transform: `translateX(-50%) rotate(${targetAngle}deg)` };

  return (
    <section className="game-section" aria-labelledby="game-title">
      <header className="game-copy">
        <p className="eyebrow">PERSONALIZED FOR EMMA</p>
        <h1 id="game-title">Catch today&apos;s meal deal</h1>
        <p>Each category is backed by one eligible restaurant offer.</p>
      </header>

      <div className="game-canvas" ref={canvasRef}>
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
              <span className="captured-gem">
                {CATEGORY_EMOJI[selectedGem.label]}
              </span>
            )}
          </div>
        </div>

        {gemEntries.map(({ gem, position }) => (
          <FoodGemView
            key={gem.gem_id}
            gem={gem}
            position={position}
            hidden={attached && selectedGemId === gem.gem_id}
          />
        ))}

        <div className="mine-floor" aria-hidden="true" />
      </div>

      {error && (
        <div className="inline-error" role="alert">
          <span>{error}</span>
          <button onClick={() => executeCatch(pendingCatch ?? undefined)}>Retry</button>
        </div>
      )}

      <button
        className="primary-button catch-button"
        disabled={phase !== "ready"}
        onClick={() => executeCatch(pendingCatch ?? undefined)}
      >
        {phase === "submitting" ? "Securing your deal…" : "Catch"}
      </button>
      <p className="single-catch-note">One guaranteed catch. No rerolls.</p>
    </section>
  );
}
