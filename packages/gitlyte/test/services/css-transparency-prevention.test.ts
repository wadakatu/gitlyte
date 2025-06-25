import { describe, expect, it } from "vitest";
import type {
  DesignStrategy,
  RepoAnalysis,
} from "../../services/ai-analyzer.js";
import { generateAstroSite } from "../../services/ai-code-generator.js";
import type { RepoData } from "../../types.js";

describe("CSS Transparency Prevention", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "test/test-repo",
      description: "A test repository",
      html_url: "https://github.com/test/test-repo",
      stargazers_count: 100,
      forks_count: 50,
      language: "TypeScript",
      updated_at: "2024-01-01T00:00:00Z",
      created_at: "2023-01-01T00:00:00Z",
      pushed_at: "2024-01-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: null,
      topics: [],
    },
    prs: [],
    issues: [],
    readme: "# Test Repository\n\nThis is a test repository.",
  };

  const mockAnalysis: RepoAnalysis = {
    projectType: "library",
    techStack: ["TypeScript", "React"],
    primaryLanguage: "TypeScript",
    activity: "high",
    audience: "developer",
    purpose: "Testing AI code generation",
    tone: "professional",
    complexity: "moderate",
  };

  const mockDesign: DesignStrategy = {
    colorScheme: {
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#3b82f6",
      background: "#ffffff",
    },
    typography: {
      heading: "Inter, sans-serif",
      body: "system-ui, sans-serif",
      code: "JetBrains Mono, monospace",
    },
    layout: "hero-focused",
    style: "modern",
    animations: true,
    darkMode: false,
    effects: {
      blur: true,
      shadows: "subtle",
      borders: "rounded",
      spacing: "normal",
    },
  };

  it("should not have transparent text due to webkit-text-fill-color with CSS variables", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that -webkit-text-fill-color: transparent is only used with actual color values, not CSS variables
    const transparentWebkitPatterns = [
      /-webkit-text-fill-color:\s*transparent/g,
    ];

    transparentWebkitPatterns.forEach((pattern) => {
      const matches = result.heroComponent.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          // Find the surrounding context of each match
          const matchIndex = result.heroComponent.indexOf(match);
          const contextStart = Math.max(0, matchIndex - 200);
          const contextEnd = Math.min(
            result.heroComponent.length,
            matchIndex + 200
          );
          const context = result.heroComponent.slice(contextStart, contextEnd);

          // Check that the context contains actual color values (hex colors) not CSS variables
          const hasHexColors = /#[0-9a-fA-F]{3,8}/.test(context);
          const hasCssVariables = /var\(--[^)]+\)/.test(context);

          // If using webkit-text-fill-color: transparent, ensure it's with hex colors not CSS variables
          if (hasCssVariables && !hasHexColors) {
            throw new Error(
              `Found webkit-text-fill-color: transparent with CSS variables instead of actual color values in context: ${context}`
            );
          }
        });
      }
    });
  });

  it("should have fallback colors for gradient text effects", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that gradient text effects have proper fallback colors
    const gradientTextPattern = /-webkit-text-fill-color:\s*transparent/g;
    const matches = result.heroComponent.match(gradientTextPattern);

    if (matches) {
      matches.forEach((match) => {
        const matchIndex = result.heroComponent.indexOf(match);
        const contextStart = Math.max(0, matchIndex - 300);
        const contextEnd = Math.min(
          result.heroComponent.length,
          matchIndex + 300
        );
        const context = result.heroComponent.slice(contextStart, contextEnd);

        // Check that there's a fallback color defined before the transparent fill
        const hasFallbackColor = /color:\s*#[0-9a-fA-F]{3,8}/.test(context);
        const hasSupportsRule =
          /@supports\s+not\s+\(-webkit-background-clip:\s*text\)/.test(context);

        expect(
          hasFallbackColor,
          `Gradient text with webkit-text-fill-color: transparent should have a fallback color. Context: ${context}`
        ).toBe(true);

        expect(
          hasSupportsRule,
          `Gradient text should have @supports rule for browser compatibility. Context: ${context}`
        ).toBe(true);
      });
    }
  });

  it("should use actual design color values instead of CSS variables in critical styles", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that primary design colors are used directly instead of CSS variables
    const expectedPrimaryColor = mockDesign.colorScheme.primary; // "#2563eb"
    const expectedSecondaryColor = mockDesign.colorScheme.secondary; // "#1e40af"

    expect(result.heroComponent).toContain(expectedPrimaryColor);
    expect(result.heroComponent).toContain(expectedSecondaryColor);

    // Check that gradient backgrounds use actual color values
    const gradientPattern = /background:\s*linear-gradient\([^)]+\)/g;
    const gradientMatches = result.heroComponent.match(gradientPattern);

    if (gradientMatches) {
      gradientMatches.forEach((gradient) => {
        // Should contain hex colors, not CSS variables
        const hasHexColors = /#[0-9a-fA-F]{3,8}/.test(gradient);
        const hasCssVariables = /var\(--[^)]+\)/.test(gradient);

        if (hasCssVariables && !hasHexColors) {
          throw new Error(
            `Gradient should use actual color values, not CSS variables: ${gradient}`
          );
        }
      });
    }
  });

  it("should prevent text visibility issues in all layout types", async () => {
    const layoutTypes = [
      "minimal",
      "grid",
      "sidebar",
      "hero-focused",
      "content-heavy",
    ] as const;

    for (const layout of layoutTypes) {
      const designWithLayout = { ...mockDesign, layout };
      const result = await generateAstroSite(
        mockRepoData,
        mockAnalysis,
        designWithLayout
      );

      // Check that section headers and titles are visible
      const transparentTextPattern = /-webkit-text-fill-color:\s*transparent/g;
      const matches = result.heroComponent.match(transparentTextPattern) || [];

      for (const match of matches) {
        const matchIndex = result.heroComponent.indexOf(match);
        const contextStart = Math.max(0, matchIndex - 200);
        const contextEnd = Math.min(
          result.heroComponent.length,
          matchIndex + 200
        );
        const context = result.heroComponent.slice(contextStart, contextEnd);

        // Ensure there's either a background gradient with real colors or a fallback color
        const hasRealGradient =
          /background:\s*linear-gradient\([^)]*#[0-9a-fA-F]{3,8}[^)]*\)/.test(
            context
          );
        const hasFallbackColor = /color:\s*#[0-9a-fA-F]{3,8}/.test(context);

        expect(
          hasRealGradient || hasFallbackColor,
          `Layout ${layout}: Transparent text must have either real gradient or fallback color. Context: ${context}`
        ).toBe(true);
      }
    }
  });
});
