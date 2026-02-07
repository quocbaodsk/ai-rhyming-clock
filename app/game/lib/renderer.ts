import { LevelData, Player, Camera, Platform, Rect, Vec2, Decor, VIEW_WIDTH, VIEW_HEIGHT } from './types';

const COLORS = {
  bg: '#0a120a',
  platform: '#1a3a1a',
  platformEdge: '#33ff66',
  platformBounce: '#66ffaa',
  platformCrumble: '#2a5a2a',
  platformMoving: '#22aa44',
  hazardSpike: '#ff3b30',
  hazardLava: '#ff6633',
  lavaGlow: '#ff440033',
  coin: '#ffdd33',
  gem: '#33ddff',
  player: '#33ff66',
  playerEye: '#0a120a',
  goal: '#33ff66',
  goalGlow: '#33ff6633',
  decorFar: '#0d1a0d',
  decorMid: '#132613',
  decorNear: '#1a331a',
  text: '#33ff66',
  textDim: '#1a8033',
};

const LAYER_COLORS: Record<string, string> = {
  far: COLORS.decorFar,
  mid: COLORS.decorMid,
  near: COLORS.decorNear,
};

const TRAIL_LENGTH = 3;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private glowBuffer: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;
  private time: number = 0;
  private playerTrail: { x: number; y: number; alpha: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.buffer = document.createElement('canvas');
    this.buffer.width = VIEW_WIDTH;
    this.buffer.height = VIEW_HEIGHT;
    this.bufferCtx = this.buffer.getContext('2d')!;

    this.glowBuffer = document.createElement('canvas');
    this.glowBuffer.width = VIEW_WIDTH;
    this.glowBuffer.height = VIEW_HEIGHT;
    this.glowCtx = this.glowBuffer.getContext('2d')!;
  }

  render(
    level: LevelData,
    player: Player,
    camera: Camera,
    stats: { score: number; levelNumber: number; theme: string },
    dt: number,
  ): void {
    this.time += dt;
    const buf = this.bufferCtx;
    const cx = camera.x;
    const cy = camera.y;

    // 1. Clear buffer
    buf.fillStyle = COLORS.bg;
    buf.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Background grid
    buf.strokeStyle = COLORS.platformEdge;
    buf.globalAlpha = 0.03;
    buf.lineWidth = 1;
    const gridSize = 32;
    const startX = -(cx % gridSize);
    const startY = -(cy % gridSize);
    buf.beginPath();
    for (let x = startX; x < VIEW_WIDTH; x += gridSize) {
      buf.moveTo(x, 0);
      buf.lineTo(x, VIEW_HEIGHT);
    }
    for (let y = startY; y < VIEW_HEIGHT; y += gridSize) {
      buf.moveTo(0, y);
      buf.lineTo(VIEW_WIDTH, y);
    }
    buf.stroke();
    buf.globalAlpha = 1;

    // 2. Parallax decor - far layer
    this.drawDecorLayer(buf, level.decor, 'far', cx, cy);
    // 3. Parallax decor - mid layer
    this.drawDecorLayer(buf, level.decor, 'mid', cx, cy);

    // 4. Platforms
    for (let i = 0; i < level.platforms.length; i++) {
      this.drawPlatform(buf, level.platforms[i], cx, cy);
    }

    // 5. Hazards
    for (let i = 0; i < level.hazards.length; i++) {
      const h = level.hazards[i];
      const rx = h.rect.x - cx;
      const ry = h.rect.y - cy;
      if (rx + h.rect.w < -20 || rx > VIEW_WIDTH + 20) continue;

      if (h.type === 'spikes') {
        this.drawSpikes(buf, rx, ry, h.rect.w, h.rect.h);
      } else {
        this.drawLava(buf, rx, ry, h.rect.w, h.rect.h);
      }
    }

    // 6. Collectibles
    for (let i = 0; i < level.collectibles.length; i++) {
      const c = level.collectibles[i];
      if (c._collected) continue;
      const bob = Math.sin(this.time * 3 + i) * 3;
      const sx = c.pos.x - cx;
      const sy = c.pos.y - cy + bob;
      if (sx < -20 || sx > VIEW_WIDTH + 20) continue;

      if (c.type === 'coin') {
        buf.fillStyle = COLORS.coin;
        buf.beginPath();
        buf.arc(sx, sy, 5, 0, Math.PI * 2);
        buf.fill();
      } else {
        const bigBob = Math.sin(this.time * 3 + i) * 4;
        const dy = c.pos.y - cy + bigBob;
        buf.fillStyle = COLORS.gem;
        buf.save();
        buf.translate(sx, dy);
        buf.rotate(Math.PI / 4);
        buf.fillRect(-5, -5, 10, 10);
        buf.restore();
      }
    }

    // 7. Goal
    this.drawGoal(buf, level.goal, cx, cy);

    // 8. Player
    this.drawPlayer(buf, player, cx, cy);

    // 9. Near decor layer
    this.drawDecorLayer(buf, level.decor, 'near', cx, cy);

    // 10. HUD
    this.drawHUD(buf, stats);

    // 11. Copy buffer to main canvas (pixel-perfect upscale)
    const mainCtx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.clearRect(0, 0, cw, ch);
    mainCtx.drawImage(this.buffer, 0, 0, cw, ch);

    // 12. Bloom/glow pass
    this.glowCtx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.glowCtx.drawImage(this.buffer, 0, 0);

    mainCtx.save();
    mainCtx.globalCompositeOperation = 'screen';
    mainCtx.globalAlpha = 0.15;
    mainCtx.filter = 'blur(4px)';
    mainCtx.drawImage(this.glowBuffer, 0, 0, cw, ch);
    mainCtx.restore();

    // 13. Vignette
    const vGrad = mainCtx.createRadialGradient(
      cw / 2, ch / 2, cw * 0.25,
      cw / 2, ch / 2, cw * 0.75,
    );
    vGrad.addColorStop(0, 'transparent');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.6)');
    mainCtx.fillStyle = vGrad;
    mainCtx.fillRect(0, 0, cw, ch);
  }

  private drawDecorLayer(
    buf: CanvasRenderingContext2D,
    decor: Decor[],
    layer: 'far' | 'mid' | 'near',
    cx: number,
    cy: number,
  ): void {
    const color = LAYER_COLORS[layer];
    for (let i = 0; i < decor.length; i++) {
      const d = decor[i];
      if (d.layer !== layer) continue;
      const dx = d.pos.x - cx * d.parallax;
      const dy = d.pos.y - cy * d.parallax;
      if (dx + d.size.w < -40 || dx > VIEW_WIDTH + 40) continue;

      buf.globalAlpha = d.opacity;
      buf.fillStyle = color;

      switch (d.kind) {
        case 'cloud':
          buf.beginPath();
          this.roundedRect(buf, dx, dy, d.size.w, d.size.h, 6);
          buf.fill();
          break;
        case 'stalactite':
          buf.beginPath();
          buf.moveTo(dx, dy);
          buf.lineTo(dx + d.size.w / 2, dy + d.size.h);
          buf.lineTo(dx + d.size.w, dy);
          buf.closePath();
          buf.fill();
          break;
        case 'stalagmite':
          buf.beginPath();
          buf.moveTo(dx, dy + d.size.h);
          buf.lineTo(dx + d.size.w / 2, dy);
          buf.lineTo(dx + d.size.w, dy + d.size.h);
          buf.closePath();
          buf.fill();
          break;
        case 'bush':
          buf.beginPath();
          buf.ellipse(dx + d.size.w * 0.3, dy + d.size.h * 0.6, d.size.w * 0.3, d.size.h * 0.4, 0, 0, Math.PI * 2);
          buf.fill();
          buf.beginPath();
          buf.ellipse(dx + d.size.w * 0.7, dy + d.size.h * 0.6, d.size.w * 0.3, d.size.h * 0.4, 0, 0, Math.PI * 2);
          buf.fill();
          buf.beginPath();
          buf.ellipse(dx + d.size.w * 0.5, dy + d.size.h * 0.35, d.size.w * 0.35, d.size.h * 0.35, 0, 0, Math.PI * 2);
          buf.fill();
          break;
        case 'rock':
          buf.fillRect(dx, dy + d.size.h * 0.3, d.size.w, d.size.h * 0.7);
          buf.fillRect(dx + d.size.w * 0.15, dy, d.size.w * 0.7, d.size.h * 0.4);
          break;
        default:
          buf.fillRect(dx, dy, d.size.w, d.size.h);
          break;
      }
    }
    buf.globalAlpha = 1;
  }

  private drawPlatform(buf: CanvasRenderingContext2D, p: Platform, cx: number, cy: number): void {
    if (p._isGone) return;
    const offset = p._currentPos ?? { x: 0, y: 0 };
    const rx = p.rect.x + offset.x - cx;
    const ry = p.rect.y + offset.y - cy;
    if (rx + p.rect.w < -10 || rx > VIEW_WIDTH + 10) return;

    switch (p.type) {
      case 'normal':
        buf.fillStyle = COLORS.platform;
        buf.fillRect(rx, ry, p.rect.w, p.rect.h);
        buf.fillStyle = COLORS.platformEdge;
        buf.fillRect(rx, ry, p.rect.w, 1);
        break;

      case 'moving':
        buf.fillStyle = COLORS.platformMoving;
        buf.fillRect(rx, ry, p.rect.w, p.rect.h);
        buf.fillStyle = COLORS.platformEdge;
        buf.fillRect(rx, ry, p.rect.w, 1);
        // direction chevrons
        buf.strokeStyle = COLORS.platformEdge;
        buf.globalAlpha = 0.5;
        buf.lineWidth = 1;
        const midY = ry + p.rect.h / 2;
        for (let ci = 0; ci < 3; ci++) {
          const chevX = rx + 8 + ci * 12;
          buf.beginPath();
          buf.moveTo(chevX, midY - 3);
          buf.lineTo(chevX + 4, midY);
          buf.lineTo(chevX, midY + 3);
          buf.stroke();
        }
        buf.globalAlpha = 1;
        break;

      case 'crumbling': {
        const shake = p._crumbleTimer != null ? (Math.random() - 0.5) * 3 : 0;
        buf.fillStyle = COLORS.platformCrumble;
        const segW = 6;
        const gap = 2;
        for (let sx = 0; sx < p.rect.w; sx += segW + gap) {
          const sw = Math.min(segW, p.rect.w - sx);
          const segShake = p._crumbleTimer != null ? (Math.random() - 0.5) * 4 : 0;
          buf.fillRect(rx + sx + shake, ry + segShake, sw, p.rect.h);
        }
        buf.fillStyle = COLORS.platformEdge;
        buf.globalAlpha = 0.5;
        buf.fillRect(rx + shake, ry, p.rect.w, 1);
        buf.globalAlpha = 1;
        break;
      }

      case 'bounce':
        buf.fillStyle = COLORS.platformBounce;
        buf.fillRect(rx, ry, p.rect.w, p.rect.h);
        // zigzag spring on top
        buf.strokeStyle = COLORS.platformEdge;
        buf.lineWidth = 1;
        buf.beginPath();
        const zigCount = Math.floor(p.rect.w / 6);
        for (let z = 0; z <= zigCount; z++) {
          const zx = rx + (z / zigCount) * p.rect.w;
          const zy = ry + (z % 2 === 0 ? -3 : 0);
          if (z === 0) buf.moveTo(zx, zy);
          else buf.lineTo(zx, zy);
        }
        buf.stroke();
        break;
    }
  }

  private drawSpikes(buf: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number): void {
    buf.fillStyle = COLORS.hazardSpike;
    buf.shadowColor = COLORS.hazardSpike;
    buf.shadowBlur = 6;
    const spikeW = 8;
    const count = Math.max(1, Math.floor(w / spikeW));
    const actualW = w / count;
    buf.beginPath();
    for (let i = 0; i < count; i++) {
      const sx = rx + i * actualW;
      buf.moveTo(sx, ry + h);
      buf.lineTo(sx + actualW / 2, ry);
      buf.lineTo(sx + actualW, ry + h);
    }
    buf.closePath();
    buf.fill();
    buf.shadowBlur = 0;
  }

  private drawLava(buf: CanvasRenderingContext2D, rx: number, ry: number, w: number, h: number): void {
    // glow underneath
    buf.fillStyle = COLORS.lavaGlow;
    buf.fillRect(rx - 4, ry - 6, w + 8, h + 12);

    buf.fillStyle = COLORS.hazardLava;
    buf.fillRect(rx, ry + 4, w, h - 4);

    // animated sine wave on top
    buf.beginPath();
    buf.moveTo(rx, ry + h);
    for (let x = 0; x <= w; x += 2) {
      const wave = Math.sin((this.time * 4) + (rx + x) * 0.15) * 3;
      buf.lineTo(rx + x, ry + wave + 2);
    }
    buf.lineTo(rx + w, ry + h);
    buf.closePath();
    buf.fill();
  }

  private drawGoal(buf: CanvasRenderingContext2D, goal: Rect, cx: number, cy: number): void {
    const gx = goal.x - cx;
    const gy = goal.y - cy;
    const pulse = 0.5 + Math.sin(this.time * 4) * 0.3;

    // glow
    buf.fillStyle = COLORS.goalGlow;
    buf.globalAlpha = pulse;
    buf.fillRect(gx - 6, gy - 6, goal.w + 12, goal.h + 12);
    buf.globalAlpha = 1;

    // door body
    buf.fillStyle = COLORS.goal;
    buf.globalAlpha = 0.3 + pulse * 0.4;
    buf.fillRect(gx, gy, goal.w, goal.h);

    // arch on top
    buf.beginPath();
    buf.arc(gx + goal.w / 2, gy, goal.w / 2, Math.PI, 0);
    buf.fill();
    buf.globalAlpha = 1;

    // door outline
    buf.strokeStyle = COLORS.goal;
    buf.lineWidth = 1;
    buf.strokeRect(gx, gy, goal.w, goal.h);
  }

  private drawPlayer(buf: CanvasRenderingContext2D, player: Player, cx: number, cy: number): void {
    const px = player.pos.x - cx;
    const py = player.pos.y - cy;

    // trail
    if (Math.abs(player.vel.x) > 10 || Math.abs(player.vel.y) > 10) {
      this.playerTrail.push({ x: px, y: py, alpha: 0.4 });
      if (this.playerTrail.length > TRAIL_LENGTH) {
        this.playerTrail.shift();
      }
    } else if (this.playerTrail.length > 0) {
      this.playerTrail.length = 0;
    }

    for (let i = 0; i < this.playerTrail.length; i++) {
      const t = this.playerTrail[i];
      t.alpha *= 0.85;
      buf.fillStyle = COLORS.player;
      buf.globalAlpha = t.alpha;
      buf.fillRect(t.x, t.y + player.height * 0.3, player.width, player.height * 0.5);
      buf.globalAlpha = 1;
    }

    // dead flash
    if (player.isDead) {
      buf.globalAlpha = Math.abs(Math.sin(this.time * 12)) * 0.6;
    }

    const facingLeft = player.facing < 0;

    buf.save();
    if (facingLeft) {
      buf.translate(px + player.width, py);
      buf.scale(-1, 1);
    } else {
      buf.translate(px, py);
    }

    // glow
    buf.shadowColor = COLORS.player;
    buf.shadowBlur = 8;

    // body
    buf.fillStyle = COLORS.player;
    buf.fillRect(2, player.height * 0.3, player.width - 4, player.height * 0.7);

    // head
    buf.beginPath();
    buf.arc(player.width / 2, player.height * 0.25, player.width * 0.35, 0, Math.PI * 2);
    buf.fill();

    // eye
    buf.fillStyle = COLORS.playerEye;
    buf.shadowBlur = 0;
    buf.fillRect(player.width * 0.55, player.height * 0.2, 3, 3);

    buf.restore();
    buf.globalAlpha = 1;
    buf.shadowBlur = 0;
  }

  private drawHUD(
    buf: CanvasRenderingContext2D,
    stats: { score: number; levelNumber: number; theme: string },
  ): void {
    buf.save();
    buf.font = '10px monospace';
    buf.textBaseline = 'top';

    // text glow shadow
    buf.shadowColor = COLORS.text;
    buf.shadowBlur = 4;
    buf.fillStyle = COLORS.text;

    buf.textAlign = 'left';
    buf.fillText(`LVL ${stats.levelNumber}`, 6, 6);
    buf.fillText(`SCORE: ${stats.score}`, 6, 18);

    buf.textAlign = 'right';
    buf.fillStyle = COLORS.textDim;
    buf.fillText(stats.theme, VIEW_WIDTH - 6, 6);

    buf.shadowBlur = 0;
    buf.restore();
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }
}
