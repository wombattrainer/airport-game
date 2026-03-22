import { Renderer } from './Renderer';
import { QueueSystem } from '../systems/QueueSystem';
import { Aircraft } from '../entities/Aircraft';
import { AircraftState } from '../types';

const CARD_HEIGHT = 60;
const CARD_MARGIN = 6;
const CARD_PADDING = 8;

export interface QueueCardHitArea {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClearedToLandHitArea {
  callsign: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QueuePanelResult {
  dragAreas: QueueCardHitArea[];
  ctlAreas: ClearedToLandHitArea[];
}

/** Draw the queue panel. Returns drag hit areas and cleared-to-land button hit areas. */
export function drawQueuePanel(
  renderer: Renderer,
  queueSystem: QueueSystem,
  activeAircraft: Aircraft[],
  dragIndex: number | null,
  dragY: number | null,
): QueuePanelResult {
  const { ctx } = renderer;
  const panelX = renderer.queuePanelX;
  const panelW = renderer.queuePanelWidth;
  const dragAreas: QueueCardHitArea[] = [];
  const ctlAreas: ClearedToLandHitArea[] = [];
  const cardW = panelW - CARD_MARGIN * 2;
  const cardX = panelX + CARD_MARGIN;

  // Panel header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LANDING QUEUE', panelX + panelW / 2, 24);

  ctx.font = '11px monospace';
  ctx.fillStyle = '#666';
  ctx.fillText(`${queueSystem.length} aircraft holding`, panelX + panelW / 2, 42);

  let nextY = 56;

  // Active aircraft cards (approach / landing) — not draggable, one per aircraft
  for (const aircraft of activeAircraft) {
    drawActiveCard(ctx, aircraft, cardX, nextY, cardW);
    nextY += CARD_HEIGHT + CARD_MARGIN;
  }
  if (activeAircraft.length > 0) {
    nextY += 4; // extra gap to separate from queue
  }

  // Queue cards (draggable, with CTL button)
  for (let i = 0; i < queueSystem.queue.length; i++) {
    const aircraft = queueSystem.queue[i];
    const isDragging = dragIndex === i;

    let cardY: number;
    if (isDragging && dragY !== null) {
      cardY = dragY - CARD_HEIGHT / 2;
    } else {
      cardY = nextY + i * (CARD_HEIGHT + CARD_MARGIN);
    }

    // Card background color based on fuel
    let bgColor: string;
    if (aircraft.fuelEndurance <= 30) {
      bgColor = '#4a1111';
    } else if (aircraft.fuelEndurance <= 60) {
      bgColor = '#4a3a11';
    } else {
      bgColor = '#1a1a3e';
    }

    // Border color
    let borderColor: string;
    if (aircraft.fuelEndurance <= 30) {
      borderColor = '#ff4444';
    } else if (aircraft.fuelEndurance <= 60) {
      borderColor = '#ffcc00';
    } else {
      borderColor = '#444';
    }

    if (isDragging) {
      ctx.globalAlpha = 0.8;
    }

    // Card background
    ctx.fillStyle = bgColor;
    ctx.fillRect(cardX, cardY, cardW, CARD_HEIGHT);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isDragging ? 2 : 1;
    ctx.strokeRect(cardX, cardY, cardW, CARD_HEIGHT);

    // Position number
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`#${i + 1}`, cardX + CARD_PADDING, cardY + 14);

    // Cleared to Land button (top-right of card)
    const btnW = 46;
    const btnH = 18;
    const btnX = cardX + cardW - CARD_PADDING - btnW;
    const btnY = cardY + 4;
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#44cc44';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.fillStyle = '#44cc44';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('→ LAND', btnX + btnW / 2, btnY + 12);

    ctlAreas.push({ callsign: aircraft.callsign, x: btnX, y: btnY, width: btnW, height: btnH });

    // Callsign
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(aircraft.callsign, cardX + CARD_PADDING, cardY + 32);

    // Size indicator
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(aircraft.size, cardX + CARD_PADDING + 50, cardY + 32);

    // Fuel timer
    const fuelMins = Math.floor(aircraft.fuelEndurance / 60);
    const fuelSecs = Math.floor(aircraft.fuelEndurance % 60);
    const fuelStr = `${fuelMins}:${fuelSecs.toString().padStart(2, '0')}`;
    ctx.fillStyle = aircraft.fuelEndurance <= 30 ? '#ff4444'
      : aircraft.fuelEndurance <= 60 ? '#ffcc00'
      : '#44cc44';
    ctx.font = '12px monospace';
    ctx.fillText(`⛽ ${fuelStr}`, cardX + CARD_PADDING, cardY + 50);

    // Value
    ctx.fillStyle = '#88cc88';
    ctx.textAlign = 'right';
    ctx.fillText(`$${aircraft.value.toLocaleString()}`, cardX + cardW - CARD_PADDING, cardY + 50);

    ctx.globalAlpha = 1;

    dragAreas.push({
      index: i,
      x: cardX,
      y: nextY + i * (CARD_HEIGHT + CARD_MARGIN),
      width: cardW,
      height: CARD_HEIGHT,
    });
  }

  return { dragAreas, ctlAreas };
}

function drawActiveCard(
  ctx: CanvasRenderingContext2D,
  aircraft: Aircraft,
  cardX: number,
  cardY: number,
  cardW: number,
): void {
  const isLanding = aircraft.state === AircraftState.LANDING;
  const label = isLanding ? 'LANDING' : 'APPROACH';
  const accentColor = isLanding ? '#44cc44' : '#4488ff';

  // Card background
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(cardX, cardY, cardW, CARD_HEIGHT);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, CARD_HEIGHT);

  // State label
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, cardX + CARD_PADDING, cardY + 14);

  // Callsign
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(aircraft.callsign, cardX + CARD_PADDING, cardY + 32);

  // Size indicator
  ctx.fillStyle = '#888';
  ctx.font = '10px monospace';
  ctx.fillText(aircraft.size, cardX + CARD_PADDING + 50, cardY + 32);

  // Value
  ctx.fillStyle = '#88cc88';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`$${aircraft.value.toLocaleString()}`, cardX + cardW - CARD_PADDING, cardY + 50);
}
