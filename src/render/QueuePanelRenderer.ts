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

/** Draw the queue panel. Returns hit areas for drag-and-drop (queue cards only). */
export function drawQueuePanel(
  renderer: Renderer,
  queueSystem: QueueSystem,
  activeAircraft: Aircraft | null,
  dragIndex: number | null,
  dragY: number | null,
): QueueCardHitArea[] {
  const { ctx } = renderer;
  const panelX = renderer.queuePanelX;
  const panelW = renderer.queuePanelWidth;
  const hitAreas: QueueCardHitArea[] = [];
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

  // Active aircraft card (approach / landing) — not draggable
  if (activeAircraft) {
    drawActiveCard(ctx, activeAircraft, cardX, nextY, cardW);
    nextY += CARD_HEIGHT + CARD_MARGIN + 4; // extra gap to separate from queue
  }

  // Queue cards (draggable)
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

    // Callsign
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';
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

    hitAreas.push({
      index: i,
      x: cardX,
      y: nextY + i * (CARD_HEIGHT + CARD_MARGIN),
      width: cardW,
      height: CARD_HEIGHT,
    });
  }

  return hitAreas;
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
