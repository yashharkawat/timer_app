// AI provider router — set AI_PROVIDER env var to: gemini | openai | anthropic
// Falls back to first available key if AI_PROVIDER not set.

import { parseSchedule as gemini } from './gemini.js';
import { parseSchedule as openai } from './openai.js';
import { parseSchedule as anthropic } from './anthropic.js';

const providers = { gemini, openai, anthropic };

export function getProvider() {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit && providers[explicit]) return explicit;

  // Auto-detect from available keys
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';

  return null;
}

export async function parseScheduleFromText(text) {
  const provider = getProvider();
  if (!provider) {
    throw new Error(
      'No AI provider configured. Set AI_PROVIDER and the corresponding API key env var.'
    );
  }
  return providers[provider](text);
}
