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
 * Calculate the base turn point.
 *
 * Geometry (for runway heading 0 / north):
 *
 *   Aircraft approaches from the holding fix (west/northwest).
 *   It makes a LEFT turn onto the runway heading.
 *
 *   Turn center C = FP offset to the LEFT of runway heading by radius R.
 *     For heading 0: left = west, so C = (FP.x - R, FP.y)
 *
 *   BP is on the OPPOSITE side of the turn circle from FP (directly
 *   west of C). This assumes the aircraft arrives heading ~180° (south)
 *   and sweeps a ~180° left turn through to heading 0° (north) at FP.
 *
 *     BP = C + left * R = FP + left * 2R
 *     For heading 0: BP = (FP.x - 2R, FP.y)
 *
 * Generalised for any runway heading H:
 *   Left direction: (-cos(H), -sin(H))
 *   C  = FP + left * R
 *   BP = C  + left * R  = FP + left * 2R
 */
export function calcBaseTurnPoint(runway: Runway, speedGU: number): { x: number; y: number } {
  const R = turnRadius(speedGU);
  const H = degToRad(runway.heading);

  // Left direction from runway heading
  const leftX = -Math.cos(H);
  const leftY = -Math.sin(H);

  // BP: 2R to the left of FP (opposite side of turn circle from FP)
  return {
    x: FINAL_APPROACH_X + leftX * 2 * R,
    y: FINAL_APPROACH_Y + leftY * 2 * R,
  };
}

/** Initiate approach for an aircraft. */
export function beginApproach(aircraft: Aircraft, runway: Runway): void {
  aircraft.state = AircraftState.APPROACH;
  aircraft.approachSubState = ApproachSubState.DIRECT_TO_BASE;
  aircraft.approachTurnAccumulated = 0;
  aircraft.approachTargetHeading = runway.heading;

  runway.lock(aircraft.callsign);
}

/** Update an aircraft on approach. Returns true when aircraft reaches the threshold. */
export function updateApproach(aircraft: Aircraft, runway: Runway, dt: number): boolean {
  if (aircraft.state !== AircraftState.APPROACH) return false;

  const speedGU = aircraft.profile.speed * KNOTS_TO_GU_PER_SEC;
  const basePt = calcBaseTurnPoint(runway, speedGU);
  const turnAmount = TURN_RATE_DEG_PER_SEC * dt;

  switch (aircraft.approachSubState) {
    case ApproachSubState.DIRECT_TO_BASE: {
      const dx = basePt.x - aircraft.x;
      const dy = basePt.y - aircraft.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Steer toward base point (rate-limited)
      const targetHeading = vectorToHeading(dx, dy);
      const diff = angleDiffDeg(aircraft.heading, targetHeading);
      if (Math.abs(diff) > turnAmount) {
        aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
      } else {
        aircraft.heading = targetHeading;
      }

      aircraft.moveForward(dt);

      if (dist < speedGU * dt * 2) {
        aircraft.approachSubState = ApproachSubState.BASE_TURN;
        aircraft.approachTurnAccumulated = 0;
      }
      break;
    }

    case ApproachSubState.BASE_TURN: {
      // Follow the arc of the turn circle by tracking the tangent heading.
      //
      // Turn center C = FP offset left of runway heading by R.
      // At any point on/near the circle, the tangent heading for our
      // left turn equals the screen-angle from C to the aircraft:
      //   tangentHeading = atan2(dy, dx)  (in degrees)
      //
      // This works because for our left turn (CCW on screen),
      // the tangent at screen-angle θ points in heading θ.
      const R = turnRadius(speedGU);
      const H = degToRad(runway.heading);
      const cx = FINAL_APPROACH_X + (-Math.cos(H)) * R;
      const cy = FINAL_APPROACH_Y + (-Math.sin(H)) * R;

      const dx = aircraft.x - cx;
      const dy = aircraft.y - cy;
      const tangentHeading = wrapDeg(radToDeg(Math.atan2(dy, dx)));

      // Steer toward the tangent heading (rate-limited)
      const diff = angleDiffDeg(aircraft.heading, tangentHeading);
      if (Math.abs(diff) > turnAmount) {
        aircraft.heading = wrapDeg(aircraft.heading + Math.sign(diff) * turnAmount);
      } else {
        aircraft.heading = tangentHeading;
      }

      aircraft.moveForward(dt);

      // Transition to FINAL when heading is close to runway heading
      const headingDiff = Math.abs(angleDiffDeg(aircraft.heading, runway.heading));
      if (headingDiff < turnAmount * 2) {
        aircraft.heading = runway.heading;
        aircraft.approachSubState = ApproachSubState.FINAL;
      }
      break;
    }

    case ApproachSubState.FINAL: {
      // Steer toward the runway threshold (self-corrects any offset from the turn)
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
