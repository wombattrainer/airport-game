import { Aircraft } from '../entities/Aircraft';
import { AircraftState } from '../types';

/** Update fuel for holding aircraft. Returns true if aircraft should divert. */
export function updateFuel(aircraft: Aircraft, dt: number): boolean {
  if (aircraft.state !== AircraftState.HOLDING) return false;

  aircraft.fuelEndurance -= dt;
  if (aircraft.fuelEndurance <= 0) {
    aircraft.fuelEndurance = 0;
    return true;
  }
  return false;
}

/** Start divert: fly off screen in a random direction. */
export function beginDivert(aircraft: Aircraft): void {
  aircraft.state = AircraftState.DIVERTED;
  aircraft.heading = Math.random() * 360;
  aircraft.speed = aircraft.baseSpeed;
}
