import { HumanizedDraft } from '../types';

export class HumanizationLayer {
  rewrite(input: string, persona: string, memeMode = false): HumanizedDraft {
    const trimmed = input.trim();
    const withPersona = this.applyPersona(trimmed, persona, memeMode);

    return {
      original: input,
      rewritten: this.applyNaturalVariation(withPersona),
      persona
    };
  }

  private applyPersona(text: string, persona: string, memeMode: boolean): string {
    const lowerPersona = persona.toLowerCase();

    if (memeMode) {
      return `ngl ${text} 😂`;
    }
    if (lowerPersona.includes('technical')) {
      return `From a practical angle: ${text}`;
    }
    if (lowerPersona.includes('casual')) {
      return `Honestly, ${text}`;
    }

    return text;
  }

  private applyNaturalVariation(text: string): string {
    return text
      .replace(/\bdo not\b/gi, "don't")
      .replace(/\bcannot\b/gi, "can't")
      .replace(/\bit is\b/gi, "it's");
  }
}
