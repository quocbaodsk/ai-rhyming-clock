"use client";

import { useState, useRef, useCallback } from "react";

interface Suggestion {
  principle: string;
  severity: "high" | "medium" | "low";
  line?: number;
  issue: string;
  fix: string;
}

interface CodeReview {
  score: number;
  summary: string;
  suggestions: Suggestion[];
  strengths: string[];
}

const SEVERITY_CONFIG = {
  high: { label: "HIGH", color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
  medium: { label: "MED", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  low: { label: "LOW", color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.2)" },
};

function getScoreColor(score: number): string {
  if (score >= 90) return "#22c55e";
  if (score >= 75) return "#3b82f6";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Poor";
}

export default function CodingCoach() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const [review, setReview] = useState<CodeReview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50000) {
      setError("File too large. Maximum size is 50KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCode(text);
      setFilename(file.name);
      setError("");
      setReview(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.size > 50000) {
      setError("File too large. Maximum size is 50KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCode(text);
      setFilename(file.name);
      setError("");
      setReview(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const submitCode = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError("");
    setReview(null);
    setActiveFilter(null);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, filename }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.review) {
        setReview(data.review);
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setCode("");
    setFilename("");
    setReview(null);
    setError("");
    setActiveFilter(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredSuggestions = review?.suggestions.filter(
    (s) => !activeFilter || s.principle === activeFilter
  );

  const principles = review
    ? [...new Set(review.suggestions.map((s) => s.principle))]
    : [];

  const lineCount = code.split("\n").length;

  return (
    <div className="coach-container">
      <div className="coach-header">
        <h1 className="coach-title">Coding Coach</h1>
        <p className="coach-subtitle">
          Upload your code for an AI-powered review on production readiness and maintainability
        </p>
      </div>

      <div className="coach-layout">
        {/* Left: Code Input */}
        <div className="coach-panel coach-input-panel">
          <div className="coach-panel-header">
            <span className="coach-panel-title">
              {filename || "Your Code"}
            </span>
            <div className="coach-panel-actions">
              {code && (
                <span className="coach-line-count">{lineCount} lines</span>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="coach-btn coach-btn-secondary"
              >
                Upload File
              </button>
              {code && (
                <button onClick={clearAll} className="coach-btn coach-btn-ghost">
                  Clear
                </button>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.c,.cpp,.cs,.rb,.php,.swift,.kt,.vue,.svelte,.html,.css,.sql,.sh,.bash,.yaml,.yml,.json,.xml,.toml,.md"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />

          {!code ? (
            <div
              className="coach-dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="coach-dropzone-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </div>
              <span className="coach-dropzone-text">
                Drop a file here or click to browse
              </span>
              <span className="coach-dropzone-hint">
                Supports most programming languages — max 50KB
              </span>
            </div>
          ) : (
            <div className="coach-code-area">
              <div className="coach-code-gutter">
                {code.split("\n").map((_, i) => (
                  <div key={i} className="coach-line-num">{i + 1}</div>
                ))}
              </div>
              <textarea
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setReview(null);
                }}
                className="coach-code-editor"
                spellCheck={false}
              />
            </div>
          )}

          <div className="coach-submit-row">
            {error && <span className="coach-error">{error}</span>}
            <button
              onClick={submitCode}
              disabled={!code.trim() || isLoading}
              className="coach-btn coach-btn-primary"
            >
              {isLoading ? (
                <span className="coach-btn-loading">
                  <span className="coach-spinner" />
                  Analyzing...
                </span>
              ) : (
                "Evaluate Code"
              )}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="coach-panel coach-results-panel">
          {!review && !isLoading && (
            <div className="coach-empty-state">
              <div className="coach-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="coach-empty-text">
                Upload code to get your review
              </span>
              <span className="coach-empty-hint">
                Your code will be evaluated on 7 key principles
              </span>
            </div>
          )}

          {isLoading && (
            <div className="coach-loading-state">
              <div className="coach-loading-pulse" />
              <span className="coach-loading-text">Reviewing your code...</span>
              <span className="coach-loading-hint">
                Checking naming, structure, error handling, and more
              </span>
            </div>
          )}

          {review && (
            <div className="coach-results">
              {/* Score Card */}
              <div className="coach-score-card">
                <div className="coach-score-ring" style={{ "--score-color": getScoreColor(review.score) } as React.CSSProperties}>
                  <svg viewBox="0 0 100 100" className="coach-score-svg">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={getScoreColor(review.score)}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(review.score / 100) * 264} 264`}
                      transform="rotate(-90 50 50)"
                      style={{ filter: `drop-shadow(0 0 6px ${getScoreColor(review.score)}40)` }}
                    />
                  </svg>
                  <div className="coach-score-inner">
                    <span className="coach-score-num" style={{ color: getScoreColor(review.score) }}>
                      {review.score}
                    </span>
                    <span className="coach-score-label" style={{ color: getScoreColor(review.score) }}>
                      {getScoreLabel(review.score)}
                    </span>
                  </div>
                </div>
                <p className="coach-summary">{review.summary}</p>
              </div>

              {/* Strengths */}
              {review.strengths.length > 0 && (
                <div className="coach-section">
                  <h3 className="coach-section-title coach-section-strengths">Strengths</h3>
                  <ul className="coach-strengths-list">
                    {review.strengths.map((s, i) => (
                      <li key={i} className="coach-strength-item">{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {review.suggestions.length > 0 && (
                <div className="coach-section">
                  <div className="coach-section-header">
                    <h3 className="coach-section-title">
                      Suggestions
                      <span className="coach-suggestion-count">{filteredSuggestions?.length}</span>
                    </h3>
                    {principles.length > 1 && (
                      <div className="coach-filters">
                        <button
                          className={`coach-filter-btn${!activeFilter ? " active" : ""}`}
                          onClick={() => setActiveFilter(null)}
                        >
                          All
                        </button>
                        {principles.map((p) => (
                          <button
                            key={p}
                            className={`coach-filter-btn${activeFilter === p ? " active" : ""}`}
                            onClick={() => setActiveFilter(activeFilter === p ? null : p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="coach-suggestions-list">
                    {filteredSuggestions?.map((s, i) => {
                      const sev = SEVERITY_CONFIG[s.severity];
                      return (
                        <div
                          key={i}
                          className="coach-suggestion"
                          style={{ borderLeftColor: sev.color }}
                        >
                          <div className="coach-suggestion-header">
                            <span
                              className="coach-severity-badge"
                              style={{ color: sev.color, background: sev.bg, borderColor: sev.border }}
                            >
                              {sev.label}
                            </span>
                            <span className="coach-principle-tag">{s.principle}</span>
                            {s.line && <span className="coach-line-ref">Line {s.line}</span>}
                          </div>
                          <p className="coach-suggestion-issue">{s.issue}</p>
                          <p className="coach-suggestion-fix">{s.fix}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {review.suggestions.length === 0 && (
                <div className="coach-no-issues">
                  No issues found — your code looks clean.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
