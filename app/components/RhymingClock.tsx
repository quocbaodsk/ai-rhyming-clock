"use client";

import { useState, useEffect, useCallback, useRef } from "react";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDigitalTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function RhymingClock() {
  const [poem, setPoem] = useState("");
  const [displayedPoem, setDisplayedPoem] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const lastMinute = useRef<number>(-1);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPoem = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      const res = await fetch("/api/poem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: formatTime(date) }),
      });
      const data = await res.json();
      setPoem(data.poem);
    } catch {
      setPoem("The clock ticks on through day and night,\nBut words have failed to reach the light.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!poem || loading) return;

    if (typingRef.current) clearTimeout(typingRef.current);
    setDisplayedPoem("");
    setIsTyping(true);

    let i = 0;
    const typeChar = () => {
      if (i < poem.length) {
        setDisplayedPoem(poem.slice(0, i + 1));
        i++;
        typingRef.current = setTimeout(typeChar, 30 + Math.random() * 25);
      } else {
        setIsTyping(false);
      }
    };
    typingRef.current = setTimeout(typeChar, 200);

    return () => {
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [poem, loading]);

  useEffect(() => {
    const now = new Date();
    setCurrentTime(now);
    lastMinute.current = now.getMinutes();
    fetchPoem(now);

    const interval = setInterval(() => {
      const d = new Date();
      setCurrentTime(d);
      if (d.getMinutes() !== lastMinute.current) {
        lastMinute.current = d.getMinutes();
        fetchPoem(d);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchPoem]);

  return (
    <div className="clock-body">
      <div className="clock-bezel">
        <div className="clock-screen">
          <div className="scanlines" />
          <div className="screen-content">
            {loading && !displayedPoem ? (
              <div className="loading-indicator">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            ) : (
              <p className="poem-text">
                {displayedPoem}
                {isTyping && <span className="cursor">|</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="clock-footer">
        <div className="led-cluster">
          <div className={`led ${loading ? "led-active" : ""}`} />
          <span className="led-label">{loading ? "SYNC" : "READY"}</span>
        </div>
        <div className="digital-time">
          {currentTime ? formatDigitalTime(currentTime) : "--:--"}
        </div>
        <div className="brand-mark">
          RHYME<span className="brand-thin">CLOCK</span>
        </div>
      </div>
    </div>
  );
}
