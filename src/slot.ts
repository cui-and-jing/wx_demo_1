import { SlotClearEffect, SlotEntry, SlotResult } from './types';
import { clamp, lerp } from './utils';

export class SlotManager {
  private entries: SlotEntry[] = [];
  private effects: SlotClearEffect[] = [];
  private baseX = 120;
  private baseY = 1080;
  private spacing = 90;
  constructor(private readonly maxSlots: number) {}

  reset(): void {
    this.entries = [];
    this.effects = [];
  }

  setLayout(baseX: number, baseY: number, spacing: number): void {
    this.baseX = baseX;
    this.baseY = baseY;
    this.spacing = spacing;
  }

  addCard(id: number, typeId: number, label: string): SlotResult {
    if (this.entries.length >= this.maxSlots) {
      return { accepted: false, overflow: true, matched: false };
    }
    const entry: SlotEntry = {
      id,
      typeId,
      label,
      x: this.baseX,
      y: this.baseY - 80,
      targetX: this.computeTargetX(this.entries.length),
      targetY: this.baseY,
      scale: 0.5
    };
    this.entries.push(entry);
    this.recalculateTargets();

    const indices: number[] = [];
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].typeId === typeId) {
        indices.push(i);
      }
    }
    if (indices.length >= 3) {
      const removed: SlotEntry[] = [];
      const toRemove = indices.slice(0, 3).sort((a, b) => b - a);
      for (const index of toRemove) {
        const [removedEntry] = this.entries.splice(index, 1);
        if (removedEntry) {
          removed.push(removedEntry);
        }
      }
      for (const r of removed) {
        this.effects.push({
          id: r.id,
          typeId: r.typeId,
          label: r.label,
          x: r.x,
          y: r.y,
          timer: 0,
          duration: 320
        });
      }
      this.recalculateTargets();
      return { accepted: true, overflow: false, matched: true, clearedTypeId: typeId, removedIds: removed.map((item) => item.id) };
    }

    return { accepted: true, overflow: false, matched: false };
  }

  getEntries(): SlotEntry[] {
    return this.entries;
  }

  getEffects(): SlotClearEffect[] {
    return this.effects;
  }

  update(dt: number): void {
    const step = clamp(dt / 180, 0, 1);
    this.entries.forEach((entry, index) => {
      entry.targetX = this.computeTargetX(index);
      entry.targetY = this.baseY;
      entry.x = lerp(entry.x, entry.targetX, step);
      entry.y = lerp(entry.y, entry.targetY, step);
      entry.scale = lerp(entry.scale, 1, step * 0.9);
    });
    this.effects = this.effects.filter((effect) => {
      effect.timer += dt;
      effect.y -= dt * 0.05;
      return effect.timer < effect.duration;
    });
  }

  private recalculateTargets(): void {
    this.entries.forEach((entry, index) => {
      entry.targetX = this.computeTargetX(index);
      entry.targetY = this.baseY;
    });
  }

  private computeTargetX(index: number): number {
    return this.baseX + index * this.spacing;
  }
}
