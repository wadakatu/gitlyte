import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  evaluateSite,
  evaluateAllBenchmarks,
  generateCombinedReport,
  type EvaluationReport,
  type EvaluationOptions,
} from "../../eval/index.js";

// Mock lighthouse module
vi.mock("../../eval/lighthouse.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../eval/lighthouse.js")
  >("../../eval/lighthouse.js");
  return {
    ...actual,
    runLighthouse: vi.fn(),
  };
});

describe("eval/index", () => {
  describe("evaluateSite", () => {
    const mockLlmEvaluator = vi.fn();
    const mockLighthouseResult = {
      url: "/test/index.html",
      scores: {
        performance: 90,
        accessibility: 95,
        bestPractices: 85,
        seo: 90,
      },
      passed: true,
    };

    const mockDesignEvaluation = {
      overallScore: 4,
      criteria: {
        aesthetics: { score: 4, reasoning: "Good" },
        modernity: { score: 4, reasoning: "Modern" },
        repositoryFit: { score: 4, reasoning: "Fits" },
        usability: { score: 4, reasoning: "Usable" },
        consistency: { score: 4, reasoning: "Consistent" },
      },
      reasoning: "Overall good design",
      suggestions: ["Improve colors"],
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return report with both lighthouse and design evaluations", async () => {
      const { runLighthouse } = await import("../../eval/lighthouse.js");
      vi.mocked(runLighthouse).mockResolvedValue(mockLighthouseResult);
      mockLlmEvaluator.mockResolvedValue(JSON.stringify(mockDesignEvaluation));

      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator
      );

      expect(report.timestamp).toBeDefined();
      expect(report.benchmarkId).toBe("gitlyte");
      expect(report.lighthouse).toBeDefined();
      expect(report.designEvaluation).toBeDefined();
      expect(report.overallPassed).toBe(true);
    });

    it("should skip lighthouse when runLighthouse option is false", async () => {
      mockLlmEvaluator.mockResolvedValue(JSON.stringify(mockDesignEvaluation));
      const options: EvaluationOptions = {
        runLighthouse: false,
        runDesignEvaluation: true,
        designThreshold: 3.0,
      };

      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator,
        options
      );

      expect(report.lighthouse).toBeUndefined();
      expect(report.designEvaluation).toBeDefined();
    });

    it("should skip design evaluation when runDesignEvaluation option is false", async () => {
      const { runLighthouse } = await import("../../eval/lighthouse.js");
      vi.mocked(runLighthouse).mockResolvedValue(mockLighthouseResult);
      const options: EvaluationOptions = {
        runLighthouse: true,
        runDesignEvaluation: false,
      };

      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator,
        options
      );

      expect(report.lighthouse).toBeDefined();
      expect(report.designEvaluation).toBeUndefined();
    });

    it("should handle lighthouse failure gracefully", async () => {
      const { runLighthouse } = await import("../../eval/lighthouse.js");
      vi.mocked(runLighthouse).mockRejectedValue(
        new Error("Lighthouse failed")
      );
      mockLlmEvaluator.mockResolvedValue(JSON.stringify(mockDesignEvaluation));

      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator
      );

      expect(report.lighthouse).toBeUndefined();
      expect(report.errors).toBeDefined();
      expect(report.errors?.[0].component).toBe("lighthouse");
      expect(report.errors?.[0].message).toBe("Lighthouse failed");
      // Overall should fail when lighthouse fails
      expect(report.overallPassed).toBe(false);
    });

    it("should handle design evaluation failure gracefully", async () => {
      const { runLighthouse } = await import("../../eval/lighthouse.js");
      vi.mocked(runLighthouse).mockResolvedValue(mockLighthouseResult);
      mockLlmEvaluator.mockRejectedValue(new Error("LLM failed"));

      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator
      );

      expect(report.designEvaluation).toBeUndefined();
      expect(report.errors).toBeDefined();
      expect(report.errors?.[0].component).toBe("design");
      // Overall should fail when design eval fails
      expect(report.overallPassed).toBe(false);
    });

    it("should generate summary with both evaluations", async () => {
      const { runLighthouse } = await import("../../eval/lighthouse.js");
      vi.mocked(runLighthouse).mockResolvedValue(mockLighthouseResult);
      mockLlmEvaluator.mockResolvedValue(JSON.stringify(mockDesignEvaluation));

      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator
      );

      expect(report.summary).toContain("Lighthouse:");
      expect(report.summary).toContain("Design:");
      expect(report.summary).toContain("PASS");
    });

    it("should use custom design threshold", async () => {
      const { runLighthouse } = await import("../../eval/lighthouse.js");
      vi.mocked(runLighthouse).mockResolvedValue(mockLighthouseResult);

      const lowScoreEvaluation = {
        ...mockDesignEvaluation,
        overallScore: 3.5,
      };
      mockLlmEvaluator.mockResolvedValue(JSON.stringify(lowScoreEvaluation));

      // With threshold 4.0, score 3.5 should fail
      const report = await evaluateSite(
        "/test/index.html",
        "<!DOCTYPE html><html></html>",
        "gitlyte",
        mockLlmEvaluator,
        {
          runLighthouse: true,
          runDesignEvaluation: true,
          designThreshold: 4.0,
        }
      );

      expect(report.overallPassed).toBe(false);
    });
  });

  describe("evaluateAllBenchmarks", () => {
    const mockGenerateSite = vi.fn();
    const mockLlmEvaluator = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should evaluate all benchmarks", async () => {
      mockGenerateSite.mockResolvedValue({
        path: "/test/index.html",
        content: "<!DOCTYPE html><html></html>",
      });

      const mockDesignEvaluation = {
        overallScore: 4,
        criteria: {
          aesthetics: { score: 4, reasoning: "Good" },
          modernity: { score: 4, reasoning: "Modern" },
          repositoryFit: { score: 4, reasoning: "Fits" },
          usability: { score: 4, reasoning: "Usable" },
          consistency: { score: 4, reasoning: "Consistent" },
        },
        reasoning: "Overall good design",
        suggestions: [],
      };
      mockLlmEvaluator.mockResolvedValue(JSON.stringify(mockDesignEvaluation));

      const reports = await evaluateAllBenchmarks(
        mockGenerateSite,
        mockLlmEvaluator,
        { runLighthouse: false, runDesignEvaluation: true }
      );

      expect(reports.length).toBeGreaterThan(0);
      expect(mockGenerateSite).toHaveBeenCalled();
    });

    it("should handle site generation failure", async () => {
      mockGenerateSite.mockRejectedValue(new Error("Generation failed"));

      const reports = await evaluateAllBenchmarks(
        mockGenerateSite,
        mockLlmEvaluator,
        { runLighthouse: false, runDesignEvaluation: false }
      );

      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].overallPassed).toBe(false);
      expect(reports[0].summary).toContain("Evaluation failed");
    });
  });

  describe("generateCombinedReport", () => {
    it("should generate markdown report header", () => {
      const reports: EvaluationReport[] = [];
      const report = generateCombinedReport(reports);

      expect(report).toContain("# GitLyte Evaluation Report");
      expect(report).toContain("Generated:");
    });

    it("should include summary table", () => {
      const reports: EvaluationReport[] = [
        {
          timestamp: new Date().toISOString(),
          benchmarkId: "test-benchmark",
          overallPassed: true,
          summary: "Test summary",
          lighthouse: {
            url: "/test",
            scores: {
              performance: 90,
              accessibility: 95,
              bestPractices: 85,
              seo: 90,
            },
            passed: true,
          },
        },
      ];

      const report = generateCombinedReport(reports);

      expect(report).toContain("| Benchmark | Lighthouse | Design | Overall |");
      expect(report).toContain("| test-benchmark | PASS | N/A | PASS |");
    });

    it("should include detailed reports section", () => {
      const reports: EvaluationReport[] = [
        {
          timestamp: new Date().toISOString(),
          benchmarkId: "test-benchmark",
          overallPassed: true,
          summary: "Test summary",
          lighthouse: {
            url: "/test",
            scores: {
              performance: 90,
              accessibility: 95,
              bestPractices: 85,
              seo: 90,
            },
            passed: true,
          },
        },
      ];

      const report = generateCombinedReport(reports);

      expect(report).toContain("## Detailed Reports");
      expect(report).toContain("### test-benchmark");
      expect(report).toContain("#### Lighthouse Scores");
      expect(report).toContain("- Performance: 90");
    });

    it("should include design evaluation details", () => {
      const reports: EvaluationReport[] = [
        {
          timestamp: new Date().toISOString(),
          benchmarkId: "test-benchmark",
          overallPassed: true,
          summary: "Test summary",
          designEvaluation: {
            overallScore: 4,
            criteria: {
              aesthetics: { score: 4, reasoning: "Good" },
              modernity: { score: 4, reasoning: "Modern" },
              repositoryFit: { score: 4, reasoning: "Fits" },
              usability: { score: 4, reasoning: "Usable" },
              consistency: { score: 4, reasoning: "Consistent" },
            },
            reasoning: "Overall good design",
            suggestions: [],
          },
        },
      ];

      const report = generateCombinedReport(reports);

      expect(report).toContain("#### Design Evaluation");
      expect(report).toContain("- Overall Score: 4/5");
      expect(report).toContain("- Reasoning: Overall good design");
    });

    it("should show FAIL for failed lighthouse", () => {
      const reports: EvaluationReport[] = [
        {
          timestamp: new Date().toISOString(),
          benchmarkId: "test-benchmark",
          overallPassed: false,
          summary: "Test summary",
          lighthouse: {
            url: "/test",
            scores: {
              performance: 50,
              accessibility: 60,
              bestPractices: 55,
              seo: 60,
            },
            passed: false,
          },
        },
      ];

      const report = generateCombinedReport(reports);

      expect(report).toContain("| test-benchmark | FAIL | N/A | FAIL |");
    });

    it("should show design score in summary", () => {
      const reports: EvaluationReport[] = [
        {
          timestamp: new Date().toISOString(),
          benchmarkId: "test-benchmark",
          overallPassed: true,
          summary: "Test summary",
          designEvaluation: {
            overallScore: 4.5,
            criteria: {
              aesthetics: { score: 5, reasoning: "Great" },
              modernity: { score: 4, reasoning: "Modern" },
              repositoryFit: { score: 5, reasoning: "Perfect" },
              usability: { score: 4, reasoning: "Good" },
              consistency: { score: 4, reasoning: "Consistent" },
            },
            reasoning: "Excellent design",
            suggestions: [],
          },
        },
      ];

      const report = generateCombinedReport(reports);

      expect(report).toContain("| test-benchmark | N/A | 4.5/5 | PASS |");
    });
  });
});
