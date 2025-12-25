/**
 * Simplified Site Generator for GitHub Action
 *
 * A standalone version of the site generator that works without Probot dependencies.
 */
import type { AIProviderInstance } from "./ai-provider.js";
export interface RepoInfo {
    name: string;
    fullName: string;
    description?: string;
    htmlUrl: string;
    language?: string;
    topics: string[];
    readme?: string;
}
export interface SiteConfig {
    outputDirectory: string;
    theme: {
        mode: "light" | "dark";
    };
    prompts: {
        siteInstructions?: string;
    };
}
export interface GeneratedPage {
    path: string;
    html: string;
}
export interface GeneratedSite {
    pages: GeneratedPage[];
    assets: Array<{
        path: string;
        content: string;
    }>;
}
/**
 * Generate a complete site
 */
export declare function generateSite(repoInfo: RepoInfo, aiProvider: AIProviderInstance, config: SiteConfig): Promise<GeneratedSite>;
