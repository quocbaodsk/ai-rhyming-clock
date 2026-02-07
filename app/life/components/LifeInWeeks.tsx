"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const LIFE_EXPECTANCY = 80;
const WEEKS_PER_YEAR = 52;
const TOTAL_WEEKS = LIFE_EXPECTANCY * WEEKS_PER_YEAR;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Stats {
  weeksLived: number;
  weeksRemaining: number;
  percentLived: number;
  daysAlive: number;
  hoursAlive: number;
  heartbeats: number;
  breaths: number;
  sunrises: number;
  sleepYears: number;
  mealsEaten: number;
  moonCycles: number;
  seasonsLived: number;
  currentSeason: string;
  age: number;
  nextBirthdayWeeks: number;
}

function computeStats(birthDate: Date): Stats {
  const now = new Date();
  const diffMs = now.getTime() - birthDate.getTime();
  const daysAlive = Math.floor(diffMs / MS_PER_DAY);
  const weeksLived = Math.floor(diffMs / MS_PER_WEEK);
  const hoursAlive = Math.floor(diffMs / (1000 * 60 * 60));
  const age = Math.floor(daysAlive / 365.25);

  const month = now.getMonth();
  const seasons = ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter"];
  const currentSeason = seasons[month];

  const nextBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday <= now) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  const nextBirthdayWeeks = Math.ceil((nextBirthday.getTime() - now.getTime()) / MS_PER_WEEK);

  return {
    weeksLived: Math.min(weeksLived, TOTAL_WEEKS),
    weeksRemaining: Math.max(0, TOTAL_WEEKS - weeksLived),
    percentLived: Math.min(100, (weeksLived / TOTAL_WEEKS) * 100),
    daysAlive,
    hoursAlive,
    heartbeats: Math.round(daysAlive * 100800),
    breaths: Math.round(daysAlive * 23040),
    sunrises: daysAlive,
    sleepYears: Math.round((daysAlive / 3 / 365.25) * 10) / 10,
    mealsEaten: daysAlive * 3,
    moonCycles: Math.round(daysAlive / 29.53),
    seasonsLived: Math.floor(daysAlive / 365.25) * 4 + [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4][month],
    currentSeason,
    age,
    nextBirthdayWeeks,
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function WeekGrid({ weeksLived }: { weeksLived: number }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const decades = useMemo(() => {
    const result: { label: string; weeks: { index: number; lived: boolean }[] }[] = [];
    for (let decade = 0; decade < LIFE_EXPECTANCY / 10; decade++) {
      const startWeek = decade * 10 * WEEKS_PER_YEAR;
      const weeks: { index: number; lived: boolean }[] = [];
      for (let w = 0; w < 10 * WEEKS_PER_YEAR; w++) {
        const idx = startWeek + w;
        if (idx < TOTAL_WEEKS) {
          weeks.push({ index: idx, lived: idx < weeksLived });
        }
      }
      result.push({ label: `${decade * 10}`, weeks });
    }
    return result;
  }, [weeksLived]);

  return (
    <div className={`liw-grid-container${revealed ? " liw-grid-revealed" : ""}`} ref={gridRef}>
      <div className="liw-grid-header">
        <span className="liw-grid-subtitle">Each dot is one week of your life</span>
      </div>
      <div className="liw-decades">
        {decades.map((decade) => (
          <div key={decade.label} className="liw-decade">
            <span className="liw-decade-label">{decade.label}</span>
            <div className="liw-decade-weeks">
              {decade.weeks.map((week) => (
                <span
                  key={week.index}
                  className={`liw-week${week.lived ? " liw-week-lived" : ""}`}
                  style={week.lived ? { animationDelay: `${Math.min(week.index * 0.15, 800)}ms` } : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="liw-grid-legend">
        <span className="liw-legend-item"><span className="liw-week liw-week-lived liw-legend-dot" /> Weeks lived</span>
        <span className="liw-legend-item"><span className="liw-week liw-legend-dot" /> Weeks remaining</span>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="liw-stat">
      <span className="liw-stat-value">{value}</span>
      <span className="liw-stat-label">{label}</span>
    </div>
  );
}

export default function LifeInWeeks() {
  const [step, setStep] = useState<1 | 2>(1);
  const [dateStr, setDateStr] = useState("");
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    if (!birthDate) return null;
    return computeStats(birthDate);
  }, [birthDate]);

  const handleContinue = useCallback(() => {
    if (!dateStr) {
      setError("Please enter your birth date");
      return;
    }
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) {
      setError("That doesn't look like a valid date");
      return;
    }
    if (d > new Date()) {
      setError("Birth date can't be in the future");
      return;
    }
    if (d.getFullYear() < 1900) {
      setError("Please enter a date after 1900");
      return;
    }
    setError("");
    setBirthDate(d);
    setStep(2);
  }, [dateStr]);

  const handleBack = useCallback(() => {
    setStep(1);
  }, []);

  if (step === 1) {
    return (
      <div className="liw-body">
        <div className="liw-bezel">
          <div className="liw-screen">
            <div className="scanlines" />
            <div className="liw-intro">
              <div className="liw-intro-icon">◷</div>
              <h1 className="liw-intro-title">Your life in weeks</h1>
              <p className="liw-intro-desc">
                The average human life is about {formatNumber(TOTAL_WEEKS)} weeks.
                <br />
                Enter your birth date to see yours.
              </p>
              <div className="liw-input-group">
                <input
                  className="liw-date-input"
                  type="date"
                  value={dateStr}
                  onChange={(e) => {
                    setDateStr(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  max={new Date().toISOString().split("T")[0]}
                  min="1900-01-01"
                />
                <button className="liw-continue-btn" onClick={handleContinue}>
                  Show me
                </button>
              </div>
              {error && <p className="liw-error">{error}</p>}
            </div>
          </div>
        </div>
        <div className="clock-footer">
          <div className="led-cluster">
            <div className="led led-on" />
            <div className="led" />
          </div>
          <span className="model-label">LIFE v1.0</span>
        </div>
      </div>
    );
  }

  return (
    <div className="liw-body liw-body-wide">
      <div className="liw-bezel">
        <div className="liw-screen">
          <div className="scanlines" />
          <div className="liw-result">
            <div className="liw-result-header">
              <button className="liw-back-btn" onClick={handleBack}>← Back</button>
              <h1 className="liw-result-title">Your life in weeks</h1>
              <div className="liw-result-spacer" />
            </div>

            <div className="liw-hero-stats">
              <div className="liw-hero-stat">
                <span className="liw-hero-num">{formatNumber(stats!.weeksLived)}</span>
                <span className="liw-hero-label">weeks lived</span>
              </div>
              <div className="liw-hero-divider" />
              <div className="liw-hero-stat">
                <span className="liw-hero-num">{formatNumber(stats!.weeksRemaining)}</span>
                <span className="liw-hero-label">weeks remaining</span>
              </div>
              <div className="liw-hero-divider" />
              <div className="liw-hero-stat">
                <span className="liw-hero-num">{stats!.percentLived.toFixed(1)}%</span>
                <span className="liw-hero-label">of an {LIFE_EXPECTANCY}-year life</span>
              </div>
            </div>

            <div className="liw-progress-wrap">
              <div className="liw-progress-bar">
                <div
                  className="liw-progress-fill"
                  style={{ width: `${Math.min(stats!.percentLived, 100)}%` }}
                />
              </div>
            </div>

            <WeekGrid weeksLived={stats!.weeksLived} />

            <div className="liw-stats-section">
              <h2 className="liw-stats-heading">Moments in numbers</h2>
              <div className="liw-stats-grid">
                <StatCard value={formatNumber(stats!.daysAlive)} label="days on earth" />
                <StatCard value={formatNumber(stats!.sunrises)} label="sunrises witnessed" />
                <StatCard value={`~${formatNumber(stats!.heartbeats)}`} label="heartbeats" />
                <StatCard value={`~${formatNumber(stats!.breaths)}`} label="breaths taken" />
                <StatCard value={`~${formatNumber(stats!.mealsEaten)}`} label="meals eaten" />
                <StatCard value={`${stats!.sleepYears} years`} label="spent sleeping" />
                <StatCard value={formatNumber(stats!.moonCycles)} label="full moons" />
                <StatCard value={formatNumber(stats!.seasonsLived)} label="seasons experienced" />
              </div>
            </div>

            <div className="liw-reflection">
              <p className="liw-reflection-text">
                {stats!.nextBirthdayWeeks <= 1
                  ? "Your birthday is this week. Another orbit complete."
                  : `${stats!.nextBirthdayWeeks} weeks until your next birthday.`}
              </p>
              <p className="liw-reflection-text liw-reflection-quiet">
                It is {stats!.currentSeason.toLowerCase()} — your {formatNumber(stats!.seasonsLived)}th season.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="clock-footer">
        <div className="led-cluster">
          <div className="led led-on" />
          <div className="led" />
        </div>
        <span className="model-label">LIFE v1.0</span>
      </div>
    </div>
  );
}
