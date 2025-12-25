/**
 * Self-Refine Pattern Implementation
 *
 * Implements LLM-as-Judge evaluation and iterative refinement
 * for higher quality site generation.
 */

import * as core from "@actions/core";
import type { AIProviderInstance } from "./ai-provider.js";

/** Evaluation result from LLM-as-Judge */
export interface EvaluationResult {
  score: number; // 1-10
  feedback: string;
  strengths: string[];
  improvements: string[];
}

/** Result of self-refinement process */
export interface RefinementResult {
  html: string;
  evaluation: EvaluationResult;
  iterations: number;
  improved: boolean;
}

/** Configuration for self-refinement */
export interface RefinementConfig {
  maxIterations: number;
  targetScore: number;
  projectName: string;
  projectDescription: string;
  requirements: string;
}

const DEFAULT_CONFIG: Partial<RefinementConfig> = {
  maxIterations: 3,
  targetScore: 8,
};

/**
 * Evaluate generated HTML using LLM-as-Judge pattern
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

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.3, // Lower temperature for consistent evaluation
  });

  try {
    const parsed = JSON.parse(cleanJsonResponse(result.text));
    return {
      score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
      feedback: String(parsed.feedback || "No feedback provided"),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
    };
  } catch (error) {
    core.warning(
      `Failed to parse evaluation response, using default score. Error: ${error}`
    );
    return {
      score: 5,
      feedback: "Evaluation parsing failed, using default score",
      strengths: [],
      improvements: [],
    };
  }
}

/**
 * Refine HTML based on evaluation feedback
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

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.7,
  });

  return cleanHtmlResponse(result.text);
}

/**
 * Self-refine HTML generation with iterative improvement
 */
export async function selfRefine(
  initialHtml: string,
  config: RefinementConfig,
  aiProvider: AIProviderInstance
): Promise<RefinementResult> {
  const maxIterations = config.maxIterations ?? DEFAULT_CONFIG.maxIterations!;
  const targetScore = config.targetScore ?? DEFAULT_CONFIG.targetScore!;

  let currentHtml = initialHtml;
  let bestHtml = initialHtml;
  let bestEvaluation: EvaluationResult | null = null;
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

  bestEvaluation = evaluation;

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
    if (evaluation.score > (bestEvaluation?.score ?? 0)) {
      bestHtml = currentHtml;
      bestEvaluation = evaluation;
      core.info("   ✨ New best score!");
    }
  }

  const improved = bestEvaluation!.score > 5; // Consider improved if above average
  const finalScore = bestEvaluation!.score;

  if (finalScore >= targetScore) {
    core.info(`✅ Self-Refine complete! Final score: ${finalScore}/10`);
  } else {
    core.info(
      `⚠️ Self-Refine complete. Best score: ${finalScore}/10 (target was ${targetScore})`
    );
  }

  return {
    html: bestHtml,
    evaluation: bestEvaluation!,
    iterations,
    improved,
  };
}

/**
 * Clean JSON response from AI (remove markdown code blocks)
 */
function cleanJsonResponse(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Clean HTML response from AI (remove markdown code blocks)
 */
function cleanHtmlResponse(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  let cleaned = text.trim();

  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}
