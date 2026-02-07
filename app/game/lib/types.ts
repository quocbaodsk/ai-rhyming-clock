export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PlatformType = 'normal' | 'moving' | 'crumbling' | 'bounce';

export interface Platform {
  id: string;
  type: PlatformType;
  rect: Rect;
  // moving platform fields
  path?: Vec2[];
  speed?: number;
  // crumbling platform fields
  crumbleDelay?: number;
  respawnTime?: number;
  // bounce platform fields
  bounceMultiplier?: number;
  // runtime state
  _pathIndex?: number;
  _pathDirection?: number;
  _crumbleTimer?: number;
  _isGone?: boolean;
  _respawnTimer?: number;
  _currentPos?: Vec2;
}

export interface Hazard {
  id: string;
  type: 'spikes' | 'lava';
  rect: Rect;
}

export interface Collectible {
  id: string;
  type: 'coin' | 'gem';
  pos: Vec2;
  value: number;
  _collected?: boolean;
}

export interface Decor {
  id: string;
  layer: 'far' | 'mid' | 'near';
  kind: string;
  pos: Vec2;
  size: { w: number; h: number };
  parallax: number;
  opacity: number;
}

export interface LevelData {
  levelNumber: number;
  theme: string;
  world: {
    width: number;
    height: number;
    gravity: number;
  };
  spawn: Vec2;
  goal: Rect;
  platforms: Platform[];
  hazards: Hazard[];
  collectibles: Collectible[];
  decor: Decor[];
}

export interface Player {
  pos: Vec2;
  vel: Vec2;
  width: number;
  height: number;
  onGround: boolean;
  facing: number; // 1 = right, -1 = left
  jumpHeld: boolean;
  jumpTime: number;
  isDead: boolean;
  deathTimer: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

export interface GameStats {
  score: number;
  coins: number;
  deaths: number;
  timeElapsed: number;
}

export type GameScreen =
  | { name: 'title' }
  | { name: 'theme_select'; levelNumber: number }
  | { name: 'generating'; levelNumber: number; theme: string }
  | { name: 'playing'; levelNumber: number; theme: string; level: LevelData }
  | { name: 'level_complete'; levelNumber: number; theme: string; stats: GameStats }
  | { name: 'game_over'; levelNumber: number; theme: string; stats: GameStats };

export const PLAYER_WIDTH = 16;
export const PLAYER_HEIGHT = 24;
export const PLAYER_SPEED = 220;
export const PLAYER_JUMP_VELOCITY = -480;
export const PLAYER_JUMP_HOLD_TIME = 0.18;
export const PLAYER_JUMP_HOLD_BOOST = -120;
export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 270;
export const CAMERA_DEADZONE_X = 60;
export const CAMERA_DEADZONE_Y = 40;
export const CAMERA_SMOOTH = 8;
