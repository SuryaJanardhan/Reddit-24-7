import { SafetyReport } from '../types';

const TOXIC = ['idiot', 'stupid', 'dumb', 'hate you', 'kill'];
const SPAMMY = ['buy now', 'limited offer', 'click here'];

export class SafetyEngine {
  evaluate(content: string, subredditRules: string[] = []): SafetyReport {
    const text = content.toLowerCase();
    const flags: string[] = [];

    if (TOXIC.some((word) => text.includes(word))) {
      flags.push('toxicity_risk');
    }

    if (SPAMMY.some((phrase) => text.includes(phrase))) {
      flags.push('spam_pattern');
    }

    if (/(.)\1{7,}/.test(text)) {
      flags.push('repetition_pattern');
    }

    if (subredditRules.some((rule) => rule.toLowerCase().includes('no links')) && text.includes('http')) {
      flags.push('subreddit_rule_violation');
    }

    if (text.length < 4) {
      flags.push('low_effort_content');
    }

    const riskScore = Math.min(1, flags.length / 4);

    return {
      approved: riskScore < 0.5,
      flags,
      riskScore
    };
  }
}
