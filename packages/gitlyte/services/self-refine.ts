/**
 * Self-Refine Service
 *
 * Implements the Self-Refine pattern for improving generated site quality:
 * 1. Generate initial site
 * 2. Evaluate design quality using LLM as Judge
 * 3. If below threshold, regenerate with feedback
 * 4. Return the best version
 *
 * This service is activated when `quality: "high"` is set in config.
 */

import type { AIProviderInstance } from "../utils/ai-provider.js";
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

  const result = await aiProvider.generateText({
    prompt,
    taskType: "evaluation",
  });

  return parseEvaluationResponse(result.text);
}

/**
 * Generate an improved page based on evaluation feedback
 */
export async function generateRefinedPage(
  currentHtml: string,
  evaluation: DesignEvaluation,
  context: RefinementContext,
  aiProvider: AIProviderInstance
): Promise<string> {
  const prompt = buildRefinementPrompt(currentHtml, evaluation, context);

  const result = await aiProvider.generateText({
    prompt,
    taskType: "content",
    maxOutputTokens: 4000,
  });

  return cleanHtmlResponse(result.text);
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

/**
 * Clean HTML response from AI
 */
function cleanHtmlResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  // Ensure it starts with doctype
  if (!cleaned.toLowerCase().startsWith("<!doctype")) {
    const doctypeIndex = cleaned.toLowerCase().indexOf("<!doctype");
    if (doctypeIndex > -1) {
      cleaned = cleaned.slice(doctypeIndex);
    }
  }

  return cleaned.trim();
}

/**
 * Refine a generated page using the Self-Refine pattern
 *
 * @param initialHtml - The initially generated HTML
 * @param context - Context for refinement
 * @param aiProvider - AI provider instance
 * @param config - Self-Refine configuration
 * @returns Refinement result with the best HTML
 */
export async function refinePage(
  initialHtml: string,
  context: RefinementContext,
  aiProvider: AIProviderInstance,
  config: SelfRefineConfig = DEFAULT_SELF_REFINE_CONFIG
): Promise<RefinementResult> {
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

  while (iterations < config.maxIterations) {
    iterations++;
    log(
      `[self-refine] Refinement iteration ${iterations}/${config.maxIterations}...`
    );

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
  }

  const scoreImprovement =
    bestEvaluation.overallScore - initialEvaluation.overallScore;
  const improved = scoreImprovement > 0;

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
