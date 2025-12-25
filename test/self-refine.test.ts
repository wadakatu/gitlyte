import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateHtml, refineHtml, selfRefine } from "../src/self-refine.js";
import type { AIProviderInstance } from "../src/ai-provider.js";

// Mock @actions/core
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

describe("Self-Refine Module", () => {
  // Valid HTML mock that's at least 100 characters (required by refineHtml validation)
  const validHtml = (content: string) =>
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Test</title></head><body>${content}</body></html>`;

  // Helper to create mock AI provider
  const createMockProvider = (
    responses: string[]
  ): AIProviderInstance => {
    let callCount = 0;
    return {
      provider: "anthropic",
      quality: "high",
      generateText: vi.fn().mockImplementation(async () => {
        const response = responses[callCount] ?? "{}";
        callCount++;
        return { text: response };
      }),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateHtml", () => {
    it("should parse valid evaluation response", async () => {
      const mockResponse = JSON.stringify({
        score: 8,
        feedback: "Great design with modern aesthetics",
        strengths: ["Clean layout", "Good typography"],
        improvements: ["Add more contrast", "Improve mobile view"],
      });

      const provider = createMockProvider([mockResponse]);

      const result = await evaluateHtml(
        "<html><body>Test</body></html>",
        { projectName: "TestProject", projectDescription: "A test project" },
        provider
      );

      expect(result.score).toBe(8);
      expect(result.feedback).toBe("Great design with modern aesthetics");
      expect(result.strengths).toHaveLength(2);
      expect(result.improvements).toHaveLength(2);
    });

    it("should clamp score to valid range 1-10", async () => {
      const mockResponse = JSON.stringify({
        score: 15, // Invalid, should be clamped to 10
        feedback: "Test",
        strengths: [],
        improvements: [],
      });

      const provider = createMockProvider([mockResponse]);

      const result = await evaluateHtml(
        "<html></html>",
        { projectName: "Test", projectDescription: "Test" },
        provider
      );

      expect(result.score).toBe(10);
    });

    it("should clamp negative scores to 1", async () => {
      const mockResponse = JSON.stringify({
        score: -5,
        feedback: "Test",
        strengths: [],
        improvements: [],
      });

      const provider = createMockProvider([mockResponse]);

      const result = await evaluateHtml(
        "<html></html>",
        { projectName: "Test", projectDescription: "Test" },
        provider
      );

      expect(result.score).toBe(1);
    });

    it("should throw error on parse error", async () => {
      const provider = createMockProvider(["invalid json {"]);

      await expect(
        evaluateHtml(
          "<html></html>",
          { projectName: "Test", projectDescription: "Test" },
          provider
        )
      ).rejects.toThrow("HTML evaluation failed");
    });

    it("should throw error when AI provider fails", async () => {
      const provider: AIProviderInstance = {
        provider: "anthropic",
        quality: "high",
        generateText: vi.fn().mockRejectedValue(new Error("API rate limit")),
      };

      await expect(
        evaluateHtml(
          "<html></html>",
          { projectName: "Test", projectDescription: "Test" },
          provider
        )
      ).rejects.toThrow("HTML evaluation failed during AI generation");
    });

    it("should throw error when AI returns empty response", async () => {
      const provider = createMockProvider([""]);

      await expect(
        evaluateHtml(
          "<html></html>",
          { projectName: "Test", projectDescription: "Test" },
          provider
        )
      ).rejects.toThrow("HTML evaluation failed: AI returned empty response");
    });

    it("should handle markdown-wrapped JSON response", async () => {
      const mockResponse = `\`\`\`json
{
  "score": 7,
  "feedback": "Good but could improve",
  "strengths": ["Nice colors"],
  "improvements": ["Better spacing"]
}
\`\`\``;

      const provider = createMockProvider([mockResponse]);

      const result = await evaluateHtml(
        "<html></html>",
        { projectName: "Test", projectDescription: "Test" },
        provider
      );

      expect(result.score).toBe(7);
      expect(result.feedback).toBe("Good but could improve");
    });

    it("should handle missing arrays in response", async () => {
      const mockResponse = JSON.stringify({
        score: 6,
        feedback: "Okay design",
        // Missing strengths and improvements
      });

      const provider = createMockProvider([mockResponse]);

      const result = await evaluateHtml(
        "<html></html>",
        { projectName: "Test", projectDescription: "Test" },
        provider
      );

      expect(result.score).toBe(6);
      expect(result.strengths).toEqual([]);
      expect(result.improvements).toEqual([]);
    });
  });

  describe("refineHtml", () => {
    it("should call AI with evaluation feedback", async () => {
      const provider = createMockProvider([validHtml("Refined content here")]);

      const result = await refineHtml(
        "<html><body>Original</body></html>",
        {
          score: 5,
          feedback: "Needs improvement",
          strengths: ["Good structure"],
          improvements: ["Add more color", "Improve typography"],
        },
        {
          maxIterations: 3,
          targetScore: 8,
          projectName: "TestProject",
          projectDescription: "A test project",
          requirements: "Use Tailwind CSS",
        },
        provider
      );

      expect(result).toContain("Refined content here");
      expect(provider.generateText).toHaveBeenCalled();
    });

    it("should handle markdown-wrapped HTML response", async () => {
      const cleanHtml = validHtml("Clean content here");
      const provider = createMockProvider([`\`\`\`html\n${cleanHtml}\n\`\`\``]);

      const result = await refineHtml(
        "<html></html>",
        {
          score: 4,
          feedback: "Poor",
          strengths: [],
          improvements: ["Everything"],
        },
        {
          maxIterations: 3,
          targetScore: 8,
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Be better",
        },
        provider
      );

      expect(result).toBe(cleanHtml);
    });

    it("should throw error when AI provider fails", async () => {
      const provider: AIProviderInstance = {
        provider: "anthropic",
        quality: "high",
        generateText: vi.fn().mockRejectedValue(new Error("Network error")),
      };

      await expect(
        refineHtml(
          "<html></html>",
          {
            score: 4,
            feedback: "Poor",
            strengths: [],
            improvements: ["Fix everything"],
          },
          {
            maxIterations: 3,
            targetScore: 8,
            projectName: "Test",
            projectDescription: "Test",
            requirements: "Be better",
          },
          provider
        )
      ).rejects.toThrow("HTML refinement failed during AI generation");
    });

    it("should throw error when AI returns empty HTML", async () => {
      const provider = createMockProvider([""]);

      await expect(
        refineHtml(
          "<html></html>",
          {
            score: 4,
            feedback: "Poor",
            strengths: [],
            improvements: ["Fix everything"],
          },
          {
            maxIterations: 3,
            targetScore: 8,
            projectName: "Test",
            projectDescription: "Test",
            requirements: "Be better",
          },
          provider
        )
      ).rejects.toThrow("HTML refinement failed: AI returned empty or invalid HTML");
    });

    it("should throw error when AI returns very short HTML", async () => {
      const provider = createMockProvider(["<html></html>"]); // 13 chars, less than 100

      await expect(
        refineHtml(
          "<html></html>",
          {
            score: 4,
            feedback: "Poor",
            strengths: [],
            improvements: ["Fix everything"],
          },
          {
            maxIterations: 3,
            targetScore: 8,
            projectName: "Test",
            projectDescription: "Test",
            requirements: "Be better",
          },
          provider
        )
      ).rejects.toThrow("HTML refinement failed: AI returned empty or invalid HTML");
    });
  });

  describe("selfRefine", () => {
    it("should return immediately if initial score meets target", async () => {
      const provider = createMockProvider([
        // Initial evaluation - high score
        JSON.stringify({
          score: 9,
          feedback: "Excellent!",
          strengths: ["Everything"],
          improvements: [],
        }),
      ]);

      const result = await selfRefine(
        "<!DOCTYPE html><html></html>",
        {
          maxIterations: 3,
          targetScore: 8,
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Test",
        },
        provider
      );

      expect(result.iterations).toBe(0);
      expect(result.evaluation.score).toBe(9);
      expect(provider.generateText).toHaveBeenCalledTimes(1); // Only evaluation
    });

    it("should iterate until target score is reached", async () => {
      const provider = createMockProvider([
        // Initial evaluation - low score
        JSON.stringify({
          score: 5,
          feedback: "Needs work",
          strengths: [],
          improvements: ["Improve colors"],
        }),
        // First refinement
        validHtml("Better content after refinement"),
        // Second evaluation - improved
        JSON.stringify({
          score: 8,
          feedback: "Much better!",
          strengths: ["Good colors"],
          improvements: [],
        }),
      ]);

      const result = await selfRefine(
        "<!DOCTYPE html><html></html>",
        {
          maxIterations: 3,
          targetScore: 8,
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Test",
        },
        provider
      );

      expect(result.iterations).toBe(1);
      expect(result.evaluation.score).toBe(8);
      expect(result.html).toContain("Better content after refinement");
    });

    it("should stop at max iterations even if target not reached", async () => {
      const provider = createMockProvider([
        // Initial evaluation
        JSON.stringify({ score: 4, feedback: "Poor", strengths: [], improvements: ["Fix everything"] }),
        // Iteration 1
        validHtml("Version 1 content"),
        JSON.stringify({ score: 5, feedback: "Slightly better", strengths: [], improvements: ["More work"] }),
        // Iteration 2
        validHtml("Version 2 content"),
        JSON.stringify({ score: 6, feedback: "Better", strengths: [], improvements: ["Almost there"] }),
        // Iteration 3 (max)
        validHtml("Version 3 content"),
        JSON.stringify({ score: 7, feedback: "Good but not great", strengths: [], improvements: ["Fine tune"] }),
      ]);

      const result = await selfRefine(
        "<!DOCTYPE html><html></html>",
        {
          maxIterations: 3,
          targetScore: 9, // High target that won't be reached
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Test",
        },
        provider
      );

      expect(result.iterations).toBe(3);
      expect(result.evaluation.score).toBe(7); // Best score achieved
    });

    it("should keep track of best version", async () => {
      const provider = createMockProvider([
        // Initial evaluation
        JSON.stringify({ score: 5, feedback: "Okay", strengths: [], improvements: ["Improve"] }),
        // Iteration 1 - better
        validHtml("v1-best content here"),
        JSON.stringify({ score: 7, feedback: "Good", strengths: ["Better"], improvements: ["Refine"] }),
        // Iteration 2 - worse (regression)
        validHtml("v2-worse content here"),
        JSON.stringify({ score: 6, feedback: "Regressed", strengths: [], improvements: ["Undo"] }),
      ]);

      const result = await selfRefine(
        "<!DOCTYPE html><html></html>",
        {
          maxIterations: 2,
          targetScore: 8,
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Test",
        },
        provider
      );

      // Should return the best version (score 7), not the last (score 6)
      expect(result.html).toContain("v1-best content here");
      expect(result.evaluation.score).toBe(7);
    });

    it("should set improved flag correctly", async () => {
      const provider = createMockProvider([
        JSON.stringify({
          score: 7,
          feedback: "Above average",
          strengths: ["Good"],
          improvements: [],
        }),
      ]);

      const result = await selfRefine(
        "<!DOCTYPE html><html></html>",
        {
          maxIterations: 1,
          targetScore: 7, // Initial score meets target, no refinement needed
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Test",
        },
        provider
      );

      expect(result.improved).toBe(true); // Score > 5 is considered improved
    });

    it("should not set improved flag for low scores", async () => {
      const provider = createMockProvider([
        JSON.stringify({
          score: 4,
          feedback: "Below average",
          strengths: [],
          improvements: ["Major work needed"],
        }),
        validHtml("attempt content here"),
        JSON.stringify({
          score: 5,
          feedback: "Still not good",
          strengths: [],
          improvements: ["Continue working"],
        }),
      ]);

      const result = await selfRefine(
        "<!DOCTYPE html><html></html>",
        {
          maxIterations: 1,
          targetScore: 8,
          projectName: "Test",
          projectDescription: "Test",
          requirements: "Test",
        },
        provider
      );

      expect(result.improved).toBe(false); // Best score is 5, not > 5
    });

    it("should propagate evaluation errors", async () => {
      const provider: AIProviderInstance = {
        provider: "anthropic",
        quality: "high",
        generateText: vi.fn().mockRejectedValue(new Error("API unavailable")),
      };

      await expect(
        selfRefine(
          "<!DOCTYPE html><html></html>",
          {
            maxIterations: 3,
            targetScore: 8,
            projectName: "Test",
            projectDescription: "Test",
            requirements: "Test",
          },
          provider
        )
      ).rejects.toThrow("HTML evaluation failed during AI generation");
    });

    it("should propagate refinement errors during iteration", async () => {
      let callCount = 0;
      const provider: AIProviderInstance = {
        provider: "anthropic",
        quality: "high",
        generateText: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            // First call: evaluation - returns low score
            return {
              text: JSON.stringify({
                score: 4,
                feedback: "Needs work",
                strengths: [],
                improvements: ["Fix everything"],
              }),
            };
          }
          // Second call: refinement - throws error
          throw new Error("API rate limit exceeded");
        }),
      };

      await expect(
        selfRefine(
          "<!DOCTYPE html><html></html>",
          {
            maxIterations: 3,
            targetScore: 8,
            projectName: "Test",
            projectDescription: "Test",
            requirements: "Test",
          },
          provider
        )
      ).rejects.toThrow("HTML refinement failed during AI generation");
    });
  });
});
