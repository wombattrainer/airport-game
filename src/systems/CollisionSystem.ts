import { Aircraft } from '../entities/Aircraft';
import { AircraftState, AircraftSize } from '../types';
import { Renderer } from '../render/Renderer';

/**
 * Diamond half-extents in screen pixels — must match AircraftRenderer.
 * Formula: 18 * SIZE_SCALE[size]
 */
const DIAMOND_SCREEN_RADIUS: Record<AircraftSize, number> = {
  [AircraftSize.SMALL]:  18 * 0.7,  // 12.6 px
  [AircraftSize.MEDIUM]: 18 * 1.0,  // 18 px
  [AircraftSize.LARGE]:  18 * 1.4,  // 25.2 px
};

export interface CollisionResult {
  a: Aircraft;
  b: Aircraft;
  /** World-space midpoint — used to place the explosion. */
  wx: number;
  wy: number;
}

/**
 * Check for diamond-diamond collisions between all aircraft in APPROACH or
 * LANDING state. Two axis-aligned rhombuses with half-extents r₁ and r₂
 * overlap when |Δx| + |Δy| ≤ r₁ + r₂ (screen space).
 *
 * Each aircraft appears in at most one result (first collision wins).
 */
export function checkCollisions(
  aircraft: Aircraft[],
  renderer: Renderer,
): CollisionResult[] {
  const applicable = aircraft.filter(
    ac => ac.state === AircraftState.APPROACH || ac.state === AircraftState.LANDING,
  );

  const results: CollisionResult[] = [];
  const collided = new Set<string>();

  for (let i = 0; i < applicable.length; i++) {
    for (let j = i + 1; j < applicable.length; j++) {
      const a = applicable[i];
      const b = applicable[j];

      if (collided.has(a.callsign) || collided.has(b.callsign)) continue;

      const posA = renderer.gameToScreen(a.x, a.y);
      const posB = renderer.gameToScreen(b.x, b.y);
      const rA = DIAMOND_SCREEN_RADIUS[a.size];
      const rB = DIAMOND_SCREEN_RADIUS[b.size];

      const dx = Math.abs(posA.sx - posB.sx);
      const dy = Math.abs(posA.sy - posB.sy);

      if (dx + dy <= rA + rB) {
        results.push({
          a,
          b,
          wx: (a.x + b.x) / 2,
          wy: (a.y + b.y) / 2,
        });
        collided.add(a.callsign);
        collided.add(b.callsign);
      }
    }
  }

  return results;
}
