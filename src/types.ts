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
