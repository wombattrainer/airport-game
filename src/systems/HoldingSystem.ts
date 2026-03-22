import { Aircraft } from '../entities/Aircraft';
import { AircraftState, HoldingSubState } from '../types';
import {
  HOLDING_FIX_X, HOLDING_FIX_Y,
  TURN_RATE_DEG_PER_SEC, HOLDING_OUTBOUND_DURATION,
  HOLDING_ENTRY_DISTANCE, HOLDING_DIRECTION,
} from '../config';
import { degToRad, wrapDeg, angleDiffDeg, headingToVector } from '../math/MathUtils';

/**
 * Holding pattern racetrack geometry.
 *
 * HOLDING_DIRECTION is the compass heading of the inbound leg.
 * Right-hand turns (standard pattern).
 *
 * Entry procedure (direct entry for current spawn geometry):
 *   ENTRY_ALIGN   → shortest turn to HOLDING_DIRECTION
 *   ENTRY_TURN1   → 90° right turn toward holding side
 *   ENTRY_LEG     → straight leg until perpendicular displacement = R
 *   ENTRY_TURN2   → 90° right turn to outbound heading
 *
 * Steady-state racetrack:
 *   OUTBOUND_LEG  → fly straight for HOLDING_OUTBOUND_DURATION (timer starts abeam HF)
 *   INBOUND_TURN  → 180° right turn, rolling out on HOLDING_DIRECTION
 *   INBOUND_LEG   → fly on HOLDING_DIRECTION toward HF
 *   OUTBOUND_TURN → 180° right turn at HF
 */

const INBOUND_HEADING = HOLDING_DIRECTION;
const OUTBOUND_HEADING = wrapDeg(HOLDING_DIRECTION + 180);
const PERP_HEADING = wrapDeg(HOLDING_DIRECTION + 90);

/** Inbound direction unit vector (for overshoot detection). */
const inbDir = headingToVector(INBOUND_HEADING);

/** Perpendicular to inbound direction (right of track), for track-line projection. */
const inbPerpDir = {
  x: Math.cos(degToRad(INBOUND_HEADING)),
  y: Math.sin(degToRad(INBOUND_HEADING)),
};

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
  aircraft.holdingSubState = HoldingSubState.ENTRY_ALIGN;
  aircraft.holdingTurnAccumulated = 0;
  aircraft.holdingTimer = 0;
}

/** Update an aircraft in holding pattern. */
export function updateHolding(aircraft: Aircraft, dt: number): void {
  if (aircraft.state !== AircraftState.HOLDING) return;

  const turnAmount = TURN_RATE_DEG_PER_SEC * dt;

  switch (aircraft.holdingSubState) {
    // ── Entry: Phase 1 — turn to HOLDING_DIRECTION via shortest arc ──
    case HoldingSubState.ENTRY_ALIGN: {
      const diff = angleDiffDeg(aircraft.heading, INBOUND_HEADING);
      if (Math.abs(diff) > turnAmount) {
        aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
        aircraft.moveForward(dt);
      } else {
        aircraft.heading = INBOUND_HEADING;
        aircraft.moveForward(dt);
        aircraft.holdingSubState = HoldingSubState.ENTRY_TURN1;
        aircraft.holdingTurnAccumulated = 0;
      }
      break;
    }

    // ── Entry: Phase 2a — 90° right turn toward holding side ──
    case HoldingSubState.ENTRY_TURN1: {
      aircraft.heading = wrapDeg(aircraft.heading + turnAmount);
      aircraft.holdingTurnAccumulated += turnAmount;
      aircraft.moveForward(dt);
      if (aircraft.holdingTurnAccumulated >= 90) {
        aircraft.heading = PERP_HEADING;
        aircraft.holdingSubState = HoldingSubState.ENTRY_LEG;
      }
      break;
    }

    // ── Entry: Phase 2b — straight leg until perpendicular offset = R ──
    case HoldingSubState.ENTRY_LEG: {
      aircraft.heading = PERP_HEADING;
      aircraft.moveForward(dt);

      const R = aircraft.speed / degToRad(TURN_RATE_DEG_PER_SEC);
      const perpDisp = (aircraft.x - HOLDING_FIX_X) * inbPerpDir.x +
                       (aircraft.y - HOLDING_FIX_Y) * inbPerpDir.y;
      if (perpDisp >= R) {
        aircraft.holdingSubState = HoldingSubState.ENTRY_TURN2;
        aircraft.holdingTurnAccumulated = 0;
      }
      break;
    }

    // ── Entry: Phase 2c — 90° right turn to outbound heading ──
    case HoldingSubState.ENTRY_TURN2: {
      aircraft.heading = wrapDeg(aircraft.heading + turnAmount);
      aircraft.holdingTurnAccumulated += turnAmount;
      aircraft.moveForward(dt);
      if (aircraft.holdingTurnAccumulated >= 90) {
        aircraft.heading = OUTBOUND_HEADING;
        aircraft.holdingSubState = HoldingSubState.OUTBOUND_LEG;
        aircraft.holdingTimer = 0;
      }
      break;
    }

    // ── Steady-state racetrack ──────────────────────────────────

    case HoldingSubState.OUTBOUND_TURN: {
      // 180° right turn at HF from inbound to outbound heading.
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
      // Fly straight on outbound heading.
      // Timer only runs when abeam or past HF (handles entry offset).
      aircraft.heading = OUTBOUND_HEADING;
      aircraft.moveForward(dt);

      const abeamDot = (aircraft.x - HOLDING_FIX_X) * inbDir.x +
                       (aircraft.y - HOLDING_FIX_Y) * inbDir.y;
      if (abeamDot <= 0) {
        aircraft.holdingTimer += dt;
      }
      if (aircraft.holdingTimer >= HOLDING_OUTBOUND_DURATION) {
        aircraft.holdingSubState = HoldingSubState.INBOUND_TURN;
        aircraft.holdingTurnAccumulated = 0;
      }
      break;
    }

    case HoldingSubState.INBOUND_TURN: {
      // 180° right turn from outbound heading to inbound heading.
      aircraft.heading = wrapDeg(aircraft.heading + turnAmount);
      aircraft.holdingTurnAccumulated += turnAmount;
      aircraft.moveForward(dt);
      if (aircraft.holdingTurnAccumulated >= 180) {
        aircraft.heading = INBOUND_HEADING;
        // Project position onto the inbound track line through HF
        // to eliminate perpendicular drift from turn discretization.
        const dx = aircraft.x - HOLDING_FIX_X;
        const dy = aircraft.y - HOLDING_FIX_Y;
        const perpDist = dx * inbPerpDir.x + dy * inbPerpDir.y;
        aircraft.x -= perpDist * inbPerpDir.x;
        aircraft.y -= perpDist * inbPerpDir.y;
        aircraft.holdingSubState = HoldingSubState.INBOUND_LEG;
      }
      break;
    }

    case HoldingSubState.INBOUND_LEG: {
      // Fly toward HF on HOLDING_DIRECTION heading.
      aircraft.heading = INBOUND_HEADING;

      // Check BEFORE moving whether aircraft will reach/pass HF this frame.
      const dxFromHF = aircraft.x - HOLDING_FIX_X;
      const dyFromHF = aircraft.y - HOLDING_FIX_Y;
      const dot = dxFromHF * inbDir.x + dyFromHF * inbDir.y;
      const distToHF = -dot; // positive = still approaching
      const moveDistance = aircraft.speed * dt;

      if (dot >= 0 || moveDistance >= distToHF) {
        // Will reach or pass HF — snap to HF and begin outbound turn
        aircraft.x = HOLDING_FIX_X;
        aircraft.y = HOLDING_FIX_Y;
        aircraft.holdingSubState = HoldingSubState.OUTBOUND_TURN;
        aircraft.holdingTurnAccumulated = 0;
      } else {
        aircraft.moveForward(dt);
      }
      break;
    }
  }
}
