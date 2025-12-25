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
export function toScoreValue(value: unknown): ScoreValue {
  // Handle null/undefined explicitly as "no value provided"
  if (value === null || value === undefined) {
    return 5;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 5; // Default for non-numeric values
  }
  const clamped = Math.min(10, Math.max(1, Math.round(num)));
  return clamped as ScoreValue;
}

/**
 * Clean JSON response from AI (remove markdown code blocks)
 */
export function cleanJsonResponse(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Clean HTML response from AI (remove markdown code blocks)
 */
export function cleanHtmlResponse(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  let cleaned = text.trim();

  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}
