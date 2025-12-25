/**
 * AI Provider for GitHub Action
 *
 * Simplified version of the core AI provider.
 */
/** Valid AI provider values */
export declare const AI_PROVIDERS: readonly ["anthropic", "openai", "google"];
export type AIProvider = (typeof AI_PROVIDERS)[number];
/** Valid quality mode values */
export declare const QUALITY_MODES: readonly ["standard", "high"];
export type QualityMode = (typeof QUALITY_MODES)[number];
export interface AIProviderInstance {
    readonly generateText: (options: {
        prompt: string;
        system?: string;
        temperature?: number;
    }) => Promise<{
        text: string;
    }>;
    readonly provider: AIProvider;
    readonly quality: QualityMode;
}
export declare function createAIProvider(provider: AIProvider, quality: QualityMode, apiKey: string): AIProviderInstance;
