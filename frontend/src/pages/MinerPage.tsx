import {
  useCallback,
  useEffect,
  useState,
} from "react";
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

export default function MinerPage() {
  const navigate = useNavigate();

  const [session, setSession] =
    useState<GameSessionResponse | null>(null);

  /*
   * checkingSession:
   * 只表示正在询问 backend 今天的 session 状态。
   *
   * showGenerating:
   * backend 已确认这是一个 READY session，
   * 此时才显示完整 Lottie。
   */
  const [checkingSession, setCheckingSession] =
    useState(true);

  const [showGenerating, setShowGenerating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [revealedDeal, setRevealedDeal] =
    useState<CandidateDeal | null>(null);

  const [claiming, setClaiming] =
    useState(false);

  const loadGame = useCallback(async () => {
    setCheckingSession(true);
    setShowGenerating(false);
    setError(null);
    setRevealedDeal(null);

    try {
      const response =
        await createOrRestoreGame("emma");

      setSession(response);

      localStorage.setItem(
        "foodMinerGameId",
        response.game_id,
      );

      /*
       * 只有 READY 才播放 Building 动画。
       *
       * 已经抓过、claim 过或下单过的用户
       * 不应该再次看到 “Building Emma’s Food Mine”。
       */
      if (response.status === "READY") {
        setShowGenerating(true);
        return;
      }

      if (
        response.status === "CAUGHT" &&
        response.revealed_deal
      ) {
        setRevealedDeal(
          response.revealed_deal,
        );

        return;
      }

      if (
        (
          response.status === "CLAIMED" ||
          response.status === "ORDERED"
        ) &&
        response.redirect_path
      ) {
        navigate(
          response.redirect_path,
          {
            replace: true,
          },
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create game",
      );
    } finally {
      setCheckingSession(false);
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
      throw new Error(
        "Game session is unavailable",
      );
    }

    /*
     * 不在这里更新 session.status。
     * GameCanvas 必须保持 mounted，
     * 才能完成下钩、吸附和拉回动画。
     */
    return catchGem(
      session.game_id,
      gemId,
      requestId,
    );
  }

  function handleReveal(
    response: CatchResponse,
  ) {
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
    if (!session) {
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      const response =
        await claimDiscount(
          session.game_id,
        );

      localStorage.setItem(
        "foodMinerGameId",
        response.game_id,
      );

      navigate(response.redirect_path);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Claim failed",
      );
    } finally {
      setClaiming(false);
    }
  }

  /*
   * 这是非常短暂的 backend session 检查。
   * 它不会显示完整 Building 动画，
   * 避免已经玩过的用户误以为还能再玩。
   */
  if (checkingSession) {
    return (
      <MobileShell className="miner-shell">
        <div
          className="miner-session-check"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">
            Checking today&apos;s Food Miner session.
          </span>
        </div>
      </MobileShell>
    );
  }

  /*
   * 对新的 READY session：
   * 第二个可见页面只展示 Lottie。
   */
  if (
    showGenerating &&
    session?.status === "READY"
  ) {
    return (
      <MobileShell className="miner-shell">
        <MineGeneratingOverlay
          onBack={() => navigate("/")}
          onComplete={() => {
            setShowGenerating(false);
          }}
        />
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

  if (!session) {
    return null;
  }

  return (
    <MobileShell className="miner-shell">
      <header className="miner-nav">
        <button
          className="icon-button"
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          ←
        </button>

        <div>
          <strong>Food Miner</strong>
          <small>One catch per day</small>
        </div>

        <span className="oracle-pill">
          Emma
        </span>
      </header>

      <div className="summary-chips">
        {session.personalization_summary.map(
          (item) => (
            <span key={item}>
              {item}
            </span>
          ),
        )}
      </div>

      {session.status === "READY" && (
        <GameCanvas
          gems={session.gems}
          onCatch={handleCatch}
          onReveal={handleReveal}
        />
      )}

      {session.status !== "READY" &&
        !revealedDeal && (
          <section className="already-played-panel">
            <h1>
              Today&apos;s catch is already used
            </h1>

            <p>
              Emma has already used today&apos;s
              Food Miner opportunity.
            </p>

            <button
              className="primary-button"
              type="button"
              onClick={() => navigate("/")}
            >
              Back to Uber Eats
            </button>
          </section>
        )}

      {error && session && (
        <div
          className="page-error"
          role="alert"
        >
          {error}
        </div>
      )}

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