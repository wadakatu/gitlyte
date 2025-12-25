import { describe, it, expect } from "vitest";
import {
  toScoreValue,
  cleanJsonResponse,
  cleanHtmlResponse,
} from "../src/ai-response-utils.js";

describe("AI Response Utils", () => {
  describe("toScoreValue", () => {
    it("should return the value if within 1-10 range", () => {
      expect(toScoreValue(5)).toBe(5);
      expect(toScoreValue(1)).toBe(1);
      expect(toScoreValue(10)).toBe(10);
    });

    it("should clamp values above 10 to 10", () => {
      expect(toScoreValue(15)).toBe(10);
      expect(toScoreValue(100)).toBe(10);
    });

    it("should clamp values below 1 to 1", () => {
      expect(toScoreValue(0)).toBe(1);
      expect(toScoreValue(-5)).toBe(1);
    });

    it("should round floating point values", () => {
      expect(toScoreValue(7.4)).toBe(7);
      expect(toScoreValue(7.6)).toBe(8);
    });

    it("should return 5 for NaN", () => {
      expect(toScoreValue(Number.NaN)).toBe(5);
    });

    it("should return 5 for non-numeric values", () => {
      expect(toScoreValue("invalid")).toBe(5);
      expect(toScoreValue(undefined)).toBe(5);
      expect(toScoreValue(null)).toBe(5);
    });

    it("should parse numeric strings", () => {
      expect(toScoreValue("7")).toBe(7);
      expect(toScoreValue("3.5")).toBe(4);
    });
  });

  describe("cleanJsonResponse", () => {
    it("should return empty string for null/undefined", () => {
      expect(cleanJsonResponse(null)).toBe("");
      expect(cleanJsonResponse(undefined)).toBe("");
    });

    it("should return trimmed text for plain JSON", () => {
      expect(cleanJsonResponse('  {"key": "value"}  ')).toBe('{"key": "value"}');
    });

    it("should remove ```json wrapper", () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(cleanJsonResponse(input)).toBe('{"key": "value"}');
    });

    it("should remove plain ``` wrapper", () => {
      const input = '```\n{"key": "value"}\n```';
      expect(cleanJsonResponse(input)).toBe('{"key": "value"}');
    });

    it("should handle trailing ``` only", () => {
      const input = '{"key": "value"}\n```';
      expect(cleanJsonResponse(input)).toBe('{"key": "value"}');
    });
  });

  describe("cleanHtmlResponse", () => {
    it("should return empty string for null/undefined", () => {
      expect(cleanHtmlResponse(null)).toBe("");
      expect(cleanHtmlResponse(undefined)).toBe("");
    });

    it("should return trimmed text for plain HTML", () => {
      expect(cleanHtmlResponse("  <html></html>  ")).toBe("<html></html>");
    });

    it("should remove ```html wrapper", () => {
      const input = "```html\n<!DOCTYPE html><html></html>\n```";
      expect(cleanHtmlResponse(input)).toBe("<!DOCTYPE html><html></html>");
    });

    it("should remove plain ``` wrapper", () => {
      const input = "```\n<!DOCTYPE html><html></html>\n```";
      expect(cleanHtmlResponse(input)).toBe("<!DOCTYPE html><html></html>");
    });

    it("should handle trailing ``` only", () => {
      const input = "<!DOCTYPE html><html></html>\n```";
      expect(cleanHtmlResponse(input)).toBe("<!DOCTYPE html><html></html>");
    });
  });
});
