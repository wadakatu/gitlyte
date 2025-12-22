/**
 * LLM as Judge - Design Quality Evaluation
 *
 * Uses AI to evaluate generated site design quality:
 * - Visual aesthetics
 * - Modernity
 * - Repository fit
 * - User experience
 */

export interface DesignEvaluation {
  overallScore: number; // 1-5
  criteria: {
    aesthetics: CriterionScore;
    modernity: CriterionScore;
    repositoryFit: CriterionScore;
    usability: CriterionScore;
    consistency: CriterionScore;
  };
  reasoning: string;
  suggestions: string[];
}

export interface CriterionScore {
  score: number; // 1-5
  reasoning: string;
}

export interface EvaluationContext {
  html: string;
  repositoryInfo: {
    name: string;
    description: string;
    language: string;
    topics: string[];
  };
}

/**
 * Evaluation criteria definitions
 */
const EVALUATION_CRITERIA = {
  aesthetics: {
    name: "Visual Aesthetics",
    description:
      "How visually appealing is the design? Consider color harmony, spacing, typography, and overall polish.",
  },
  modernity: {
    name: "Modernity",
    description:
      "Does the design feel modern and current? Consider trends like minimalism, clean layouts, and contemporary UI patterns.",
  },
  repositoryFit: {
    name: "Repository Fit",
    description:
      "How well does the design match the repository's purpose, audience, and technical domain?",
  },
  usability: {
    name: "Usability",
    description:
      "Is the site easy to navigate and understand? Consider information hierarchy, readability, and user flow.",
  },
  consistency: {
    name: "Consistency",
    description:
      "Is the design consistent throughout? Consider visual language, component styling, and spacing.",
  },
};

/**
 * Build the evaluation prompt for LLM as Judge
 */
export function buildEvaluationPrompt(context: EvaluationContext): string {
  return `You are an expert web designer evaluating the quality of a generated website.

## Repository Information
- Name: ${context.repositoryInfo.name}
- Description: ${context.repositoryInfo.description}
- Primary Language: ${context.repositoryInfo.language}
- Topics: ${context.repositoryInfo.topics.join(", ")}

## Generated HTML
\`\`\`html
${context.html}
\`\`\`

## Evaluation Task
Evaluate this generated website design on the following criteria, scoring each from 1-5:

${Object.entries(EVALUATION_CRITERIA)
  .map(([, value]) => `### ${value.name}\n${value.description}`)
  .join("\n\n")}

## Response Format
Respond with a JSON object in this exact format:
{
  "overallScore": <number 1-5>,
  "criteria": {
    "aesthetics": { "score": <number 1-5>, "reasoning": "<brief explanation>" },
    "modernity": { "score": <number 1-5>, "reasoning": "<brief explanation>" },
    "repositoryFit": { "score": <number 1-5>, "reasoning": "<brief explanation>" },
    "usability": { "score": <number 1-5>, "reasoning": "<brief explanation>" },
    "consistency": { "score": <number 1-5>, "reasoning": "<brief explanation>" }
  },
  "reasoning": "<overall assessment in 2-3 sentences>",
  "suggestions": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}

Be objective and critical. A score of 3 means "acceptable", 4 means "good", 5 means "excellent".
Most generated sites should score between 2-4. Reserve 5 for truly exceptional designs.`;
}

/**
 * Parse LLM response into DesignEvaluation
 */
export function parseEvaluationResponse(response: string): DesignEvaluation {
  // Clean up response (remove markdown code blocks if present)
  let cleaned = response.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  try {
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (
      typeof parsed.overallScore !== "number" ||
      parsed.overallScore < 1 ||
      parsed.overallScore > 5
    ) {
      throw new Error("Invalid overallScore");
    }

    // Validate reasoning
    if (typeof parsed.reasoning !== "string" || parsed.reasoning.length === 0) {
      throw new Error("Missing or invalid reasoning");
    }

    // Validate suggestions
    if (!Array.isArray(parsed.suggestions)) {
      throw new Error("Missing or invalid suggestions array");
    }
    for (const suggestion of parsed.suggestions) {
      if (typeof suggestion !== "string") {
        throw new Error("Invalid suggestion: must be a string");
      }
    }

    // Validate criteria
    const requiredCriteria = [
      "aesthetics",
      "modernity",
      "repositoryFit",
      "usability",
      "consistency",
    ];

    if (!parsed.criteria || typeof parsed.criteria !== "object") {
      throw new Error("Missing criteria object");
    }

    for (const criterion of requiredCriteria) {
      if (!parsed.criteria[criterion]) {
        throw new Error(`Missing criterion: ${criterion}`);
      }
      if (
        typeof parsed.criteria[criterion].score !== "number" ||
        parsed.criteria[criterion].score < 1 ||
        parsed.criteria[criterion].score > 5
      ) {
        throw new Error(`Invalid score for ${criterion}`);
      }
      if (
        typeof parsed.criteria[criterion].reasoning !== "string" ||
        parsed.criteria[criterion].reasoning.length === 0
      ) {
        throw new Error(`Missing or invalid reasoning for ${criterion}`);
      }
    }

    return parsed as DesignEvaluation;
  } catch (error) {
    throw new Error(
      `Failed to parse LLM evaluation response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Calculate if the design passes quality threshold
 */
export function meetsQualityThreshold(
  evaluation: DesignEvaluation,
  threshold = 3.0
): boolean {
  return evaluation.overallScore >= threshold;
}

/**
 * Generate a human-readable evaluation report
 */
export function generateEvaluationReport(evaluation: DesignEvaluation): string {
  const lines: string[] = ["# Design Quality Evaluation Report", ""];

  lines.push(`## Overall Score: ${evaluation.overallScore}/5`);
  lines.push("");
  lines.push("## Criteria Scores");
  lines.push("| Criterion | Score | Reasoning |");
  lines.push("|-----------|-------|-----------|");

  for (const [key, value] of Object.entries(evaluation.criteria)) {
    const criterionName =
      EVALUATION_CRITERIA[key as keyof typeof EVALUATION_CRITERIA]?.name || key;
    lines.push(`| ${criterionName} | ${value.score}/5 | ${value.reasoning} |`);
  }

  lines.push("");
  lines.push("## Overall Assessment");
  lines.push(evaluation.reasoning);
  lines.push("");

  if (evaluation.suggestions.length > 0) {
    lines.push("## Suggestions for Improvement");
    for (const suggestion of evaluation.suggestions) {
      lines.push(`- ${suggestion}`);
    }
  }

  return lines.join("\n");
}

/**
 * Compare two evaluations (for A/B testing)
 */
export function compareEvaluations(
  evaluationA: DesignEvaluation,
  evaluationB: DesignEvaluation
): {
  winner: "A" | "B" | "tie";
  scoreDifference: number;
  criteriaComparison: Record<
    string,
    { a: number; b: number; winner: "A" | "B" | "tie" }
  >;
} {
  const scoreDiff = evaluationA.overallScore - evaluationB.overallScore;
  const criteriaComparison: Record<
    string,
    { a: number; b: number; winner: "A" | "B" | "tie" }
  > = {};

  for (const key of Object.keys(evaluationA.criteria)) {
    const scoreA =
      evaluationA.criteria[key as keyof typeof evaluationA.criteria].score;
    const scoreB =
      evaluationB.criteria[key as keyof typeof evaluationB.criteria].score;
    criteriaComparison[key] = {
      a: scoreA,
      b: scoreB,
      winner: scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : "tie",
    };
  }

  return {
    winner: scoreDiff > 0.5 ? "A" : scoreDiff < -0.5 ? "B" : "tie",
    scoreDifference: Math.abs(scoreDiff),
    criteriaComparison,
  };
}
