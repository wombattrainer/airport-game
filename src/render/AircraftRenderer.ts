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

  // Triangle pointing in heading direction (up = 0°)
  ctx.fillStyle = SIZE_COLORS[aircraft.size];
  if (aircraft.state === AircraftState.DIVERTED) {
    ctx.globalAlpha = 0.4;
  }
  ctx.beginPath();
  ctx.moveTo(0, -triSize);         // nose
  ctx.lineTo(-triSize * 0.6, triSize * 0.5);  // left wing
  ctx.lineTo(triSize * 0.6, triSize * 0.5);   // right wing
  ctx.closePath();
  ctx.fill();

  ctx.restore();

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
