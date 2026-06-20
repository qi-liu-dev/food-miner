import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  catchGem,
  claimDiscount,
  createOrRestoreGame,
} from "../api/client";
import type {
  CandidateDeal,
  CatchResponse,
  GameSessionResponse,
} from "../api/types";
import DealRevealSheet from "../components/DealRevealSheet";
import ErrorState from "../components/ErrorState";
import GameCanvas from "../components/GameCanvas";
import MineGeneratingOverlay from "../components/MineGeneratingOverlay";
import MobileShell from "../components/MobileShell";

function delay(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function MinerPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedDeal, setRevealedDeal] = useState<CandidateDeal | null>(null);
  const [claiming, setClaiming] = useState(false);

  const loadGame = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response] = await Promise.all([
        createOrRestoreGame("emma"),
        delay(1300),
      ]);
      setSession(response);
      localStorage.setItem("foodMinerGameId", response.game_id);
      if (response.status === "CAUGHT" && response.revealed_deal) {
        setRevealedDeal(response.revealed_deal);
      }
      if (response.status === "CLAIMED" && response.redirect_path) {
        navigate(response.redirect_path, { replace: true });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create game");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  async function handleCatch(
    gemId: string,
    requestId: string,
  ): Promise<CatchResponse> {
    if (!session) {
      throw new Error("Game session is unavailable");
    }

    // Do not update session.status here. GameCanvas must stay mounted while
    // the hook drops, attaches to the Gem and retracts.
    return catchGem(session.game_id, gemId, requestId);
  }

  function handleReveal(response: CatchResponse) {
    // Only switch the page to CAUGHT after the complete animation has ended.
    setSession((current) =>
      current
        ? {
            ...current,
            status: response.status,
            revealed_deal: response.deal,
          }
        : current,
    );
    setRevealedDeal(response.deal);
  }

  async function handleClaim() {
    if (!session) return;
    setClaiming(true);
    setError(null);
    try {
      const response = await claimDiscount(session.game_id);
      navigate(response.redirect_path);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Claim failed");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <MobileShell className="miner-shell">
        <MineGeneratingOverlay summary={session?.personalization_summary} />
      </MobileShell>
    );
  }

  if (error && !session) {
    return (
      <MobileShell>
        <ErrorState
          message={error}
          onRetry={() => void loadGame()}
          onHome={() => navigate("/")}
        />
      </MobileShell>
    );
  }

  if (!session) return null;

  return (
    <MobileShell className="miner-shell">
      <header className="miner-nav">
        <button className="icon-button" onClick={() => navigate("/")} aria-label="Back to home">←</button>
        <div>
          <strong>Food Miner</strong>
          <small>One catch per day</small>
        </div>
        <span className="oracle-pill">Emma</span>
      </header>

      <div className="summary-chips">
        {session.personalization_summary.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {session.status === "READY" && (
        <GameCanvas
          gems={session.gems}
          onCatch={handleCatch}
          onReveal={handleReveal}
        />
      )}

      {session.status !== "READY" && !revealedDeal && (
        <section className="already-played-panel">
          <h1>Today&apos;s catch is already used</h1>
          <p>Return to the restaurant deal you revealed earlier.</p>
        </section>
      )}

      {error && session && <div className="page-error">{error}</div>}

      {revealedDeal && (
        <DealRevealSheet
          deal={revealedDeal}
          claiming={claiming}
          onClaim={() => void handleClaim()}
          onExit={() => navigate("/")}
        />
      )}
    </MobileShell>
  );
}
