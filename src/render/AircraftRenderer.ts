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

  // Fuel warning indicator for holding aircraft
  if (aircraft.state === AircraftState.HOLDING) {
    const fuelSec = aircraft.fuelEndurance;
    if (fuelSec <= 30) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText(`${Math.ceil(fuelSec)}s`, pos.sx, pos.sy + triSize + 12);
    } else if (fuelSec <= 60) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`${Math.ceil(fuelSec)}s`, pos.sx, pos.sy + triSize + 12);
    }
  }
}
