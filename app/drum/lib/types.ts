export type DrumInstrument = 'kick' | 'snare' | 'hihat_closed' | 'hihat_open' | 'clap' | 'tom_low' | 'tom_high';

export type DrumTrack = {
  id: DrumInstrument;
  label: string;
  steps: boolean[];
};

export type DrumPattern = {
  bpm: number;
  tracks: DrumTrack[];
};

export const STEPS = 16;

export const DEFAULT_PATTERN: DrumPattern = {
  bpm: 120,
  tracks: [
    { id: 'kick', label: 'KICK', steps: [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false] },
    { id: 'snare', label: 'SNARE', steps: [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false] },
    { id: 'hihat_closed', label: 'HI-HAT', steps: [true,false,true,false, true,false,true,false, true,false,true,false, true,false,true,false] },
  ],
};
