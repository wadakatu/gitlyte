/**
 * Self-Refine Pattern Implementation
 *
 * Implements LLM-as-Judge evaluation and iterative refinement
 * for higher quality site generation.
 */

import * as core from "@actions/core";
import type { AIProviderInstance } from "./ai-provider.js";
import {
  type ScoreValue,
  toScoreValue,
  cleanJsonResponse,
  cleanHtmlResponse,
} from "./ai-response-utils.js";

/** Evaluation result from LLM-as-Judge */
export interface EvaluationResult {
  /** Score from 1-10 */
  score: ScoreValue;
  /** Overall feedback in 2-3 sentences */
  feedback: string;
  /** List of positive aspects */
  strengths: string[];
  /** List of areas needing improvement */
  improvements: string[];
}

/** Result of self-refinement process */
export interface RefinementResult {
  /** The final HTML output after refinement */
  readonly html: string;
  /** Final evaluation of the refined HTML */
  readonly evaluation: EvaluationResult;
  /** Number of refinement iterations performed (0 if initial score met target) */
  readonly iterations: number;
  /** True if final score exceeds baseline threshold (5) */
  readonly improved: boolean;
}

/** Configuration for self-refinement */
export interface RefinementConfig {
  maxIterations: number;
  targetScore: ScoreValue;
  projectName: string;
  projectDescription: string;
  requirements: string;
}

const DEFAULT_MAX_ITERATIONS = 3;
const DEFAULT_TARGET_SCORE: ScoreValue = 8;
const IMPROVED_THRESHOLD: ScoreValue = 5;

/**
 * Evaluate generated HTML using LLM-as-Judge pattern
 *
 * @throws Error if AI returns invalid JSON that cannot be parsed
 */
export async function evaluateHtml(
  html: string,
  context: { projectName: string; projectDescription: string },
  aiProvider: AIProviderInstance
): Promise<EvaluationResult> {
  const prompt = `You are an expert web design evaluator. Evaluate this landing page HTML for a project called "${context.projectName}".

PROJECT CONTEXT:
${context.projectDescription}

HTML TO EVALUATE:
${html.slice(0, 8000)}

EVALUATION CRITERIA:
1. Visual Design (colors, typography, spacing, modern aesthetics)
2. Content Quality (clear messaging, compelling copy, professional tone)
3. User Experience (navigation, readability, call-to-action clarity)
4. Technical Quality (semantic HTML, responsive design, accessibility)
5. Brand Alignment (matches project purpose and audience)

Respond with JSON only (no markdown, no code blocks):
{
  "score": 7,
  "feedback": "Overall assessment in 2-3 sentences",
  "strengths": ["strength1", "strength2"],
  "improvements": ["specific improvement 1", "specific improvement 2"]
}

Be critical but constructive. Score 1-10 where:
- 1-3: Poor, major issues
- 4-5: Below average, needs work
- 6-7: Average, acceptable but could improve
- 8-9: Good, high quality
- 10: Exceptional, production-ready`;

  let result: { text: string };
  try {
    result = await aiProvider.generateText({
      prompt,
      temperature: 0.3, // Lower temperature for consistent evaluation
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `HTML evaluation failed during AI generation: ${errorMessage}. ` +
        "This may be due to API rate limits or network issues.",
      { cause: error }
    );
  }

  const cleanedResponse = cleanJsonResponse(result.text);
  if (!cleanedResponse) {
    throw new Error(
      "HTML evaluation failed: AI returned empty response. " +
        "Please retry or check your API key."
    );
  }

  try {
    const parsed = JSON.parse(cleanedResponse);
    return {
      score: toScoreValue(parsed.score),
      feedback: String(parsed.feedback || "No feedback provided"),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawPreview = result.text?.slice(0, 200) || "(empty)";
    core.error(
      "Evaluation failed: AI returned invalid JSON. " +
        `Raw response preview: ${rawPreview}`
    );
    throw new Error(
      "HTML evaluation failed: AI returned malformed JSON response. " +
        `Error: ${errorMessage}. Please retry or check your configuration.`,
      { cause: error }
    );
  }
}

/**
 * Refine HTML based on evaluation feedback
 *
 * @throws Error if AI generation fails or returns invalid HTML
 */
export async function refineHtml(
  html: string,
  evaluation: EvaluationResult,
  config: RefinementConfig,
  aiProvider: AIProviderInstance
): Promise<string> {
  const improvementList = evaluation.improvements
    .map((imp, i) => `${i + 1}. ${imp}`)
    .join("\n");

  const prompt = `You are improving a landing page HTML. The current version was evaluated and received feedback.

PROJECT: ${config.projectName}
DESCRIPTION: ${config.projectDescription}

CURRENT EVALUATION:
- Score: ${evaluation.score}/10
- Feedback: ${evaluation.feedback}
- Areas to improve:
${improvementList}

ORIGINAL REQUIREMENTS:
${config.requirements}

CURRENT HTML:
${html.slice(0, 10000)}

TASK: Regenerate the complete HTML page addressing ALL the improvement areas listed above.
Keep what works well (strengths) but significantly improve the weak areas.

OUTPUT: Return ONLY the complete HTML document starting with <!DOCTYPE html>.`;

  let result: { text: string };
  try {
    result = await aiProvider.generateText({
      prompt,
      temperature: 0.7,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `HTML refinement failed during AI generation for project "${config.projectName}": ${errorMessage}. ` +
        "This may be due to API rate limits or network issues.",
      { cause: error }
    );
  }

  const refinedHtml = cleanHtmlResponse(result.text);

  if (!refinedHtml || refinedHtml.length < 100) {
    const rawPreview = result.text?.slice(0, 200) || "(empty)";
    core.error(
      "Refinement returned invalid HTML. " +
        `Response length: ${refinedHtml?.length ?? 0}, ` +
        `Raw preview: ${rawPreview}`
    );
    throw new Error(
      "HTML refinement failed: AI returned empty or invalid HTML response. " +
        `Project: "${config.projectName}". Please retry.`
    );
  }

  return refinedHtml;
}

/**
 * Self-refine HTML generation with iterative improvement
 *
 * @throws Error if evaluation or refinement fails
 */
export async function selfRefine(
  initialHtml: string,
  config: RefinementConfig,
  aiProvider: AIProviderInstance
): Promise<RefinementResult> {
  const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const targetScore = config.targetScore ?? DEFAULT_TARGET_SCORE;

  let currentHtml = initialHtml;
  let bestHtml = initialHtml;
  let iterations = 0;

  core.info(`🔄 Starting Self-Refine (target score: ${targetScore}/10)`);

  // Initial evaluation
  let evaluation = await evaluateHtml(
    currentHtml,
    {
      projectName: config.projectName,
      projectDescription: config.projectDescription,
    },
    aiProvider
  );

  core.info(`📊 Initial evaluation: ${evaluation.score}/10`);
  core.info(`   Feedback: ${evaluation.feedback}`);

  // Initialize bestEvaluation with the first evaluation
  let bestEvaluation: EvaluationResult = evaluation;

  // Iterate until target score or max iterations
  while (evaluation.score < targetScore && iterations < maxIterations) {
    iterations++;
    core.info(`🔧 Refinement iteration ${iterations}/${maxIterations}...`);

    // Log improvements to make
    if (evaluation.improvements.length > 0) {
      core.info("   Improvements needed:");
      for (const imp of evaluation.improvements) {
        core.info(`   - ${imp}`);
      }
    }

    // Refine based on feedback
    currentHtml = await refineHtml(currentHtml, evaluation, config, aiProvider);

    // Re-evaluate
    evaluation = await evaluateHtml(
      currentHtml,
      {
        projectName: config.projectName,
        projectDescription: config.projectDescription,
      },
      aiProvider
    );

    core.info(`📊 Iteration ${iterations} score: ${evaluation.score}/10`);

    // Keep track of best version
    if (evaluation.score > bestEvaluation.score) {
      bestHtml = currentHtml;
      bestEvaluation = evaluation;
      core.info("   ✨ New best score!");
    }
  }

  const improved = bestEvaluation.score > IMPROVED_THRESHOLD;
  const finalScore = bestEvaluation.score;

  if (finalScore >= targetScore) {
    core.info(`✅ Self-Refine complete! Final score: ${finalScore}/10`);
  } else {
    core.info(
      `⚠️ Self-Refine complete. Best score: ${finalScore}/10 (target was ${targetScore})`
    );
  }

  return {
    html: bestHtml,
    evaluation: bestEvaluation,
    iterations,
    improved,
  };
}
