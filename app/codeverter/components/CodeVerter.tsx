"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const LANGUAGES = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
  "PHP",
  "Ruby",
  "Dart",
  "Scala",
  "R",
  "Perl",
  "Lua",
  "Haskell",
  "Elixir",
  "Clojure",
  "Shell (Bash)",
  "SQL",
  "MATLAB",
  "Objective-C",
];

interface LanguageDropdownProps {
  value: string;
  onChange: (lang: string) => void;
  id: string;
}

function LanguageDropdown({ value, onChange, id }: LanguageDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = LANGUAGES.filter((l) =>
    l.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (lang: string) => {
    onChange(lang);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="cv-dropdown" ref={wrapRef}>
      <button
        className="cv-dropdown-btn"
        onClick={() => {
          setOpen(!open);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        type="button"
        id={id}
      >
        <span>{value || "Select language"}</span>
        <span className="cv-dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="cv-dropdown-menu">
          <input
            ref={inputRef}
            className="cv-dropdown-search"
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="cv-dropdown-list">
            {filtered.length === 0 && (
              <li className="cv-dropdown-empty">No match</li>
            )}
            {filtered.map((lang) => (
              <li
                key={lang}
                className={`cv-dropdown-item${lang === value ? " cv-dropdown-item-active" : ""}`}
                onClick={() => select(lang)}
              >
                {lang}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CodeVerter() {
  const [sourceLanguage, setSourceLanguage] = useState("Python");
  const [targetLanguage, setTargetLanguage] = useState("JavaScript");
  const [sourceCode, setSourceCode] = useState("");
  const [outputCode, setOutputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const convert = useCallback(async () => {
    if (!sourceCode.trim()) return;
    setLoading(true);
    setError("");
    setOutputCode("");

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: sourceCode,
          sourceLanguage,
          targetLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Conversion failed");
      } else {
        setOutputCode(data.code);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sourceCode, sourceLanguage, targetLanguage]);

  return (
    <div className="cv-body">
      <div className="cv-bezel">
        <div className="cv-screen">
          <div className="scanlines" />

          <div className="cv-content">
            <div className="cv-title">CODEVERTER</div>

            <div className="cv-panels">
              <div className="cv-panel">
                <div className="cv-panel-header">
                  <span className="cv-panel-label">SOURCE</span>
                  <LanguageDropdown
                    value={sourceLanguage}
                    onChange={setSourceLanguage}
                    id="source-lang"
                  />
                </div>
                <textarea
                  className="cv-code-input"
                  placeholder="Paste your code here..."
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="cv-divider">
                <button
                  className="cv-convert-btn"
                  onClick={convert}
                  disabled={loading || !sourceCode.trim()}
                >
                  {loading ? "···" : "CONVERT →"}
                </button>
              </div>

              <div className="cv-panel">
                <div className="cv-panel-header">
                  <span className="cv-panel-label">OUTPUT</span>
                  <LanguageDropdown
                    value={targetLanguage}
                    onChange={setTargetLanguage}
                    id="target-lang"
                  />
                </div>
                <textarea
                  className="cv-code-input cv-code-output"
                  value={loading ? "Converting..." : outputCode}
                  readOnly
                  spellCheck={false}
                  placeholder="Converted code appears here..."
                />
              </div>
            </div>

            {error && <div className="cv-error">{error}</div>}
          </div>
        </div>
      </div>

      <div className="clock-footer">
        <div className="led-cluster">
          <div className={`led${loading ? " led-pulse" : " led-on"}`} />
          <div className="led" />
        </div>
        <span className="model-label">CODEVERTER v1.0</span>
      </div>
    </div>
  );
}
