/**
 * Self-Refine Pattern Implementation
 *
 * Implements LLM-as-Judge evaluation and iterative refinement
 * for higher quality site generation.
 */
import type { AIProviderInstance } from "./ai-provider.js";
/** Evaluation result from LLM-as-Judge */
export interface EvaluationResult {
    score: number;
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
/**
 * Evaluate generated HTML using LLM-as-Judge pattern
 */
export declare function evaluateHtml(html: string, context: {
    projectName: string;
    projectDescription: string;
}, aiProvider: AIProviderInstance): Promise<EvaluationResult>;
/**
 * Refine HTML based on evaluation feedback
 */
export declare function refineHtml(html: string, evaluation: EvaluationResult, config: RefinementConfig, aiProvider: AIProviderInstance): Promise<string>;
/**
 * Self-refine HTML generation with iterative improvement
 */
export declare function selfRefine(initialHtml: string, config: RefinementConfig, aiProvider: AIProviderInstance): Promise<RefinementResult>;
