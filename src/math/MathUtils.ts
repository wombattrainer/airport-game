export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Wrap angle to [0, 360). */
export function wrapDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Wrap angle to [0, 2π). */
export function wrapRad(rad: number): number {
  const TWO_PI = Math.PI * 2;
  return ((rad % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Convert a heading in degrees (0=north/up, clockwise) to a unit vector
 * in game space (y-axis points down on screen, but we treat up as negative y).
 *
 * Heading 0 = (0, -1)  (up)
 * Heading 90 = (1, 0)  (right)
 * Heading 180 = (0, 1) (down)
 * Heading 270 = (-1, 0)(left)
 */
export function headingToVector(headingDeg: number): { x: number; y: number } {
  const rad = degToRad(headingDeg);
  return {
    x: Math.sin(rad),
    y: -Math.cos(rad),
  };
}

/** Convert a vector (screen space: y-down) to heading in degrees (0=north, clockwise). */
export function vectorToHeading(x: number, y: number): number {
  // atan2 with swapped args: atan2(x, -y) gives clockwise-from-north
  return wrapDeg(radToDeg(Math.atan2(x, -y)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Shortest signed angle difference from `from` to `to` in degrees, range (-180, 180]. */
export function angleDiffDeg(from: number, to: number): number {
  let diff = wrapDeg(to - from);
  if (diff > 180) diff -= 360;
  return diff;
}
