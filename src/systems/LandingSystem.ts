import { Aircraft } from '../entities/Aircraft';
import { AircraftState } from '../types';
import { Runway } from '../entities/Runway';
import { LANDING_STOP_FRACTION, KNOTS_TO_GU_PER_SEC } from '../config';

/** Begin landing: aircraft has crossed the threshold. */
export function beginLanding(aircraft: Aircraft, runway: Runway): void {
  aircraft.state = AircraftState.LANDING;
  aircraft.heading = runway.heading;
  // Snap to runway centreline
  aircraft.x = runway.thresholdX;

  // Calculate deceleration: v² / (2 × stopDistance)
  const speedGU = aircraft.profile.speed * KNOTS_TO_GU_PER_SEC;
  aircraft.speed = speedGU;
}

/** Update a landing aircraft. Returns true when stopped (LANDED). */
export function updateLanding(aircraft: Aircraft, runway: Runway, dt: number): boolean {
  if (aircraft.state !== AircraftState.LANDING) return false;

  const stopDistance = LANDING_STOP_FRACTION * runway.length;
  const initialSpeed = aircraft.profile.speed * KNOTS_TO_GU_PER_SEC;
  const deceleration = (initialSpeed * initialSpeed) / (2 * stopDistance);

  aircraft.speed -= deceleration * dt;

  if (aircraft.speed <= 0) {
    aircraft.speed = 0;
    aircraft.state = AircraftState.LANDED;
    return true;
  }

  aircraft.moveForward(dt);
  return false;
}
