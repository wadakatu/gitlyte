import { describe, expect, it } from "vitest";
import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
  meetsQualityThreshold,
  generateEvaluationReport,
  compareEvaluations,
  type DesignEvaluation,
  type EvaluationContext,
} from "../../eval/llm-judge.js";

describe("llm-judge", () => {
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

  describe("buildEvaluationPrompt", () => {
    it("should include repository information in prompt", () => {
      const context: EvaluationContext = {
        html: "<!DOCTYPE html><html><body>Test</body></html>",
        repositoryInfo: {
          name: "test-repo",
          description: "A test repository",
          language: "TypeScript",
          topics: ["typescript", "testing"],
        },
      };

      const prompt = buildEvaluationPrompt(context);

      expect(prompt).toContain("test-repo");
      expect(prompt).toContain("A test repository");
      expect(prompt).toContain("TypeScript");
      expect(prompt).toContain("typescript, testing");
    });

    it("should include HTML content in prompt", () => {
      const context: EvaluationContext = {
        html: '<!DOCTYPE html><html><body class="custom-class">Content</body></html>',
        repositoryInfo: {
          name: "test",
          description: "test",
          language: "JS",
          topics: [],
        },
      };

      const prompt = buildEvaluationPrompt(context);

      expect(prompt).toContain("custom-class");
      expect(prompt).toContain("Content");
    });

    it("should include evaluation criteria descriptions", () => {
      const context: EvaluationContext = {
        html: "<!DOCTYPE html><html></html>",
        repositoryInfo: {
          name: "test",
          description: "test",
          language: "JS",
          topics: [],
        },
      };

      const prompt = buildEvaluationPrompt(context);

      expect(prompt).toContain("Visual Aesthetics");
      expect(prompt).toContain("Modernity");
      expect(prompt).toContain("Repository Fit");
      expect(prompt).toContain("Usability");
      expect(prompt).toContain("Consistency");
    });

    it("should request JSON response format", () => {
      const context: EvaluationContext = {
        html: "<!DOCTYPE html><html></html>",
        repositoryInfo: {
          name: "test",
          description: "test",
          language: "JS",
          topics: [],
        },
      };

      const prompt = buildEvaluationPrompt(context);

      expect(prompt).toContain("overallScore");
      expect(prompt).toContain("criteria");
      expect(prompt).toContain("suggestions");
    });
  });

  describe("parseEvaluationResponse", () => {
    it("should parse valid JSON response", () => {
      const evaluation = createMockEvaluation(4);
      const response = JSON.stringify(evaluation);

      const result = parseEvaluationResponse(response);

      expect(result.overallScore).toBe(4);
      expect(result.criteria.aesthetics.score).toBe(4);
      expect(result.suggestions).toHaveLength(2);
    });

    it("should handle markdown code blocks", () => {
      const evaluation = createMockEvaluation(3.5);
      const response = `\`\`\`json\n${JSON.stringify(evaluation)}\n\`\`\``;

      const result = parseEvaluationResponse(response);

      expect(result.overallScore).toBe(3.5);
    });

    it("should throw on invalid JSON", () => {
      expect(() => parseEvaluationResponse("not valid json")).toThrow(
        "Failed to parse LLM evaluation response"
      );
    });

    it("should throw on invalid overallScore (< 1)", () => {
      const invalid = createMockEvaluation(0);
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Invalid overallScore"
      );
    });

    it("should throw on invalid overallScore (> 5)", () => {
      const invalid = createMockEvaluation(6);
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Invalid overallScore"
      );
    });

    it("should throw on missing reasoning", () => {
      const evaluation = createMockEvaluation(4);
      const invalid = { ...evaluation, reasoning: "" };
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Missing or invalid reasoning"
      );
    });

    it("should throw on missing suggestions array", () => {
      const evaluation = createMockEvaluation(4);
      const invalid = { ...evaluation, suggestions: "not an array" };
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Missing or invalid suggestions"
      );
    });

    it("should throw on non-string suggestion", () => {
      const evaluation = createMockEvaluation(4);
      const invalid = { ...evaluation, suggestions: [123] };
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Invalid suggestion"
      );
    });

    it("should throw on missing criteria", () => {
      const evaluation = createMockEvaluation(4);
      const { criteria: _, ...invalid } = evaluation;
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Missing criteria object"
      );
    });

    it("should throw on missing criterion", () => {
      const evaluation = createMockEvaluation(4);
      const { aesthetics: _, ...partialCriteria } = evaluation.criteria;
      const invalid = { ...evaluation, criteria: partialCriteria };
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Missing criterion: aesthetics"
      );
    });

    it("should throw on invalid criterion score", () => {
      const evaluation = createMockEvaluation(4);
      const invalid = {
        ...evaluation,
        criteria: {
          ...evaluation.criteria,
          aesthetics: { score: 10, reasoning: "test" },
        },
      };
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Invalid score for aesthetics"
      );
    });

    it("should throw on missing criterion reasoning", () => {
      const evaluation = createMockEvaluation(4);
      const invalid = {
        ...evaluation,
        criteria: {
          ...evaluation.criteria,
          modernity: { score: 4, reasoning: "" },
        },
      };
      expect(() => parseEvaluationResponse(JSON.stringify(invalid))).toThrow(
        "Missing or invalid reasoning for modernity"
      );
    });
  });

  describe("meetsQualityThreshold", () => {
    it("should return true when score meets threshold", () => {
      const evaluation = createMockEvaluation(4);
      expect(meetsQualityThreshold(evaluation, 4)).toBe(true);
    });

    it("should return true when score exceeds threshold", () => {
      const evaluation = createMockEvaluation(4.5);
      expect(meetsQualityThreshold(evaluation, 4)).toBe(true);
    });

    it("should return false when score is below threshold", () => {
      const evaluation = createMockEvaluation(3);
      expect(meetsQualityThreshold(evaluation, 4)).toBe(false);
    });

    it("should use default threshold of 3.0", () => {
      const evaluation = createMockEvaluation(3);
      expect(meetsQualityThreshold(evaluation)).toBe(true);
    });
  });

  describe("generateEvaluationReport", () => {
    it("should generate markdown report", () => {
      const evaluation = createMockEvaluation(4);
      const report = generateEvaluationReport(evaluation);

      expect(report).toContain("# Design Quality Evaluation Report");
      expect(report).toContain("## Overall Score: 4/5");
      expect(report).toContain("## Criteria Scores");
      expect(report).toContain("Visual Aesthetics");
      expect(report).toContain("| 4/5 |");
    });

    it("should include suggestions section", () => {
      const evaluation = createMockEvaluation(4);
      const report = generateEvaluationReport(evaluation);

      expect(report).toContain("## Suggestions for Improvement");
      expect(report).toContain("- Improve colors");
      expect(report).toContain("- Add more whitespace");
    });

    it("should handle empty suggestions", () => {
      const evaluation = createMockEvaluation(4);
      evaluation.suggestions = [];
      const report = generateEvaluationReport(evaluation);

      expect(report).not.toContain("## Suggestions for Improvement");
    });
  });

  describe("compareEvaluations", () => {
    it("should identify A as winner when score difference > 0.5", () => {
      const evalA = createMockEvaluation(4);
      const evalB = createMockEvaluation(3);

      const result = compareEvaluations(evalA, evalB);

      expect(result.winner).toBe("A");
      expect(result.scoreDifference).toBe(1);
    });

    it("should identify B as winner when score difference < -0.5", () => {
      const evalA = createMockEvaluation(3);
      const evalB = createMockEvaluation(4);

      const result = compareEvaluations(evalA, evalB);

      expect(result.winner).toBe("B");
      expect(result.scoreDifference).toBe(1);
    });

    it("should identify tie when score difference <= 0.5", () => {
      const evalA = createMockEvaluation(3.8);
      const evalB = createMockEvaluation(3.5);

      const result = compareEvaluations(evalA, evalB);

      expect(result.winner).toBe("tie");
      expect(result.scoreDifference).toBeCloseTo(0.3);
    });

    it("should provide criteria comparison", () => {
      const evalA = createMockEvaluation(4);
      const evalB = createMockEvaluation(3);

      const result = compareEvaluations(evalA, evalB);

      expect(result.criteriaComparison.aesthetics).toEqual({
        a: 4,
        b: 3,
        winner: "A",
      });
    });

    it("should handle tied criteria", () => {
      const evalA = createMockEvaluation(4);
      const evalB = createMockEvaluation(4);

      const result = compareEvaluations(evalA, evalB);

      expect(result.criteriaComparison.aesthetics.winner).toBe("tie");
    });
  });
});
