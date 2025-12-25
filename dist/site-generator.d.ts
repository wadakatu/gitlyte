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
/** Valid theme mode values - single source of truth */
export declare const THEME_MODES: readonly ["light", "dark", "auto"];
/** Theme mode options - derived from THEME_MODES array */
export type ThemeMode = (typeof THEME_MODES)[number];
/**
 * Type guard to validate if a value is a valid ThemeMode
 */
export declare function isValidThemeMode(value: unknown): value is ThemeMode;
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
