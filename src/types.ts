export type RedditEntityType = 'post' | 'comment';

export type SuggestedActionType =
  | 'ignore'
  | 'save'
  | 'summarize'
  | 'alert'
  | 'draft_reply'
  | 'draft_meme_reply'
  | 'schedule_post';

export interface RedditEvent {
  id: string;
  type: RedditEntityType;
  subreddit: string;
  author: string;
  title?: string;
  body: string;
  createdAt: string;
  score: number;
  numComments?: number;
  permalink?: string;
  keywords?: string[];
}

export interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number;
  viralityProbability: number;
  controversyLevel: number;
  humorStyle: 'none' | 'dry' | 'sarcastic' | 'meme';
  subredditCulture: 'formal' | 'casual' | 'technical' | 'meme';
  keywordFrequency: Record<string, number>;
  engagementVelocity: number;
  competitorMentions: string[];
  audienceBehavior: 'questioning' | 'debating' | 'seeking_help' | 'reactive';
  trendSignals: string[];
}

export interface StrategyDecision {
  action: SuggestedActionType;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  scheduledAt?: string;
}

export interface HumanizedDraft {
  original: string;
  rewritten: string;
  persona: string;
}

export interface SafetyReport {
  approved: boolean;
  flags: string[];
  riskScore: number;
}

export interface ActionRecord {
  id: string;
  eventId: string;
  action: SuggestedActionType;
  status: 'queued' | 'executed' | 'blocked' | 'failed';
  draft?: string;
  createdAt: string;
  updatedAt: string;
  safetyReport?: SafetyReport;
  decision: StrategyDecision;
  analysis: AnalysisResult;
}

export interface EngagementOutcome {
  actionId: string;
  karmaDelta: number;
  removedByMods: boolean;
  deleted: boolean;
  replyCount: number;
  capturedAt: string;
}

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

export interface PatternPerformance {
  pattern: string;
  samples: number;
  avgKarmaDelta: number;
  avgReplyCount: number;
  moderationRemovalRate: number;
  subreddits: Array<{
    subreddit: string;
    samples: number;
    avgKarmaDelta: number;
    avgReplyCount: number;
  }>;
}

export interface AnalyticsWindow {
  period: AnalyticsPeriod;
  periodKey: string;
  samples: number;
  avgKarmaDelta: number;
  avgReplyCount: number;
  moderationRemovalRate: number;
  topPatterns: PatternPerformance[];
}

export interface TrendRadarSignal {
  subreddit: string;
  eventId: string;
  viralityProbability: number;
  trendSignals: string[];
  detectedAt: string;
}

export interface PatternAnalyticsReport {
  generatedAt: string;
  cumulativePatterns: PatternPerformance[];
  daily: AnalyticsWindow[];
  weekly: AnalyticsWindow[];
  monthly: AnalyticsWindow[];
  trendRadar: TrendRadarSignal[];
}

export interface SheetChartSeries {
  label: string;
  values: number[];
  color: string;
}

export interface SheetChartSpec {
  type: 'pie' | 'bar';
  title: string;
  labels: string[];
  series: SheetChartSeries[];
}

export interface SheetTab {
  name: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean>>;
  charts?: SheetChartSpec[];
  description?: string;
}

export interface SheetsWorkbookPayload {
  spreadsheetId?: string;
  generatedAt: string;
  tabs: SheetTab[];
}
