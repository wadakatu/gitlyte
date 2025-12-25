/**
 * Self-Refine Pattern Implementation
 *
 * Implements LLM-as-Judge evaluation and iterative refinement
 * for higher quality site generation.
 */
import type { AIProviderInstance } from "./ai-provider.js";
import { type ScoreValue } from "./ai-response-utils.js";
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
/**
 * Evaluate generated HTML using LLM-as-Judge pattern
 *
 * @throws Error if AI returns invalid JSON that cannot be parsed
 */
export declare function evaluateHtml(html: string, context: {
    projectName: string;
    projectDescription: string;
}, aiProvider: AIProviderInstance): Promise<EvaluationResult>;
/**
 * Refine HTML based on evaluation feedback
 *
 * @throws Error if AI generation fails or returns invalid HTML
 */
export declare function refineHtml(html: string, evaluation: EvaluationResult, config: RefinementConfig, aiProvider: AIProviderInstance): Promise<string>;
/**
 * Self-refine HTML generation with iterative improvement
 *
 * @throws Error if evaluation or refinement fails
 */
export declare function selfRefine(initialHtml: string, config: RefinementConfig, aiProvider: AIProviderInstance): Promise<RefinementResult>;
