import {
  ActionRecord,
  AnalyticsPeriod,
  AnalyticsWindow,
  EngagementOutcome,
  PatternAnalyticsReport,
  PatternPerformance,
  RedditEvent,
  TrendRadarSignal
} from '../types';

interface PatternSample {
  pattern: string;
  subreddit: string;
  karmaDelta: number;
  replyCount: number;
  removedByMods: boolean;
  capturedAt: string;
}

export class PatternAnalyticsEngine {
  constructor(private readonly viralPeakThreshold: number) {}

  buildReport(events: RedditEvent[], actions: ActionRecord[], outcomes: EngagementOutcome[]): PatternAnalyticsReport {
    const actionById = new Map(actions.map((action) => [action.id, action]));
    const eventById = new Map(events.map((event) => [event.id, event]));
    const samples = this.collectSamples(outcomes, actionById, eventById);

    return {
      generatedAt: new Date().toISOString(),
      cumulativePatterns: this.buildPatternPerformance(samples),
      daily: this.buildPeriodWindows(samples, 'daily', 30),
      weekly: this.buildPeriodWindows(samples, 'weekly', 12),
      monthly: this.buildPeriodWindows(samples, 'monthly', 12),
      trendRadar: this.extractTrendRadar(events, actions)
    };
  }

  private collectSamples(
    outcomes: EngagementOutcome[],
    actionById: Map<string, ActionRecord>,
    eventById: Map<string, RedditEvent>
  ): PatternSample[] {
    const samples: PatternSample[] = [];

    for (const outcome of outcomes) {
      const action = actionById.get(outcome.actionId);
      if (!action) {
        continue;
      }
      const event = eventById.get(action.eventId);
      if (!event) {
        continue;
      }

      const patterns = [
        ...action.analysis.trendSignals,
        ...(event.keywords ?? []).slice(0, 3),
        action.action
      ].map((entry) => entry.toLowerCase());

      for (const pattern of new Set(patterns)) {
        samples.push({
          pattern,
          subreddit: event.subreddit.toLowerCase(),
          karmaDelta: outcome.karmaDelta,
          replyCount: outcome.replyCount,
          removedByMods: outcome.removedByMods,
          capturedAt: outcome.capturedAt
        });
      }
    }

    return samples;
  }

  private buildPatternPerformance(samples: PatternSample[]): PatternPerformance[] {
    const groups = new Map<string, PatternSample[]>();

    for (const sample of samples) {
      const list = groups.get(sample.pattern) ?? [];
      list.push(sample);
      groups.set(sample.pattern, list);
    }

    return [...groups.entries()]
      .map(([pattern, bucket]) => this.mapPatternBucket(pattern, bucket))
      .sort((a, b) => b.samples - a.samples)
      .slice(0, 50);
  }

  private buildPeriodWindows(samples: PatternSample[], period: AnalyticsPeriod, limit: number): AnalyticsWindow[] {
    const groups = new Map<string, PatternSample[]>();

    for (const sample of samples) {
      const key = this.toPeriodKey(sample.capturedAt, period);
      const list = groups.get(key) ?? [];
      list.push(sample);
      groups.set(key, list);
    }

    return [...groups.entries()]
      .sort(([left], [right]) => (left < right ? 1 : -1))
      .slice(0, limit)
      .map(([periodKey, bucket]) => {
        const totalKarma = bucket.reduce((sum, item) => sum + item.karmaDelta, 0);
        const totalReplies = bucket.reduce((sum, item) => sum + item.replyCount, 0);
        const removals = bucket.filter((item) => item.removedByMods).length;

        return {
          period,
          periodKey,
          samples: bucket.length,
          avgKarmaDelta: bucket.length ? totalKarma / bucket.length : 0,
          avgReplyCount: bucket.length ? totalReplies / bucket.length : 0,
          moderationRemovalRate: bucket.length ? removals / bucket.length : 0,
          topPatterns: this.buildPatternPerformance(bucket).slice(0, 5)
        };
      });
  }

  private mapPatternBucket(pattern: string, bucket: PatternSample[]): PatternPerformance {
    const karma = bucket.reduce((sum, item) => sum + item.karmaDelta, 0);
    const replies = bucket.reduce((sum, item) => sum + item.replyCount, 0);
    const removals = bucket.filter((item) => item.removedByMods).length;
    const subredditBuckets = new Map<string, PatternSample[]>();

    for (const sample of bucket) {
      const list = subredditBuckets.get(sample.subreddit) ?? [];
      list.push(sample);
      subredditBuckets.set(sample.subreddit, list);
    }

    return {
      pattern,
      samples: bucket.length,
      avgKarmaDelta: bucket.length ? karma / bucket.length : 0,
      avgReplyCount: bucket.length ? replies / bucket.length : 0,
      moderationRemovalRate: bucket.length ? removals / bucket.length : 0,
      subreddits: [...subredditBuckets.entries()]
        .map(([subreddit, subredditSamples]) => ({
          subreddit,
          samples: subredditSamples.length,
          avgKarmaDelta:
            subredditSamples.reduce((sum, item) => sum + item.karmaDelta, 0) / subredditSamples.length,
          avgReplyCount:
            subredditSamples.reduce((sum, item) => sum + item.replyCount, 0) / subredditSamples.length
        }))
        .sort((a, b) => b.samples - a.samples)
        .slice(0, 5)
    };
  }

  private extractTrendRadar(events: RedditEvent[], actions: ActionRecord[]): TrendRadarSignal[] {
    const eventById = new Map(events.map((event) => [event.id, event]));

    return actions
      .filter((action) => action.analysis.viralityProbability >= this.viralPeakThreshold)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 25)
      .map((action) => {
        const event = eventById.get(action.eventId);
        return {
          subreddit: event?.subreddit ?? 'unknown',
          eventId: action.eventId,
          viralityProbability: action.analysis.viralityProbability,
          trendSignals: action.analysis.trendSignals,
          detectedAt: action.updatedAt
        };
      });
  }

  private toPeriodKey(timestamp: string, period: AnalyticsPeriod): string {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');

    if (period === 'daily') {
      return `${year}-${month}-${day}`;
    }

    if (period === 'monthly') {
      return `${year}-${month}`;
    }

    const week = this.isoWeek(date);
    return `${year}-W${`${week}`.padStart(2, '0')}`;
  }

  private isoWeek(date: Date): number {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
