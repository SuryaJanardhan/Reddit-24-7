import { PatternAnalyticsReport, SheetChartSpec, SheetTab, SheetsWorkbookPayload } from '../types';

interface GoogleSheetsSyncOptions {
  enabled: boolean;
  webhookUrl?: string;
  spreadsheetId?: string;
  timeoutMs: number;
}

export class GoogleSheetsSyncService {
  constructor(private readonly options: GoogleSheetsSyncOptions) {}

  buildWorkbook(report: PatternAnalyticsReport): SheetsWorkbookPayload {
    const tabs: SheetTab[] = [
      this.overviewTab(report),
      this.periodTab('Daily Analytics', report.daily),
      this.periodTab('Weekly Analytics', report.weekly),
      this.periodTab('Monthly Analytics', report.monthly),
      this.patternTextDatabaseTab(report),
      this.viralRadarTab(report)
    ];

    return {
      spreadsheetId: this.options.spreadsheetId,
      generatedAt: report.generatedAt,
      tabs
    };
  }

  async sync(payload: SheetsWorkbookPayload): Promise<{ pushed: boolean; details: string }> {
    if (!this.options.enabled) {
      return { pushed: false, details: 'Sheets sync disabled by configuration.' };
    }

    if (!this.options.webhookUrl) {
      return { pushed: false, details: 'GOOGLE_SHEETS_WEBHOOK_URL is not configured.' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(this.options.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const text = await response.text();
        return { pushed: false, details: `Sheets sync failed (${response.status}): ${text}` };
      }

      return { pushed: true, details: 'Sheets sync completed successfully.' };
    } catch (error) {
      return { pushed: false, details: `Sheets sync request failed: ${(error as Error).message}` };
    } finally {
      clearTimeout(timer);
    }
  }

  private overviewTab(report: PatternAnalyticsReport): SheetTab {
    const top = report.cumulativePatterns.slice(0, 10);

    return {
      name: 'Overview',
      description:
        'High-level cumulative view of pattern performance, designed for fast operator + agent understanding.',
      columns: ['pattern', 'samples', 'avg_karma_delta', 'avg_reply_count', 'mod_removal_rate'],
      rows: top.map((entry) => ({
        pattern: entry.pattern,
        samples: entry.samples,
        avg_karma_delta: Number(entry.avgKarmaDelta.toFixed(3)),
        avg_reply_count: Number(entry.avgReplyCount.toFixed(3)),
        mod_removal_rate: Number(entry.moderationRemovalRate.toFixed(3))
      })),
      charts: [
        {
          type: 'bar',
          title: 'Top Patterns by Average Karma',
          labels: top.map((entry) => entry.pattern),
          series: [
            {
              label: 'avg_karma_delta',
              values: top.map((entry) => Number(entry.avgKarmaDelta.toFixed(3))),
              color: '#4f46e5'
            }
          ]
        },
        {
          type: 'pie',
          title: 'Pattern Share by Sample Count',
          labels: top.map((entry) => entry.pattern),
          series: [
            {
              label: 'samples',
              values: top.map((entry) => entry.samples),
              color: '#f59e0b'
            }
          ]
        }
      ]
    };
  }

  private periodTab(
    title: string,
    windows: PatternAnalyticsReport['daily'] | PatternAnalyticsReport['weekly'] | PatternAnalyticsReport['monthly']
  ): SheetTab {
    const labels = windows.map((window) => window.periodKey);
    const chartSpecs: SheetChartSpec[] = [
      {
        type: 'bar',
        title: `${title} Karma Trend`,
        labels,
        series: [
          {
            label: 'avg_karma_delta',
            values: windows.map((window) => Number(window.avgKarmaDelta.toFixed(3))),
            color: '#10b981'
          }
        ]
      },
      {
        type: 'bar',
        title: `${title} Replies Trend`,
        labels,
        series: [
          {
            label: 'avg_reply_count',
            values: windows.map((window) => Number(window.avgReplyCount.toFixed(3))),
            color: '#ef4444'
          }
        ]
      }
    ];

    return {
      name: title,
      columns: ['period', 'samples', 'avg_karma_delta', 'avg_reply_count', 'mod_removal_rate', 'top_patterns'],
      rows: windows.map((window) => ({
        period: window.periodKey,
        samples: window.samples,
        avg_karma_delta: Number(window.avgKarmaDelta.toFixed(3)),
        avg_reply_count: Number(window.avgReplyCount.toFixed(3)),
        mod_removal_rate: Number(window.moderationRemovalRate.toFixed(3)),
        top_patterns: window.topPatterns.map((entry) => entry.pattern).join(', ')
      })),
      charts: chartSpecs
    };
  }

  private patternTextDatabaseTab(report: PatternAnalyticsReport): SheetTab {
    const rows = report.cumulativePatterns.flatMap((pattern) =>
      pattern.subreddits.length > 0
        ? pattern.subreddits.map((subredditStats) => ({
            pattern: pattern.pattern,
            subreddit: subredditStats.subreddit,
            samples: subredditStats.samples,
            avg_karma_delta: Number(subredditStats.avgKarmaDelta.toFixed(3)),
            avg_reply_count: Number(subredditStats.avgReplyCount.toFixed(3)),
            summary: `Pattern "${pattern.pattern}" is showing avg karma ${pattern.avgKarmaDelta.toFixed(
              2
            )} with ${pattern.samples} samples overall.`
          }))
        : [
            {
              pattern: pattern.pattern,
              subreddit: 'n/a',
              samples: pattern.samples,
              avg_karma_delta: Number(pattern.avgKarmaDelta.toFixed(3)),
              avg_reply_count: Number(pattern.avgReplyCount.toFixed(3)),
              summary: `Pattern "${pattern.pattern}" has ${pattern.samples} samples in cumulative analysis.`
            }
          ]
    );

    return {
      name: 'Pattern Text DB',
      description:
        'Human-readable textual database rows to support future edits by both operators and autonomous agents.',
      columns: ['pattern', 'subreddit', 'samples', 'avg_karma_delta', 'avg_reply_count', 'summary'],
      rows
    };
  }

  private viralRadarTab(report: PatternAnalyticsReport): SheetTab {
    return {
      name: 'Viral Radar',
      columns: ['subreddit', 'event_id', 'virality_probability', 'trend_signals', 'detected_at'],
      rows: report.trendRadar.map((entry) => ({
        subreddit: entry.subreddit,
        event_id: entry.eventId,
        virality_probability: Number(entry.viralityProbability.toFixed(3)),
        trend_signals: entry.trendSignals.join(', '),
        detected_at: entry.detectedAt
      })),
      charts: [
        {
          type: 'bar',
          title: 'Current Viral Peak Score',
          labels: report.trendRadar.map((entry) => `${entry.subreddit}:${entry.eventId}`),
          series: [
            {
              label: 'virality_probability',
              values: report.trendRadar.map((entry) => Number(entry.viralityProbability.toFixed(3))),
              color: '#8b5cf6'
            }
          ]
        }
      ]
    };
  }
}
