"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DrumPattern, DrumTrack, STEPS, DEFAULT_PATTERN } from "../lib/types";
import { playDrumSound } from "../lib/synth";

export default function DrumMachine() {
  const [pattern, setPattern] = useState<DrumPattern>(DEFAULT_PATTERN);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(DEFAULT_PATTERN.bpm);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextNoteTimeRef = useRef(0);
  const stepRef = useRef(0);
  const patternRef = useRef(pattern);
  const bpmRef = useRef(bpm);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const scheduleStep = useCallback((stepIndex: number, time: number) => {
    const pat = patternRef.current;
    for (const track of pat.tracks) {
      if (track.steps[stepIndex]) {
        const ctx = audioCtxRef.current;
        if (ctx) playDrumSound(ctx, track.id, time);
      }
    }
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !isPlayingRef.current) return;

    const scheduleAhead = 0.1;
    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAhead) {
      scheduleStep(stepRef.current, nextNoteTimeRef.current);
      setCurrentStep(stepRef.current);

      const secondsPer16th = 60.0 / bpmRef.current / 4;
      nextNoteTimeRef.current += secondsPer16th;
      stepRef.current = (stepRef.current + 1) % STEPS;
    }
  }, [scheduleStep]);

  const startPlayback = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    isPlayingRef.current = true;
    stepRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    setIsPlaying(true);
    setCurrentStep(0);

    schedulerRef.current = setInterval(scheduler, 25);
  }, [scheduler]);

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentStep(-1);
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    setPattern((prev) => {
      const newTracks = prev.tracks.map((track, i) => {
        if (i !== trackIndex) return track;
        const newSteps = [...track.steps];
        newSteps[stepIndex] = !newSteps[stepIndex];
        return { ...track, steps: newSteps };
      });
      return { ...prev, tracks: newTracks };
    });
  };

  const removeTrack = (trackIndex: number) => {
    setPattern((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== trackIndex),
    }));
  };

  const generatePattern = async () => {
    if (!description.trim()) return;
    setIsLoading(true);
    stopPlayback();
    try {
      const res = await fetch("/api/drum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json();
      if (data.pattern) {
        setPattern(data.pattern);
        setBpm(data.pattern.bpm);
      }
    } catch {
      setPattern(DEFAULT_PATTERN);
      setBpm(DEFAULT_PATTERN.bpm);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") generatePattern();
  };

  const clearPattern = () => {
    stopPlayback();
    setPattern((prev) => ({
      ...prev,
      tracks: prev.tracks.map((track) => ({
        ...track,
        steps: Array(STEPS).fill(false),
      })),
    }));
  };

  return (
    <div className="clock-body drum-body">
      <div className="clock-bezel">
        <div className="clock-screen drum-screen">
          <div className="scanlines" />
          <div className="screen-content drum-content">
            {/* Input Section */}
            <div className="drum-input-row">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe a beat... (e.g. funky hip hop)"
                className="drum-input"
                disabled={isLoading}
              />
              <button
                onClick={generatePattern}
                disabled={isLoading || !description.trim()}
                className="drum-btn drum-btn-generate"
              >
                {isLoading ? "..." : "GEN"}
              </button>
            </div>

            {/* Transport Controls */}
            <div className="drum-transport">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
                className={`drum-btn drum-btn-play ${isPlaying ? "active" : ""}`}
              >
                {isPlaying ? "STOP" : "PLAY"}
              </button>
              <button onClick={clearPattern} className="drum-btn">
                CLR
              </button>
              <div className="drum-bpm">
                <label className="drum-bpm-label">BPM</label>
                <input
                  type="range"
                  min={70}
                  max={170}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="drum-bpm-slider"
                />
                <span className="drum-bpm-value">{bpm}</span>
              </div>
            </div>

            {/* Step Sequencer Grid */}
            <div className="drum-grid-wrapper">
              {/* Step numbers */}
              <div className="drum-grid-header">
                <div className="drum-label-spacer" />
                {Array.from({ length: STEPS }, (_, i) => (
                  <div
                    key={i}
                    className={`drum-step-num ${i % 4 === 0 ? "beat-marker" : ""}`}
                  >
                    {i + 1}
                  </div>
                ))}
                <div className="drum-remove-spacer" />
              </div>

              {/* Tracks */}
              {pattern.tracks.map((track, trackIdx) => (
                <div key={track.id} className="drum-row">
                  <div className="drum-label">{track.label}</div>
                  {track.steps.map((active, stepIdx) => (
                    <button
                      key={stepIdx}
                      className={`drum-cell${active ? " on" : ""}${currentStep === stepIdx ? " playhead" : ""}${stepIdx % 4 === 0 ? " beat-start" : ""}`}
                      onClick={() => toggleStep(trackIdx, stepIdx)}
                    />
                  ))}
                  <button
                    className="drum-remove-btn"
                    onClick={() => removeTrack(trackIdx)}
                    title="Remove track"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Loading overlay */}
            {isLoading && (
              <div className="drum-loading">
                <div className="loading-indicator">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <span className="drum-loading-text">Generating pattern...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="clock-footer">
        <div className="led-cluster">
          <div className={`led ${isPlaying ? "led-active" : ""}`} />
          <span className="led-label">
            {isPlaying ? "PLAYING" : isLoading ? "SYNC" : "READY"}
          </span>
        </div>
        <div className="digital-time">{bpm} BPM</div>
        <div className="brand-mark">
          DRUM<span className="brand-thin">MACHINE</span>
        </div>
      </div>
    </div>
  );
}
