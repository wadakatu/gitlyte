import { describe, expect, it } from "vitest";
import {
  cleanHtmlResponse,
  cleanJsonResponse,
  tryCleanHtmlResponse,
} from "../../utils/ai-response-cleaner.js";

describe("ai-response-cleaner", () => {
  describe("cleanHtmlResponse", () => {
    it("should return HTML as-is when already clean", () => {
      const html = "<!DOCTYPE html><html><body>Test</body></html>";
      expect(cleanHtmlResponse(html)).toBe(html);
    });

    it("should remove markdown html code block wrapper", () => {
      const html =
        "```html\n<!DOCTYPE html><html><body>Test</body></html>\n```";
      expect(cleanHtmlResponse(html)).toBe(
        "<!DOCTYPE html><html><body>Test</body></html>"
      );
    });

    it("should remove plain markdown code block wrapper", () => {
      const html = "```\n<!DOCTYPE html><html><body>Test</body></html>\n```";
      expect(cleanHtmlResponse(html)).toBe(
        "<!DOCTYPE html><html><body>Test</body></html>"
      );
    });

    it("should handle whitespace around content", () => {
      const html = "  \n<!DOCTYPE html><html></html>\n  ";
      expect(cleanHtmlResponse(html)).toBe("<!DOCTYPE html><html></html>");
    });

    it("should extract DOCTYPE from middle of response", () => {
      const html = "Here is the HTML:\n<!DOCTYPE html><html></html>";
      expect(cleanHtmlResponse(html)).toBe("<!DOCTYPE html><html></html>");
    });

    it("should be case-insensitive for DOCTYPE detection", () => {
      const html = "<!doctype html><html></html>";
      expect(cleanHtmlResponse(html)).toBe("<!doctype html><html></html>");
    });

    it("should throw error when DOCTYPE is missing", () => {
      expect(() =>
        cleanHtmlResponse("<html><body>No doctype</body></html>")
      ).toThrow("Invalid HTML response: missing DOCTYPE declaration");
    });

    it("should throw error on empty response", () => {
      expect(() => cleanHtmlResponse("")).toThrow(
        "Invalid HTML response: missing DOCTYPE declaration"
      );
    });

    it("should throw error on response without HTML", () => {
      expect(() =>
        cleanHtmlResponse("I apologize, but I cannot generate HTML.")
      ).toThrow("Invalid HTML response: missing DOCTYPE declaration");
    });

    it("should handle complex markdown with explanation before code", () => {
      const response = `Here's the improved HTML:

\`\`\`html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>Content</body>
</html>
\`\`\`

Let me know if you need changes.`;

      // The function should extract the HTML content
      expect(cleanHtmlResponse(response)).toContain("<!DOCTYPE html>");
      expect(cleanHtmlResponse(response)).toContain("<title>Test</title>");
    });
  });

  describe("cleanJsonResponse", () => {
    it("should return JSON as-is when already clean", () => {
      const json = '{"key": "value"}';
      expect(cleanJsonResponse(json)).toBe(json);
    });

    it("should remove markdown json code block wrapper", () => {
      const json = '```json\n{"key": "value"}\n```';
      expect(cleanJsonResponse(json)).toBe('{"key": "value"}');
    });

    it("should remove plain markdown code block wrapper", () => {
      const json = '```\n{"key": "value"}\n```';
      expect(cleanJsonResponse(json)).toBe('{"key": "value"}');
    });

    it("should handle whitespace around content", () => {
      const json = '  \n{"key": "value"}\n  ';
      expect(cleanJsonResponse(json)).toBe('{"key": "value"}');
    });

    it("should preserve complex JSON structure", () => {
      const complexJson = JSON.stringify({
        nested: { array: [1, 2, 3] },
        string: "value",
      });
      const wrapped = `\`\`\`json\n${complexJson}\n\`\`\``;
      expect(cleanJsonResponse(wrapped)).toBe(complexJson);
    });
  });

  describe("tryCleanHtmlResponse", () => {
    it("should return cleaned HTML on success", () => {
      const html = "```html\n<!DOCTYPE html><html></html>\n```";
      expect(tryCleanHtmlResponse(html)).toBe("<!DOCTYPE html><html></html>");
    });

    it("should return null on invalid HTML", () => {
      expect(tryCleanHtmlResponse("not html")).toBeNull();
    });

    it("should return null on empty input", () => {
      expect(tryCleanHtmlResponse("")).toBeNull();
    });

    it("should return null on AI refusal message", () => {
      expect(
        tryCleanHtmlResponse("I cannot generate that content.")
      ).toBeNull();
    });
  });
});
