import { ITEMS, createStack } from '../data/items.js';

export class Inventory {
  constructor(size = 36, serialized = null) {
    this.slots = Array.from({ length: size }, (_, index) => {
      const stack = serialized?.[index];
      return stack && ITEMS[stack.id] ? { ...stack } : null;
    });
  }

  get(index) { return this.slots[index] ?? null; }

  count(id) {
    return this.slots.reduce((sum, stack) => sum + (stack?.id === id ? stack.count : 0), 0);
  }

  has(ingredients) {
    return Object.entries(ingredients).every(([id, count]) => this.count(id) >= count);
  }

  add(id, count = 1, durability = null) {
    const item = ITEMS[id];
    if (!item || count <= 0) return count;
    let left = count;
    if (item.stack > 1) {
      for (const stack of this.slots) {
        if (!stack || stack.id !== id || stack.count >= item.stack) continue;
        const moved = Math.min(left, item.stack - stack.count);
        stack.count += moved;
        left -= moved;
        if (!left) return 0;
      }
    }
    for (let i = 0; i < this.slots.length && left; i++) {
      if (this.slots[i]) continue;
      const moved = Math.min(left, item.stack);
      this.slots[i] = createStack(id, moved, durability);
      left -= moved;
    }
    return left;
  }

  remove(id, count = 1) {
    let left = count;
    for (let i = this.slots.length - 1; i >= 0 && left; i--) {
      const stack = this.slots[i];
      if (!stack || stack.id !== id) continue;
      const removed = Math.min(left, stack.count);
      stack.count -= removed;
      left -= removed;
      if (stack.count <= 0) this.slots[i] = null;
    }
    return left === 0;
  }

  consume(ingredients) {
    if (!this.has(ingredients)) return false;
    for (const [id, count] of Object.entries(ingredients)) this.remove(id, count);
    return true;
  }

  damage(index, amount = 1) {
    const stack = this.slots[index];
    if (!stack || stack.durability == null) return false;
    stack.durability -= amount;
    if (stack.durability <= 0) {
      this.slots[index] = null;
      return true;
    }
    return false;
  }

  loseResources(ratio = .3) {
    for (let i = 0; i < this.slots.length; i++) {
      const stack = this.slots[i];
      if (!stack) continue;
      const item = ITEMS[stack.id];
      if (!item || item.stack === 1 || ['Строительство', 'Защита', 'Оружие', 'Инструмент'].includes(item.category)) continue;
      stack.count -= Math.max(1, Math.ceil(stack.count * ratio));
      if (stack.count <= 0) this.slots[i] = null;
    }
  }

  serialize() { return this.slots.map(stack => stack ? { ...stack } : null); }
}
