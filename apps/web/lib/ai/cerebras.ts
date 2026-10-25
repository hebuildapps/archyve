// Backwards compatibility re-exports for assistant BYOK models
export * from './assistant';

import {
  BYOK_MODELS,
  BYOKModel,
  DEFAULT_BYOK_MODEL,
  buildAssistantSystemPrompt,
  formatOpenAIMessages,
} from './assistant';

export const CEREBRAS_MODELS = BYOK_MODELS;
export type CerebrasModel = BYOKModel;
export const DEFAULT_CEREBRAS_MODEL = DEFAULT_BYOK_MODEL;
export const buildCerebrasSystemPrompt = buildAssistantSystemPrompt;
export const formatCerebrasMessages = formatOpenAIMessages;
export function isCerebrasConfigured(): boolean {
  return false;
}
