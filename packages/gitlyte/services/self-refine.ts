/**
 * Self-Refine Service
 *
 * Implements the Self-Refine pattern for improving generated site quality.
 * This service receives already-generated HTML and iteratively improves it:
 * 1. Evaluate design quality using LLM as Judge
 * 2. If below threshold, regenerate with feedback
 * 3. Repeat until threshold met or max iterations reached
 * 4. Return the best version
 *
 * This service is activated when `quality: "high"` is set in config.
 */

import type { AIProviderInstance } from "../utils/ai-provider.js";
import { cleanHtmlResponse } from "../utils/ai-response-cleaner.js";
import {
  type DesignEvaluation,
  type EvaluationContext,
  buildEvaluationPrompt,
  parseEvaluationResponse,
  meetsQualityThreshold,
} from "../eval/llm-judge.js";
import type { RepositoryAnalysis, DesignSystem } from "./v2-site-generator.js";

/**
 * Self-Refine configuration
 */
export interface SelfRefineConfig {
  /** Quality threshold (1-5). Pages below this score will be refined. */
  threshold: number;

  /** Maximum number of refinement attempts */
  maxIterations: number;

  /** Whether to log refinement progress */
  verbose: boolean;
}

/**
 * Default Self-Refine configuration
 */
export const DEFAULT_SELF_REFINE_CONFIG: SelfRefineConfig = {
  threshold: 3.5,
  maxIterations: 2,
  verbose: true,
};

/**
 * Validate and normalize Self-Refine configuration
 *
 * @param config - Configuration to validate
 * @returns Validated and normalized configuration
 * @throws Error if configuration is invalid
 *
 * @example
 * ```typescript
 * const config = validateSelfRefineConfig({ threshold: 4.5, maxIterations: 3, verbose: false });
 * ```
 */
export function validateSelfRefineConfig(
  config: SelfRefineConfig
): SelfRefineConfig {
  if (config.threshold < 1 || config.threshold > 5) {
    throw new Error(
      `Invalid threshold: ${config.threshold}. Must be between 1 and 5.`
    );
  }

  if (config.maxIterations < 1 || config.maxIterations > 10) {
    throw new Error(
      `Invalid maxIterations: ${config.maxIterations}. Must be between 1 and 10.`
    );
  }

  return config;
}

/**
 * Result of a refinement attempt
 */
export interface RefinementResult {
  /** The final HTML content */
  html: string;

  /** Number of refinement iterations performed */
  iterations: number;

  /** Evaluation of the initial generation */
  initialEvaluation: DesignEvaluation;

  /** Evaluation of the final generation (may be same as initial if no refinement needed) */
  finalEvaluation: DesignEvaluation;

  /** Whether refinement improved the score */
  improved: boolean;

  /** Score improvement (final - initial) */
  scoreImprovement: number;
}

/**
 * Context needed for refinement
 */
export interface RefinementContext {
  /** Repository analysis results */
  analysis: RepositoryAnalysis;

  /** Design system */
  design: DesignSystem;

  /** Repository info for evaluation */
  repositoryInfo: {
    name: string;
    description: string;
    language: string;
    topics: string[];
  };
}

/**
 * Evaluate a generated page using LLM as Judge
 *
 * @param html - The HTML content to evaluate
 * @param context - Refinement context with repository and design info
 * @param aiProvider - AI provider instance
 * @returns Design evaluation with scores and feedback
 * @throws Error if AI generation or response parsing fails
 *
 * @example
 * ```typescript
 * const evaluation = await evaluatePageDesign(html, context, aiProvider);
 * console.log(`Score: ${evaluation.overallScore}/5`);
 * ```
 */
export async function evaluatePageDesign(
  html: string,
  context: RefinementContext,
  aiProvider: AIProviderInstance
): Promise<DesignEvaluation> {
  const evalContext: EvaluationContext = {
    html,
    repositoryInfo: context.repositoryInfo,
  };

  const prompt = buildEvaluationPrompt(evalContext);

  try {
    const result = await aiProvider.generateText({
      prompt,
      taskType: "evaluation",
    });

    return parseEvaluationResponse(result.text);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[self-refine] Failed to evaluate page design: ${errorMessage}`,
      {
        cause: error,
      }
    );
  }
}

/**
 * Generate an improved page based on evaluation feedback
 *
 * @param currentHtml - The current HTML to improve
 * @param evaluation - Evaluation with feedback to address
 * @param context - Refinement context with repository and design info
 * @param aiProvider - AI provider instance
 * @returns Improved HTML content
 * @throws Error if AI generation or HTML cleaning fails
 *
 * @example
 * ```typescript
 * const improvedHtml = await generateRefinedPage(html, evaluation, context, aiProvider);
 * ```
 */
export async function generateRefinedPage(
  currentHtml: string,
  evaluation: DesignEvaluation,
  context: RefinementContext,
  aiProvider: AIProviderInstance
): Promise<string> {
  const prompt = buildRefinementPrompt(currentHtml, evaluation, context);

  try {
    const result = await aiProvider.generateText({
      prompt,
      taskType: "content",
      maxOutputTokens: 4000,
    });

    return cleanHtmlResponse(result.text);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[self-refine] Failed to generate refined page: ${errorMessage}`,
      {
        cause: error,
      }
    );
  }
}

/**
 * Build a prompt for page refinement based on evaluation feedback
 */
function buildRefinementPrompt(
  currentHtml: string,
  evaluation: DesignEvaluation,
  context: RefinementContext
): string {
  const weakestCriteria = getWeakestCriteria(evaluation);

  return `You are an expert web designer. Improve the following HTML page based on feedback.

## Project Information
- Name: ${context.analysis.name}
- Description: ${context.analysis.description}
- Type: ${context.analysis.projectType}
- Audience: ${context.analysis.audience}
- Style: ${context.analysis.style}

## Design System
- Primary Color: ${context.design.colors.primary}
- Secondary Color: ${context.design.colors.secondary}
- Accent Color: ${context.design.colors.accent}
- Background: ${context.design.colors.background}
- Text: ${context.design.colors.text}
- Layout: ${context.design.layout}

## Current Evaluation (Score: ${evaluation.overallScore}/5)
${evaluation.reasoning}

## Specific Issues to Address
${weakestCriteria.map((c) => `- **${c.name}** (${c.score}/5): ${c.reasoning}`).join("\n")}

## Improvement Suggestions
${evaluation.suggestions.map((s) => `- ${s}`).join("\n")}

## Current HTML
\`\`\`html
${currentHtml}
\`\`\`

## Your Task
Generate an improved version of this HTML that addresses the feedback above.
Focus especially on: ${weakestCriteria.map((c) => c.name).join(", ")}.

REQUIREMENTS:
1. Keep using Tailwind CSS classes (loaded via CDN)
2. Maintain the same general structure but improve the weak areas
3. Make it responsive (mobile-first)
4. Use modern design patterns
5. No external images - use gradients or emoji as placeholders

OUTPUT: Return ONLY the complete HTML document, no explanation. Start with <!DOCTYPE html>.`;
}

/**
 * Get the weakest criteria from an evaluation (those with lowest scores)
 */
function getWeakestCriteria(
  evaluation: DesignEvaluation
): Array<{ name: string; score: number; reasoning: string }> {
  const criteria = [
    {
      name: "Aesthetics",
      score: evaluation.criteria.aesthetics.score,
      reasoning: evaluation.criteria.aesthetics.reasoning,
    },
    {
      name: "Modernity",
      score: evaluation.criteria.modernity.score,
      reasoning: evaluation.criteria.modernity.reasoning,
    },
    {
      name: "Repository Fit",
      score: evaluation.criteria.repositoryFit.score,
      reasoning: evaluation.criteria.repositoryFit.reasoning,
    },
    {
      name: "Usability",
      score: evaluation.criteria.usability.score,
      reasoning: evaluation.criteria.usability.reasoning,
    },
    {
      name: "Consistency",
      score: evaluation.criteria.consistency.score,
      reasoning: evaluation.criteria.consistency.reasoning,
    },
  ];

  // Sort by score (ascending) and return the bottom 3
  return criteria.sort((a, b) => a.score - b.score).slice(0, 3);
}

/** Small epsilon for floating point comparisons */
const EPSILON = 0.001;

/**
 * Refine a generated page using the Self-Refine pattern
 *
 * @param initialHtml - The initially generated HTML
 * @param context - Context for refinement
 * @param aiProvider - AI provider instance
 * @param config - Self-Refine configuration
 * @returns Refinement result with the best HTML
 * @throws Error if initial evaluation fails or configuration is invalid
 *
 * @example
 * ```typescript
 * const result = await refinePage(html, context, aiProvider, {
 *   threshold: 4.0,
 *   maxIterations: 3,
 *   verbose: true,
 * });
 * console.log(`Final score: ${result.finalEvaluation.overallScore}/5`);
 * ```
 */
export async function refinePage(
  initialHtml: string,
  context: RefinementContext,
  aiProvider: AIProviderInstance,
  config: SelfRefineConfig = DEFAULT_SELF_REFINE_CONFIG
): Promise<RefinementResult> {
  // Validate configuration
  validateSelfRefineConfig(config);

  const log = config.verbose ? console.log : () => {};

  log("[self-refine] Evaluating initial generation...");

  // Evaluate the initial generation
  const initialEvaluation = await evaluatePageDesign(
    initialHtml,
    context,
    aiProvider
  );

  log(
    `[self-refine] Initial score: ${initialEvaluation.overallScore}/5 (threshold: ${config.threshold})`
  );

  // Check if initial generation meets the threshold
  if (meetsQualityThreshold(initialEvaluation, config.threshold)) {
    log(
      "[self-refine] Initial generation meets threshold, no refinement needed"
    );
    return {
      html: initialHtml,
      iterations: 0,
      initialEvaluation,
      finalEvaluation: initialEvaluation,
      improved: false,
      scoreImprovement: 0,
    };
  }

  // Refinement loop
  let currentHtml = initialHtml;
  let currentEvaluation = initialEvaluation;
  let bestHtml = initialHtml;
  let bestEvaluation = initialEvaluation;
  let iterations = 0;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 2;

  while (iterations < config.maxIterations) {
    iterations++;
    log(
      `[self-refine] Refinement iteration ${iterations}/${config.maxIterations}...`
    );

    try {
      // Generate refined version
      const refinedHtml = await generateRefinedPage(
        currentHtml,
        currentEvaluation,
        context,
        aiProvider
      );

      // Evaluate the refined version
      const refinedEvaluation = await evaluatePageDesign(
        refinedHtml,
        context,
        aiProvider
      );

      log(
        `[self-refine] Refined score: ${refinedEvaluation.overallScore}/5 (was: ${currentEvaluation.overallScore}/5)`
      );

      // Reset failure counter on success
      consecutiveFailures = 0;

      // Keep track of the best version
      if (refinedEvaluation.overallScore > bestEvaluation.overallScore) {
        bestHtml = refinedHtml;
        bestEvaluation = refinedEvaluation;
        log("[self-refine] New best version found");
      }

      // Check if we've reached the threshold
      if (meetsQualityThreshold(refinedEvaluation, config.threshold)) {
        log("[self-refine] Refined generation meets threshold");
        break;
      }

      // Prepare for next iteration
      currentHtml = refinedHtml;
      currentEvaluation = refinedEvaluation;
    } catch (error) {
      consecutiveFailures++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`[self-refine] Iteration ${iterations} failed: ${errorMessage}`);

      if (consecutiveFailures >= maxConsecutiveFailures) {
        log(
          `[self-refine] ${maxConsecutiveFailures} consecutive failures, stopping refinement`
        );
        break;
      }

      // Continue with current best version on next iteration
      log("[self-refine] Continuing with current best version...");
    }
  }

  const scoreImprovement =
    bestEvaluation.overallScore - initialEvaluation.overallScore;
  // Use epsilon for floating point comparison
  const improved = scoreImprovement > EPSILON;

  log(
    `[self-refine] Complete. Final score: ${bestEvaluation.overallScore}/5, improvement: ${scoreImprovement > 0 ? "+" : ""}${scoreImprovement.toFixed(1)}`
  );

  return {
    html: bestHtml,
    iterations,
    initialEvaluation,
    finalEvaluation: bestEvaluation,
    improved,
    scoreImprovement,
  };
}

/**
 * Check if Self-Refine should be used based on quality mode
 */
export function shouldUseSelfRefine(qualityMode: "standard" | "high"): boolean {
  return qualityMode === "high";
}
