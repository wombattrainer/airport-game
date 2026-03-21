import { Aircraft } from '../entities/Aircraft';
import { AircraftState, HoldingSubState } from '../types';
import {
  HOLDING_FIX_X, HOLDING_FIX_Y,
  TURN_RATE_DEG_PER_SEC, HOLDING_OUTBOUND_DURATION,
  HOLDING_ENTRY_DISTANCE,
} from '../config';
import { wrapDeg } from '../math/MathUtils';

/**
 * Holding pattern racetrack geometry.
 *
 * The inbound leg runs left-to-right toward the holding fix.
 * Right-hand turns (standard pattern).
 *
 * Sub-states:
 *   INBOUND_LEG  → fly toward fix → at fix → OUTBOUND_TURN
 *   OUTBOUND_TURN → 180° right turn → OUTBOUND_LEG
 *   OUTBOUND_LEG  → fly straight for HOLDING_OUTBOUND_DURATION → INBOUND_TURN
 *   INBOUND_TURN  → 180° right turn → INBOUND_LEG
 */

/** Inbound heading: left to right = heading 90° (east). */
const INBOUND_HEADING = 90;
const OUTBOUND_HEADING = 270;

/** Check if an arriving aircraft should enter holding. */
export function checkHoldingEntry(aircraft: Aircraft): boolean {
  if (aircraft.state !== AircraftState.ARRIVING) return false;
  const dx = aircraft.x - HOLDING_FIX_X;
  const dy = aircraft.y - HOLDING_FIX_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < HOLDING_ENTRY_DISTANCE;
}

/** Transition aircraft into holding state. */
export function enterHolding(aircraft: Aircraft): void {
  aircraft.state = AircraftState.HOLDING;
  aircraft.holdingSubState = HoldingSubState.OUTBOUND_TURN;
  aircraft.holdingTurnAccumulated = 0;
  aircraft.holdingTimer = 0;
}

/** Update an aircraft in holding pattern. */
export function updateHolding(aircraft: Aircraft, dt: number): void {
  if (aircraft.state !== AircraftState.HOLDING) return;

  const turnAmount = TURN_RATE_DEG_PER_SEC * dt;

  switch (aircraft.holdingSubState) {
    case HoldingSubState.INBOUND_LEG: {
      // Fly toward holding fix
      aircraft.heading = INBOUND_HEADING;
      aircraft.moveForward(dt);
      // Check if we've reached or passed the fix
      if (aircraft.x >= HOLDING_FIX_X) {
        aircraft.holdingSubState = HoldingSubState.OUTBOUND_TURN;
        aircraft.holdingTurnAccumulated = 0;
      }
      break;
    }

    case HoldingSubState.OUTBOUND_TURN: {
      // 180° right turn from inbound heading to outbound heading
      aircraft.heading = wrapDeg(aircraft.heading + turnAmount);
      aircraft.holdingTurnAccumulated += turnAmount;
      aircraft.moveForward(dt);
      if (aircraft.holdingTurnAccumulated >= 180) {
        aircraft.heading = OUTBOUND_HEADING;
        aircraft.holdingSubState = HoldingSubState.OUTBOUND_LEG;
        aircraft.holdingTimer = 0;
      }
      break;
    }

    case HoldingSubState.OUTBOUND_LEG: {
      // Fly straight for duration
      aircraft.heading = OUTBOUND_HEADING;
      aircraft.moveForward(dt);
      aircraft.holdingTimer += dt;
      if (aircraft.holdingTimer >= HOLDING_OUTBOUND_DURATION) {
        aircraft.holdingSubState = HoldingSubState.INBOUND_TURN;
        aircraft.holdingTurnAccumulated = 0;
      }
      break;
    }

    case HoldingSubState.INBOUND_TURN: {
      // 180° right turn from outbound heading to inbound heading
      aircraft.heading = wrapDeg(aircraft.heading + turnAmount);
      aircraft.holdingTurnAccumulated += turnAmount;
      aircraft.moveForward(dt);
      if (aircraft.holdingTurnAccumulated >= 180) {
        aircraft.heading = INBOUND_HEADING;
        aircraft.holdingSubState = HoldingSubState.INBOUND_LEG;
      }
      break;
    }
  }
}
