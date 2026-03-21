export class Vector2 {
  constructor(public x: number, public y: number) {}

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vector2 {
    return new Vector2(this.x * s, this.y * s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return new Vector2(0, 0);
    return this.scale(1 / len);
  }

  distanceTo(v: Vector2): number {
    return this.sub(v).length();
  }

  /** Angle in radians from positive X axis, counter-clockwise. */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Rotate by radians counter-clockwise. */
  rotate(radians: number): Vector2 {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return new Vector2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
    );
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }
}
