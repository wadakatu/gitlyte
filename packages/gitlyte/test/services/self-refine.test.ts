import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluatePageDesign,
  generateRefinedPage,
  refinePage,
  shouldUseSelfRefine,
  validateSelfRefineConfig,
  DEFAULT_SELF_REFINE_CONFIG,
  type RefinementContext,
} from "../../services/self-refine.js";
import type { AIProviderInstance } from "../../utils/ai-provider.js";
import type { DesignEvaluation } from "../../eval/llm-judge.js";

describe("self-refine", () => {
  let mockAIProvider: AIProviderInstance;
  let mockContext: RefinementContext;

  const createMockEvaluation = (overallScore: number): DesignEvaluation => ({
    overallScore,
    criteria: {
      aesthetics: { score: overallScore, reasoning: "Good aesthetics" },
      modernity: { score: overallScore, reasoning: "Modern design" },
      repositoryFit: { score: overallScore, reasoning: "Fits the repo" },
      usability: { score: overallScore, reasoning: "Easy to use" },
      consistency: { score: overallScore, reasoning: "Consistent design" },
    },
    reasoning: "Overall good design",
    suggestions: ["Improve colors", "Add more whitespace"],
  });

  beforeEach(() => {
    mockAIProvider = {
      provider: "anthropic",
      quality: "high",
      generateText: vi.fn(),
    };

    mockContext = {
      analysis: {
        name: "test-repo",
        description: "A test repository",
        projectType: "library",
        primaryLanguage: "TypeScript",
        audience: "developers",
        style: "professional",
        keyFeatures: ["feature1", "feature2"],
      },
      design: {
        colors: {
          primary: "blue-600",
          secondary: "indigo-500",
          accent: "purple-400",
          background: "white",
          text: "gray-900",
        },
        typography: {
          headingFont: "Inter",
          bodyFont: "Inter",
        },
        layout: "hero-centered",
      },
      repositoryInfo: {
        name: "test-repo",
        description: "A test repository",
        language: "TypeScript",
        topics: ["typescript", "library"],
      },
    };
  });

  describe("shouldUseSelfRefine", () => {
    it('should return true for "high" quality mode', () => {
      expect(shouldUseSelfRefine("high")).toBe(true);
    });

    it('should return false for "standard" quality mode', () => {
      expect(shouldUseSelfRefine("standard")).toBe(false);
    });
  });

  describe("evaluatePageDesign", () => {
    it("should evaluate page design and return DesignEvaluation", async () => {
      const mockEvaluation = createMockEvaluation(4);
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify(mockEvaluation),
      });

      const result = await evaluatePageDesign(
        "<!DOCTYPE html><html></html>",
        mockContext,
        mockAIProvider
      );

      expect(result.overallScore).toBe(4);
      expect(result.criteria.aesthetics.score).toBe(4);
      expect(mockAIProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: "evaluation",
        })
      );
    });

    it("should throw on invalid evaluation response", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "invalid json",
      });

      await expect(
        evaluatePageDesign(
          "<!DOCTYPE html><html></html>",
          mockContext,
          mockAIProvider
        )
      ).rejects.toThrow();
    });
  });

  describe("generateRefinedPage", () => {
    it("should generate refined HTML based on evaluation feedback", async () => {
      const mockEvaluation = createMockEvaluation(2.5);
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><body>Refined content</body></html>",
      });

      const result = await generateRefinedPage(
        "<!DOCTYPE html><html><body>Original</body></html>",
        mockEvaluation,
        mockContext,
        mockAIProvider
      );

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("Refined content");
      expect(mockAIProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: "content",
          maxOutputTokens: 4000,
        })
      );
    });

    it("should clean markdown code blocks from response", async () => {
      const mockEvaluation = createMockEvaluation(2.5);
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "```html\n<!DOCTYPE html><html><body>Refined</body></html>\n```",
      });

      const result = await generateRefinedPage(
        "<!DOCTYPE html><html></html>",
        mockEvaluation,
        mockContext,
        mockAIProvider
      );

      expect(result).not.toContain("```");
      expect(result).toContain("<!DOCTYPE html>");
    });
  });

  describe("refinePage", () => {
    it("should return original HTML when initial score meets threshold", async () => {
      const highScoreEvaluation = createMockEvaluation(4.5);
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify(highScoreEvaluation),
      });

      const result = await refinePage(
        "<!DOCTYPE html><html></html>",
        mockContext,
        mockAIProvider,
        { ...DEFAULT_SELF_REFINE_CONFIG, threshold: 4.0, verbose: false }
      );

      expect(result.html).toBe("<!DOCTYPE html><html></html>");
      expect(result.iterations).toBe(0);
      expect(result.improved).toBe(false);
      expect(result.scoreImprovement).toBe(0);
      expect(mockAIProvider.generateText).toHaveBeenCalledTimes(1);
    });

    it("should refine when initial score is below threshold", async () => {
      const lowScoreEvaluation = createMockEvaluation(2.5);
      const improvedEvaluation = createMockEvaluation(4.0);

      vi.mocked(mockAIProvider.generateText)
        // Initial evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(lowScoreEvaluation) })
        // Refinement generation
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Improved</body></html>",
        })
        // Refined evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(improvedEvaluation) });

      const result = await refinePage(
        "<!DOCTYPE html><html></html>",
        mockContext,
        mockAIProvider,
        { ...DEFAULT_SELF_REFINE_CONFIG, threshold: 3.5, verbose: false }
      );

      expect(result.html).toContain("Improved");
      expect(result.iterations).toBe(1);
      expect(result.improved).toBe(true);
      expect(result.scoreImprovement).toBe(1.5);
      expect(result.initialEvaluation.overallScore).toBe(2.5);
      expect(result.finalEvaluation.overallScore).toBe(4.0);
    });

    it("should stop after maxIterations even if threshold not met", async () => {
      const lowScoreEvaluation = createMockEvaluation(2.0);

      vi.mocked(mockAIProvider.generateText)
        // Initial evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(lowScoreEvaluation) })
        // Iteration 1: generation
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>V1</body></html>",
        })
        // Iteration 1: evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(lowScoreEvaluation) })
        // Iteration 2: generation
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>V2</body></html>",
        })
        // Iteration 2: evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(lowScoreEvaluation) });

      const result = await refinePage(
        "<!DOCTYPE html><html></html>",
        mockContext,
        mockAIProvider,
        {
          ...DEFAULT_SELF_REFINE_CONFIG,
          threshold: 5.0,
          maxIterations: 2,
          verbose: false,
        }
      );

      expect(result.iterations).toBe(2);
      expect(mockAIProvider.generateText).toHaveBeenCalledTimes(5);
    });

    it("should keep track of best version across iterations", async () => {
      const lowScore = createMockEvaluation(2.0);
      const highScore = createMockEvaluation(3.5);
      const mediumScore = createMockEvaluation(2.5);

      vi.mocked(mockAIProvider.generateText)
        // Initial evaluation (low)
        .mockResolvedValueOnce({ text: JSON.stringify(lowScore) })
        // Iteration 1: generation (best version)
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Best</body></html>",
        })
        // Iteration 1: evaluation (high)
        .mockResolvedValueOnce({ text: JSON.stringify(highScore) })
        // Iteration 2: generation (worse version)
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Worse</body></html>",
        })
        // Iteration 2: evaluation (medium - worse than iteration 1)
        .mockResolvedValueOnce({ text: JSON.stringify(mediumScore) });

      const result = await refinePage(
        "<!DOCTYPE html><html><body>Original</body></html>",
        mockContext,
        mockAIProvider,
        {
          ...DEFAULT_SELF_REFINE_CONFIG,
          threshold: 4.0,
          maxIterations: 2,
          verbose: false,
        }
      );

      // Should return the best version (iteration 1 with score 3.5)
      expect(result.html).toContain("Best");
      expect(result.finalEvaluation.overallScore).toBe(3.5);
      expect(result.improved).toBe(true);
    });
  });

  describe("DEFAULT_SELF_REFINE_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_SELF_REFINE_CONFIG.threshold).toBe(3.5);
      expect(DEFAULT_SELF_REFINE_CONFIG.maxIterations).toBe(2);
      expect(DEFAULT_SELF_REFINE_CONFIG.verbose).toBe(true);
    });
  });

  describe("validateSelfRefineConfig", () => {
    it("should accept valid configuration", () => {
      const config = { threshold: 4.0, maxIterations: 3, verbose: true };
      expect(() => validateSelfRefineConfig(config)).not.toThrow();
    });

    it("should throw on threshold < 1", () => {
      const config = { threshold: 0.5, maxIterations: 2, verbose: false };
      expect(() => validateSelfRefineConfig(config)).toThrow(
        "Invalid threshold: 0.5. Must be between 1 and 5."
      );
    });

    it("should throw on threshold > 5", () => {
      const config = { threshold: 6, maxIterations: 2, verbose: false };
      expect(() => validateSelfRefineConfig(config)).toThrow(
        "Invalid threshold: 6. Must be between 1 and 5."
      );
    });

    it("should throw on maxIterations < 1", () => {
      const config = { threshold: 3.5, maxIterations: 0, verbose: false };
      expect(() => validateSelfRefineConfig(config)).toThrow(
        "Invalid maxIterations: 0. Must be between 1 and 10."
      );
    });

    it("should throw on maxIterations > 10", () => {
      const config = { threshold: 3.5, maxIterations: 11, verbose: false };
      expect(() => validateSelfRefineConfig(config)).toThrow(
        "Invalid maxIterations: 11. Must be between 1 and 10."
      );
    });
  });

  describe("evaluatePageDesign error handling", () => {
    it("should wrap AI provider errors with context", async () => {
      vi.mocked(mockAIProvider.generateText).mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );

      await expect(
        evaluatePageDesign(
          "<!DOCTYPE html><html></html>",
          mockContext,
          mockAIProvider
        )
      ).rejects.toThrow(
        "[self-refine] Failed to evaluate page design: API rate limit exceeded"
      );
    });

    it("should wrap parse errors with context", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "invalid json response",
      });

      await expect(
        evaluatePageDesign(
          "<!DOCTYPE html><html></html>",
          mockContext,
          mockAIProvider
        )
      ).rejects.toThrow("[self-refine] Failed to evaluate page design:");
    });
  });

  describe("generateRefinedPage error handling", () => {
    it("should wrap AI provider errors with context", async () => {
      const mockEvaluation = createMockEvaluation(2.5);
      vi.mocked(mockAIProvider.generateText).mockRejectedValueOnce(
        new Error("Network timeout")
      );

      await expect(
        generateRefinedPage(
          "<!DOCTYPE html><html></html>",
          mockEvaluation,
          mockContext,
          mockAIProvider
        )
      ).rejects.toThrow(
        "[self-refine] Failed to generate refined page: Network timeout"
      );
    });

    it("should wrap HTML cleaning errors with context", async () => {
      const mockEvaluation = createMockEvaluation(2.5);
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "I cannot generate HTML for this request.",
      });

      await expect(
        generateRefinedPage(
          "<!DOCTYPE html><html></html>",
          mockEvaluation,
          mockContext,
          mockAIProvider
        )
      ).rejects.toThrow("[self-refine] Failed to generate refined page:");
    });
  });

  describe("refinePage error recovery", () => {
    it("should recover from single iteration failure and continue", async () => {
      const lowScore = createMockEvaluation(2.0);
      const highScore = createMockEvaluation(4.0);

      vi.mocked(mockAIProvider.generateText)
        // Initial evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(lowScore) })
        // Iteration 1: generation fails
        .mockRejectedValueOnce(new Error("Temporary failure"))
        // Iteration 2: generation succeeds
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Recovered</body></html>",
        })
        // Iteration 2: evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(highScore) });

      const result = await refinePage(
        "<!DOCTYPE html><html></html>",
        mockContext,
        mockAIProvider,
        {
          ...DEFAULT_SELF_REFINE_CONFIG,
          threshold: 3.5,
          maxIterations: 3,
          verbose: false,
        }
      );

      expect(result.iterations).toBe(2);
      expect(result.html).toContain("Recovered");
    });

    it("should stop after consecutive failures", async () => {
      const lowScore = createMockEvaluation(2.0);

      vi.mocked(mockAIProvider.generateText)
        // Initial evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(lowScore) })
        // Iteration 1: fails
        .mockRejectedValueOnce(new Error("Failure 1"))
        // Iteration 2: fails
        .mockRejectedValueOnce(new Error("Failure 2"));

      const result = await refinePage(
        "<!DOCTYPE html><html><body>Original</body></html>",
        mockContext,
        mockAIProvider,
        {
          ...DEFAULT_SELF_REFINE_CONFIG,
          threshold: 5.0,
          maxIterations: 5,
          verbose: false,
        }
      );

      // Should stop after 2 consecutive failures
      expect(result.iterations).toBe(2);
      // Should return original HTML since no successful refinements
      expect(result.html).toContain("Original");
    });

    it("should throw on invalid configuration", async () => {
      await expect(
        refinePage(
          "<!DOCTYPE html><html></html>",
          mockContext,
          mockAIProvider,
          { threshold: 0, maxIterations: 2, verbose: false }
        )
      ).rejects.toThrow("Invalid threshold");
    });
  });

  describe("score regression scenario", () => {
    it("should handle score regression across iterations", async () => {
      const initialScore = createMockEvaluation(2.0);
      const bestScore = createMockEvaluation(3.5);
      const regressedScore = createMockEvaluation(2.5);
      const finalScore = createMockEvaluation(3.0);

      vi.mocked(mockAIProvider.generateText)
        // Initial evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(initialScore) })
        // Iteration 1: generation (best version)
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Best</body></html>",
        })
        // Iteration 1: evaluation (high score)
        .mockResolvedValueOnce({ text: JSON.stringify(bestScore) })
        // Iteration 2: generation (regressed)
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Regressed</body></html>",
        })
        // Iteration 2: evaluation (score dropped)
        .mockResolvedValueOnce({ text: JSON.stringify(regressedScore) })
        // Iteration 3: generation
        .mockResolvedValueOnce({
          text: "<!DOCTYPE html><html><body>Final</body></html>",
        })
        // Iteration 3: evaluation
        .mockResolvedValueOnce({ text: JSON.stringify(finalScore) });

      const result = await refinePage(
        "<!DOCTYPE html><html><body>Original</body></html>",
        mockContext,
        mockAIProvider,
        {
          ...DEFAULT_SELF_REFINE_CONFIG,
          threshold: 4.0,
          maxIterations: 3,
          verbose: false,
        }
      );

      // Should keep the best version from iteration 1
      expect(result.html).toContain("Best");
      expect(result.finalEvaluation.overallScore).toBe(3.5);
      expect(result.improved).toBe(true);
      expect(result.scoreImprovement).toBeCloseTo(1.5);
    });
  });
});
