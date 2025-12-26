/**
 * Simplified Site Generator for GitHub Action
 *
 * A standalone version of the site generator that works without Probot dependencies.
 */

import * as core from "@actions/core";
import type { AIProviderInstance } from "./ai-provider.js";
import { selfRefine } from "./self-refine.js";
import { cleanJsonResponse, cleanHtmlResponse } from "./ai-response-utils.js";

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

  core.info("Site generation complete!");

  return {
    pages: [{ path: "index.html", html: indexHtml }],
    assets: [],
  };
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

  return `PROJECT INFO:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Type: ${analysis.projectType}
- Key Features: ${analysis.keyFeatures.join(", ") || "Various features"}
- GitHub URL: ${repoInfo.htmlUrl}

${themeRequirements}
${assetRequirements}${seoRequirements}REQUIREMENTS:
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

  const prompt = `Generate a modern, beautiful landing page HTML for this project.

PROJECT INFO:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Type: ${analysis.projectType}
- Key Features: ${analysis.keyFeatures.join(", ") || "Various features"}
- GitHub URL: ${repoInfo.htmlUrl}

${themePrompt}
${assetRequirements}${seoRequirements}REQUIREMENTS:
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
