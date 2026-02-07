import {
  LevelData, Player, InputState, Camera, GameStats, Platform, Rect,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED, PLAYER_JUMP_VELOCITY,
  PLAYER_JUMP_HOLD_TIME, PLAYER_JUMP_HOLD_BOOST,
  VIEW_WIDTH, VIEW_HEIGHT, CAMERA_DEADZONE_X, CAMERA_DEADZONE_Y, CAMERA_SMOOTH,
} from './types';

export type GameEvent =
  | { type: 'coin'; value: number }
  | { type: 'goal_reached' }
  | { type: 'player_died' };

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Engine {
  level: LevelData;
  player: Player;
  camera: Camera;
  stats: GameStats;
  private onEvent: (event: GameEvent) => void;

  constructor(level: LevelData, onEvent: (event: GameEvent) => void) {
    this.level = level;
    this.onEvent = onEvent;
    this.stats = { score: 0, coins: 0, deaths: 0, timeElapsed: 0 };
    this.player = this.createPlayer();
    this.camera = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.initPlatforms();
    this.resetCamera();
  }

  private createPlayer(): Player {
    return {
      pos: { x: this.level.spawn.x, y: this.level.spawn.y },
      vel: { x: 0, y: 0 },
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      onGround: false,
      facing: 1,
      jumpHeld: false,
      jumpTime: 0,
      isDead: false,
      deathTimer: 0,
    };
  }

  private initPlatforms(): void {
    for (const p of this.level.platforms) {
      if (p.type === 'moving' && p.path && p.path.length > 0) {
        p._pathIndex = 0;
        p._pathDirection = 1;
        p._currentPos = { x: p.path[0].x, y: p.path[0].y };
      }
      if (p.type === 'crumbling') {
        p._crumbleTimer = 0;
        p._isGone = false;
        p._respawnTimer = 0;
      }
    }
  }

  private getPlayerRect(): Rect {
    return {
      x: this.player.pos.x,
      y: this.player.pos.y,
      w: this.player.width,
      h: this.player.height,
    };
  }

  private getPlatformRect(p: Platform): Rect {
    if (p.type === 'moving' && p._currentPos) {
      return { x: p._currentPos.x, y: p._currentPos.y, w: p.rect.w, h: p.rect.h };
    }
    return { ...p.rect };
  }

  update(dt: number, input: InputState): void {
    if (this.player.isDead) {
      this.player.deathTimer -= dt;
      if (this.player.deathTimer <= 0) {
        this.respawn();
      }
      return;
    }

    this.stats.timeElapsed += dt;
    this.updatePlayer(dt, input);
    this.updatePlatforms(dt);
    this.checkCollisions();
    this.checkCollectibles();
    this.checkHazards();
    this.checkGoal();
    this.updateCamera(dt);
    this.checkBounds();
  }

  private updatePlayer(dt: number, input: InputState): void {
    const p = this.player;

    if (input.left) {
      p.vel.x = -PLAYER_SPEED;
      p.facing = -1;
    } else if (input.right) {
      p.vel.x = PLAYER_SPEED;
      p.facing = 1;
    } else {
      p.vel.x *= 0.7;
    }

    if (input.jump && p.onGround) {
      p.vel.y = PLAYER_JUMP_VELOCITY;
      p.onGround = false;
      p.jumpHeld = true;
      p.jumpTime = 0;
    }

    if (input.jump && p.jumpHeld && p.jumpTime < PLAYER_JUMP_HOLD_TIME) {
      p.vel.y += PLAYER_JUMP_HOLD_BOOST * dt;
      p.jumpTime += dt;
    }

    if (!input.jump) {
      p.jumpHeld = false;
    }

    p.vel.y += this.level.world.gravity * dt;
    if (p.vel.y > 600) p.vel.y = 600;

    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
  }

  private updatePlatforms(dt: number): void {
    for (const p of this.level.platforms) {
      if (p.type === 'moving') {
        this.updateMovingPlatform(p, dt);
      }
      if (p.type === 'crumbling') {
        this.updateCrumblingPlatform(p, dt);
      }
    }
  }

  private updateMovingPlatform(p: Platform, dt: number): void {
    if (!p.path || p.path.length < 2 || !p._currentPos) return;

    const speed = p.speed ?? 60;
    const targetIndex = p._pathIndex! + p._pathDirection!;
    const target = p.path[targetIndex];
    if (!target) return;

    const dx = target.x - p._currentPos.x;
    const dy = target.y - p._currentPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < speed * dt) {
      const prevX = p._currentPos.x;
      const prevY = p._currentPos.y;
      p._currentPos.x = target.x;
      p._currentPos.y = target.y;
      p._pathIndex = targetIndex;

      if (targetIndex >= p.path.length - 1) {
        p._pathDirection = -1;
      } else if (targetIndex <= 0) {
        p._pathDirection = 1;
      }

      this.movePlayerWithPlatform(p, p._currentPos.x - prevX, p._currentPos.y - prevY);
    } else {
      const nx = dx / dist;
      const ny = dy / dist;
      const moveX = nx * speed * dt;
      const moveY = ny * speed * dt;
      p._currentPos.x += moveX;
      p._currentPos.y += moveY;

      this.movePlayerWithPlatform(p, moveX, moveY);
    }
  }

  private movePlayerWithPlatform(p: Platform, deltaX: number, deltaY: number): void {
    if (!this.player.onGround) return;

    const pRect = this.getPlatformRect(p);
    const playerRect = this.getPlayerRect();
    const playerBottom = playerRect.y + playerRect.h;
    const onTop =
      playerBottom >= pRect.y - 2 &&
      playerBottom <= pRect.y + 4 &&
      playerRect.x + playerRect.w > pRect.x &&
      playerRect.x < pRect.x + pRect.w;

    if (onTop) {
      this.player.pos.x += deltaX;
      this.player.pos.y += deltaY;
    }
  }

  private updateCrumblingPlatform(p: Platform, dt: number): void {
    if (p._isGone) {
      if (p.respawnTime && p.respawnTime > 0) {
        p._respawnTimer = (p._respawnTimer ?? 0) + dt * 1000;
        if (p._respawnTimer >= p.respawnTime) {
          p._isGone = false;
          p._crumbleTimer = 0;
          p._respawnTimer = 0;
        }
      }
      return;
    }

    if ((p._crumbleTimer ?? 0) > 0) {
      p._crumbleTimer! += dt * 1000;
      if (p._crumbleTimer! >= (p.crumbleDelay ?? 500)) {
        p._isGone = true;
        p._respawnTimer = 0;
      }
    }
  }

  private checkCollisions(): void {
    this.player.onGround = false;

    const playerRect = this.getPlayerRect();

    for (const p of this.level.platforms) {
      if (p._isGone) continue;

      const pRect = this.getPlatformRect(p);
      if (!rectsOverlap(playerRect, pRect)) continue;

      const overlapLeft = playerRect.x + playerRect.w - pRect.x;
      const overlapRight = pRect.x + pRect.w - playerRect.x;
      const overlapTop = playerRect.y + playerRect.h - pRect.y;
      const overlapBottom = pRect.y + pRect.h - playerRect.y;

      const minOverlapX = Math.min(overlapLeft, overlapRight);
      const minOverlapY = Math.min(overlapTop, overlapBottom);

      if (minOverlapY < minOverlapX) {
        if (overlapTop < overlapBottom) {
          this.player.pos.y = pRect.y - this.player.height;
          this.player.vel.y = 0;
          this.player.onGround = true;
          this.player.jumpTime = 0;

          if (p.type === 'bounce') {
            const mult = p.bounceMultiplier ?? 1.5;
            this.player.vel.y = PLAYER_JUMP_VELOCITY * mult;
            this.player.onGround = false;
          }

          if (p.type === 'crumbling' && (p._crumbleTimer ?? 0) === 0) {
            p._crumbleTimer = 0.001;
          }
        } else {
          this.player.pos.y = pRect.y + pRect.h;
          this.player.vel.y = 0;
        }
      } else {
        if (overlapLeft < overlapRight) {
          this.player.pos.x = pRect.x - this.player.width;
        } else {
          this.player.pos.x = pRect.x + pRect.w;
        }
        this.player.vel.x = 0;
      }

      playerRect.x = this.player.pos.x;
      playerRect.y = this.player.pos.y;
    }
  }

  private checkCollectibles(): void {
    const centerX = this.player.pos.x + this.player.width / 2;
    const centerY = this.player.pos.y + this.player.height / 2;

    for (const c of this.level.collectibles) {
      if (c._collected) continue;
      const dx = centerX - c.pos.x;
      const dy = centerY - c.pos.y;
      if (dx * dx + dy * dy < 16 * 16) {
        c._collected = true;
        this.stats.coins += 1;
        this.stats.score += c.value;
        this.onEvent({ type: 'coin', value: c.value });
      }
    }
  }

  private checkHazards(): void {
    const playerRect = this.getPlayerRect();
    for (const h of this.level.hazards) {
      if (rectsOverlap(playerRect, h.rect)) {
        this.killPlayer();
        return;
      }
    }
  }

  private checkGoal(): void {
    const playerRect = this.getPlayerRect();
    if (rectsOverlap(playerRect, this.level.goal)) {
      this.onEvent({ type: 'goal_reached' });
    }
  }

  private updateCamera(dt: number): void {
    const playerCenterX = this.player.pos.x + this.player.width / 2;
    const playerCenterY = this.player.pos.y + this.player.height / 2;

    const camCenterX = this.camera.targetX + VIEW_WIDTH / 2;
    const camCenterY = this.camera.targetY + VIEW_HEIGHT / 2;

    if (playerCenterX > camCenterX + CAMERA_DEADZONE_X) {
      this.camera.targetX += playerCenterX - (camCenterX + CAMERA_DEADZONE_X);
    } else if (playerCenterX < camCenterX - CAMERA_DEADZONE_X) {
      this.camera.targetX += playerCenterX - (camCenterX - CAMERA_DEADZONE_X);
    }

    if (playerCenterY > camCenterY + CAMERA_DEADZONE_Y) {
      this.camera.targetY += playerCenterY - (camCenterY + CAMERA_DEADZONE_Y);
    } else if (playerCenterY < camCenterY - CAMERA_DEADZONE_Y) {
      this.camera.targetY += playerCenterY - (camCenterY - CAMERA_DEADZONE_Y);
    }

    const maxX = Math.max(0, this.level.world.width - VIEW_WIDTH);
    const maxY = Math.max(0, this.level.world.height - VIEW_HEIGHT);
    this.camera.targetX = Math.max(0, Math.min(this.camera.targetX, maxX));
    this.camera.targetY = Math.max(0, Math.min(this.camera.targetY, maxY));

    const lerpFactor = CAMERA_SMOOTH * dt;
    this.camera.x += (this.camera.targetX - this.camera.x) * lerpFactor;
    this.camera.y += (this.camera.targetY - this.camera.y) * lerpFactor;

    this.camera.x = Math.max(0, Math.min(this.camera.x, maxX));
    this.camera.y = Math.max(0, Math.min(this.camera.y, maxY));
  }

  private checkBounds(): void {
    if (this.player.pos.y > this.level.world.height + 50) {
      this.killPlayer();
    }
  }

  private killPlayer(): void {
    if (this.player.isDead) return;
    this.player.isDead = true;
    this.player.deathTimer = 1.0;
    this.player.vel.x = 0;
    this.player.vel.y = 0;
    this.onEvent({ type: 'player_died' });
  }

  private respawn(): void {
    this.player = this.createPlayer();
    this.stats.deaths += 1;
    this.resetCamera();
  }

  resetCamera(): void {
    const px = this.player.pos.x + this.player.width / 2 - VIEW_WIDTH / 2;
    const py = this.player.pos.y + this.player.height / 2 - VIEW_HEIGHT / 2;
    const maxX = Math.max(0, this.level.world.width - VIEW_WIDTH);
    const maxY = Math.max(0, this.level.world.height - VIEW_HEIGHT);
    const cx = Math.max(0, Math.min(px, maxX));
    const cy = Math.max(0, Math.min(py, maxY));
    this.camera.x = cx;
    this.camera.y = cy;
    this.camera.targetX = cx;
    this.camera.targetY = cy;
  }
}
