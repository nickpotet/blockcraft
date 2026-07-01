import { QUESTS } from '../data/quests.js';

export class QuestSystem {
  constructor(saved = null, callbacks = {}) {
    this.callbacks = callbacks;
    this.state = {
      questIndex: saved?.questIndex ?? 0,
      stepIndex: saved?.stepIndex ?? 0,
      progress: saved?.progress ?? 0,
      completed: saved?.completed ?? [],
      trophies: saved?.trophies ?? [],
      clues: saved?.clues ?? [],
      victory: saved?.victory ?? false
    };
  }

  get quest() { return QUESTS[this.state.questIndex] ?? QUESTS.at(-1); }
  get step() { return this.quest?.steps[this.state.stepIndex] ?? null; }
  get complete() { return this.state.victory; }

  event(type, target = null, amount = 1, context = {}) {
    const step = this.step;
    if (!step || step.type !== type) return false;
    let match = false;
    if (type === 'build') match = true;
    else if (type === 'haveAny') match = step.targets?.includes(target);
    else match = step.target === target;
    if (!match || (step.night && !context.isNight)) return false;
    if (type === 'clue' && context.clueId) {
      if (this.state.clues.includes(context.clueId)) return false;
      this.state.clues.push(context.clueId);
    }
    this.state.progress += amount;
    this.callbacks.progress?.(this.quest, step, this.state.progress);
    if (this.state.progress >= (step.count ?? 1)) this.advance();
    return true;
  }

  syncInventory(inventory) {
    const step = this.step;
    if (!step) return;
    if ((step.type === 'collect' || step.type === 'craft') && inventory.count(step.target) >= step.count) this.event(step.type, step.target, step.count);
    if (step.type === 'have' && inventory.count(step.target) >= step.count) this.event('have', step.target, step.count);
    if (step.type === 'haveAny') {
      const target = step.targets.find(id => inventory.count(id) > 0);
      if (target) this.event('haveAny', target, 1);
    }
  }

  advance() {
    const completedStep = this.step;
    this.state.progress = 0;
    this.state.stepIndex++;
    if (this.state.stepIndex >= this.quest.steps.length) {
      const completedQuest = this.quest;
      if (!this.state.completed.includes(completedQuest.id)) this.state.completed.push(completedQuest.id);
      if (completedQuest.id !== 'first_fire' && completedQuest.id !== 'ancient_leshy' && !this.state.trophies.includes(completedQuest.id)) this.state.trophies.push(completedQuest.id);
      this.state.questIndex++;
      this.state.stepIndex = 0;
      if (completedQuest.id === 'ancient_leshy') this.state.victory = true;
      this.callbacks.questComplete?.(completedQuest, this.state.victory);
    } else this.callbacks.stepComplete?.(this.quest, completedStep, this.step);
    this.callbacks.changed?.();
  }

  serialize() { return structuredClone(this.state); }
}
