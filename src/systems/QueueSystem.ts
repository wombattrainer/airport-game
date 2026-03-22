import { Aircraft } from '../entities/Aircraft';

export class QueueSystem {
  readonly queue: Aircraft[] = [];

  enqueue(aircraft: Aircraft): void {
    this.queue.push(aircraft);
  }

  /** Remove and return the top aircraft, or null if empty. */
  dequeue(): Aircraft | null {
    return this.queue.shift() ?? null;
  }

  /** Remove a specific aircraft by callsign. Returns the removed aircraft or null. */
  remove(callsign: string): Aircraft | null {
    const idx = this.queue.findIndex(a => a.callsign === callsign);
    if (idx !== -1) {
      const [removed] = this.queue.splice(idx, 1);
      return removed;
    }
    return null;
  }

  /** Move an aircraft from one position to another. */
  reorder(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.queue.length) return;
    if (toIndex < 0 || toIndex >= this.queue.length) return;
    const [item] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, item);
  }

  get length(): number {
    return this.queue.length;
  }

  reset(): void {
    this.queue.length = 0;
  }
}
