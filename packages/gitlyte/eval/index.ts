/**
 * GitLyte Evaluation System
 *
 * Provides tools for evaluating generated site quality:
 * - Lighthouse CI: Technical quality (performance, accessibility, SEO)
 * - LLM as Judge: Design quality (aesthetics, modernity, fit)
 * - promptfoo: Prompt quality and regression testing
 */

export * from "./lighthouse.js";
export * from "./llm-judge.js";
export * from "./benchmarks/index.js";

import type { LighthouseResult, LighthouseThresholds } from "./lighthouse.js";
import { runLighthouse } from "./lighthouse.js";
import type { DesignEvaluation, EvaluationContext } from "./llm-judge.js";
import {
  buildEvaluationPrompt,
  parseEvaluationResponse,
  meetsQualityThreshold,
} from "./llm-judge.js";
import { ALL_BENCHMARKS, getMockData } from "./benchmarks/index.js";

export interface EvaluationError {
  component: "lighthouse" | "design" | "generation";
  message: string;
}

export interface EvaluationReport {
  timestamp: string;
  benchmarkId: string;
  lighthouse?: LighthouseResult;
  designEvaluation?: DesignEvaluation;
  overallPassed: boolean;
  summary: string;
  errors?: EvaluationError[];
}

export interface EvaluationOptions {
  runLighthouse?: boolean;
  runDesignEvaluation?: boolean;
  lighthouseThresholds?: LighthouseThresholds;
  designThreshold?: number;
}

const DEFAULT_OPTIONS: EvaluationOptions = {
  runLighthouse: true,
  runDesignEvaluation: true,
  designThreshold: 3.0,
};

/**
 * Run full evaluation on a generated site
 */
export async function evaluateSite(
  htmlPath: string,
  htmlContent: string,
  benchmarkId: string,
  llmEvaluator: (prompt: string) => Promise<string>,
  options: EvaluationOptions = DEFAULT_OPTIONS
): Promise<EvaluationReport> {
  const timestamp = new Date().toISOString();
  const mockData = getMockData(benchmarkId);
  const errors: EvaluationError[] = [];

  let lighthouseResult: LighthouseResult | undefined;
  let designEvaluation: DesignEvaluation | undefined;
  let lighthouseFailed = false;
  let designFailed = false;

  // Run Lighthouse evaluation
  if (options.runLighthouse) {
    try {
      lighthouseResult = await runLighthouse(
        htmlPath,
        options.lighthouseThresholds
      );
    } catch (error) {
      lighthouseFailed = true;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push({ component: "lighthouse", message: errorMessage });
      console.error("Lighthouse evaluation failed:", error);
    }
  }

  // Run design evaluation with LLM as Judge
  if (options.runDesignEvaluation && mockData) {
    try {
      const context: EvaluationContext = {
        html: htmlContent,
        repositoryInfo: {
          name: mockData.name,
          description: mockData.description,
          language: mockData.language,
          topics: mockData.topics,
        },
      };

      const prompt = buildEvaluationPrompt(context);
      const response = await llmEvaluator(prompt);
      designEvaluation = parseEvaluationResponse(response);
    } catch (error) {
      designFailed = true;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errors.push({ component: "design", message: errorMessage });
      console.error("Design evaluation failed:", error);
    }
  }

  // Determine overall pass/fail
  // Failed evaluations should NOT default to passed
  const lighthousePassed = lighthouseFailed
    ? false
    : (lighthouseResult?.passed ?? !options.runLighthouse);
  const designPassed = designFailed
    ? false
    : designEvaluation
      ? meetsQualityThreshold(designEvaluation, options.designThreshold)
      : !options.runDesignEvaluation;
  const overallPassed = lighthousePassed && designPassed;

  // Generate summary
  const summaryParts: string[] = [];
  if (lighthouseResult) {
    summaryParts.push(
      `Lighthouse: ${lighthouseResult.passed ? "PASS" : "FAIL"} (Performance: ${lighthouseResult.scores.performance})`
    );
  }
  if (designEvaluation) {
    summaryParts.push(
      `Design: ${designPassed ? "PASS" : "FAIL"} (Score: ${designEvaluation.overallScore}/5)`
    );
  }

  return {
    timestamp,
    benchmarkId,
    lighthouse: lighthouseResult,
    designEvaluation,
    overallPassed,
    summary: summaryParts.join(" | ") || "No evaluations run",
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Run evaluation on all benchmarks
 */
export async function evaluateAllBenchmarks(
  generateSite: (
    benchmarkId: string
  ) => Promise<{ path: string; content: string }>,
  llmEvaluator: (prompt: string) => Promise<string>,
  options: EvaluationOptions = DEFAULT_OPTIONS
): Promise<EvaluationReport[]> {
  const reports: EvaluationReport[] = [];

  for (const benchmark of ALL_BENCHMARKS) {
    console.log(`Evaluating benchmark: ${benchmark.id}`);

    try {
      const { path, content } = await generateSite(benchmark.id);
      const report = await evaluateSite(
        path,
        content,
        benchmark.id,
        llmEvaluator,
        options
      );
      reports.push(report);
    } catch (error) {
      console.error(`Failed to evaluate ${benchmark.id}:`, error);
      reports.push({
        timestamp: new Date().toISOString(),
        benchmarkId: benchmark.id,
        overallPassed: false,
        summary: `Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  return reports;
}

/**
 * Generate combined evaluation report
 */
export function generateCombinedReport(reports: EvaluationReport[]): string {
  const lines: string[] = [
    "# GitLyte Evaluation Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    "| Benchmark | Lighthouse | Design | Overall |",
    "|-----------|------------|--------|---------|",
  ];

  for (const report of reports) {
    const lhStatus = report.lighthouse
      ? report.lighthouse.passed
        ? "PASS"
        : "FAIL"
      : "N/A";
    const designStatus = report.designEvaluation
      ? `${report.designEvaluation.overallScore}/5`
      : "N/A";
    const overall = report.overallPassed ? "PASS" : "FAIL";
    lines.push(
      `| ${report.benchmarkId} | ${lhStatus} | ${designStatus} | ${overall} |`
    );
  }

  lines.push("");
  lines.push("## Detailed Reports");
  lines.push("");

  for (const report of reports) {
    lines.push(`### ${report.benchmarkId}`);
    lines.push("");

    if (report.lighthouse) {
      lines.push("#### Lighthouse Scores");
      lines.push(`- Performance: ${report.lighthouse.scores.performance}`);
      lines.push(`- Accessibility: ${report.lighthouse.scores.accessibility}`);
      lines.push(`- Best Practices: ${report.lighthouse.scores.bestPractices}`);
      lines.push(`- SEO: ${report.lighthouse.scores.seo}`);
      lines.push("");
    }

    if (report.designEvaluation) {
      lines.push("#### Design Evaluation");
      lines.push(`- Overall Score: ${report.designEvaluation.overallScore}/5`);
      lines.push(`- Reasoning: ${report.designEvaluation.reasoning}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
