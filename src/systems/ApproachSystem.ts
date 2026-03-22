import { Aircraft } from '../entities/Aircraft';
import { AircraftState, ApproachSubState } from '../types';
import { Runway } from '../entities/Runway';
import {
  TURN_RATE_DEG_PER_SEC,
  FINAL_APPROACH_X, FINAL_APPROACH_Y,
  KNOTS_TO_GU_PER_SEC,
} from '../config';
import { degToRad, radToDeg, wrapDeg, angleDiffDeg, vectorToHeading } from '../math/MathUtils';

/**
 * Turn radius = speed / angular_velocity (in rad/s).
 */
function turnRadius(speedGU: number): number {
  return speedGU / degToRad(TURN_RATE_DEG_PER_SEC);
}

/**
 * Compute the turn center for a left turn onto the runway heading at FP.
 *
 * The turn center is offset to the LEFT of the runway heading from FP.
 * For heading 0 (north), left = west, so C = (FP.x - R, FP.y).
 */
function turnCenter(runway: Runway, R: number): { cx: number; cy: number } {
  const H = degToRad(runway.heading);
  return {
    cx: FINAL_APPROACH_X + (-Math.cos(H)) * R,
    cy: FINAL_APPROACH_Y + (-Math.sin(H)) * R,
  };
}

/**
 * Compute the tangent point from an external point P to the turn circle.
 *
 * Given circle (C, R) and external point P, finds the tangent point T
 * on the circle that allows the aircraft to enter a left turn (CCW on
 * screen) and sweep to FP with minimum turn.
 *
 * Returns the tangent point {x, y} or null if P is inside the circle.
 */
function tangentPoint(
  px: number, py: number,
  cx: number, cy: number,
  R: number,
): { x: number; y: number } | null {
  const dx = px - cx;
  const dy = py - cy;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d <= R) return null; // Inside circle — no tangent

  // Angle from C to P
  const beta = Math.atan2(dy, dx);

  // Angle offset for tangent
  const alpha = Math.acos(R / d);

  // We want the tangent that gives the shorter left-turn sweep to FP.
  // FP is at screen-angle H (runway heading in radians) from C.
  // The left turn sweeps CCW on screen (screen-angle decreasing).
  // We want the tangent at (beta - alpha) — this is closer to FP's
  // angle, requiring less turn.
  const theta = beta - alpha;

  return {
    x: cx + R * Math.cos(theta),
    y: cy + R * Math.sin(theta),
  };
}

/** Initiate approach for an aircraft. Pass lockRunway=false for user-initiated approaches. */
export function beginApproach(aircraft: Aircraft, runway: Runway, lockRunway = true): void {
  aircraft.state = AircraftState.APPROACH;
  aircraft.approachSubState = ApproachSubState.DIRECT_TO_BASE;
  aircraft.approachTurnAccumulated = 0;
  aircraft.approachTargetHeading = runway.heading;

  if (lockRunway) {
    runway.lock(aircraft.callsign);
  }
}

/** Update an aircraft on approach. Returns true when aircraft reaches the threshold. */
export function updateApproach(aircraft: Aircraft, runway: Runway, dt: number): boolean {
  if (aircraft.state !== AircraftState.APPROACH) return false;

  const speedGU = aircraft.profile.speed * KNOTS_TO_GU_PER_SEC;
  const R = turnRadius(speedGU);
  const C = turnCenter(runway, R);
  const turnAmount = TURN_RATE_DEG_PER_SEC * dt;

  switch (aircraft.approachSubState) {
    case ApproachSubState.DIRECT_TO_BASE: {
      // Dynamically compute the tangent point from current position
      const tp = tangentPoint(aircraft.x, aircraft.y, C.cx, C.cy, R);

      if (!tp) {
        // Inside the circle — steer directly toward FP
        const dx = FINAL_APPROACH_X - aircraft.x;
        const dy = FINAL_APPROACH_Y - aircraft.y;
        const targetHeading = vectorToHeading(dx, dy);
        const diff = angleDiffDeg(aircraft.heading, targetHeading);
        if (Math.abs(diff) > turnAmount) {
          aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
        } else {
          aircraft.heading = targetHeading;
        }
        aircraft.moveForward(dt);
        // Check if close to FP — transition to FINAL
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < speedGU * dt * 2) {
          aircraft.approachSubState = ApproachSubState.FINAL;
        }
        break;
      }

      // Steer toward tangent point (rate-limited)
      const dx = tp.x - aircraft.x;
      const dy = tp.y - aircraft.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const targetHeading = vectorToHeading(dx, dy);
      const diff = angleDiffDeg(aircraft.heading, targetHeading);
      if (Math.abs(diff) > turnAmount) {
        aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
      } else {
        aircraft.heading = targetHeading;
      }

      aircraft.moveForward(dt);

      // Transition to ARC when reaching the tangent point
      if (dist < speedGU * dt * 2) {
        aircraft.approachSubState = ApproachSubState.BASE_TURN;
      }
      break;
    }

    case ApproachSubState.BASE_TURN: {
      // Follow the arc by tracking the tangent heading.
      // The tangent heading at any point on/near the circle equals
      // the screen-angle from C to the aircraft: atan2(dy, dx).
      const dx = aircraft.x - C.cx;
      const dy = aircraft.y - C.cy;
      const tangentHeading = wrapDeg(radToDeg(Math.atan2(dy, dx)));

      const diff = angleDiffDeg(aircraft.heading, tangentHeading);
      if (Math.abs(diff) > turnAmount) {
        aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
      } else {
        aircraft.heading = tangentHeading;
      }

      aircraft.moveForward(dt);

      // Transition to FINAL when heading is within 15° of runway heading
      const headingDiff = Math.abs(angleDiffDeg(aircraft.heading, runway.heading));
      if (headingDiff < 15) {
        aircraft.approachSubState = ApproachSubState.FINAL;
      }
      break;
    }

    case ApproachSubState.FINAL: {
      // Steer toward the runway threshold
      const dx = runway.thresholdX - aircraft.x;
      const dy = runway.thresholdY - aircraft.y;
      const distToThreshold = Math.sqrt(dx * dx + dy * dy);

      const targetHeading = vectorToHeading(dx, dy);
      const diff = angleDiffDeg(aircraft.heading, targetHeading);
      if (Math.abs(diff) > turnAmount) {
        aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
      } else {
        aircraft.heading = targetHeading;
      }

      aircraft.moveForward(dt);

      if (distToThreshold < speedGU * dt * 2) {
        return true; // Reached threshold — transition to LANDING
      }
      break;
    }
  }

  return false;
}
