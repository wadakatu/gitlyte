/**
 * AI Response Utilities
 *
 * Shared utilities for cleaning and validating AI-generated responses.
 */
/**
 * Valid score values for evaluation (1-10)
 */
export type ScoreValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/**
 * Clamp and validate a score value to the 1-10 range
 */
export declare function toScoreValue(value: unknown): ScoreValue;
/**
 * Clean JSON response from AI (remove markdown code blocks)
 */
export declare function cleanJsonResponse(text: string | null | undefined): string;
/**
 * Clean HTML response from AI (remove markdown code blocks)
 */
export declare function cleanHtmlResponse(text: string | null | undefined): string;
