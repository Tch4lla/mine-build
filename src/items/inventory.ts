import { item } from './items';

export interface StackData {
  /** Bound material item id (stored as `fuse` for save compatibility). */
  fuse?: string;
  /** Remaining durability of a tool (or of its bound material). */
  durability?: number;
  /** Photo for frames / photo blocks / shield emblems. */
  photoId?: string;
  /** Frame size in blocks (longest side). */
  size?: number;
}

export interface ItemStack {
  id: string;
  count: number;
  data?: StackData;
}

export const HOTBAR_SIZE = 9;
export const INVENTORY_SIZE = 36;

function sameData(a?: StackData, b?: StackData): boolean {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

export function canMerge(a: ItemStack, b: ItemStack): boolean {
  return a.id === b.id && sameData(a.data, b.data) && item(a.id).maxStack > 1;
}

export class Inventory {
  slots: (ItemStack | null)[] = new Array(INVENTORY_SIZE).fill(null);
  selected = 0;
  private listeners: (() => void)[] = [];

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  changed(): void {
    for (const fn of this.listeners) fn();
  }

  get held(): ItemStack | null {
    return this.slots[this.selected];
  }

  /** Adds a stack, returning how many items didn't fit. */
  add(stack: ItemStack): number {
    let left = stack.count;
    const max = item(stack.id).maxStack;
    // Top up existing stacks first.
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (s && canMerge(s, stack) && s.count < max) {
        const n = Math.min(left, max - s.count);
        s.count += n;
        left -= n;
      }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(left, max);
        this.slots[i] = { id: stack.id, count: n, data: stack.data ? { ...stack.data } : undefined };
        left -= n;
      }
    }
    if (left !== stack.count) this.changed();
    return left;
  }

  count(id: string): number {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }

  /** Removes `count` items with the given id (any data). Returns false (and removes nothing) if not enough. */
  remove(id: string, count: number): boolean {
    if (this.count(id) < count) return false;
    let left = count;
    // Take from the back so the hotbar is drained last.
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const n = Math.min(left, s.count);
        s.count -= n;
        left -= n;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    this.changed();
    return true;
  }

  /** Decrements the stack in a slot. */
  consume(slot: number, n = 1): void {
    const s = this.slots[slot];
    if (!s) return;
    s.count -= n;
    if (s.count <= 0) this.slots[slot] = null;
    this.changed();
  }

  swap(a: number, b: number): void {
    [this.slots[a], this.slots[b]] = [this.slots[b], this.slots[a]];
    this.changed();
  }

  clear(): void {
    this.slots.fill(null);
    this.changed();
  }

  toJSON(): { slots: (ItemStack | null)[]; selected: number } {
    return {
      slots: this.slots.map((s) => (s ? { ...s, data: s.data ? { ...s.data } : undefined } : null)),
      selected: this.selected,
    };
  }

  load(data: { slots: (ItemStack | null)[]; selected: number }): void {
    this.slots = new Array(INVENTORY_SIZE).fill(null);
    data.slots.slice(0, INVENTORY_SIZE).forEach((s, i) => (this.slots[i] = s));
    this.selected = data.selected ?? 0;
    this.changed();
  }
}
