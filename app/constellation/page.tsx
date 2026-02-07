"use client";

import { useState, useCallback, useMemo } from "react";
import { Quicksand } from "next/font/google";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface Star {
  x: number;
  y: number;
  id: number;
}

interface ConstellationResult {
  name: string;
  story: string;
}

const MAX_STARS = 15;
const MIN_STARS = 3;
const BG_STAR_COUNT = 60;

export default function ConstellationPage() {
  const [stars, setStars] = useState<Star[]>([]);
  const [result, setResult] = useState<ConstellationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [nextId, setNextId] = useState(0);

  const bgStars = useMemo(
    () =>
      Array.from({ length: BG_STAR_COUNT }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      })),
    []
  );

  const shootingStars = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        delay: i * 8 + Math.random() * 5,
        duration: 1 + Math.random(),
        top: Math.random() * 40,
        left: Math.random() * 60 + 20,
      })),
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (revealed || loading || stars.length >= MAX_STARS) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setStars((prev) => [...prev, { x, y, id: nextId }]);
      setNextId((prev) => prev + 1);
      setError(null);
    },
    [revealed, loading, stars.length, nextId]
  );

  const handleUndo = useCallback(() => {
    if (revealed || loading) return;
    setStars((prev) => prev.slice(0, -1));
  }, [revealed, loading]);

  const handleReveal = useCallback(async () => {
    if (stars.length < MIN_STARS || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/constellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: stars.map((s) => ({ x: s.x, y: s.y })) }),
      });
      if (!res.ok) throw new Error("Failed to read the stars");
      const data = await res.json();
      setResult(data);
      setRevealed(true);
    } catch {
      setError("The stars are shy tonight. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [stars, loading]);

  const handleReset = useCallback(() => {
    setStars([]);
    setResult(null);
    setRevealed(false);
    setLoading(false);
    setError(null);
    setNextId(0);
  }, []);

  return (
    <div className={`sky-container ${quicksand.variable}`}>
      <div className="sky-bg">
        {bgStars.map((s, i) => (
          <div
            key={i}
            className="sky-bg-star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
        {shootingStars.map((s, i) => (
          <div
            key={`shoot-${i}`}
            className="sky-shooting-star"
            style={{
              top: `${s.top}%`,
              left: `${s.left}%`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
      </div>

      <svg className="sky-canvas" onClick={handleCanvasClick}>
        {stars.map((star, i) =>
          i > 0 ? (
            <line
              key={`line-${star.id}`}
              x1={`${stars[i - 1].x * 100}%`}
              y1={`${stars[i - 1].y * 100}%`}
              x2={`${star.x * 100}%`}
              y2={`${star.y * 100}%`}
              className={revealed ? "sky-line-revealed" : "sky-line"}
            />
          ) : null
        )}
        {revealed && stars.length > 2 && (
          <line
            x1={`${stars[stars.length - 1].x * 100}%`}
            y1={`${stars[stars.length - 1].y * 100}%`}
            x2={`${stars[0].x * 100}%`}
            y2={`${stars[0].y * 100}%`}
            className="sky-line-revealed"
          />
        )}
        {stars.map((star) => (
          <circle
            key={`star-${star.id}`}
            cx={`${star.x * 100}%`}
            cy={`${star.y * 100}%`}
            r="4"
            className={revealed ? "sky-star sky-star-revealed" : "sky-star"}
          />
        ))}
      </svg>

      <div className="sky-ui-layer">
        <div className="sky-glass sky-title-panel">
          <h1 className="sky-title">Stories in the sky</h1>
        </div>

        {stars.length === 0 && !revealed && (
          <p className="sky-instructions">Click anywhere to place stars</p>
        )}

        {stars.length > 0 && !revealed && (
          <div className="sky-counter">
            {stars.length}/{MAX_STARS} stars placed
          </div>
        )}

        <div className="sky-bottom-panel">
          {error && <p className="sky-error">{error}</p>}

          {revealed && result && (
            <div className="sky-result">
              <h2 className="sky-constellation-name">{result.name}</h2>
              <p className="sky-story">{result.story}</p>
            </div>
          )}

          {loading && (
            <div className="sky-loading">
              <div className="sky-loading-dot" />
              <div className="sky-loading-dot" />
              <div className="sky-loading-dot" />
            </div>
          )}

          <div className="sky-btn-group">
            {stars.length > 0 && !revealed && !loading && (
              <button className="sky-btn sky-btn-undo" onClick={handleUndo}>
                Undo last star
              </button>
            )}
            {stars.length >= MIN_STARS && !revealed && !loading && (
              <button className="sky-btn sky-btn-reveal" onClick={handleReveal}>
                Reveal constellation
              </button>
            )}
            {(revealed || stars.length > 0) && !loading && (
              <button className="sky-btn sky-btn-reset" onClick={handleReset}>
                Start over
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
