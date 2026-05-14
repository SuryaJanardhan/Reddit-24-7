import { ChannelRateLimiter } from '../rateLimit/channelRateLimiter';

interface GroqClientOptions {
  apiKeys: string[];
  lightweightModel: string;
  complexModel: string;
  complexPromptThresholdChars: number;
  maxRetries: number;
  baseRetryMs: number;
  limiter: ChannelRateLimiter;
}

class GroqHttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

export class GroqClient {
  private keyIndex = 0;

  constructor(private readonly options: GroqClientOptions) {}

  async generateReply(
    systemPrompt: string,
    userPrompt: string,
    complexityHint: 'auto' | 'lightweight' | 'complex' = 'auto'
  ): Promise<string> {
    if (this.options.apiKeys.length === 0) {
      throw new Error('No Groq API keys configured. Set GROQ_API_KEYS or GROQ_API_KEY_1..5.');
    }

    let lastError: Error | undefined;
    const totalAttempts = Math.max(this.options.maxRetries, this.options.apiKeys.length);
    const preferredModel = this.pickPreferredModel(systemPrompt, userPrompt, complexityHint);
    const fallbackModel =
      preferredModel === this.options.complexModel ? this.options.lightweightModel : this.options.complexModel;
    const modelOrder = preferredModel === fallbackModel ? [preferredModel] : [preferredModel, fallbackModel];

    for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
      const key = this.nextKey();
      const model = modelOrder[attempt % modelOrder.length];
      try {
        const delayMs = this.options.limiter.reserveDelayMs();
        if (delayMs > 0) {
          await sleep(delayMs);
        }

        const content = await this.callGroqApi(key, model, systemPrompt, userPrompt);
        if (content.length > 0) {
          return content;
        }
      } catch (error) {
        lastError = error as Error;

        if (error instanceof GroqHttpError) {
          if (error.status === 401 || error.status === 403) {
            continue;
          }

          if (error.status === 429 || error.status >= 500) {
            await sleep(this.calculateBackoff(attempt));
            continue;
          }
        }

        await sleep(this.calculateBackoff(attempt));
      }
    }

    throw lastError ?? new Error('Groq request failed after retry/key rotation attempts.');
  }

  private nextKey(): string {
    const key = this.options.apiKeys[this.keyIndex % this.options.apiKeys.length];
    this.keyIndex += 1;
    return key;
  }

  private calculateBackoff(attempt: number): number {
    const cappedAttempt = Math.min(8, attempt);
    const jitter = Math.floor(Math.random() * 250);
    return this.options.baseRetryMs * 2 ** cappedAttempt + jitter;
  }

  private pickPreferredModel(
    systemPrompt: string,
    userPrompt: string,
    complexityHint: 'auto' | 'lightweight' | 'complex'
  ): string {
    if (complexityHint === 'lightweight') {
      return this.options.lightweightModel;
    }
    if (complexityHint === 'complex') {
      return this.options.complexModel;
    }

    const totalChars = systemPrompt.length + userPrompt.length;
    return totalChars >= this.options.complexPromptThresholdChars
      ? this.options.complexModel
      : this.options.lightweightModel;
  }

  private async callGroqApi(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new GroqHttpError(response.status, body || 'Groq API error');
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return payload.choices?.[0]?.message?.content?.trim() ?? '';
  }
}
