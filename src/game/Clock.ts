export class Clock {
  private lastTime = 0;
  private _elapsed = 0;
  private _running = false;
  private frameId = 0;
  private onTick: (dt: number) => void;

  /** Maximum delta to prevent spiral after tab-away. */
  private maxDt = 0.1;

  get elapsed(): number {
    return this._elapsed;
  }

  get running(): boolean {
    return this._running;
  }

  constructor(onTick: (dt: number) => void) {
    this.onTick = onTick;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this._running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  reset(): void {
    this._elapsed = 0;
    this.lastTime = performance.now();
  }

  private loop = (now: number): void => {
    if (!this._running) return;
    const dt = Math.min((now - this.lastTime) / 1000, this.maxDt);
    this.lastTime = now;
    this._elapsed += dt;
    this.onTick(dt);
    this.frameId = requestAnimationFrame(this.loop);
  };
}
