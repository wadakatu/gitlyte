/**
 * Lighthouse CI Integration
 *
 * Evaluates generated sites for:
 * - Performance
 * - Accessibility
 * - Best Practices
 * - SEO
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface LighthouseResult {
  url: string;
  scores: LighthouseScores;
  passed: boolean;
  details?: Record<string, unknown>;
}

export interface LighthouseThresholds {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

const DEFAULT_THRESHOLDS: LighthouseThresholds = {
  performance: 80,
  accessibility: 90,
  bestPractices: 80,
  seo: 80,
};

/**
 * Run Lighthouse CI on a generated site
 */
export async function runLighthouse(
  htmlPath: string,
  thresholds: LighthouseThresholds = DEFAULT_THRESHOLDS
): Promise<LighthouseResult> {
  const outputDir = join(process.cwd(), ".lighthouseci");

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const url = `file://${htmlPath}`;

  try {
    // Run Lighthouse CLI using execFileSync (safer than execSync)
    execFileSync(
      "npx",
      [
        "@lhci/cli",
        "collect",
        `--url=${url}`,
        `--output-dir=${outputDir}`,
        "--chrome-flags=--headless --no-sandbox",
      ],
      { stdio: "pipe" }
    );

    // Read the results
    const resultsPath = join(outputDir, "manifest.json");
    if (!existsSync(resultsPath)) {
      throw new Error("Lighthouse results not found");
    }

    const manifest = JSON.parse(readFileSync(resultsPath, "utf-8"));
    const latestRun = manifest[manifest.length - 1];
    const report = JSON.parse(readFileSync(latestRun.jsonPath, "utf-8"));

    const scores: LighthouseScores = {
      performance: Math.round(report.categories.performance.score * 100),
      accessibility: Math.round(report.categories.accessibility.score * 100),
      bestPractices: Math.round(
        report.categories["best-practices"].score * 100
      ),
      seo: Math.round(report.categories.seo.score * 100),
    };

    const passed =
      scores.performance >= thresholds.performance &&
      scores.accessibility >= thresholds.accessibility &&
      scores.bestPractices >= thresholds.bestPractices &&
      scores.seo >= thresholds.seo;

    return {
      url: htmlPath,
      scores,
      passed,
      details: {
        audits: report.audits,
      },
    };
  } catch (error) {
    throw new Error(
      `Lighthouse evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate a Lighthouse report summary
 */
export function generateLighthouseReport(results: LighthouseResult[]): string {
  const lines: string[] = ["# Lighthouse Evaluation Report", ""];

  for (const result of results) {
    const status = result.passed ? "PASS" : "FAIL";
    lines.push(`## ${result.url}`);
    lines.push(`Status: **${status}**`);
    lines.push("");
    lines.push("| Category | Score |");
    lines.push("|----------|-------|");
    lines.push(`| Performance | ${result.scores.performance} |`);
    lines.push(`| Accessibility | ${result.scores.accessibility} |`);
    lines.push(`| Best Practices | ${result.scores.bestPractices} |`);
    lines.push(`| SEO | ${result.scores.seo} |`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Create Lighthouse CI configuration file
 */
export function createLighthouseConfig(outputDir: string): void {
  const config = {
    ci: {
      collect: {
        staticDistDir: outputDir,
        numberOfRuns: 1,
      },
      assert: {
        assertions: {
          "categories:performance": ["warn", { minScore: 0.8 }],
          "categories:accessibility": ["error", { minScore: 0.9 }],
          "categories:best-practices": ["warn", { minScore: 0.8 }],
          "categories:seo": ["warn", { minScore: 0.8 }],
        },
      },
      upload: {
        target: "temporary-public-storage",
      },
    },
  };

  writeFileSync(
    join(process.cwd(), "lighthouserc.json"),
    JSON.stringify(config, null, 2)
  );
}
