import { Renderer } from './Renderer';
import { Aircraft } from '../entities/Aircraft';
import { AircraftSize, AircraftState } from '../types';
import { degToRad } from '../math/MathUtils';

const SIZE_COLORS: Record<AircraftSize, string> = {
  [AircraftSize.SMALL]: '#44cc44',
  [AircraftSize.MEDIUM]: '#4488ff',
  [AircraftSize.LARGE]: '#ff4444',
};

const SIZE_SCALE: Record<AircraftSize, number> = {
  [AircraftSize.SMALL]: 0.7,
  [AircraftSize.MEDIUM]: 1.0,
  [AircraftSize.LARGE]: 1.4,
};

/** Cessna 172 — single-engine prop, straight high wings, narrow fuselage */
function drawCessna(ctx: CanvasRenderingContext2D, s: number): void {
  // Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -8 * s);
  ctx.lineTo(1 * s, -6 * s);
  ctx.lineTo(1 * s, 7 * s);
  ctx.lineTo(-1 * s, 7 * s);
  ctx.lineTo(-1 * s, -6 * s);
  ctx.closePath();
  ctx.fill();

  // Straight wings (high-wing, rectangular)
  ctx.fillRect(-11 * s, -1.5 * s, 22 * s, 2.5 * s);

  // Horizontal stabilizer
  ctx.fillRect(-4.5 * s, 5.5 * s, 9 * s, 1.5 * s);
}

/** Dash 8 — twin turboprop, straight wings, T-tail */
function drawDash8(ctx: CanvasRenderingContext2D, s: number): void {
  // Fuselage
  ctx.beginPath();
  ctx.moveTo(0, -9 * s);
  ctx.lineTo(1.5 * s, -7 * s);
  ctx.lineTo(1.5 * s, 8 * s);
  ctx.lineTo(-1.5 * s, 8 * s);
  ctx.lineTo(-1.5 * s, -7 * s);
  ctx.closePath();
  ctx.fill();

  // Straight wings (slight taper)
  ctx.beginPath();
  ctx.moveTo(-13 * s, 0);
  ctx.lineTo(-12 * s, -1.5 * s);
  ctx.lineTo(12 * s, -1.5 * s);
  ctx.lineTo(13 * s, 0);
  ctx.lineTo(12 * s, 1.5 * s);
  ctx.lineTo(-12 * s, 1.5 * s);
  ctx.closePath();
  ctx.fill();

  // Engine nacelles
  ctx.fillRect(-7.5 * s, -1 * s, 2 * s, 3.5 * s);
  ctx.fillRect(5.5 * s, -1 * s, 2 * s, 3.5 * s);

  // T-tail vertical fin
  ctx.fillRect(-0.5 * s, 5 * s, 1 * s, 4 * s);

  // T-tail horizontal stabilizer
  ctx.fillRect(-5 * s, 5 * s, 10 * s, 1.2 * s);
}

/** 747 — four-engine jet, swept wings, wide body */
function draw747(ctx: CanvasRenderingContext2D, s: number): void {
  // Wide fuselage
  ctx.beginPath();
  ctx.moveTo(0, -10 * s);
  ctx.lineTo(2 * s, -8 * s);
  ctx.lineTo(2 * s, 9 * s);
  ctx.lineTo(-2 * s, 9 * s);
  ctx.lineTo(-2 * s, -8 * s);
  ctx.closePath();
  ctx.fill();

  // Swept wings
  ctx.beginPath();
  ctx.moveTo(-2 * s, -1 * s);       // left wing root leading
  ctx.lineTo(-14 * s, 4 * s);       // left wingtip leading
  ctx.lineTo(-13 * s, 6 * s);       // left wingtip trailing
  ctx.lineTo(-2 * s, 3 * s);        // left wing root trailing
  ctx.lineTo(2 * s, 3 * s);         // right wing root trailing
  ctx.lineTo(13 * s, 6 * s);        // right wingtip trailing
  ctx.lineTo(14 * s, 4 * s);        // right wingtip leading
  ctx.lineTo(2 * s, -1 * s);        // right wing root leading
  ctx.closePath();
  ctx.fill();

  // 4 engine pods (inner pair + outer pair)
  const engines = [
    { x: -5, y: 0.5 },   // inner left
    { x: 5, y: 0.5 },    // inner right
    { x: -9.5, y: 2.5 }, // outer left
    { x: 9.5, y: 2.5 },  // outer right
  ];
  for (const e of engines) {
    ctx.fillRect((e.x - 0.6) * s, (e.y - 1) * s, 1.2 * s, 2.5 * s);
  }

  // Swept horizontal stabilizer
  ctx.beginPath();
  ctx.moveTo(-1.5 * s, 7 * s);
  ctx.lineTo(-5.5 * s, 9 * s);
  ctx.lineTo(-5 * s, 10 * s);
  ctx.lineTo(-1.5 * s, 8.5 * s);
  ctx.lineTo(1.5 * s, 8.5 * s);
  ctx.lineTo(5 * s, 10 * s);
  ctx.lineTo(5.5 * s, 9 * s);
  ctx.lineTo(1.5 * s, 7 * s);
  ctx.closePath();
  ctx.fill();
}

export function drawAircraft(renderer: Renderer, aircraft: Aircraft): void {
  if (aircraft.state === AircraftState.LANDED) return;

  const { ctx } = renderer;
  const pos = renderer.gameToScreen(aircraft.x, aircraft.y);
  const s = SIZE_SCALE[aircraft.size];
  const triSize = 10 * s;

  // Trail dots (oldest first, fading opacity and shrinking size)
  const color = SIZE_COLORS[aircraft.size];
  for (let i = 0; i < aircraft.trail.length; i++) {
    const t = aircraft.trail[i];
    const tp = renderer.gameToScreen(t.x, t.y);
    const age = aircraft.trail.length - i; // 3=oldest, 1=newest
    const alpha = (4 - age) * 0.25; // 0.25, 0.50, 0.75
    const radius = 2 * s * (4 - age) / 3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tp.sx, tp.sy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(pos.sx, pos.sy);
  ctx.rotate(degToRad(aircraft.heading));

  ctx.fillStyle = SIZE_COLORS[aircraft.size];
  if (aircraft.state === AircraftState.DIVERTED) {
    ctx.globalAlpha = 0.4;
  }

  switch (aircraft.size) {
    case AircraftSize.SMALL:
      drawCessna(ctx, s);
      break;
    case AircraftSize.MEDIUM:
      drawDash8(ctx, s);
      break;
    case AircraftSize.LARGE:
      draw747(ctx, s);
      break;
  }

  ctx.restore();

  // Approach indicator: yellow diamond outline
  if (aircraft.state === AircraftState.APPROACH) {
    const r = 18 * s;
    ctx.save();
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pos.sx,     pos.sy - r);
    ctx.lineTo(pos.sx + r, pos.sy);
    ctx.lineTo(pos.sx,     pos.sy + r);
    ctx.lineTo(pos.sx - r, pos.sy);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  // Callsign label
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(aircraft.callsign, pos.sx, pos.sy - triSize - 4);

  // Holding sub-state debug label + fuel warning
  if (aircraft.state === AircraftState.HOLDING) {
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '9px monospace';
    ctx.fillText(aircraft.holdingSubState, pos.sx, pos.sy + triSize + 12);

    const fuelSec = aircraft.fuelEndurance;
    if (fuelSec <= 30) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText(`${Math.ceil(fuelSec)}s`, pos.sx, pos.sy + triSize + 22);
    } else if (fuelSec <= 60) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`${Math.ceil(fuelSec)}s`, pos.sx, pos.sy + triSize + 22);
    }
  }
}
