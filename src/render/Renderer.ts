import { WORLD_WIDTH, WORLD_HEIGHT, GAME_VIEW_FRACTION, BACKGROUND_COLOR, QUEUE_PANEL_BG } from '../config';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Pixels per game unit. */
  private scale = 1;
  /** Pixel offset for the game view area. */
  private offsetX = 0;
  private offsetY = 0;

  /** Pixel dimensions of the game view area (excluding queue panel). */
  gameViewWidth = 0;
  gameViewHeight = 0;
  /** Pixel dimensions of the queue panel. */
  queuePanelX = 0;
  queuePanelWidth = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.gameViewWidth = w * GAME_VIEW_FRACTION;
    this.gameViewHeight = h;
    this.queuePanelX = this.gameViewWidth;
    this.queuePanelWidth = w - this.gameViewWidth;

    // Fit world into game view with uniform scale
    const scaleX = this.gameViewWidth / WORLD_WIDTH;
    const scaleY = this.gameViewHeight / WORLD_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);

    // Centre the world in the game view area
    this.offsetX = (this.gameViewWidth - WORLD_WIDTH * this.scale) / 2;
    this.offsetY = (this.gameViewHeight - WORLD_HEIGHT * this.scale) / 2;
  }

  /** Convert game-unit position to screen pixel position. */
  gameToScreen(gx: number, gy: number): { sx: number; sy: number } {
    return {
      sx: this.offsetX + gx * this.scale,
      sy: this.offsetY + gy * this.scale,
    };
  }

  /** Convert screen pixel position to game-unit position. */
  screenToGame(sx: number, sy: number): { gx: number; gy: number } {
    return {
      gx: (sx - this.offsetX) / this.scale,
      gy: (sy - this.offsetY) / this.scale,
    };
  }

  /** Convert a game-unit length to pixel length. */
  gameToScreenLength(len: number): number {
    return len * this.scale;
  }

  /** Clear the entire canvas and draw background regions. */
  clear(): void {
    const { ctx } = this;
    const screenH = window.innerHeight;
    const screenW = window.innerWidth;

    // Game area background
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, this.gameViewWidth, screenH);

    // Queue panel background
    ctx.fillStyle = QUEUE_PANEL_BG;
    ctx.fillRect(this.queuePanelX, 0, this.queuePanelWidth, screenH);

    // Divider line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.queuePanelX, 0);
    ctx.lineTo(this.queuePanelX, screenH);
    ctx.stroke();

    // Clear full canvas width (in case of rounding)
    ctx.clearRect(screenW, 0, 1, screenH);
  }
}
