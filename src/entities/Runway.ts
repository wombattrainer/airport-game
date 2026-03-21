import { RUNWAY_LENGTH, RUNWAY_WIDTH, RUNWAY_CENTER_X, RUNWAY_CENTER_Y, RUNWAY_HEADING } from '../config';
import { headingToVector } from '../math/MathUtils';

export class Runway {
  readonly designator = '01/19';
  readonly length = RUNWAY_LENGTH;
  readonly width = RUNWAY_WIDTH;
  readonly centerX = RUNWAY_CENTER_X;
  readonly centerY = RUNWAY_CENTER_Y;
  readonly heading = RUNWAY_HEADING;

  isLocked = false;
  lockedBy: string | null = null;

  /** Threshold position (start of runway, aircraft lands here). */
  readonly thresholdX: number;
  readonly thresholdY: number;
  /** End of runway. */
  readonly endX: number;
  readonly endY: number;

  constructor() {
    const dir = headingToVector(this.heading);
    const halfLen = this.length / 2;

    // Threshold is the southern end (aircraft approaches from south for heading 0)
    this.thresholdX = this.centerX - dir.x * halfLen;
    this.thresholdY = this.centerY - dir.y * halfLen;

    this.endX = this.centerX + dir.x * halfLen;
    this.endY = this.centerY + dir.y * halfLen;
  }

  lock(by: string): void {
    this.isLocked = true;
    this.lockedBy = by;
  }

  unlock(): void {
    this.isLocked = false;
    this.lockedBy = null;
  }
}
