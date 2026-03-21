import { AircraftSize, AircraftState, AircraftSizeProfile, HoldingSubState, ApproachSubState } from '../types';
import { AIRCRAFT_PROFILES, KNOTS_TO_GU_PER_SEC } from '../config';
import { headingToVector } from '../math/MathUtils';

export class Aircraft {
  readonly callsign: string;
  readonly size: AircraftSize;
  readonly profile: AircraftSizeProfile;

  /** Speed in game units per second. */
  readonly baseSpeed: number;
  speed: number;

  fuelEndurance: number;
  value: number;

  state: AircraftState = AircraftState.ARRIVING;
  x: number;
  y: number;
  heading: number;

  // Holding pattern sub-state
  holdingSubState: HoldingSubState = HoldingSubState.INBOUND_LEG;
  holdingTimer = 0;
  holdingTurnAccumulated = 0;

  // Approach sub-state
  approachSubState: ApproachSubState = ApproachSubState.DIRECT_TO_BASE;
  approachTurnAccumulated = 0;
  approachTargetHeading = 0;

  constructor(callsign: string, size: AircraftSize, x: number, y: number, heading: number) {
    this.callsign = callsign;
    this.size = size;
    this.profile = AIRCRAFT_PROFILES[size];
    this.baseSpeed = this.profile.speed * KNOTS_TO_GU_PER_SEC;
    this.speed = this.baseSpeed;
    this.fuelEndurance = this.profile.fuelEndurance;
    this.value = this.profile.value;
    this.x = x;
    this.y = y;
    this.heading = heading;
  }

  /** Move forward along current heading. */
  moveForward(dt: number): void {
    const dir = headingToVector(this.heading);
    this.x += dir.x * this.speed * dt;
    this.y += dir.y * this.speed * dt;
  }
}

/** Generate a random 3-letter callsign. */
export function generateCallsign(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * 26)]).join('');
}

/** Pick a random aircraft size based on spawn weights. */
export function randomAircraftSize(): AircraftSize {
  const r = Math.random();
  const small = AIRCRAFT_PROFILES[AircraftSize.SMALL].spawnWeight;
  const medium = AIRCRAFT_PROFILES[AircraftSize.MEDIUM].spawnWeight;
  if (r < small) return AircraftSize.SMALL;
  if (r < small + medium) return AircraftSize.MEDIUM;
  return AircraftSize.LARGE;
}
