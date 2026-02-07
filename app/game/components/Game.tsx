"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LevelData, InputState, GameStats, VIEW_WIDTH, VIEW_HEIGHT } from "../lib/types";
import { Engine, GameEvent } from "../lib/engine";
import { Renderer } from "../lib/renderer";

type Screen =
  | { name: "theme_select"; levelNumber: number }
  | { name: "generating"; levelNumber: number; theme: string }
  | { name: "playing"; levelNumber: number; theme: string; level: LevelData }
  | { name: "level_complete"; levelNumber: number; theme: string; stats: GameStats }
  | { name: "game_over"; levelNumber: number; theme: string; stats: GameStats };

const THEME_SUGGESTIONS = [
  "Ancient Ruins",
  "Neon City",
  "Underwater Caves",
  "Haunted Forest",
  "Volcanic Wasteland",
  "Crystal Caverns",
  "Sky Temples",
  "Frozen Tundra",
];

export default function Game() {
  const [screen, setScreen] = useState<Screen>({
    name: "theme_select",
    levelNumber: 1,
  });
  const [themeInput, setThemeInput] = useState("");
  const [totalScore, setTotalScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false });

  const generateLevel = useCallback(async (theme: string, levelNumber: number) => {
    setScreen({ name: "generating", levelNumber, theme });
    try {
      const res = await fetch("/api/level", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, levelNumber }),
      });
      const data = await res.json();
      if (data.level) {
        setScreen({ name: "playing", levelNumber, theme, level: data.level });
      }
    } catch {
      setScreen({ name: "theme_select", levelNumber });
    }
  }, []);

  const handleThemeSubmit = useCallback(() => {
    if (screen.name !== "theme_select") return;
    const theme = themeInput.trim() || THEME_SUGGESTIONS[Math.floor(Math.random() * THEME_SUGGESTIONS.length)];
    generateLevel(theme, screen.levelNumber);
  }, [screen, themeInput, generateLevel]);

  const handleNextLevel = useCallback(() => {
    if (screen.name !== "level_complete") return;
    setScreen({ name: "theme_select", levelNumber: screen.levelNumber + 1 });
    setThemeInput("");
  }, [screen]);

  const handleRetry = useCallback(() => {
    if (screen.name !== "game_over") return;
    setScreen({ name: "theme_select", levelNumber: screen.levelNumber });
    setThemeInput("");
  }, [screen]);

  const handleRestart = useCallback(() => {
    setScreen({ name: "theme_select", levelNumber: 1 });
    setTotalScore(0);
    setThemeInput("");
  }, []);

  useEffect(() => {
    if (screen.name !== "playing") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      engineRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = 2;
    canvas.width = VIEW_WIDTH * scale;
    canvas.height = VIEW_HEIGHT * scale;

    if (!rendererRef.current) {
      rendererRef.current = new Renderer(canvas);
    }
    const renderer = rendererRef.current;

    const onEvent = (event: GameEvent) => {
      if (event.type === "goal_reached") {
        const stats = engineRef.current?.stats ?? { score: 0, coins: 0, deaths: 0, timeElapsed: 0 };
        setTotalScore((prev) => prev + stats.score);
        setScreen({
          name: "level_complete",
          levelNumber: screen.levelNumber,
          theme: screen.theme,
          stats: { ...stats },
        });
      } else if (event.type === "player_died") {
        const eng = engineRef.current;
        if (eng && eng.stats.deaths >= 5) {
          setScreen({
            name: "game_over",
            levelNumber: screen.levelNumber,
            theme: screen.theme,
            stats: { ...eng.stats },
          });
        }
      }
    };

    const engine = new Engine(screen.level, onEvent);
    engineRef.current = engine;

    let last = performance.now();
    let acc = 0;
    const STEP = 1 / 60;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;

      while (acc >= STEP) {
        engine.update(STEP, inputRef.current);
        acc -= STEP;
      }

      renderer.render(
        engine.level,
        engine.player,
        engine.camera,
        { score: engine.stats.score, levelNumber: screen.levelNumber, theme: screen.theme },
        dt
      );

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [screen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") inputRef.current.right = true;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") {
        inputRef.current.jump = true;
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") inputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") inputRef.current.right = false;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === " ") inputRef.current.jump = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="clock-body game-body">
      <div className="clock-bezel">
        <div className="clock-screen game-screen">
          <div className="scanlines" />
          <div className="screen-content game-content">
            {screen.name === "theme_select" && (
              <div className="game-menu">
                <div className="game-title">
                  {screen.levelNumber === 1 ? (
                    <>
                      <span className="game-title-main">PIXEL</span>
                      <span className="game-title-sub">TRAVERSE</span>
                    </>
                  ) : (
                    <span className="game-level-header">LEVEL {screen.levelNumber}</span>
                  )}
                </div>
                <p className="game-prompt">
                  {screen.levelNumber === 1
                    ? "Choose a theme for your adventure"
                    : "Choose a theme for the next level"}
                </p>
                <div className="game-input-row">
                  <input
                    type="text"
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleThemeSubmit()}
                    placeholder="Type a theme or pick below..."
                    className="drum-input game-input"
                    autoFocus
                  />
                  <button onClick={handleThemeSubmit} className="drum-btn drum-btn-generate">
                    GO
                  </button>
                </div>
                <div className="game-suggestions">
                  {THEME_SUGGESTIONS.map((t) => (
                    <button
                      key={t}
                      className="game-tag"
                      onClick={() => {
                        setThemeInput(t);
                        generateLevel(t, screen.levelNumber);
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {totalScore > 0 && (
                  <div className="game-total-score">TOTAL SCORE: {totalScore}</div>
                )}
                <div className="game-controls-hint">
                  <span>MOVE</span> Arrow Keys / WASD
                  <span className="game-hint-sep">|</span>
                  <span>JUMP</span> Space / Up
                </div>
              </div>
            )}

            {screen.name === "generating" && (
              <div className="game-menu">
                <div className="game-generating">
                  <div className="loading-indicator">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                  <p className="game-gen-text">
                    Generating &quot;{screen.theme}&quot; — Level {screen.levelNumber}
                  </p>
                  <p className="game-gen-sub">Designing platforms, hazards, and secrets...</p>
                </div>
              </div>
            )}

            {screen.name === "playing" && (
              <canvas
                ref={canvasRef}
                className="game-canvas"
                tabIndex={0}
              />
            )}

            {screen.name === "level_complete" && (
              <div className="game-menu">
                <div className="game-complete">
                  <div className="game-complete-title">LEVEL COMPLETE</div>
                  <div className="game-stats">
                    <div className="game-stat">
                      <span className="game-stat-label">SCORE</span>
                      <span className="game-stat-value">{screen.stats.score}</span>
                    </div>
                    <div className="game-stat">
                      <span className="game-stat-label">COINS</span>
                      <span className="game-stat-value">{screen.stats.coins}</span>
                    </div>
                    <div className="game-stat">
                      <span className="game-stat-label">DEATHS</span>
                      <span className="game-stat-value">{screen.stats.deaths}</span>
                    </div>
                    <div className="game-stat">
                      <span className="game-stat-label">TIME</span>
                      <span className="game-stat-value">{Math.floor(screen.stats.timeElapsed)}s</span>
                    </div>
                  </div>
                  <button onClick={handleNextLevel} className="drum-btn game-btn-main" autoFocus>
                    NEXT LEVEL
                  </button>
                </div>
              </div>
            )}

            {screen.name === "game_over" && (
              <div className="game-menu">
                <div className="game-over">
                  <div className="game-over-title">GAME OVER</div>
                  <div className="game-over-level">
                    Reached Level {screen.levelNumber}
                  </div>
                  <div className="game-stats">
                    <div className="game-stat">
                      <span className="game-stat-label">FINAL SCORE</span>
                      <span className="game-stat-value">{totalScore + screen.stats.score}</span>
                    </div>
                  </div>
                  <div className="game-over-actions">
                    <button onClick={handleRetry} className="drum-btn game-btn-main" autoFocus>
                      RETRY LEVEL
                    </button>
                    <button onClick={handleRestart} className="drum-btn">
                      NEW GAME
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="clock-footer">
        <div className="led-cluster">
          <div className={`led ${screen.name === "playing" ? "led-active" : ""}`} />
          <span className="led-label">
            {screen.name === "playing" ? "LIVE" : screen.name === "generating" ? "SYNC" : "READY"}
          </span>
        </div>
        <div className="digital-time">
          {screen.name === "playing" && engineRef.current
            ? `SCORE ${engineRef.current.stats.score}`
            : `TOTAL ${totalScore}`}
        </div>
        <div className="brand-mark">
          PIXEL<span className="brand-thin">TRAVERSE</span>
        </div>
      </div>
    </div>
  );
}
