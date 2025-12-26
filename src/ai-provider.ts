/**
 * AI Provider for GitHub Action
 *
 * Simplified version of the core AI provider.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";

/** Valid AI provider values */
export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

/** Valid quality mode values */
export const QUALITY_MODES = ["standard", "high"] as const;
export type QualityMode = (typeof QUALITY_MODES)[number];

const MODEL_CONFIG = {
  anthropic: {
    standard: "claude-sonnet-4-5",
    high: "claude-sonnet-4-5",
  },
  openai: {
    standard: "gpt-4.1",
    high: "gpt-4.1",
  },
  google: {
    standard: "gemini-3-flash",
    high: "gemini-3-flash",
  },
} as const;

export interface AIProviderInstance {
  readonly generateText: (options: {
    prompt: string;
    system?: string;
    temperature?: number;
  }) => Promise<{ text: string }>;
  readonly provider: AIProvider;
  readonly quality: QualityMode;
}

export function createAIProvider(
  provider: AIProvider,
  quality: QualityMode,
  apiKey: string
): AIProviderInstance {
  // Validate API key
  if (!apiKey) {
    throw new Error(
      `API key is required for provider "${provider}". ` +
        `Please set the 'api-key' input in your workflow.`
    );
  }

  const model = getModel(provider, quality, apiKey);

  return {
    provider,
    quality,
    generateText: async (options) => {
      try {
        const result = await generateText({
          model,
          prompt: options.prompt,
          system: options.system,
          temperature: options.temperature ?? 0.7,
          maxRetries: 2, // Retry up to 2 times (3 total attempts) with exponential backoff
        });
        return { text: result.text };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`[${provider}] AI generation failed: ${errorMessage}`, {
          cause: error,
        });
      }
    },
  };
}

function getModel(
  provider: AIProvider,
  quality: QualityMode,
  apiKey: string
): LanguageModel {
  const modelId = MODEL_CONFIG[provider][quality];

  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(modelId);
    }
    default: {
      // Exhaustive check - TypeScript will error if a new provider is added
      const _exhaustive: never = provider;
      throw new Error(`Unknown AI provider: ${_exhaustive}`);
    }
  }
}
