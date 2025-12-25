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
/** Theme mode options */
export type ThemeMode = "light" | "dark" | "auto";
export interface SiteConfig {
    outputDirectory: string;
    theme: {
        /** Default theme mode: "light", "dark", or "auto" (respects system preference) */
        mode: ThemeMode;
        /** Whether to include a toggle button for switching themes */
        toggle: boolean;
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
