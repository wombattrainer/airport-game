import { Renderer } from './Renderer';
import { Airport } from '../entities/Airport';
import { Runway } from '../entities/Runway';
import { WeatherSystem } from '../systems/WeatherSystem';
import { WIN_TARGET } from '../config';

export function drawHud(
  renderer: Renderer,
  airport: Airport,
  runway: Runway,
  weather: WeatherSystem,
  elapsed: number,
): void {
  const { ctx } = renderer;
  const x = 12;
  let y = 24;
  const lineHeight = 20;

  ctx.font = '14px monospace';
  ctx.textAlign = 'left';

  // Bank balance
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Balance: $${airport.bankBalance.toLocaleString()}`, x, y);
  y += lineHeight;

  // Progress bar
  const barW = 160;
  const barH = 8;
  const progress = Math.min(1, airport.bankBalance / WIN_TARGET);
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = '#44cc44';
  ctx.fillRect(x, y, barW * progress, barH);
  ctx.strokeStyle = '#666';
  ctx.strokeRect(x, y, barW, barH);
  y += lineHeight;

  // Target
  ctx.fillStyle = '#888';
  ctx.fillText(`Target: $${WIN_TARGET.toLocaleString()}`, x, y);
  y += lineHeight;

  // Game time
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Time: ${mins}:${secs.toString().padStart(2, '0')}`, x, y);
  y += lineHeight;

  // Runway status
  const statusColor = runway.isLocked ? '#ff4444' : '#44ff44';
  const statusText = runway.isLocked
    ? `Runway: CLOSED [${runway.lockedBy}]`
    : 'Runway: OPEN';
  ctx.fillStyle = statusColor;
  ctx.fillText(statusText, x, y);
  y += lineHeight;

  // Weather
  if (weather.isStormActive) {
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`⚡ STORM — ${Math.ceil(weather.stormRemaining)}s`, x, y);
    ctx.font = '14px monospace';
  } else {
    ctx.fillStyle = '#888';
    ctx.fillText('Weather: Clear', x, y);
  }
}
