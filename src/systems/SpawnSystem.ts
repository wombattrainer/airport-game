import { Aircraft, generateCallsign, randomAircraftSize } from '../entities/Aircraft';
import {
  SPAWN_POINT_X, SPAWN_POINT_Y,
  SPAWN_INTERVAL_START, SPAWN_JITTER,
  SPAWN_RAMP_FREQUENCY, SPAWN_RAMP_AMOUNT, SPAWN_INTERVAL_MIN,
  HOLDING_FIX_X, HOLDING_FIX_Y,
} from '../config';
import { vectorToHeading } from '../math/MathUtils';

export class SpawnSystem {
  private timer = 0;
  private nextInterval = 0;

  constructor() {
    this.nextInterval = this.computeInterval(0);
  }

  reset(): void {
    this.timer = 0;
    this.nextInterval = 0; // Spawn first aircraft immediately
  }

  /** Returns a new Aircraft if it's time to spawn, else null. */
  update(dt: number, elapsedTime: number): Aircraft | null {
    this.timer += dt;
    if (this.timer < this.nextInterval) return null;

    this.timer = 0;
    this.nextInterval = this.computeInterval(elapsedTime);

    const size = randomAircraftSize();
    const callsign = generateCallsign();

    // Heading toward holding fix
    const dx = HOLDING_FIX_X - SPAWN_POINT_X;
    const dy = HOLDING_FIX_Y - SPAWN_POINT_Y;
    const heading = vectorToHeading(dx, dy);

    return new Aircraft(callsign, size, SPAWN_POINT_X, SPAWN_POINT_Y, heading);
  }

  private computeInterval(elapsed: number): number {
    const steps = Math.floor(elapsed / SPAWN_RAMP_FREQUENCY);
    const base = Math.max(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_START - steps * SPAWN_RAMP_AMOUNT);
    const jitter = (Math.random() * 2 - 1) * SPAWN_JITTER;
    return Math.max(1, base + jitter);
  }
}
