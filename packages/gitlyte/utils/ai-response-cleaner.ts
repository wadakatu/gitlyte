/**
 * AI Response Cleaner Utilities
 *
 * Shared utilities for cleaning and validating AI-generated responses.
 * Used by v2-site-generator and self-refine services.
 */

/**
 * Clean HTML response from AI
 *
 * Removes markdown code blocks and ensures the response starts with DOCTYPE.
 *
 * @param text - Raw AI response text
 * @returns Cleaned HTML string
 * @throws Error if the response doesn't contain valid HTML after cleaning
 *
 * @example
 * ```typescript
 * const html = cleanHtmlResponse("```html\n<!DOCTYPE html>...</html>\n```");
 * // Returns: "<!DOCTYPE html>...</html>"
 * ```
 */
export function cleanHtmlResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Ensure it starts with doctype
  if (!cleaned.toLowerCase().startsWith("<!doctype")) {
    const doctypeIndex = cleaned.toLowerCase().indexOf("<!doctype");
    if (doctypeIndex > -1) {
      cleaned = cleaned.slice(doctypeIndex);
    }
  }

  // Validate the result
  const result = cleaned.trim();
  if (!result.toLowerCase().startsWith("<!doctype")) {
    throw new Error(
      "Invalid HTML response: missing DOCTYPE declaration. " +
        `Response starts with: "${result.slice(0, 50)}..."`
    );
  }

  return result;
}

/**
 * Clean JSON response from AI
 *
 * Removes markdown code blocks from JSON responses.
 *
 * @param text - Raw AI response text
 * @returns Cleaned JSON string (not parsed)
 *
 * @example
 * ```typescript
 * const json = cleanJsonResponse("```json\n{\"key\": \"value\"}\n```");
 * // Returns: '{"key": "value"}'
 * ```
 */
export function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Try to clean HTML response, returning null on failure
 *
 * Useful for cases where you want to handle invalid HTML gracefully
 * without throwing exceptions.
 *
 * @param text - Raw AI response text
 * @returns Cleaned HTML string or null if invalid
 *
 * @example
 * ```typescript
 * const html = tryCleanHtmlResponse("invalid response");
 * if (html === null) {
 *   // Handle fallback
 * }
 * ```
 */
export function tryCleanHtmlResponse(text: string): string | null {
  try {
    return cleanHtmlResponse(text);
  } catch {
    return null;
  }
}
