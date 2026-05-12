import { randomUUID } from 'crypto';
import {
  ActionRecord,
  AnalysisResult,
  EngagementOutcome,
  RedditEvent,
  StrategyDecision
} from '../types';

export class ExecutionEngine {
  buildActionRecord(event: RedditEvent, analysis: AnalysisResult, decision: StrategyDecision, draft?: string): ActionRecord {
    const now = new Date().toISOString();

    return {
      id: randomUUID(),
      eventId: event.id,
      action: decision.action,
      status: 'queued',
      draft,
      createdAt: now,
      updatedAt: now,
      decision,
      analysis
    };
  }

  captureOutcome(actionId: string, karmaDelta: number, removedByMods: boolean, deleted: boolean, replyCount: number): EngagementOutcome {
    return {
      actionId,
      karmaDelta,
      removedByMods,
      deleted,
      replyCount,
      capturedAt: new Date().toISOString()
    };
  }
}
