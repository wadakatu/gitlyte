/**
 * AI Provider Abstraction
 *
 * Uses Vercel AI SDK to provide a unified interface for multiple AI providers.
 * Supports Anthropic, OpenAI, and Google AI.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";

import type { AIProvider, QualityMode } from "../types/v2-config.js";

/**
 * Model configurations for each provider
 */
const MODEL_CONFIG = {
  anthropic: {
    standard: "claude-sonnet-4-20250514",
    high: "claude-sonnet-4-20250514", // Same model, but with self-refine
  },
  openai: {
    standard: "gpt-4o",
    high: "gpt-4o",
  },
  google: {
    standard: "gemini-2.0-flash",
    high: "gemini-2.0-flash",
  },
} as const;

/**
 * Temperature settings by task type
 */
export const TEMPERATURE = {
  analysis: 0.3, // Deterministic analysis
  design: 0.5, // Creative but consistent design
  content: 0.7, // More creative content
  evaluation: 0.0, // Fully deterministic for evaluation
} as const;

export type TaskType = keyof typeof TEMPERATURE;

/**
 * AI Provider instance
 */
export interface AIProviderInstance {
  /** Generate text using the AI provider */
  generateText: (options: GenerateTextOptions) => Promise<GenerateTextResult>;

  /** Get the provider name */
  provider: AIProvider;

  /** Get the quality mode */
  quality: QualityMode;
}

export interface GenerateTextOptions {
  /** The prompt to send to the AI */
  prompt: string;

  /** System prompt for context */
  system?: string;

  /** Temperature for generation (overrides task-based default) */
  temperature?: number;

  /** Task type to determine default temperature */
  taskType?: TaskType;

  /** Maximum output tokens to generate */
  maxOutputTokens?: number;
}

export interface GenerateTextResult {
  /** The generated text */
  text: string;

  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Create an AI provider instance
 */
export function createAIProvider(
  provider: AIProvider = "anthropic",
  quality: QualityMode = "standard",
  apiKey?: string
): AIProviderInstance {
  const model = getModel(provider, quality, apiKey);

  return {
    provider,
    quality,
    generateText: async (
      options: GenerateTextOptions
    ): Promise<GenerateTextResult> => {
      const temperature =
        options.temperature ?? TEMPERATURE[options.taskType ?? "content"];

      const result = await generateText({
        model,
        prompt: options.prompt,
        system: options.system,
        temperature,
        maxOutputTokens: options.maxOutputTokens,
      });

      return {
        text: result.text,
        usage: result.usage
          ? {
              promptTokens: result.usage.inputTokens ?? 0,
              completionTokens: result.usage.outputTokens ?? 0,
              totalTokens: result.usage.totalTokens ?? 0,
            }
          : undefined,
      };
    },
  };
}

/**
 * Get the appropriate model for a provider and quality level
 */
function getModel(
  provider: AIProvider,
  quality: QualityMode,
  apiKey?: string
): LanguageModel {
  const modelId = MODEL_CONFIG[provider][quality];

  switch (provider) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(modelId);
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: apiKey ?? process.env.OPENAI_API_KEY,
      });
      return openai(modelId);
    }
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey ?? process.env.GOOGLE_API_KEY,
      });
      return google(modelId);
    }
    default: {
      // Exhaustive check
      const _exhaustive: never = provider;
      throw new Error(`Unknown AI provider: ${_exhaustive}`);
    }
  }
}

/**
 * Get the API key environment variable name for a provider
 */
export function getApiKeyEnvVar(provider: AIProvider): string {
  switch (provider) {
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "openai":
      return "OPENAI_API_KEY";
    case "google":
      return "GOOGLE_API_KEY";
  }
}

/**
 * Check if the API key is available for a provider
 */
export function hasApiKey(provider: AIProvider): boolean {
  const envVar = getApiKeyEnvVar(provider);
  return !!process.env[envVar];
}

/**
 * Get available providers (those with API keys set)
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = ["anthropic", "openai", "google"];
  return providers.filter(hasApiKey);
}
