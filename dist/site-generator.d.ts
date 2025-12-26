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
/** SEO and Open Graph configuration */
export interface SeoConfig {
    /** Custom page title (defaults to repository name) */
    title?: string;
    /** Meta description for search engines */
    description?: string;
    /** Keywords for search engines */
    keywords?: string[];
    /** Open Graph image configuration */
    ogImage?: {
        /** Relative path to OG image file in output directory (after copying) */
        path: string;
    };
    /** Twitter/X handle (e.g., "@username") */
    twitterHandle?: string;
    /** Site URL for canonical link and OG URL */
    siteUrl?: string;
}
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
    /** Logo configuration */
    logo?: {
        /** Relative path to logo file in output directory (after copying) */
        path: string;
        /** Alt text for the logo image */
        alt?: string;
    };
    /** Favicon configuration */
    favicon?: {
        /** Relative path to favicon file in output directory (after copying) */
        path: string;
    };
    /** SEO and Open Graph configuration */
    seo?: SeoConfig;
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
