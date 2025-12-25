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
  theme: { mode: "light" | "dark" };
  prompts: { siteInstructions?: string };
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
  console.log("[gitlyte-action] Starting site generation...");

  // Step 1: Analyze repository
  console.log("[gitlyte-action] Analyzing repository...");
  const analysis = await analyzeRepository(repoInfo, aiProvider);

  // Step 2: Generate design system
  console.log("[gitlyte-action] Generating design system...");
  const design = await generateDesignSystem(analysis, aiProvider);

  // Step 3: Generate index page
  console.log("[gitlyte-action] Generating index page...");
  const indexHtml = await generateIndexPage(
    repoInfo,
    analysis,
    design,
    config,
    aiProvider
  );

  console.log("[gitlyte-action] Site generation complete!");

  return {
    pages: [{ path: "index.html", html: indexHtml }],
    assets: [],
  };
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
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `[gitlyte-action] Failed to parse repository analysis: ${errorMessage}. Using fallback values.`,
      `\n  Raw response (first 200 chars): ${result.text?.slice(0, 200)}`
    );
    return {
      name: repoInfo.name,
      description: repoInfo.description || "A software project",
      projectType: "other",
      primaryLanguage: repoInfo.language || "Unknown",
      audience: "developers",
      style: "professional",
      keyFeatures: [],
    };
  }
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
    return JSON.parse(cleanJsonResponse(result.text));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `[gitlyte-action] Failed to parse design system: ${errorMessage}. Using fallback values.`,
      `\n  Raw response (first 200 chars): ${result.text?.slice(0, 200)}`
    );
    return {
      colors: {
        light: {
          primary: "blue-600",
          secondary: "indigo-600",
          accent: "purple-500",
          background: "white",
          text: "gray-900",
        },
        dark: {
          primary: "blue-400",
          secondary: "indigo-400",
          accent: "purple-400",
          background: "gray-950",
          text: "gray-50",
        },
      },
      typography: {
        headingFont: "Inter, system-ui, sans-serif",
        bodyFont: "Inter, system-ui, sans-serif",
      },
      layout: "hero-centered",
    };
  }
}

async function generateIndexPage(
  repoInfo: RepoInfo,
  analysis: RepositoryAnalysis,
  design: DesignSystem,
  config: SiteConfig,
  aiProvider: AIProviderInstance
): Promise<string> {
  const palette = design.colors[config.theme.mode];
  const customInstructions = config.prompts.siteInstructions
    ? `\n\nADDITIONAL INSTRUCTIONS:\n${config.prompts.siteInstructions}`
    : "";

  const prompt = `Generate a modern, beautiful landing page HTML for this project.

PROJECT INFO:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Type: ${analysis.projectType}
- Key Features: ${analysis.keyFeatures.join(", ") || "Various features"}
- GitHub URL: ${repoInfo.htmlUrl}

DESIGN SYSTEM (${config.theme.mode} mode):
- Primary color: ${palette.primary}
- Secondary color: ${palette.secondary}
- Accent color: ${palette.accent}
- Background: ${palette.background}
- Text: ${palette.text}
- Layout: ${design.layout}
- Fonts: ${design.typography.headingFont}

REQUIREMENTS:
1. Use Tailwind CSS classes only (loaded via CDN)
2. Include: hero section with project name and description, features section, footer with GitHub link
3. Make it responsive (mobile-first)
4. Use modern design patterns (gradients, shadows, rounded corners)
5. Include smooth hover effects
6. No external images - use gradients or emoji as placeholders
7. Include a "View on GitHub" button linking to: ${repoInfo.htmlUrl}
8. The page should work standalone without any build step${customInstructions}

OUTPUT: Return ONLY the complete HTML document, no explanation. Start with <!DOCTYPE html>.`;

  const result = await aiProvider.generateText({
    prompt,
    temperature: 0.7,
  });

  let html = cleanHtmlResponse(result.text);

  // Ensure HTML is complete
  if (!html.includes("</html>")) {
    html = `${html}\n</body>\n</html>`;
  }

  // Ensure Tailwind CDN is included
  if (!html.includes("tailwindcss")) {
    html = html.replace(
      "</head>",
      `  <script src="https://cdn.tailwindcss.com"></script>\n  </head>`
    );
  }

  return html;
}

/**
 * Clean JSON response from AI (remove markdown code blocks)
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
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
function cleanHtmlResponse(text: string): string {
  let cleaned = text.trim();

  // Remove markdown code blocks
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
