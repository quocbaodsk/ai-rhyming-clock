import { DrumInstrument } from "./types";

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleCount = Math.floor(44100 * duration);
  const buffer = ctx.createBuffer(1, sampleCount, 44100);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playKick(ctx: AudioContext, time: number, volume: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.3);
}

function playSnare(ctx: AudioContext, time: number, volume: number): void {
  const noiseBuffer = createNoiseBuffer(ctx, 0.2);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(5000, time);
  noiseFilter.Q.setValueAtTime(1, time);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.5 * volume, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseSource.start(time);
  noiseSource.stop(time + 0.15);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, time);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.3 * volume, time);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.1);
}

function playHihatClosed(
  ctx: AudioContext,
  time: number,
  volume: number,
): void {
  const buffer = createNoiseBuffer(ctx, 0.05);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(8000, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4 * volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(time);
  source.stop(time + 0.05);
}

function playHihatOpen(ctx: AudioContext, time: number, volume: number): void {
  const buffer = createNoiseBuffer(ctx, 0.3);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(8000, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4 * volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(time);
  source.stop(time + 0.3);
}

function playClap(ctx: AudioContext, time: number, volume: number): void {
  const buffer = createNoiseBuffer(ctx, 0.15);
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2500, time);
  filter.Q.setValueAtTime(1.5, time);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
  gain.gain.setValueAtTime(0.8 * volume, time + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025 + 0.1);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(time);
  source.stop(time + 0.15);
}

function playTomLow(ctx: AudioContext, time: number, volume: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(100, time);
  osc.frequency.exponentialRampToValueAtTime(60, time + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.25);
}

function playTomHigh(ctx: AudioContext, time: number, volume: number): void {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, time);
  osc.frequency.exponentialRampToValueAtTime(120, time + 0.12);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.2);
}

export function playDrumSound(
  ctx: AudioContext,
  instrument: DrumInstrument,
  time: number,
  volume: number = 1.0,
): void {
  switch (instrument) {
    case "kick":
      playKick(ctx, time, volume);
      break;
    case "snare":
      playSnare(ctx, time, volume);
      break;
    case "hihat_closed":
      playHihatClosed(ctx, time, volume);
      break;
    case "hihat_open":
      playHihatOpen(ctx, time, volume);
      break;
    case "clap":
      playClap(ctx, time, volume);
      break;
    case "tom_low":
      playTomLow(ctx, time, volume);
      break;
    case "tom_high":
      playTomHigh(ctx, time, volume);
      break;
  }
}
