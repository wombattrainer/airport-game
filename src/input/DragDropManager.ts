import { QueueCardHitArea } from '../render/QueuePanelRenderer';
import { QueueSystem } from '../systems/QueueSystem';

export class DragDropManager {
  dragIndex: number | null = null;
  dragY: number | null = null;
  private isDragging = false;
  private hitAreas: QueueCardHitArea[] = [];

  constructor(private canvas: HTMLCanvasElement, private queueSystem: QueueSystem) {
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
  }

  updateHitAreas(areas: QueueCardHitArea[]): void {
    this.hitAreas = areas;
  }

  private onMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const area of this.hitAreas) {
      if (mx >= area.x && mx <= area.x + area.width &&
          my >= area.y && my <= area.y + area.height) {
        this.isDragging = true;
        this.dragIndex = area.index;
        this.dragY = my;
        break;
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || this.dragIndex === null) return;
    const rect = this.canvas.getBoundingClientRect();
    this.dragY = e.clientY - rect.top;
  };

  private onMouseUp = (_e: MouseEvent): void => {
    if (!this.isDragging || this.dragIndex === null || this.dragY === null) {
      this.isDragging = false;
      this.dragIndex = null;
      this.dragY = null;
      return;
    }

    // Determine drop index based on Y position
    let dropIndex = 0;
    for (const area of this.hitAreas) {
      if (this.dragY > area.y + area.height / 2) {
        dropIndex = area.index + 1;
      }
    }
    dropIndex = Math.min(dropIndex, this.queueSystem.length - 1);
    dropIndex = Math.max(dropIndex, 0);

    if (dropIndex !== this.dragIndex) {
      this.queueSystem.reorder(this.dragIndex, dropIndex);
    }

    this.isDragging = false;
    this.dragIndex = null;
    this.dragY = null;
  };

  reset(): void {
    this.isDragging = false;
    this.dragIndex = null;
    this.dragY = null;
    this.hitAreas = [];
  }
}
