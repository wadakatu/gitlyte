import type { RepoData } from "../types.js";
import type { DesignStrategy, RepoAnalysis } from "./ai-analyzer.js";
import {
  analyzeRepositoryContent,
  type ContentAnalysis,
} from "./content-analyzer.js";

// Define types locally for now (will be moved to shared package later)
export interface AIGeneratedContent {
  hero: HeroContent;
  features: FeaturesContent;
  stats: StatsContent;
  metadata: SiteMetadata;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  badge?: {
    text: string;
    emoji?: string;
  };
  ctaButtons: CTAButton[];
}

export interface CTAButton {
  text: string;
  url: string;
  type: "primary" | "secondary";
  emoji?: string;
}

export interface FeaturesContent {
  sectionTitle: string;
  sectionSubtitle: string;
  features: Feature[];
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
  highlight?: string;
}

export interface StatsContent {
  stats: StatItem[];
}

export interface StatItem {
  value: string | number;
  label: string;
  emoji?: string;
  source: "github" | "custom";
}

export interface SiteMetadata {
  title: string;
  description: string;
  githubUrl?: string;
  logoUrl?: string;
  theme: ThemeVariant;
}

export interface ThemeVariant {
  colorScheme: "primary" | "secondary" | "accent" | "custom";
  style: "minimal" | "modern" | "gradient" | "glassmorphism";
  layout: "hero-focused" | "minimal" | "grid" | "sidebar" | "content-heavy";
}

export interface GeneratedSiteContent {
  content: AIGeneratedContent;
  packageJson: string;
  astroConfig: string;
  indexPage: string;
  docsPage?: string;
  globalStyles: string;
}

/**
 * Generate AI content for site templates instead of complete components
 */
export async function generateSiteContent(
  repoData: RepoData,
  analysis: RepoAnalysis,
  design: DesignStrategy
): Promise<GeneratedSiteContent> {
  // Analyze repository content for better feature extraction
  const contentAnalysis = await analyzeRepositoryContent(repoData, analysis);

  // Generate structured content data
  const content: AIGeneratedContent = {
    hero: await generateHeroContent(repoData, analysis, design),
    features: await generateFeaturesContent(
      repoData,
      analysis,
      contentAnalysis
    ),
    stats: generateStatsContent(repoData),
    metadata: generateSiteMetadata(repoData, analysis, design),
  };

  // Generate supporting files (these remain similar to original)
  const packageJson = generatePackageJson(repoData);
  const astroConfig = generateAstroConfig();
  const indexPage = generateIndexPageTemplate(content, repoData);
  const docsPage = generateDocsPageTemplate(content, repoData);
  const globalStyles = generateGlobalStyles(design);

  return {
    content,
    packageJson,
    astroConfig,
    indexPage,
    docsPage,
    globalStyles,
  };
}

/**
 * Generate hero section content using AI
 */
async function generateHeroContent(
  repoData: RepoData,
  analysis: RepoAnalysis,
  _design: DesignStrategy
): Promise<HeroContent> {
  const prompt = `Based on this ${analysis.projectType} project "${repoData.repo.name}", generate compelling hero section content.

Project Context:
- Type: ${analysis.projectType}
- Tech Stack: ${analysis.techStack.join(", ")}
- Audience: ${analysis.audience}
- Tone: ${analysis.tone}
- Description: ${repoData.repo.description || "No description provided"}

Create hero content that:
1. Has a compelling title (different from repo name if needed)
2. Has a clear subtitle explaining the value proposition
3. Has a longer description explaining what it does
4. Includes 2-3 CTA buttons (primary: "Get Started", secondary options like "Documentation", "GitHub", "Demo")
5. Optional: Add a release badge if appropriate

Return JSON format:
{
  "title": "Compelling project title",
  "subtitle": "Clear value proposition in one line",
  "description": "More detailed explanation of what this project does and why it's valuable",
  "badge": {
    "text": "Latest Release v1.0",
    "emoji": "🚀"
  },
  "ctaButtons": [
    {
      "text": "Get Started",
      "url": "#features",
      "type": "primary",
      "emoji": "🚀"
    },
    {
      "text": "Documentation", 
      "url": "#docs",
      "type": "secondary",
      "emoji": "📖"
    }
  ]
}`;

  try {
    // Simulate AI call - replace with actual OpenAI API call
    const response = await simulateAIResponse(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error("Failed to generate hero content:", error);
    return getFallbackHeroContent(repoData);
  }
}

/**
 * Generate features section content using AI
 */
async function generateFeaturesContent(
  repoData: RepoData,
  analysis: RepoAnalysis,
  contentAnalysis: ContentAnalysis
): Promise<FeaturesContent> {
  const prompt = `Based on this ${analysis.projectType} project, generate a features section.

Project Context:
- Type: ${analysis.projectType}
- Tech Stack: ${analysis.techStack.join(", ")}
- Key Features: ${contentAnalysis.features.core
    .slice(0, 3)
    .map((f) => f.name)
    .join(", ")}
- Highlights: ${contentAnalysis.features.highlights
    .slice(0, 3)
    .map((h) => h.title)
    .join(", ")}

Create features content with:
1. Section title and subtitle
2. 3-4 key features with icons (emojis), titles, descriptions, and highlights
3. Focus on benefits, not just technical details

Return JSON format:
{
  "sectionTitle": "Why Choose This Project?",
  "sectionSubtitle": "Discover what makes this project special",
  "features": [
    {
      "title": "Feature Name",
      "description": "Benefit-focused description",
      "icon": "⚡",
      "highlight": "10x faster"
    }
  ]
}`;

  try {
    const response = await simulateAIResponse(prompt);
    return JSON.parse(response);
  } catch (error) {
    console.error("Failed to generate features content:", error);
    return getFallbackFeaturesContent(repoData, analysis);
  }
}

/**
 * Generate stats content from repo data
 */
function generateStatsContent(repoData: RepoData): StatsContent {
  const stats: StatItem[] = [];

  if (repoData.repo.stargazers_count > 0) {
    stats.push({
      value: repoData.repo.stargazers_count.toLocaleString(),
      label: "Stars",
      emoji: "⭐",
      source: "github",
    });
  }

  if (repoData.repo.forks_count > 0) {
    stats.push({
      value: repoData.repo.forks_count.toLocaleString(),
      label: "Forks",
      emoji: "🍴",
      source: "github",
    });
  }

  stats.push({
    value: repoData.issues.length,
    label: "Issues",
    emoji: "📊",
    source: "github",
  });

  return { stats };
}

/**
 * Generate site metadata
 */
function generateSiteMetadata(
  repoData: RepoData,
  analysis: RepoAnalysis,
  design: DesignStrategy
): SiteMetadata {
  const theme: ThemeVariant = {
    colorScheme: design.colorScheme?.primary ? "primary" : "accent",
    style: (["minimal", "modern", "gradient", "glassmorphism"].includes(
      design.style || "minimal"
    )
      ? design.style
      : "minimal") as "minimal" | "modern" | "gradient" | "glassmorphism",
    layout: design.layout || "hero-focused",
  };

  return {
    title: repoData.repo.name,
    description:
      repoData.repo.description || `A ${analysis.projectType} project`,
    githubUrl: repoData.repo.html_url,
    logoUrl: undefined, // Will be detected separately
    theme,
  };
}

/**
 * Generate index page that uses template components
 */
function generateIndexPageTemplate(
  content: AIGeneratedContent,
  repoData: RepoData
): string {
  const layoutComponent =
    content.metadata.theme.layout === "minimal"
      ? "MinimalTemplate"
      : "HeroFocusedTemplate";

  return `---
import ${layoutComponent} from '@gitlyte/shared/components/Templates/${layoutComponent}.astro';
import type { AIGeneratedContent } from '@gitlyte/shared';

// Generated content data
const content: AIGeneratedContent = ${JSON.stringify(content, null, 2)};

const repoData = {
  title: "${repoData.repo.name}",
  description: "${repoData.repo.description || ""}",
  stats: {
    stars: ${repoData.repo.stargazers_count},
    forks: ${repoData.repo.forks_count},
    issues: ${repoData.issues.length}
  },
  repoUrl: "${repoData.repo.html_url}",
  logoUrl: undefined,
  hasReadme: ${Boolean(repoData.readme)},
  hasLogo: false
};

const customization = {
  enableAnimations: true,
  showGithubStats: true,
  enableGradients: ${content.metadata.theme.style === "gradient"}
};
---

<${layoutComponent} 
  content={content}
  repoData={repoData}
  customization={customization}
/>`;
}

/**
 * Generate docs page template
 */
function generateDocsPageTemplate(
  content: AIGeneratedContent,
  repoData: RepoData
): string {
  return `---
import BaseLayout from '@gitlyte/shared/components/Layout/BaseLayout.astro';
import HeroFocusedDocs from '@gitlyte/shared/components/Docs/HeroFocusedDocs.astro';

const repoData = {
  title: "${repoData.repo.name}",
  description: "${repoData.repo.description || ""}",
  stats: {
    stars: ${repoData.repo.stargazers_count},
    forks: ${repoData.repo.forks_count},
    issues: ${repoData.issues.length}
  },
  repoUrl: "${repoData.repo.html_url}",
};
---

<BaseLayout 
  title={\`\${repoData.title} - Documentation\`}
  description="Documentation and guides"
  repoData={repoData}
  layoutType="${content.metadata.theme.layout}"
>
  <HeroFocusedDocs 
    title={repoData.title}
    description={repoData.description}
    githubUrl={repoData.repoUrl}
  />
</BaseLayout>`;
}

// Utility functions remain similar to original implementation
function generatePackageJson(repoData: RepoData): string {
  return JSON.stringify(
    {
      name: `${repoData.repo.name.toLowerCase().replace(/\s+/g, "-")}-site`,
      type: "module",
      version: "0.0.1",
      scripts: {
        dev: "astro dev",
        start: "astro dev",
        build: "astro build",
        preview: "astro preview",
      },
      dependencies: {
        astro: "^4.0.0",
        "@gitlyte/shared": "workspace:*",
      },
    },
    null,
    2
  );
}

function generateAstroConfig(): string {
  return `import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://your-username.github.io',
  base: '/your-repo-name',
  outDir: './docs',
  build: {
    assets: 'assets'
  }
});`;
}

function generateGlobalStyles(design: DesignStrategy): string {
  return `/* Global styles generated from design strategy */
:root {
  --color-primary: ${design.colorScheme?.primary || "#3b82f6"};
  --color-secondary: ${design.colorScheme?.secondary || "#8b5cf6"};
  --color-accent: ${design.colorScheme?.accent || "#06b6d4"};
  
  /* Additional design system variables */
  --font-heading: ${design.typography?.heading || "Inter, sans-serif"};
  --font-body: ${design.typography?.body || "Inter, sans-serif"};
  
  /* Effects */
  --enable-blur: ${design.style === "glassmorphism" ? "blur(10px)" : "none"};
  --shadow-style: ${design.style === "modern" ? "0 20px 25px -5px rgba(0, 0, 0, 0.1)" : "0 1px 3px rgba(0, 0, 0, 0.1)"};
}

/* Base typography and layout styles */
body {
  font-family: var(--font-body);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}`;
}

// Fallback content functions
function getFallbackHeroContent(repoData: RepoData): HeroContent {
  return {
    title: repoData.repo.name,
    subtitle: "A powerful open source project",
    description:
      repoData.repo.description ||
      "Discover what makes this project special and how it can help you build amazing things.",
    badge: {
      text: "Latest Release",
      emoji: "🚀",
    },
    ctaButtons: [
      {
        text: "Get Started",
        url: "#features",
        type: "primary",
        emoji: "🚀",
      },
      {
        text: "Documentation",
        url: "#docs",
        type: "secondary",
        emoji: "📖",
      },
      {
        text: "GitHub",
        url: repoData.repo.html_url || "#",
        type: "secondary",
        emoji: "🔗",
      },
    ],
  };
}

function getFallbackFeaturesContent(
  _repoData: RepoData,
  _analysis: RepoAnalysis
): FeaturesContent {
  return {
    sectionTitle: "Why Choose This Project?",
    sectionSubtitle:
      "Discover the powerful features that make this project stand out",
    features: [
      {
        title: "High Performance",
        description: "Optimized for speed and efficiency",
        icon: "⚡",
        highlight: "Lightning fast",
      },
      {
        title: "Easy to Use",
        description: "Simple API and great documentation",
        icon: "🔧",
        highlight: "5-minute setup",
      },
      {
        title: "Well Documented",
        description: "Comprehensive guides and examples",
        icon: "📚",
        highlight: "100% coverage",
      },
    ],
  };
}

// Placeholder for AI simulation - replace with actual OpenAI API
async function simulateAIResponse(prompt: string): Promise<string> {
  // This would be replaced with actual OpenAI API call
  // For now, return structured fallback based on prompt analysis

  if (prompt.includes("hero section")) {
    return JSON.stringify({
      title: "Next-Generation Development Tool",
      subtitle: "Build faster, deploy easier, scale infinitely",
      description:
        "A comprehensive solution that streamlines your development workflow with powerful automation, intelligent insights, and seamless integrations.",
      badge: {
        text: "Latest Release v2.0",
        emoji: "🚀",
      },
      ctaButtons: [
        {
          text: "Get Started",
          url: "#features",
          type: "primary",
          emoji: "🚀",
        },
        {
          text: "Documentation",
          url: "#docs",
          type: "secondary",
          emoji: "📖",
        },
        {
          text: "GitHub",
          url: "#github",
          type: "secondary",
          emoji: "🔗",
        },
      ],
    });
  }

  if (prompt.includes("features section")) {
    return JSON.stringify({
      sectionTitle: "Powerful Features Built for Developers",
      sectionSubtitle:
        "Everything you need to build, deploy, and scale your applications",
      features: [
        {
          title: "Lightning Fast Performance",
          description:
            "Optimized algorithms and smart caching deliver blazing fast results",
          icon: "⚡",
          highlight: "10x faster",
        },
        {
          title: "Developer Experience",
          description:
            "Intuitive APIs, excellent documentation, and helpful tooling",
          icon: "🛠️",
          highlight: "5-min setup",
        },
        {
          title: "Enterprise Ready",
          description:
            "Built for scale with security, reliability, and enterprise features",
          icon: "🏢",
          highlight: "99.9% uptime",
        },
        {
          title: "Open Source",
          description:
            "Fully open source with an active community and transparent development",
          icon: "🌟",
          highlight: "MIT License",
        },
      ],
    });
  }

  throw new Error("Simulation not implemented for this prompt type");
}
