import { AnalysisResult, RedditEvent } from '../types';

const POSITIVE = ['great', 'love', 'awesome', 'win', 'best', 'amazing', 'helpful', 'thank'];
const NEGATIVE = ['hate', 'worst', 'awful', 'scam', 'terrible', 'angry', 'broken', 'useless'];
const HUMOR = ['lol', 'lmao', 'meme', 'shitpost', 'rofl'];
const COMPETITORS = ['openai', 'anthropic', 'meta', 'google', 'microsoft', 'nvidia'];

export class AnalysisEngine {
  analyze(event: RedditEvent): AnalysisResult {
    const text = `${event.title ?? ''} ${event.body}`.toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);

    const positiveHits = words.filter((word) => POSITIVE.includes(word)).length;
    const negativeHits = words.filter((word) => NEGATIVE.includes(word)).length;
    const sentimentScore = positiveHits - negativeHits;

    const sentiment: AnalysisResult['sentiment'] =
      sentimentScore > 1 ? 'positive' : sentimentScore < -1 ? 'negative' : 'neutral';

    const createdAt = new Date(event.createdAt).getTime();
    const ageMinutes = Math.max(1, (Date.now() - createdAt) / 60000);
    const engagementVelocity = (event.score + (event.numComments ?? 0) * 2) / ageMinutes;
    const viralityProbability = Math.min(1, engagementVelocity / 8);

    const controversyLevel = Math.max(0, Math.min(1, (event.numComments ?? 0) / Math.max(1, event.score + 1)));
    const humorHits = words.filter((word) => HUMOR.includes(word)).length;

    const subredditCulture = this.classifyCulture(event.subreddit);
    const humorStyle: AnalysisResult['humorStyle'] = humorHits > 1 ? (subredditCulture === 'meme' ? 'meme' : 'sarcastic') : 'none';

    const keywordFrequency: Record<string, number> = {};
    for (const keyword of event.keywords ?? []) {
      keywordFrequency[keyword] = (keywordFrequency[keyword] ?? 0) + 1;
    }

    const competitorMentions = COMPETITORS.filter((brand) => text.includes(brand));

    const audienceBehavior = text.includes('?')
      ? 'questioning'
      : controversyLevel > 0.5
        ? 'debating'
        : text.includes('help')
          ? 'seeking_help'
          : 'reactive';

    const trendSignals = [
      ...(viralityProbability > 0.6 ? ['rapid_engagement'] : []),
      ...(competitorMentions.length > 0 ? ['competitor_attention'] : []),
      ...(sentiment === 'negative' ? ['reputation_risk'] : []),
      ...(humorStyle !== 'none' ? ['humor_wave'] : [])
    ];

    return {
      sentiment,
      sentimentScore,
      viralityProbability,
      controversyLevel,
      humorStyle,
      subredditCulture,
      keywordFrequency,
      engagementVelocity,
      competitorMentions,
      audienceBehavior,
      trendSignals
    };
  }

  private classifyCulture(subreddit: string): AnalysisResult['subredditCulture'] {
    const normalized = subreddit.toLowerCase();
    if (/(memes|shitpost|funny)/.test(normalized)) {
      return 'meme';
    }
    if (/(programming|machinelearning|startup|finance|stocks|technology)/.test(normalized)) {
      return 'technical';
    }
    if (/(ask|support|advice)/.test(normalized)) {
      return 'formal';
    }

    return 'casual';
  }
}
