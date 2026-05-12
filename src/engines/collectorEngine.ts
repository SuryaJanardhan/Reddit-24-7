import { RedditEvent } from '../types';

export class CollectorEngine {
  normalizeEvent(event: RedditEvent): RedditEvent {
    const normalizedBody = event.body.trim();
    const inferredKeywords = this.extractKeywords(`${event.title ?? ''} ${normalizedBody}`);

    return {
      ...event,
      body: normalizedBody,
      keywords: [...new Set([...(event.keywords ?? []), ...inferredKeywords])]
    };
  }

  private extractKeywords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9\s#]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 4)
      .slice(0, 25);
  }
}
