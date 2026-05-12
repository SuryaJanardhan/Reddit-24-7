import { AnalysisResult, RedditEvent, StrategyDecision } from '../types';

export class StrategyAgent {
  decide(event: RedditEvent, analysis: AnalysisResult): StrategyDecision {
    if (analysis.viralityProbability > 0.8 && analysis.sentiment !== 'negative') {
      return {
        action: 'alert',
        reason: 'High virality signal detected in a favorable context.',
        priority: 'high'
      };
    }

    if (analysis.audienceBehavior === 'questioning' && analysis.sentiment !== 'negative') {
      return {
        action: analysis.humorStyle === 'meme' ? 'draft_meme_reply' : 'draft_reply',
        reason: 'Question-driven thread with reply opportunity.',
        priority: 'high',
        scheduledAt: new Date(Date.now() + 60000).toISOString()
      };
    }

    if (analysis.competitorMentions.length > 0) {
      return {
        action: 'summarize',
        reason: `Competitor mentions found: ${analysis.competitorMentions.join(', ')}.`,
        priority: 'medium'
      };
    }

    if (event.score < 1 && analysis.engagementVelocity < 0.1) {
      return {
        action: 'ignore',
        reason: 'Low engagement signal and low strategic value.',
        priority: 'low'
      };
    }

    return {
      action: 'save',
      reason: 'Stored for trend learning and timing analysis.',
      priority: 'medium'
    };
  }
}
