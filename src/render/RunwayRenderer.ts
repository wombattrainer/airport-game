import { Renderer } from './Renderer';
import { Runway } from '../entities/Runway';
import { RUNWAY_COLOR, RUNWAY_MARKING_COLOR, LANDING_STOP_FRACTION, FINAL_APPROACH_X, FINAL_APPROACH_Y, HOLDING_FIX_X, HOLDING_FIX_Y } from '../config';
import { degToRad } from '../math/MathUtils';

export function drawRunway(renderer: Renderer, runway: Runway): void {
  const { ctx } = renderer;
  const center = renderer.gameToScreen(runway.centerX, runway.centerY);
  const w = renderer.gameToScreenLength(runway.width);
  const h = renderer.gameToScreenLength(runway.length);

  ctx.save();
  ctx.translate(center.sx, center.sy);
  ctx.rotate(degToRad(runway.heading));

  // Runway surface
  ctx.fillStyle = RUNWAY_COLOR;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Centre line (dashed)
  ctx.strokeStyle = RUNWAY_MARKING_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Threshold markings
  ctx.lineWidth = 2;
  const markW = w * 0.3;
  for (const yEnd of [-h / 2, h / 2]) {
    ctx.beginPath();
    ctx.moveTo(-markW, yEnd);
    ctx.lineTo(markW, yEnd);
    ctx.stroke();
  }

  // 75% stop point marker
  const stopY = -h / 2 + h * LANDING_STOP_FRACTION;
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-w / 2, stopY);
  ctx.lineTo(w / 2, stopY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // Runway status label
  const labelY = center.sy + h / 2 + 16;
  ctx.fillStyle = runway.isLocked ? '#ff4444' : '#44ff44';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  const status = runway.isLocked
    ? `LOCKED [${runway.lockedBy}]`
    : 'OPEN';
  ctx.fillText(status, center.sx, labelY);

  const crossSize = 6;

  // Debug: Holding Fix marker
  const hf = renderer.gameToScreen(HOLDING_FIX_X, HOLDING_FIX_Y);
  ctx.strokeStyle = '#00cccc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(hf.sx - crossSize, hf.sy - crossSize);
  ctx.lineTo(hf.sx + crossSize, hf.sy + crossSize);
  ctx.moveTo(hf.sx + crossSize, hf.sy - crossSize);
  ctx.lineTo(hf.sx - crossSize, hf.sy + crossSize);
  ctx.stroke();
  ctx.fillStyle = '#00cccc';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HF', hf.sx + crossSize + 3, hf.sy + 4);

  // Debug: Final Approach Point marker
  const fp = renderer.gameToScreen(FINAL_APPROACH_X, FINAL_APPROACH_Y);
  ctx.strokeStyle = '#ff00ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fp.sx - crossSize, fp.sy - crossSize);
  ctx.lineTo(fp.sx + crossSize, fp.sy + crossSize);
  ctx.moveTo(fp.sx + crossSize, fp.sy - crossSize);
  ctx.lineTo(fp.sx - crossSize, fp.sy + crossSize);
  ctx.stroke();
  ctx.fillStyle = '#ff00ff';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FP', fp.sx + crossSize + 3, fp.sy + 4);
}
