import { ActionRecord, EngagementOutcome, RedditEvent } from '../types';

export class InMemoryStore {
  private readonly events: RedditEvent[] = [];
  private readonly actions: ActionRecord[] = [];
  private readonly outcomes: EngagementOutcome[] = [];

  addEvent(event: RedditEvent): void {
    this.events.unshift(event);
  }

  listEvents(limit = 100): RedditEvent[] {
    return this.events.slice(0, limit);
  }

  getEventById(id: string): RedditEvent | undefined {
    return this.events.find((event) => event.id === id);
  }

  addAction(action: ActionRecord): void {
    this.actions.unshift(action);
  }

  updateAction(actionId: string, patch: Partial<ActionRecord>): ActionRecord | undefined {
    const current = this.actions.find((action) => action.id === actionId);
    if (!current) {
      return undefined;
    }

    Object.assign(current, patch, { updatedAt: new Date().toISOString() });
    return current;
  }

  listActions(limit = 100): ActionRecord[] {
    return this.actions.slice(0, limit);
  }

  getActionById(actionId: string): ActionRecord | undefined {
    return this.actions.find((action) => action.id === actionId);
  }

  addOutcome(outcome: EngagementOutcome): void {
    this.outcomes.unshift(outcome);
  }

  listOutcomes(limit = 200): EngagementOutcome[] {
    return this.outcomes.slice(0, limit);
  }

  getDashboard(): {
    eventsTracked: number;
    actionsQueued: number;
    actionsExecuted: number;
    actionsBlocked: number;
    outcomesTracked: number;
    avgKarmaDelta: number;
    moderationRemovalRate: number;
  } {
    const actionsExecuted = this.actions.filter((action) => action.status === 'executed').length;
    const actionsBlocked = this.actions.filter((action) => action.status === 'blocked').length;
    const karmaSum = this.outcomes.reduce((sum, outcome) => sum + outcome.karmaDelta, 0);
    const modRemovals = this.outcomes.filter((outcome) => outcome.removedByMods).length;

    return {
      eventsTracked: this.events.length,
      actionsQueued: this.actions.filter((action) => action.status === 'queued').length,
      actionsExecuted,
      actionsBlocked,
      outcomesTracked: this.outcomes.length,
      avgKarmaDelta: this.outcomes.length ? karmaSum / this.outcomes.length : 0,
      moderationRemovalRate: this.outcomes.length ? modRemovals / this.outcomes.length : 0
    };
  }
}
