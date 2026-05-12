import { CollectorEngine } from './engines/collectorEngine';
import { AnalysisEngine } from './engines/analysisEngine';
import { StrategyAgent } from './engines/strategyAgent';
import { HumanizationLayer } from './engines/humanizationLayer';
import { SafetyEngine } from './engines/safetyEngine';
import { ExecutionEngine } from './engines/executionEngine';
import { InMemoryStore } from './store/inMemoryStore';
import { QueueService } from './queue/queueService';
import { config } from './config';
import { ActionRecord, RedditEvent, SuggestedActionType } from './types';
import { ChannelRateLimiter } from './rateLimit/channelRateLimiter';
import { GroqClient } from './llm/groqClient';

export class RedditAutonomousOrchestrator {
  private readonly collector = new CollectorEngine();
  private readonly analyzer = new AnalysisEngine();
  private readonly strategist = new StrategyAgent();
  private readonly humanizer = new HumanizationLayer();
  private readonly safety = new SafetyEngine();
  private readonly executor = new ExecutionEngine();
  private readonly queue: QueueService<{ actionId: string }>;
  private readonly redditLimiter = new ChannelRateLimiter(
    config.redditRequestsPerMinute,
    config.rateLimitUtilizationTarget
  );
  private readonly sheetsLimiter = new ChannelRateLimiter(
    config.sheetsRequestsPerMinute,
    config.rateLimitUtilizationTarget
  );
  private readonly llmLimiter = new ChannelRateLimiter(
    config.llmRequestsPerMinute,
    config.rateLimitUtilizationTarget
  );
  private readonly groqClient = new GroqClient({
    apiKeys: config.groqApiKeys,
    model: config.groqModel,
    maxRetries: config.groqMaxRetries,
    baseRetryMs: config.groqBaseRetryMs,
    limiter: this.llmLimiter
  });

  constructor(private readonly store: InMemoryStore) {
    this.queue = new QueueService<{ actionId: string }>(
      config.queueName,
      config.redisUrl,
      async ({ actionId }) => {
        const action = this.store.getActionById(actionId);
        if (!action) {
          return;
        }

        if (action.status === 'blocked') {
          return;
        }

        this.store.updateAction(actionId, { status: 'executed' });
      }
    );
  }

  async ingestAndEvaluate(rawEvent: RedditEvent): Promise<{ event: RedditEvent; action: ActionRecord }> {
    const event = this.collector.normalizeEvent(rawEvent);
    this.store.addEvent(event);

    const analysis = this.analyzer.analyze(event);
    const decision = this.strategist.decide(event, analysis);

    const shouldDraft = decision.action === 'draft_reply' || decision.action === 'draft_meme_reply';
    const seedDraft = this.humanizer.rewrite(
      `Thanks for sharing this. Key point I noticed: ${event.title ?? event.body.slice(0, 120)}`,
      config.defaultPersona,
      decision.action === 'draft_meme_reply'
    ).rewritten;

    const draft = shouldDraft ? await this.generateDraftWithGroq(event, decision.action, seedDraft) : undefined;

    const safety = draft ? this.safety.evaluate(draft) : this.safety.evaluate(event.body);
    const actionRecord = this.executor.buildActionRecord(event, analysis, decision, draft);

    if (!safety.approved) {
      actionRecord.status = 'blocked';
    }

    actionRecord.safetyReport = safety;
    this.store.addAction(actionRecord);

    if (actionRecord.status === 'queued' && decision.action !== 'ignore') {
      const decisionDelay = decision.scheduledAt
        ? Math.max(0, new Date(decision.scheduledAt).getTime() - Date.now())
        : config.defaultReplyDelayMs;
      const channelDelay = this.reserveChannelDelay(decision.action);

      void this.queue.enqueue({
        name: decision.action,
        data: { actionId: actionRecord.id },
        delayMs: decisionDelay + channelDelay
      });
    }

    return { event, action: actionRecord };
  }

  recordOutcome(actionId: string, karmaDelta: number, removedByMods: boolean, deleted: boolean, replyCount: number): ActionRecord | undefined {
    const action = this.store.getActionById(actionId);
    if (!action) {
      return undefined;
    }

    const outcome = this.executor.captureOutcome(actionId, karmaDelta, removedByMods, deleted, replyCount);
    this.store.addOutcome(outcome);
    return action;
  }

  listEvents(limit?: number) {
    return this.store.listEvents(limit);
  }

  listActions(limit?: number) {
    return this.store.listActions(limit);
  }

  dashboard() {
    return this.store.getDashboard();
  }

  close(): Promise<void> {
    return this.queue.close();
  }

  private reserveChannelDelay(action: SuggestedActionType): number {
    if (action === 'save' || action === 'summarize' || action === 'alert') {
      return this.sheetsLimiter.reserveDelayMs();
    }

    if (action === 'draft_reply' || action === 'draft_meme_reply' || action === 'schedule_post') {
      return this.redditLimiter.reserveDelayMs();
    }

    return 0;
  }

  private async generateDraftWithGroq(event: RedditEvent, action: SuggestedActionType, fallbackDraft: string): Promise<string> {
    const memeMode = action === 'draft_meme_reply';
    const systemPrompt = [
      'You write natural Reddit replies.',
      'Avoid spam patterns and repetitive wording.',
      'Respect subreddit context and avoid toxic language.'
    ].join(' ');

    const userPrompt = [
      `Subreddit: r/${event.subreddit}`,
      `Author: ${event.author}`,
      `Title: ${event.title ?? '(none)'}`,
      `Body: ${event.body}`,
      `Mode: ${memeMode ? 'meme-style light humor' : 'helpful conversational'}`,
      'Return one concise comment draft only.'
    ].join('\n');

    try {
      const generated = await this.groqClient.generateReply(systemPrompt, userPrompt);
      return generated || fallbackDraft;
    } catch {
      return fallbackDraft;
    }
  }
}
