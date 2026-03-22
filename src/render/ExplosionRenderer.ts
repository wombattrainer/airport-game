import { Renderer } from './Renderer';

const EXPLOSION_MAX_AGE = 1.5; // seconds
const NUM_SPIKES = 12;

// Evenly-spaced spike angles, pre-computed once.
const SPIKE_ANGLES = Array.from({ length: NUM_SPIKES }, (_, i) =>
  (i / NUM_SPIKES) * Math.PI * 2,
);

export interface Explosion {
  x: number;
  y: number;
  age: number;
  readonly maxAge: number;
}

export function createExplosion(x: number, y: number): Explosion {
  return { x, y, age: 0, maxAge: EXPLOSION_MAX_AGE };
}

export function drawExplosion(renderer: Renderer, explosion: Explosion): void {
  const { ctx } = renderer;
  const pos = renderer.gameToScreen(explosion.x, explosion.y);
  const progress = explosion.age / explosion.maxAge; // 0 = fresh, 1 = spent
  const alpha = 1 - progress;

  // Outer radius expands from 15 px to 60 px as the explosion ages.
  const outerR = 15 + progress * 45;
  const innerR = outerR * 0.25;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(pos.sx, pos.sy);

  // Radial spikes — alternating lengths for a jagged burst shape.
  const lineWidth = Math.max(1, 2.5 * (1 - progress));
  for (let i = 0; i < NUM_SPIKES; i++) {
    const angle = SPIKE_ANGLES[i];
    const spikeR = outerR * (i % 2 === 0 ? 1.0 : 0.65);

    ctx.strokeStyle = i % 3 === 0 ? '#ffffff'
      : i % 3 === 1 ? '#ffaa00'
      : '#ff4400';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * spikeR, Math.sin(angle) * spikeR);
    ctx.stroke();
  }

  // Centre radial gradient: white core → orange → transparent red.
  const centreR = innerR * 1.4;
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, centreR);
  grad.addColorStop(0,   `rgba(255, 255, 255, ${alpha})`);
  grad.addColorStop(0.5, `rgba(255, 170, 0,   ${alpha * 0.8})`);
  grad.addColorStop(1,   'rgba(255, 50,  0,   0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, centreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
