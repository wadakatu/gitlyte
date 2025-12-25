/**
 * Section-Based Site Generator
 *
 * Generates sites by:
 * 1. Analyzing repository to determine needed sections
 * 2. Generating design system (shared across sections)
 * 3. Generating each section in parallel
 * 4. Assembling final HTML
 */

import type { AIProviderInstance } from "../utils/ai-provider.js";
import { cleanJsonResponse } from "../utils/ai-response-cleaner.js";
import type { ThemeMode } from "../types/v2-config.js";
import type {
  RepositoryAnalysis,
  DesignSystem,
  ColorPalette,
} from "./v2-site-generator.js";

/**
 * Available section types
 */
export type SectionType =
  | "hero"
  | "features"
  | "installation"
  | "usage"
  | "api"
  | "screenshots"
  | "testimonials"
  | "pricing"
  | "faq"
  | "cta"
  | "footer";

/**
 * Section analysis result
 */
export interface SectionPlan {
  sections: SectionType[];
  reasoning: string;
  /** Indicates if fallback sections were used due to parsing error */
  usedFallback?: boolean;
}

/**
 * Generated section content
 */
export interface GeneratedSection {
  type: SectionType;
  html: string;
  order: number;
}

/**
 * Section generation context passed to each section generator
 */
export interface SectionContext {
  analysis: RepositoryAnalysis;
  design: DesignSystem;
  repoInfo: {
    name: string;
    description: string;
    readme?: string;
    url: string;
  };
  themeMode: ThemeMode;
}

/**
 * Analyze repository and determine which sections are needed
 */
export async function analyzeSections(
  analysis: RepositoryAnalysis,
  readme: string | undefined,
  aiProvider: AIProviderInstance
): Promise<SectionPlan> {
  const prompt = `Analyze this project and determine which website sections are needed.

PROJECT INFO:
- Name: ${analysis.name}
- Description: ${analysis.description}
- Type: ${analysis.projectType}
- Audience: ${analysis.audience}
- Key Features: ${analysis.keyFeatures.join(", ")}

README PREVIEW (if available):
${readme ? readme.slice(0, 1500) : "No README available"}

AVAILABLE SECTIONS:
- hero: Main banner with tagline and CTA buttons (ALWAYS include)
- features: Key features/benefits grid
- installation: How to install/get started (for libraries/tools)
- usage: Code examples and usage patterns
- api: API reference highlights
- screenshots: Visual demos (for webapps)
- testimonials: User quotes (if mentioned in README)
- pricing: Pricing tiers (if commercial)
- faq: Frequently asked questions
- cta: Call-to-action before footer
- footer: Site footer with links (ALWAYS include)

RULES:
1. Always include "hero" and "footer"
2. Include "installation" for libraries/tools
3. Include "features" if project has clear features
4. Maximum 6 sections total for clean design
5. Order sections logically

Respond with JSON only:
{
  "sections": ["hero", "features", ...],
  "reasoning": "Brief explanation of why these sections were chosen"
}`;

  const result = await aiProvider.generateText({
    prompt,
    taskType: "analysis",
  });

  try {
    const parsed = JSON.parse(cleanJsonResponse(result.text)) as SectionPlan;
    // Ensure hero and footer are always present
    if (!parsed.sections.includes("hero")) {
      parsed.sections.unshift("hero");
    }
    if (!parsed.sections.includes("footer")) {
      parsed.sections.push("footer");
    }
    return { ...parsed, usedFallback: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `[section-generator] Failed to parse section analysis: ${errorMessage}` +
        `\n  Raw response (first 200 chars): ${result.text?.slice(0, 200)}`
    );
    // Fallback to safe defaults
    return {
      sections: ["hero", "features", "installation", "footer"],
      reasoning: "Using default sections due to parsing error",
      usedFallback: true,
    };
  }
}

/**
 * Section-specific prompts
 */
const SECTION_PROMPTS: Record<SectionType, string> = {
  hero: `Generate a hero section with:
- Attention-grabbing headline
- Concise tagline/description
- Primary CTA button (e.g., "Get Started", "Install")
- Secondary CTA button (e.g., "View on GitHub", "Learn More")
- Optional decorative elements (gradients, shapes)`,

  features: `Generate a features section with:
- Section heading
- 3-6 feature cards in a grid
- Each card: icon (use emoji), title, description
- Hover effects on cards`,

  installation: `Generate an installation section with:
- Section heading
- Package manager commands (npm, yarn, pnpm)
- Styled code blocks with copy-friendly formatting
- Brief "next steps" text`,

  usage: `Generate a usage/examples section with:
- Section heading
- 2-3 code examples with syntax highlighting styling
- Brief explanations for each example`,

  api: `Generate an API reference section with:
- Section heading
- Key API methods/functions in a table or card format
- Brief descriptions and signatures`,

  screenshots: `Generate a screenshots/demo section with:
- Section heading
- Placeholder boxes styled as screenshot containers
- Captions for each screenshot area`,

  testimonials: `Generate a testimonials section with:
- Section heading
- 2-3 testimonial cards
- Each card: quote, author name, role/company
- Styled quote marks`,

  pricing: `Generate a pricing section with:
- Section heading
- 2-3 pricing tier cards
- Each card: tier name, price, feature list, CTA button
- Highlight "popular" tier if applicable`,

  faq: `Generate a FAQ section with:
- Section heading
- 4-6 Q&A items
- Collapsible styling (visual only, no JS required)`,

  cta: `Generate a call-to-action section with:
- Compelling headline
- Brief supporting text
- Primary action button
- Background gradient or pattern`,

  footer: `Generate a footer section with:
- Logo/project name
- Navigation links (Home, Docs, GitHub)
- Copyright notice
- Social links placeholder`,
};

/** Default color palettes for fallback */
const DEFAULT_PALETTES: Record<ThemeMode, ColorPalette> = {
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
};

/**
 * Get color palette for the current theme mode with fallback
 */
function getPalette(design: DesignSystem, themeMode: ThemeMode): ColorPalette {
  const palette = design.colors[themeMode];
  if (!palette) {
    console.warn(
      `[section-generator] Missing color palette for mode "${themeMode}", using fallback`
    );
    return DEFAULT_PALETTES[themeMode];
  }
  return palette;
}

/**
 * Generate a single section
 */
export async function generateSection(
  sectionType: SectionType,
  context: SectionContext,
  order: number,
  aiProvider: AIProviderInstance
): Promise<GeneratedSection> {
  const sectionPrompt = SECTION_PROMPTS[sectionType];
  const palette = getPalette(context.design, context.themeMode);

  const prompt = `Generate ONLY the HTML for a ${sectionType} section.

PROJECT: ${context.analysis.name}
DESCRIPTION: ${context.analysis.description}
PROJECT TYPE: ${context.analysis.projectType}
KEY FEATURES: ${context.analysis.keyFeatures.join(", ")}

DESIGN SYSTEM (${context.themeMode} mode):
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}
- Background: ${palette.background}
- Text: ${palette.text}

SECTION REQUIREMENTS:
${sectionPrompt}

TECHNICAL REQUIREMENTS:
1. Use Tailwind CSS classes only
2. Make it responsive (mobile-first)
3. Use semantic HTML (section, article, etc.)
4. Include smooth hover transitions
5. Use the design system colors consistently
6. No external images - use gradients, emojis, or SVG icons

OUTPUT: Return ONLY the <section> element HTML. No explanation, no markdown code blocks.
Start with <section and end with </section>.`;

  const result = await aiProvider.generateText({
    prompt,
    taskType: "content",
    maxOutputTokens: 2000, // Sections are much smaller than full pages
  });

  let html = result.text.trim();

  // Clean up markdown code blocks if present
  html = html.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "");

  // Ensure it's wrapped in a section tag
  if (!html.startsWith("<section")) {
    html = `<section class="py-16 px-4">\n${html}\n</section>`;
  }

  // Add section id for navigation
  if (!html.includes("id=")) {
    html = html.replace("<section", `<section id="${sectionType}"`);
  }

  return {
    type: sectionType,
    html,
    order,
  };
}

/**
 * Generate all sections in parallel
 */
export async function generateSectionsParallel(
  sectionPlan: SectionPlan,
  context: SectionContext,
  aiProvider: AIProviderInstance
): Promise<GeneratedSection[]> {
  const sectionPromises = sectionPlan.sections.map((sectionType, index) =>
    generateSection(sectionType, context, index, aiProvider)
  );

  const sections = await Promise.all(sectionPromises);

  // Sort by order to maintain correct sequence
  return sections.sort((a, b) => a.order - b.order);
}

/**
 * Assemble sections into a complete HTML document
 */
export function assembleHtml(
  sections: GeneratedSection[],
  context: SectionContext,
  config: { favicon?: { path: string }; logo?: { path: string; alt?: string } }
): string {
  const { analysis, design, themeMode } = context;
  const palette = getPalette(design, themeMode);

  // Theme-specific styles
  const isDark = themeMode === "dark";
  const navBgClass = isDark
    ? "bg-gray-900/90 border-gray-800"
    : "bg-white/90 border-gray-200";
  const githubButtonTextClass = isDark ? "text-gray-900" : "text-white";

  // Generate navigation based on sections
  const navLinks = sections
    .filter((s) => s.type !== "footer")
    .map(
      (s) =>
        `<a href="#${s.type}" class="text-${palette.text} hover:text-${palette.primary} transition-colors capitalize">${s.type}</a>`
    )
    .join("\n            ");

  const sectionsHtml = sections.map((s) => s.html).join("\n\n  ");

  const faviconLink = config.favicon?.path
    ? `<link rel="icon" href="${config.favicon.path}" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${analysis.name} - ${analysis.description}</title>
  <meta name="description" content="${analysis.description}">
  <script src="https://cdn.tailwindcss.com"></script>
  ${faviconLink}
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${palette.primary}',
            secondary: '${palette.secondary}',
            accent: '${palette.accent}',
          }
        }
      }
    }
  </script>
  <style>
    html { scroll-behavior: smooth; }
  </style>
</head>
<body class="bg-${palette.background} text-${palette.text}">
  <!-- Navigation -->
  <nav class="fixed top-0 left-0 right-0 ${navBgClass} backdrop-blur-sm border-b z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <a href="#" class="text-xl font-bold text-${palette.primary}">${analysis.name}</a>
        <div class="hidden md:flex space-x-8">
          ${navLinks}
        </div>
        <a href="${context.repoInfo.url}" target="_blank" rel="noopener" class="inline-flex items-center px-4 py-2 bg-${palette.primary} ${githubButtonTextClass} rounded-lg hover:opacity-90 transition-opacity">
          GitHub
        </a>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="pt-16">
  ${sectionsHtml}
  </main>
</body>
</html>`;

  return html;
}
