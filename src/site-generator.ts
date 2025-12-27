/**
 * Simplified Site Generator for GitHub Action
 *
 * A standalone version of the site generator that works without Probot dependencies.
 */

import * as core from "@actions/core";
import type { AIProviderInstance } from "./ai-provider.js";
import { selfRefine } from "./self-refine.js";
import { cleanJsonResponse, cleanHtmlResponse } from "./ai-response-utils.js";

/** GitHub repository statistics */
export interface RepoStats {
  /** Number of stars/stargazers */
  stars: number;
  /** Number of forks */
  forks: number;
  /** Number of watchers/subscribers */
  watchers: number;
  /** Number of open issues */
  openIssues: number;
  /** Repository creation date (ISO 8601) */
  createdAt: string;
  /** Last push date (ISO 8601) */
  updatedAt: string;
  /** License name (e.g., "MIT License") */
  license?: string;
  /** Latest release version (e.g., "v1.2.0") */
  latestRelease?: string;
  /** Number of contributors */
  contributorCount?: number;
}

/** GitHub contributor information */
export interface Contributor {
  /** GitHub username */
  login: string;
  /** Avatar URL */
  avatarUrl: string;
  /** Profile URL */
  profileUrl: string;
  /** Number of contributions */
  contributions: number;
  /** Type of contributor (User or Bot) */
  type: "User" | "Bot";
}

/** Maximum number of contributors allowed (API and performance limit) */
export const MAX_CONTRIBUTORS_LIMIT = 500;

/** Default number of contributors to display */
export const DEFAULT_MAX_CONTRIBUTORS = 50;

/** Maximum pages to fetch for pagination (safety limit) */
export const MAX_CONTRIBUTOR_PAGES = 10;

/** Contributors page configuration */
export interface ContributorsConfig {
  /** Whether contributors page generation is enabled (default: false) */
  enabled: boolean;
  /** Maximum number of contributors to display (default: 50) */
  maxContributors: number;
}

export interface RepoInfo {
  name: string;
  fullName: string;
  description?: string;
  htmlUrl: string;
  language?: string;
  topics: string[];
  readme?: string;
  /** Dynamic GitHub statistics */
  stats?: RepoStats;
  /** Contributors list for contributors page */
  contributors?: Contributor[];
}

/** Valid theme mode values - single source of truth */
export const THEME_MODES = ["light", "dark", "auto"] as const;

/** Theme mode options - derived from THEME_MODES array */
export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * Type guard to validate if a value is a valid ThemeMode
 */
export function isValidThemeMode(value: unknown): value is ThemeMode {
  return (
    typeof value === "string" &&
    THEME_MODES.includes(value as (typeof THEME_MODES)[number])
  );
}

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

/** Valid changefreq values for sitemap */
export const SITEMAP_CHANGEFREQ = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
] as const;

/** Sitemap changefreq type */
export type SitemapChangefreq = (typeof SITEMAP_CHANGEFREQ)[number];

/** Sitemap configuration */
export interface SitemapConfig {
  /** Whether sitemap generation is enabled (default: true) */
  enabled: boolean;
  /** How frequently the page changes (default: "weekly") */
  changefreq?: SitemapChangefreq;
  /** Priority of this URL relative to other URLs (0.0 to 1.0, default: 0.8) */
  priority?: number;
}

/** Robots.txt configuration */
export interface RobotsConfig {
  /** Whether robots.txt generation is enabled (default: true) */
  enabled: boolean;
  /** Additional rules to include in robots.txt */
  additionalRules?: string[];
}

export interface SiteConfig {
  outputDirectory: string;
  theme: {
    /** Default theme mode: "light", "dark", or "auto" (respects system preference) */
    mode: ThemeMode;
    /** Whether to include a toggle button for switching themes */
    toggle: boolean;
  };
  prompts: { siteInstructions?: string };
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
  /** Sitemap generation configuration */
  sitemap?: SitemapConfig;
  /** Robots.txt generation configuration */
  robots?: RobotsConfig;
  /** Contributors page configuration */
  contributors?: ContributorsConfig;
}

export interface GeneratedPage {
  path: string;
  html: string;
}

export interface GeneratedSite {
  pages: GeneratedPage[];
  assets: Array<{ path: string; content: string }>;
}

/** Valid project type values */
type ProjectType = "library" | "tool" | "webapp" | "docs" | "other";

/** Valid audience values */
type Audience = "developers" | "designers" | "general" | "enterprise";

/** Valid style values */
type Style = "minimal" | "professional" | "creative" | "technical";

interface RepositoryAnalysis {
  name: string;
  description: string;
  projectType: ProjectType;
  primaryLanguage: string;
  audience: Audience;
  style: Style;
  keyFeatures: string[];
}

interface DesignSystem {
  colors: {
    light: ColorPalette;
    dark: ColorPalette;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  layout: string;
}

interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

/**
 * Generate a complete site
 */
export async function generateSite(
  repoInfo: RepoInfo,
  aiProvider: AIProviderInstance,
  config: SiteConfig
): Promise<GeneratedSite> {
  core.info("Starting site generation...");

  // Step 1: Analyze repository
  core.info("Analyzing repository...");
  const analysis = await analyzeRepository(repoInfo, aiProvider);

  // Step 2: Generate design system
  core.info("Generating design system...");
  const design = await generateDesignSystem(analysis, aiProvider);

  // Step 3: Generate index page
  core.info("Generating index page...");
  let indexHtml = await generateIndexPage(
    repoInfo,
    analysis,
    design,
    config,
    aiProvider
  );

  // Step 4: Apply Self-Refine for high quality mode
  if (aiProvider.quality === "high") {
    core.info("🎯 High quality mode: applying Self-Refine...");

    const requirements = buildRequirements(repoInfo, analysis, design, config);

    const refinementResult = await selfRefine(
      indexHtml,
      {
        maxIterations: 3,
        targetScore: 8,
        projectName: analysis.name,
        projectDescription: analysis.description,
        requirements,
      },
      aiProvider
    );

    indexHtml = refinementResult.html;
    core.info(
      `📈 Self-Refine: ${refinementResult.iterations} iterations, ` +
        `final score: ${refinementResult.evaluation.score}/10`
    );
  }

  // Build the pages array
  const pages: GeneratedPage[] = [{ path: "index.html", html: indexHtml }];

  // Track generation results for summary
  const generated: string[] = ["index.html"];
  const skipped: string[] = [];

  // Step 5: Generate contributors page (if enabled and contributors data is available)
  const contributorsEnabled = config.contributors?.enabled === true;
  const hasContributors =
    repoInfo.contributors && repoInfo.contributors.length > 0;

  if (contributorsEnabled) {
    if (hasContributors && repoInfo.contributors) {
      core.info("Generating contributors page...");
      try {
        const contributorsHtml = await generateContributorsPage(
          repoInfo,
          repoInfo.contributors,
          design,
          config,
          aiProvider
        );
        pages.push({ path: "contributors.html", html: contributorsHtml });
        generated.push("contributors.html");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        core.warning(
          `Failed to generate contributors page: ${errorMessage}. ` +
            "Site will be generated without contributors page."
        );
        skipped.push("contributors.html (generation failed)");
      }
    } else {
      core.info(
        "Contributors page skipped: no contributors data available. " +
          "This may be because the repository has no contributors or the API call failed."
      );
      skipped.push("contributors.html (no data)");
    }
  }

  // Step 6: Generate sitemap.xml (if enabled and siteUrl is set)
  const sitemapEnabled = config.sitemap?.enabled !== false;
  const robotsEnabled = config.robots?.enabled !== false;
  const siteUrl = config.seo?.siteUrl;

  if (sitemapEnabled || robotsEnabled) {
    if (!siteUrl) {
      if (sitemapEnabled) {
        core.warning(
          "Sitemap generation skipped: site-url is required for sitemap.xml. " +
            "Set seo.siteUrl in .gitlyte.json or use the site-url action input."
        );
        skipped.push("sitemap.xml (no site-url)");
      }
      if (robotsEnabled) {
        core.warning(
          "Robots.txt generation skipped: site-url is required for robots.txt. " +
            "Set seo.siteUrl in .gitlyte.json or use the site-url action input."
        );
        skipped.push("robots.txt (no site-url)");
      }
    } else {
      // Track whether sitemap was actually generated (for robots.txt Sitemap directive)
      let sitemapGenerated = false;

      if (sitemapEnabled) {
        core.info("Generating sitemap.xml...");
        try {
          const sitemapXml = generateSitemap(pages, siteUrl, {
            changefreq: config.sitemap?.changefreq,
            priority: config.sitemap?.priority,
          });
          pages.push({ path: "sitemap.xml", html: sitemapXml });
          sitemapGenerated = true;
          generated.push("sitemap.xml");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `Failed to generate sitemap.xml: ${errorMessage}. ` +
              "Site will be generated without a sitemap."
          );
          skipped.push("sitemap.xml (generation failed)");
        }
      }

      if (robotsEnabled) {
        core.info("Generating robots.txt...");
        try {
          const robotsTxt = generateRobots(siteUrl, {
            additionalRules: config.robots?.additionalRules,
            includeSitemap: sitemapGenerated,
          });
          pages.push({ path: "robots.txt", html: robotsTxt });
          generated.push("robots.txt");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `Failed to generate robots.txt: ${errorMessage}. ` +
              "Site will be generated without robots.txt."
          );
          skipped.push("robots.txt (generation failed)");
        }
      }
    }
  } else {
    // Track explicitly disabled features
    if (!sitemapEnabled) {
      skipped.push("sitemap.xml (disabled)");
    }
    if (!robotsEnabled) {
      skipped.push("robots.txt (disabled)");
    }
  }

  // Log generation summary
  core.info("Site generation complete!");
  core.info(`  Generated: ${generated.join(", ")}`);
  if (skipped.length > 0) {
    core.info(`  Skipped: ${skipped.join(", ")}`);
  }

  return { pages, assets: [] };
}

/**
 * Format a number for display (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Format an ISO date string to a relative date (e.g., "3 days ago", "2 months ago")
 */
export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  // Handle invalid dates
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Handle future dates
  if (diffDays < 0) {
    return "recently";
  }

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;

  const months = Math.floor(diffDays / 30);
  if (diffDays < 365)
    return `${months} ${months === 1 ? "month" : "months"} ago`;

  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

/**
 * Build GitHub statistics section for AI prompt
 */
function buildStatsRequirements(stats: RepoStats): string {
  const lines: string[] = [
    "GITHUB STATISTICS (display these prominently in a stats bar below the hero section):",
    `- Stars: ${formatCount(stats.stars)}`,
    `- Forks: ${formatCount(stats.forks)}`,
    `- Watchers: ${formatCount(stats.watchers)}`,
    `- Last Updated: ${formatRelativeDate(stats.updatedAt)}`,
  ];

  if (stats.license) {
    lines.push(`- License: ${stats.license}`);
  }
  if (stats.latestRelease) {
    lines.push(`- Latest Release: ${stats.latestRelease}`);
  }
  if (stats.contributorCount !== undefined) {
    lines.push(`- Contributors: ${formatCount(stats.contributorCount)}`);
  }

  lines.push("");
  lines.push("Design the stats section with:");
  lines.push("- A horizontal layout with icons and numbers");
  lines.push("- Subtle background to make stats stand out");
  lines.push("- Responsive design (stack on mobile if needed)");

  return lines.join("\n");
}

/**
 * Build logo and favicon requirements for AI prompt
 */
function buildAssetRequirements(config: SiteConfig): string {
  const parts: string[] = [];

  if (config.logo) {
    parts.push(`LOGO:
- Logo image path: ${config.logo.path}
- Alt text: ${config.logo.alt || config.logo.path}
- Display the logo in the header/navigation area
- Use appropriate sizing (e.g., h-8 or h-10 for header logos)`);
  }

  if (config.favicon) {
    parts.push(`FAVICON:
- Include this favicon link in the <head>: <link rel="icon" href="${config.favicon.path}">`);
  }

  return parts.length > 0 ? `${parts.join("\n\n")}\n\n` : "";
}

/**
 * Build SEO and OGP requirements for AI prompt
 */
function buildSeoRequirements(repoInfo: RepoInfo, config: SiteConfig): string {
  const seo = config.seo || {};

  // Use provided values or fallback to repo data
  const title = seo.title || repoInfo.name;
  const description = seo.description || repoInfo.description || "";
  const keywords = seo.keywords?.length
    ? seo.keywords.join(", ")
    : repoInfo.topics?.join(", ") || "";
  const ogUrl = seo.siteUrl || repoInfo.htmlUrl;
  // OGP requires absolute URL - combine with siteUrl if available
  const ogImagePath = seo.ogImage?.path || "";
  const ogImage =
    ogImagePath && seo.siteUrl
      ? `${seo.siteUrl.replace(/\/$/, "")}/${ogImagePath}`
      : ogImagePath;
  // Normalize Twitter handle to ensure @ prefix
  const twitterHandle = seo.twitterHandle
    ? seo.twitterHandle.startsWith("@")
      ? seo.twitterHandle
      : `@${seo.twitterHandle}`
    : "";
  const canonical = seo.siteUrl || "";

  return `SEO AND OPEN GRAPH REQUIREMENTS:
Generate these meta tags in the <head> section:

Required meta tags:
- <meta name="description" content="${description}">
${keywords ? `- <meta name="keywords" content="${keywords}">` : ""}
${canonical ? `- <link rel="canonical" href="${canonical}">` : ""}

Open Graph tags (for social media sharing):
- <meta property="og:title" content="${title}">
- <meta property="og:description" content="${description}">
- <meta property="og:url" content="${ogUrl}">
- <meta property="og:type" content="website">
${ogImage ? `- <meta property="og:image" content="${ogImage}">` : ""}

Twitter Card tags:
- <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
- <meta name="twitter:title" content="${title}">
- <meta name="twitter:description" content="${description}">
${ogImage ? `- <meta name="twitter:image" content="${ogImage}">` : ""}
${twitterHandle ? `- <meta name="twitter:site" content="${twitterHandle}">` : ""}

`;
}

/**
 * Build requirements string for refinement context
 */
function buildRequirements(
  repoInfo: RepoInfo,
  analysis: RepositoryAnalysis,
  design: DesignSystem,
  config: SiteConfig
): string {
  // Build theme-specific requirements
  const themeRequirements = config.theme.toggle
    ? buildDarkModeTogglePrompt(design, config.theme.mode)
    : buildSingleThemePrompt(design, config.theme.mode);

  // Build logo/favicon requirements
  const assetRequirements = buildAssetRequirements(config);

  // Build SEO requirements
  const seoRequirements = buildSeoRequirements(repoInfo, config);

  // Build stats requirements
  const statsRequirements = repoInfo.stats
    ? `${buildStatsRequirements(repoInfo.stats)}\n\n`
    : "";

  return `PROJECT INFO:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Type: ${analysis.projectType}
- Key Features: ${analysis.keyFeatures.join(", ") || "Various features"}
- GitHub URL: ${repoInfo.htmlUrl}

${themeRequirements}
${assetRequirements}${seoRequirements}${statsRequirements}REQUIREMENTS:
1. Use Tailwind CSS classes only (loaded via CDN)
2. Include: hero section with project name and description, features section, footer with GitHub link
3. Make it responsive (mobile-first)
4. Use modern design patterns (gradients, shadows, rounded corners)
5. Include smooth hover effects
6. No external images - use gradients or emoji as placeholders${config.logo ? " (except for the provided logo)" : ""}
7. Include a "View on GitHub" button linking to: ${repoInfo.htmlUrl}
8. The page should work standalone without any build step`;
}

async function analyzeRepository(
  repoInfo: RepoInfo,
  aiProvider: AIProviderInstance
): Promise<RepositoryAnalysis> {
  const prompt = `Analyze this GitHub repository and determine its characteristics.

Repository: ${repoInfo.name}
Description: ${repoInfo.description || "No description"}
Primary Language: ${repoInfo.language || "Unknown"}
Topics: ${repoInfo.topics?.join(", ") || "None"}
${repoInfo.readme ? `\nREADME (first 2000 chars):\n${repoInfo.readme.slice(0, 2000)}` : ""}

Respond with JSON only (no markdown, no code blocks):
{
  "name": "${repoInfo.name}",
  "description": "concise 1-sentence description",
  "projectType": "library|tool|webapp|docs|other",
  "primaryLanguage": "the main programming language",
  "audience": "developers|designers|general|enterprise",
  "style": "minimal|professional|creative|technical",
  "keyFeatures": ["feature1", "feature2", "feature3"]
}`;

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(cleanJsonResponse(result.text));
    // Validate and normalize the parsed result
    return {
      name: parsed.name || repoInfo.name,
      description:
        parsed.description || repoInfo.description || "A software project",
      projectType: validateProjectType(parsed.projectType),
      primaryLanguage: parsed.primaryLanguage || repoInfo.language || "Unknown",
      audience: validateAudience(parsed.audience),
      style: validateStyle(parsed.style),
      keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawPreview = result.text?.slice(0, 300) || "(empty response)";
    core.warning(
      `Failed to parse repository analysis: ${errorMessage}. ` +
        `Raw response: ${rawPreview}`
    );
    throw new Error(
      "Repository analysis failed: AI returned invalid JSON. " +
        `Please retry or check your API key. Error: ${errorMessage}`
    );
  }
}

function validateProjectType(value: unknown): ProjectType {
  const valid: ProjectType[] = ["library", "tool", "webapp", "docs", "other"];
  return valid.includes(value as ProjectType)
    ? (value as ProjectType)
    : "other";
}

function validateAudience(value: unknown): Audience {
  const valid: Audience[] = [
    "developers",
    "designers",
    "general",
    "enterprise",
  ];
  return valid.includes(value as Audience) ? (value as Audience) : "developers";
}

function validateStyle(value: unknown): Style {
  const valid: Style[] = ["minimal", "professional", "creative", "technical"];
  return valid.includes(value as Style) ? (value as Style) : "professional";
}

async function generateDesignSystem(
  analysis: RepositoryAnalysis,
  aiProvider: AIProviderInstance
): Promise<DesignSystem> {
  const prompt = `Create a design system for a ${analysis.projectType} project.

Project: ${analysis.name}
Description: ${analysis.description}
Audience: ${analysis.audience}
Style: ${analysis.style}

Generate a modern design system with BOTH light and dark mode color palettes.
Use Tailwind CSS color names (e.g., "blue-600", "gray-900").

Respond with JSON only (no markdown, no code blocks):
{
  "colors": {
    "light": {
      "primary": "blue-600",
      "secondary": "indigo-600",
      "accent": "purple-500",
      "background": "white",
      "text": "gray-900"
    },
    "dark": {
      "primary": "blue-400",
      "secondary": "indigo-400",
      "accent": "purple-400",
      "background": "gray-950",
      "text": "gray-50"
    }
  },
  "typography": {
    "headingFont": "Inter, system-ui, sans-serif",
    "bodyFont": "Inter, system-ui, sans-serif"
  },
  "layout": "hero-centered"
}`;

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.5,
  });

  try {
    const parsed = JSON.parse(cleanJsonResponse(result.text));
    // Validate the required structure
    if (!parsed.colors?.light || !parsed.colors?.dark || !parsed.typography) {
      throw new Error(
        "Missing required design system fields (colors.light, colors.dark, typography)"
      );
    }
    return parsed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const rawPreview = result.text?.slice(0, 200) || "(empty response)";
    core.warning(
      `Failed to parse design system: ${errorMessage}. Raw response: ${rawPreview}`
    );
    throw new Error(
      "Design system generation failed: AI returned invalid JSON. " +
        `Please retry or check your API key. Error: ${errorMessage}`
    );
  }
}

/**
 * Build prompt for single theme mode (no toggle)
 * Note: When mode is "auto" without toggle, falls back to "dark" for static generation
 */
function buildSingleThemePrompt(design: DesignSystem, mode: ThemeMode): string {
  let effectiveMode: "light" | "dark";
  if (mode === "auto") {
    core.warning(
      `Theme mode "auto" requires toggle to be enabled for dynamic switching. ` +
        `Falling back to "dark" mode for static generation.`
    );
    effectiveMode = "dark";
  } else {
    effectiveMode = mode;
  }
  const palette = design.colors[effectiveMode];

  return `DESIGN SYSTEM (${effectiveMode} mode):
- Primary color: ${palette.primary}
- Secondary color: ${palette.secondary}
- Accent color: ${palette.accent}
- Background: ${palette.background}
- Text: ${palette.text}
- Layout: ${design.layout}
- Fonts: ${design.typography.headingFont}`;
}

/**
 * Build prompt for dark mode toggle support
 */
function buildDarkModeTogglePrompt(
  design: DesignSystem,
  defaultMode: ThemeMode
): string {
  const light = design.colors.light;
  const dark = design.colors.dark;

  return `DESIGN SYSTEM (with Light/Dark mode toggle):

LIGHT MODE COLORS:
- Primary: ${light.primary}
- Secondary: ${light.secondary}
- Accent: ${light.accent}
- Background: ${light.background}
- Text: ${light.text}

DARK MODE COLORS:
- Primary: ${dark.primary}
- Secondary: ${dark.secondary}
- Accent: ${dark.accent}
- Background: ${dark.background}
- Text: ${dark.text}

Typography: ${design.typography.headingFont}
Layout: ${design.layout}
Default mode: ${defaultMode === "auto" ? "system preference" : defaultMode}

THEME TOGGLE REQUIREMENTS:
1. Use Tailwind's dark mode with class strategy: add "dark" class to <html> element
2. Configure Tailwind to use class-based dark mode in a <script> tag:
   tailwind.config = { darkMode: 'class' }
3. Add a theme toggle button in the header/nav area with sun/moon icons (use emoji or SVG)
4. Include this JavaScript for theme switching:
   - Check localStorage for saved theme preference
   - If no preference, check system preference (prefers-color-scheme)
   - Apply the theme by adding/removing "dark" class on <html>
   - Save preference to localStorage when user toggles
5. Use dark: prefix for dark mode styles (e.g., "bg-white dark:bg-gray-900")
6. Ensure smooth transition when switching themes (add transition classes)`;
}

async function generateIndexPage(
  repoInfo: RepoInfo,
  analysis: RepositoryAnalysis,
  design: DesignSystem,
  config: SiteConfig,
  aiProvider: AIProviderInstance
): Promise<string> {
  const customInstructions = config.prompts.siteInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${config.prompts.siteInstructions}`
    : "";

  // Build theme-specific prompt based on toggle setting
  const themePrompt = config.theme.toggle
    ? buildDarkModeTogglePrompt(design, config.theme.mode)
    : buildSingleThemePrompt(design, config.theme.mode);

  // Build logo/favicon requirements
  const assetRequirements = buildAssetRequirements(config);

  // Build SEO requirements
  const seoRequirements = buildSeoRequirements(repoInfo, config);

  // Build stats requirements
  const statsRequirements = repoInfo.stats
    ? `${buildStatsRequirements(repoInfo.stats)}\n\n`
    : "";

  const prompt = `Generate a modern, beautiful landing page HTML for this project.

PROJECT INFO:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Type: ${analysis.projectType}
- Key Features: ${analysis.keyFeatures.join(", ") || "Various features"}
- GitHub URL: ${repoInfo.htmlUrl}

${themePrompt}
${assetRequirements}${seoRequirements}${statsRequirements}REQUIREMENTS:
1. Use Tailwind CSS classes only (loaded via CDN)
2. Include: hero section with project name and description, features section, footer with GitHub link
3. Make it responsive (mobile-first)
4. Use modern design patterns (gradients, shadows, rounded corners)
5. Include smooth hover effects
6. No external images - use gradients or emoji as placeholders${config.logo ? " (except for the provided logo)" : ""}
7. Include a "View on GitHub" button linking to: ${repoInfo.htmlUrl}
8. The page should work standalone without any build step${customInstructions}

OUTPUT: Return ONLY the complete HTML document, no explanation. Start with <!DOCTYPE html>.`;

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.7,
  });

  let html = cleanHtmlResponse(result.text);

  // Validate that we got valid HTML
  if (!html || html.length < 100) {
    throw new Error(
      "Index page generation failed: AI returned empty or invalid response. " +
        `Response length: ${html?.length ?? 0} characters.`
    );
  }

  if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
    core.warning(
      "Generated HTML may be malformed: missing DOCTYPE or html tag. " +
        `Response preview: ${html.slice(0, 100)}...`
    );
  }

  // Repair incomplete HTML with warnings
  if (!html.includes("</html>")) {
    core.warning("Generated HTML was incomplete, adding missing closing tags.");
    html = `${html}\n</body>\n</html>`;
  }

  // Ensure Tailwind CDN is included
  if (!html.includes("tailwindcss")) {
    if (html.includes("</head>")) {
      html = html.replace(
        "</head>",
        `  <script src="https://cdn.tailwindcss.com"></script>\n  </head>`
      );
    } else {
      core.warning(
        "Generated HTML missing </head> tag, cannot inject Tailwind CDN."
      );
    }
  }

  return html;
}

/**
 * Generate sitemap.xml content
 * @param pages Array of generated pages (only .html files are included)
 * @param siteUrl Base URL for the site (required for absolute URLs)
 * @param options Sitemap options (changefreq, priority)
 * @returns XML string for sitemap.xml
 */
export function generateSitemap(
  pages: GeneratedPage[],
  siteUrl: string,
  options: { changefreq?: SitemapChangefreq; priority?: number } = {}
): string {
  const today = new Date().toISOString().split("T")[0];
  const changefreq = options.changefreq || "weekly";
  const priority = options.priority ?? 0.8;

  // Normalize siteUrl (remove trailing slash)
  const baseUrl = siteUrl.replace(/\/$/, "");

  const urls = pages
    .filter((page) => page.path.endsWith(".html"))
    .map((page) => {
      // Generate absolute URL
      const loc =
        page.path === "index.html"
          ? baseUrl
          : `${baseUrl}/${page.path.replace(/index\.html$/, "").replace(/\.html$/, "")}`;

      return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Generate robots.txt content
 * @param siteUrl Base URL for the site (used for sitemap reference)
 * @param options Options for robots.txt generation
 * @returns Text content for robots.txt
 */
export function generateRobots(
  siteUrl: string,
  options: {
    additionalRules?: string[];
    includeSitemap?: boolean;
  } = {}
): string {
  const { additionalRules = [], includeSitemap = true } = options;

  // Normalize siteUrl (remove trailing slash)
  const baseUrl = siteUrl.replace(/\/$/, "");

  const rules = ["User-agent: *", "Allow: /", ""];

  if (includeSitemap) {
    rules.push(`Sitemap: ${baseUrl}/sitemap.xml`);
  }

  // Filter out empty strings from additional rules
  const validAdditionalRules = additionalRules.filter(
    (rule) => rule.trim() !== ""
  );
  rules.push(...validAdditionalRules);

  return rules.join("\n");
}

/**
 * Build contributors section for AI prompt
 */
export function buildContributorsRequirements(
  contributors: Contributor[],
  repoInfo: RepoInfo
): string {
  const contributorsList = contributors
    .slice(0, 10) // Only include top 10 for prompt context
    .map(
      (c, i) =>
        `${i + 1}. ${c.login} (${c.contributions} contributions) - ${c.avatarUrl}`
    )
    .join("\n");

  return `CONTRIBUTORS DATA:
Total contributors: ${contributors.length}
Repository: ${repoInfo.name}

Top contributors:
${contributorsList}

All contributor data will be embedded in the HTML as a data attribute for the full list.`;
}

/**
 * Generate contributors page HTML
 */
export async function generateContributorsPage(
  repoInfo: RepoInfo,
  contributors: Contributor[],
  design: {
    colors: { light: ColorPalette; dark: ColorPalette };
    typography: { headingFont: string; bodyFont: string };
    layout: string;
  },
  config: SiteConfig,
  aiProvider: AIProviderInstance
): Promise<string> {
  // Build theme-specific prompt based on toggle setting
  const themePrompt = config.theme.toggle
    ? buildDarkModeTogglePrompt(design, config.theme.mode)
    : buildSingleThemePrompt(design, config.theme.mode);

  // Build SEO requirements for contributors page
  const seoRequirements = config.seo
    ? `SEO REQUIREMENTS:
- Page title: "Contributors - ${repoInfo.name}"
- Meta description: "Meet the contributors who build and maintain ${repoInfo.name}"
${config.seo.siteUrl ? `- Canonical URL: ${config.seo.siteUrl}/contributors` : ""}
`
    : "";

  // Build contributors data for prompt
  const contributorsPrompt = buildContributorsRequirements(
    contributors,
    repoInfo
  );

  const prompt = `Generate a beautiful contributors page HTML for this project.

PROJECT INFO:
- Name: ${repoInfo.name}
- Description: ${repoInfo.description || "A software project"}
- GitHub URL: ${repoInfo.htmlUrl}

${contributorsPrompt}

${themePrompt}

${seoRequirements}

DESIGN REQUIREMENTS:
1. Use Tailwind CSS classes only (loaded via CDN)
2. Create a responsive grid of contributor cards
3. Each contributor card should include:
   - Avatar image (use the avatarUrl from data)
   - Username (login) with link to profileUrl
   - Contribution count
4. Add a navigation header with:
   - Project name/logo linking to index.html
   - "Back to Home" button
5. Include a hero section with title "Contributors" and total count
6. Make it responsive (mobile-first): 1 column on mobile, 2 on tablet, 3-4 on desktop
7. Use modern design patterns matching the main site
8. Include smooth hover effects on contributor cards
9. Add a footer with GitHub link

CONTRIBUTOR DATA TO EMBED:
Generate the page with all ${contributors.length} contributors embedded directly in the HTML.
Use this exact data for each contributor:
${JSON.stringify(
  contributors.map((c) => ({
    login: c.login,
    avatarUrl: c.avatarUrl,
    profileUrl: c.profileUrl,
    contributions: c.contributions,
  })),
  null,
  2
)}

OUTPUT: Return ONLY the complete HTML document, no explanation. Start with <!DOCTYPE html>.`;

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.7,
  });

  let html = cleanHtmlResponse(result.text);

  // Validate that we got valid HTML
  if (!html || html.length < 100) {
    throw new Error(
      "Contributors page generation failed: AI returned empty or invalid response. " +
        `Response length: ${html?.length ?? 0} characters.`
    );
  }

  if (!html.includes("<!DOCTYPE html>") && !html.includes("<html")) {
    core.warning(
      "Generated contributors HTML may be malformed: missing DOCTYPE or html tag. " +
        `Response preview: ${html.slice(0, 100)}...`
    );
  }

  // Repair incomplete HTML with warnings
  if (!html.includes("</html>")) {
    core.warning(
      "Generated contributors HTML was incomplete, adding missing closing tags."
    );
    html = `${html}\n</body>\n</html>`;
  }

  // Ensure Tailwind CDN is included
  if (!html.includes("tailwindcss")) {
    if (html.includes("</head>")) {
      html = html.replace(
        "</head>",
        `  <script src="https://cdn.tailwindcss.com"></script>\n  </head>`
      );
    } else {
      core.warning(
        "Generated contributors HTML missing </head> tag, cannot inject Tailwind CDN."
      );
    }
  }

  return html;
}
