import { Runway } from '../entities/Runway';
import { STORM_MIN_INTERVAL, STORM_MAX_INTERVAL, STORM_DURATION } from '../config';

export class WeatherSystem {
  isStormActive = false;
  private stormTimer = 0;
  private stormDuration = 0;
  private nextStormIn = 0;

  constructor() {
    this.nextStormIn = this.randomInterval();
  }

  reset(): void {
    this.isStormActive = false;
    this.stormTimer = 0;
    this.stormDuration = 0;
    this.nextStormIn = this.randomInterval();
  }

  update(dt: number, runway: Runway): void {
    if (this.isStormActive) {
      this.stormDuration += dt;
      if (this.stormDuration >= STORM_DURATION) {
        // Storm ends
        this.isStormActive = false;
        this.stormDuration = 0;
        this.stormTimer = 0;
        this.nextStormIn = this.randomInterval();

        // Unlock runway if locked by weather
        if (runway.lockedBy === 'weather') {
          runway.unlock();
        }
      }
    } else {
      this.stormTimer += dt;
      if (this.stormTimer >= this.nextStormIn) {
        // Storm begins
        this.isStormActive = true;
        this.stormDuration = 0;

        // Lock runway if not already locked by an aircraft
        if (!runway.isLocked) {
          runway.lock('weather');
        }
        // If locked by aircraft, weather waits — runway stays locked by aircraft.
        // When aircraft finishes, Game will check weather and re-lock if storm still active.
      }
    }
  }

  /** Remaining storm duration in seconds (0 if no storm). */
  get stormRemaining(): number {
    if (!this.isStormActive) return 0;
    return Math.max(0, STORM_DURATION - this.stormDuration);
  }

  private randomInterval(): number {
    return STORM_MIN_INTERVAL + Math.random() * (STORM_MAX_INTERVAL - STORM_MIN_INTERVAL);
  }
}
