import { useCallback, useEffect, useRef, useState } from "react";

type Effect = { id: number; x: number; y: number };

const GAME_DURATION = 30;
const BALL_SIZE = 72;
const PAD = 48;

function getSpeed(score: number) {
  if (score >= 25) return { delay: 450, dots: 5 };
  if (score >= 18) return { delay: 600, dots: 4 };
  if (score >= 12) return { delay: 750, dots: 3 };
  if (score >= 6) return { delay: 875, dots: 2 };
  return { delay: 1000, dots: 1 };
}

const TapBallGame = () => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameActive, setGameActive] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [ballPos, setBallPos] = useState({ x: 200, y: 200 });
  const [tapped, setTapped] = useState(false);
  const [ripples, setRipples] = useState<Effect[]>([]);
  const [pluses, setPluses] = useState<Effect[]>([]);

  const arenaRef = useRef<HTMLDivElement>(null);
  const moveTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const effectIdRef = useRef(0);

  const moveBall = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const w = arena.offsetWidth;
    const h = arena.offsetHeight;
    const nx = PAD + Math.random() * (w - PAD * 2);
    const ny = PAD + Math.random() * (h - PAD * 2);
    setBallPos({ x: nx, y: ny });
  }, []);

  const scheduleMove = useCallback(
    (delay: number) => {
      if (moveTimerRef.current) window.clearInterval(moveTimerRef.current);
      moveTimerRef.current = window.setInterval(moveBall, delay);
    },
    [moveBall]
  );

  const endGame = useCallback(() => {
    setGameActive(false);
    setHasPlayed(true);
    setShowOverlay(true);
    if (moveTimerRef.current) window.clearInterval(moveTimerRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
  }, []);

  const startGame = () => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameActive(true);
    setShowOverlay(false);
    moveBall();
    scheduleMove(1000);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    countdownRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleBallClick = () => {
    if (!gameActive) return;
    scoreRef.current += 1;
    const newScore = scoreRef.current;
    setScore(newScore);

    const id = ++effectIdRef.current;
    setRipples((r) => [...r, { id, x: ballPos.x, y: ballPos.y }]);
    setPluses((p) => [...p, { id, x: ballPos.x, y: ballPos.y }]);
    window.setTimeout(() => {
      setRipples((r) => r.filter((e) => e.id !== id));
      setPluses((p) => p.filter((e) => e.id !== id));
    }, 720);

    setTapped(false);
    requestAnimationFrame(() => setTapped(true));

    const { delay } = getSpeed(newScore);
    moveBall();
    scheduleMove(delay);
  };

  useEffect(() => {
    return () => {
      if (moveTimerRef.current) window.clearInterval(moveTimerRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    };
  }, []);

  const { dots: activeDots } = getSpeed(score);
  const urgent = timeLeft <= 5 && gameActive;

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* HUD */}
      <header
        className="fixed top-0 left-0 right-0 flex justify-between items-center px-7 py-[18px] z-10"
        style={{ background: "var(--gradient-hud)" }}
      >
        <div className="font-display font-black text-2xl tracking-wider text-foreground" style={{ textShadow: "0 0 18px hsl(var(--game-accent-glow)), 0 2px 6px hsl(var(--game-shadow))" }}>
          SCORE <span className="text-accent text-[2rem]">{score}</span>
        </div>
        <div className={`font-display text-lg tracking-widest ${urgent ? "timer-urgent" : "text-foreground/75"}`}>
          TIME <span>{timeLeft}</span>s
        </div>
      </header>

      {/* Arena */}
      <div ref={arenaRef} className="fixed inset-0 top-16 z-[5]">
        {gameActive && (
          <button
            type="button"
            aria-label="Tap the ball"
            onClick={handleBallClick}
            className={`ball absolute rounded-full cursor-pointer border-0 p-0 ${tapped ? "tapped" : ""}`}
            style={{
              width: BALL_SIZE,
              height: BALL_SIZE,
              left: ballPos.x,
              top: ballPos.y,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}

        {ripples.map((r) => (
          <span
            key={`r-${r.id}`}
            className="ripple absolute rounded-full pointer-events-none"
            style={{ left: r.x, top: r.y, transform: "translate(-50%, -50%)" }}
          />
        ))}

        {pluses.map((p) => (
          <span
            key={`p-${p.id}`}
            className="plus1 absolute font-black text-[1.4rem] pointer-events-none z-20"
            style={{ left: p.x, top: p.y, transform: "translate(-50%, -50%)" }}
          >
            +1
          </span>
        ))}
      </div>

      {/* Speed bar */}
      <div className="fixed bottom-[18px] left-1/2 -translate-x-1/2 flex gap-[7px] z-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              background: i < activeDots ? "hsl(var(--game-accent))" : "hsl(0 0% 100% / 0.25)",
              boxShadow: i < activeDots ? "0 0 8px hsl(var(--game-accent))" : undefined,
            }}
          />
        ))}
      </div>

      {/* Overlay */}
      {showOverlay && (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center z-[100]"
          style={{ background: "hsl(0 0% 0% / 0.72)", backdropFilter: "blur(6px)" }}
        >
          <h1
            className="font-display font-black text-accent mb-1 tracking-wide text-center"
            style={{ fontSize: "clamp(2rem, 7vw, 4rem)", textShadow: "0 0 40px hsl(var(--game-accent-glow))" }}
          >
            {hasPlayed ? "TIME'S UP!" : "TAP THE BALL"}
          </h1>
          <p className="text-foreground/70 text-base mb-10 tracking-wider text-center px-4">
            {hasPlayed ? "Think you can do better?" : "Tap the ball as many times as you can in 30 seconds!"}
          </p>

          {hasPlayed && (
            <>
              <div
                className="font-display font-black text-foreground mb-1"
                style={{ fontSize: "3.5rem", textShadow: "0 0 24px hsl(var(--game-accent) / 0.5)" }}
              >
                {score}
              </div>
              <div className="text-xs text-foreground/45 tracking-[0.2em] uppercase mb-10">Final Score</div>
            </>
          )}

          <button
            type="button"
            onClick={startGame}
            className="start-btn font-display font-bold text-[1.1rem] tracking-[0.12em] px-12 py-4 rounded-full cursor-pointer border-0"
          >
            {hasPlayed ? "PLAY AGAIN" : "START GAME"}
          </button>
        </div>
      )}
    </main>
  );
};

export default TapBallGame;
