#!/usr/bin/env node
/**
 * GitLyte Evaluation Runner CLI
 *
 * Usage:
 *   node --loader ts-node/esm eval/run-eval.ts [options]
 *
 * Options:
 *   --design-only     Run only design evaluation (skip Lighthouse)
 *   --lighthouse-only Run only Lighthouse evaluation (skip design)
 *   --benchmark <id>  Run evaluation for a specific benchmark
 *   --output <file>   Output file for JSON results (default: stdout)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import {
  evaluateSite,
  evaluateAllBenchmarks,
  generateCombinedReport,
  type EvaluationOptions,
  type EvaluationReport,
} from "./index.js";
import {
  getMockData,
  ALL_BENCHMARKS,
  getBenchmark,
} from "./benchmarks/index.js";

interface CLIArgs {
  designOnly: boolean;
  lighthouseOnly: boolean;
  benchmarkId?: string;
  outputFile?: string;
}

function showHelp(): void {
  console.log(`
GitLyte Evaluation Runner

Usage:
  node --loader ts-node/esm eval/run-eval.ts [options]

Options:
  --design-only       Run only design evaluation (skip Lighthouse)
  --lighthouse-only   Run only Lighthouse evaluation (skip design)
  --benchmark <id>    Run evaluation for a specific benchmark
  --output <file>     Output file for JSON results (default: stdout)
  --help              Show this help message

Available benchmarks:
${ALL_BENCHMARKS.map((b) => `  - ${b.id}: ${b.name}`).join("\n")}
`);
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    designOnly: false,
    lighthouseOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--design-only":
        result.designOnly = true;
        break;
      case "--lighthouse-only":
        result.lighthouseOnly = true;
        break;
      case "--benchmark":
        // Validate that a value follows
        if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
          console.error("Error: --benchmark requires a benchmark ID value");
          console.error("Example: --benchmark gitlyte");
          console.error(
            `Available benchmarks: ${ALL_BENCHMARKS.map((b) => b.id).join(", ")}`
          );
          process.exit(1);
        }
        result.benchmarkId = args[++i];
        break;
      case "--output":
        // Validate that a value follows
        if (i + 1 >= args.length || args[i + 1].startsWith("--")) {
          console.error("Error: --output requires a file path");
          console.error("Example: --output results.json");
          process.exit(1);
        }
        result.outputFile = args[++i];
        break;
      case "--help":
        showHelp();
        process.exit(0);
        break;
      default:
        // Reject unknown arguments
        if (arg.startsWith("--")) {
          console.error(`Error: Unknown option: ${arg}`);
          console.error("Use --help to see available options.");
          process.exit(1);
        }
        // Reject unexpected positional arguments
        console.error(`Error: Unexpected argument: ${arg}`);
        console.error("Use --help to see available options.");
        process.exit(1);
    }
  }

  // Validate conflicting options
  if (result.designOnly && result.lighthouseOnly) {
    console.error(
      "Error: --design-only and --lighthouse-only cannot be used together."
    );
    console.error(
      "These options are mutually exclusive. Choose one or use neither for full evaluation."
    );
    process.exit(1);
  }

  return result;
}

async function createLlmEvaluator(): Promise<
  (prompt: string) => Promise<string>
> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }

  const client = new Anthropic({ apiKey });

  return async (prompt: string): Promise<string> => {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        const contentTypes = response.content.map((b) => b.type).join(", ");
        throw new Error(
          `Unexpected LLM response format: expected text content but received: [${contentTypes || "empty"}]. ` +
            `Stop reason: ${response.stop_reason}`
        );
      }

      return textBlock.text;
    } catch (error) {
      // Handle Anthropic-specific errors with better messages
      if (error instanceof Anthropic.RateLimitError) {
        throw new Error(
          `Anthropic rate limit exceeded. Please wait before retrying. Details: ${error.message}`
        );
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error(
          "Anthropic authentication failed. Please verify your ANTHROPIC_API_KEY is valid."
        );
      }
      if (error instanceof Anthropic.BadRequestError) {
        throw new Error(`Anthropic bad request: ${error.message}`);
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new Error(
          "Failed to connect to Anthropic API. Please check your network connection."
        );
      }
      throw error;
    }
  };
}

/**
 * Creates a mock evaluator that throws an error if called.
 * Used when --lighthouse-only mode is active to catch configuration bugs.
 */
function createMockEvaluator(): (prompt: string) => Promise<string> {
  return async () => {
    throw new Error(
      "LLM evaluator was called but --lighthouse-only mode is active. " +
        "This indicates a bug: design evaluation should be disabled."
    );
  };
}

async function generateSampleSite(
  benchmarkId: string
): Promise<{ path: string; content: string }> {
  const mockData = getMockData(benchmarkId);
  if (!mockData) {
    throw new Error(`No mock data found for benchmark: ${benchmarkId}`);
  }

  // Generate a simple sample HTML based on mock data
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${mockData.name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <header class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
    <div class="container mx-auto px-6 py-16 text-center">
      <h1 class="text-4xl font-bold mb-4">${mockData.name}</h1>
      <p class="text-xl opacity-90 mb-8">${mockData.description}</p>
      <div class="flex justify-center gap-4">
        <a href="#" class="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">Get Started</a>
        <a href="#" class="border border-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition">Learn More</a>
      </div>
    </div>
  </header>

  <main class="container mx-auto px-6 py-16">
    <section class="grid md:grid-cols-3 gap-8 mb-16">
      ${mockData.topics
        .slice(0, 3)
        .map(
          (topic) => `
      <div class="bg-white p-6 rounded-xl shadow-sm">
        <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
          <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold mb-2 capitalize">${topic}</h3>
        <p class="text-gray-600">Built with ${topic} for optimal performance and developer experience.</p>
      </div>
      `
        )
        .join("")}
    </section>

    <section class="bg-white rounded-xl shadow-sm p-8 mb-16">
      <h2 class="text-2xl font-bold mb-4">About ${mockData.name}</h2>
      <div class="prose max-w-none">
        <p class="text-gray-600">${mockData.readme.split("\n").slice(0, 3).join(" ")}</p>
      </div>
    </section>

    <section class="grid md:grid-cols-2 gap-8">
      <div class="bg-indigo-50 p-6 rounded-xl">
        <h3 class="text-xl font-semibold mb-2">Stars</h3>
        <p class="text-3xl font-bold text-indigo-600">${mockData.stars.toLocaleString()}</p>
      </div>
      <div class="bg-purple-50 p-6 rounded-xl">
        <h3 class="text-xl font-semibold mb-2">Forks</h3>
        <p class="text-3xl font-bold text-purple-600">${mockData.forks.toLocaleString()}</p>
      </div>
    </section>
  </main>

  <footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-6 text-center">
      <p>&copy; ${new Date().getFullYear()} ${mockData.name}. Built with GitLyte.</p>
    </div>
  </footer>
</body>
</html>`;

  const outputPath = resolve(
    process.cwd(),
    "eval-output",
    `${benchmarkId}.html`
  );

  // Write file to disk for Lighthouse evaluation
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html);

  return { path: outputPath, content: html };
}

function writeOutputFile(filePath: string, content: string): boolean {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
    return true;
  } catch (writeError) {
    console.error(`\n⚠️ Warning: Failed to write results to ${filePath}`);
    console.error(
      `Reason: ${writeError instanceof Error ? writeError.message : "Unknown error"}`
    );
    return false;
  }
}

function handleError(error: unknown): never {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) {
      console.error(
        "Error: Invalid ANTHROPIC_API_KEY. Please check your API key."
      );
    } else if (error.status === 429) {
      console.error(
        "Error: Rate limited by Anthropic API. Please wait and retry."
      );
    } else {
      console.error(
        `Error: Anthropic API error (${error.status}): ${error.message}`
      );
    }
  } else if (error instanceof Error) {
    if (error.message.includes("ENOENT")) {
      console.error(`Error: File not found - ${error.message}`);
    } else if (
      error.message.includes("EACCES") ||
      error.message.includes("EPERM")
    ) {
      console.error(`Error: Permission denied - ${error.message}`);
    } else if (error.message.includes("ENOSPC")) {
      console.error(`Error: Disk full - ${error.message}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    // Log stack trace for debugging
    if (process.env.DEBUG) {
      console.error("\nStack trace:", error.stack);
    }
  } else {
    console.error("Error: An unexpected error occurred:", error);
  }
  process.exit(1);
}

async function main() {
  const args = parseArgs();

  console.error("🔍 GitLyte Evaluation Runner");
  console.error("============================\n");

  const options: EvaluationOptions = {
    runLighthouse: !args.designOnly,
    runDesignEvaluation: !args.lighthouseOnly,
    designThreshold: 3.0,
  };

  let reports: EvaluationReport[];

  try {
    // Use mock evaluator for lighthouse-only mode (will throw if accidentally called)
    const llmEvaluator = args.lighthouseOnly
      ? createMockEvaluator()
      : await createLlmEvaluator();

    if (args.benchmarkId) {
      // Run single benchmark
      const benchmark = getBenchmark(args.benchmarkId);
      if (!benchmark) {
        console.error(`Unknown benchmark: ${args.benchmarkId}`);
        console.error(
          `Available: ${ALL_BENCHMARKS.map((b) => b.id).join(", ")}`
        );
        process.exit(1);
      }

      console.error(`Running evaluation for: ${benchmark.name}`);
      const { path, content } = await generateSampleSite(args.benchmarkId);
      const report = await evaluateSite(
        path,
        content,
        args.benchmarkId,
        llmEvaluator,
        options
      );
      reports = [report];
    } else {
      // Run all benchmarks
      console.error("Running evaluation for all benchmarks...\n");
      reports = await evaluateAllBenchmarks(
        generateSampleSite,
        llmEvaluator,
        options
      );
    }

    // Output results
    const output = {
      timestamp: new Date().toISOString(),
      options,
      reports,
      summary: generateCombinedReport(reports),
    };

    const jsonOutput = JSON.stringify(output, null, 2);

    if (args.outputFile) {
      const writeSuccess = writeOutputFile(args.outputFile, jsonOutput);
      if (writeSuccess) {
        console.error(`\n✅ Results written to ${args.outputFile}`);
      } else {
        // Output to stdout as fallback
        console.error("\nResults output to stdout instead:");
        console.log(jsonOutput);
      }
    } else {
      console.log(jsonOutput);
    }

    // Print summary to stderr
    console.error("\n📊 Evaluation Summary:");
    console.error("─".repeat(40));
    for (const report of reports) {
      const status = report.overallPassed ? "✅ PASS" : "❌ FAIL";
      console.error(`${status} ${report.benchmarkId}: ${report.summary}`);
    }

    const passCount = reports.filter((r) => r.overallPassed).length;
    console.error(`\nTotal: ${passCount}/${reports.length} passed`);

    process.exit(passCount === reports.length ? 0 : 1);
  } catch (error) {
    handleError(error);
  }
}

main();
