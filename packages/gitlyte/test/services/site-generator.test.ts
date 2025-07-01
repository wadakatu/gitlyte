import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteGenerator } from "../../services/site-generator.js";
import type { GitLyteConfig } from "../../types/config.js";
import type { DesignSystem } from "../../types/generated-site.js";
import type { RepositoryAnalysis } from "../../types/repository.js";

// Mock Anthropic Client
vi.mock("../../utils/anthropic-client.js", () => ({
  AnthropicClient: vi.fn().mockImplementation(() => ({
    generateContent: vi.fn(),
    generateDesign: vi.fn(),
  })),
}));

describe("Site Generator", () => {
  let siteGenerator: SiteGenerator;
  let mockAnalysis: RepositoryAnalysis;
  let mockConfig: GitLyteConfig;
  let mockDesignSystem: DesignSystem;

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    siteGenerator = new SiteGenerator();

    mockAnalysis = {
      basicInfo: {
        name: "test-repo",
        description: "A test repository for testing",
        topics: ["javascript", "library"],
        language: "TypeScript",
        license: "MIT",
      },
      codeAnalysis: {
        languages: { TypeScript: 80, JavaScript: 20 },
        hasTests: true,
        testCoverage: 85,
        hasDocumentation: true,
        codeComplexity: "moderate",
      },
      contentAnalysis: {
        readme: {
          exists: true,
          content: "# Test Repo\n\nA test repository for testing.",
          sections: ["Installation", "Usage"],
          hasInstallation: true,
          hasUsage: true,
          hasExamples: false,
        },
        hasChangelog: false,
        hasContributing: true,
        hasLicense: true,
        hasExamples: false,
      },
      projectCharacteristics: {
        type: "library",
        industry: "devtools",
        audience: "developers",
        maturity: "stable",
      },
      technicalStack: {
        frontend: ["React"],
        backend: ["Node.js"],
        database: [],
        deployment: ["npm"],
        testing: ["Vitest"],
      },
      uniqueFeatures: ["Type safety", "Easy integration"],
      competitiveAdvantages: ["Performance", "Well-tested"],
      suggestedUseCases: ["Web development", "Library integration"],
    };

    mockConfig = {
      version: "1.0",
      site: {
        title: "Test Repository",
        description: "A powerful testing library",
        layout: "hero-focused",
      },
      design: {
        theme: "professional",
        colors: {
          primary: "#007acc",
          secondary: "#005999",
          accent: "#ff6b35",
        },
      },
      pages: {
        generate: ["index", "docs", "api"],
      },
    };

    mockDesignSystem = {
      colors: {
        primary: "#007acc",
        secondary: "#005999",
        accent: "#ff6b35",
        background: "#ffffff",
        text: "#1f2937",
        surface: "#f9fafb",
        border: "#e5e7eb",
      },
      typography: {
        headings: "Inter, sans-serif",
        body: "System UI, sans-serif",
        mono: "JetBrains Mono, monospace",
      },
      effects: {
        borderRadius: "8px",
        shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        transition: "0.2s ease",
      },
      spacing: {
        unit: "rem",
        scale: {
          xs: "0.25rem",
          sm: "0.5rem",
          md: "1rem",
          lg: "1.5rem",
          xl: "2rem",
        },
      },
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("generateSite", () => {
    it("should generate complete static site from analysis and config", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockResolvedValue(
        mockDesignSystem
      );

      const result = await siteGenerator.generateSite(mockAnalysis, mockConfig);

      expect(result).toBeDefined();
      expect(result.pages["index.html"]).toBeDefined();
      expect(result.pages["index.html"]).toContain("Test Repository");
      expect(result.assets["style.css"]).toBeDefined();
      expect(result.assets["navigation.js"]).toBeDefined();
    });

    it("should generate responsive CSS styles", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockResolvedValue(
        mockDesignSystem
      );

      const result = await siteGenerator.generateSite(mockAnalysis, mockConfig);

      expect(result.assets["style.css"]).toContain("@media");
      expect(result.assets["style.css"]).toContain("max-width");
      expect(result.assets["style.css"]).toContain("flex");
    });

    it("should include navigation JavaScript", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockResolvedValue(
        mockDesignSystem
      );

      const result = await siteGenerator.generateSite(mockAnalysis, mockConfig);

      expect(result.assets["navigation.js"]).toContain(
        "document.addEventListener"
      );
      expect(result.assets["navigation.js"]).toContain("DOMContentLoaded");
    });

    it("should generate multiple pages when configured", async () => {
      const configWithMultiplePages = {
        ...mockConfig,
        pages: {
          generate: ["index", "docs", "api", "examples"] as Array<
            "index" | "docs" | "api" | "examples" | "changelog"
          >,
        },
      };

      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockResolvedValue(
        mockDesignSystem
      );

      const result = await siteGenerator.generateSite(
        mockAnalysis,
        configWithMultiplePages
      );

      expect(result.pages["index.html"]).toBeDefined();
      expect(result.pages["docs.html"]).toBeDefined();
      expect(result.pages["api.html"]).toBeDefined();
      expect(result.pages["examples.html"]).toBeDefined();
    });

    it("should include SEO meta tags", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockResolvedValue(
        mockDesignSystem
      );

      const result = await siteGenerator.generateSite(mockAnalysis, mockConfig);

      expect(result.pages["index.html"]).toContain('<meta name="description"');
      expect(result.pages["index.html"]).toContain('<meta property="og:title"');
      expect(result.pages["index.html"]).toContain(
        '<meta property="og:description"'
      );
    });

    it("should generate sitemap and robots.txt", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockResolvedValue(
        mockDesignSystem
      );

      const result = await siteGenerator.generateSite(mockAnalysis, mockConfig);

      expect(result.meta.sitemap).toBeDefined();
      expect(result.meta.sitemap).toContain('<?xml version="1.0"');
      expect(result.meta.robotsTxt).toBeDefined();
      expect(result.meta.robotsTxt).toContain("User-agent:");
    });

    it("should handle AI generation errors gracefully", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockRejectedValue(new Error("AI Error"));
      vi.mocked(siteGenerator.anthropicClient.generateDesign).mockRejectedValue(
        new Error("AI Error")
      );

      const result = await siteGenerator.generateSite(mockAnalysis, mockConfig);

      expect(result).toBeDefined();
      expect(result.pages["index.html"]).toBeDefined();
      // Should still generate basic site with fallback content
      expect(result.pages["index.html"]).toContain("test-repo");
    });
  });

  describe("generatePage", () => {
    it("should generate index page with hero content", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        hero: {
          title: "Test Repository",
          subtitle: "A powerful testing library",
          description: "Built for developers who care about quality",
        },
      });

      const result = await siteGenerator.generatePage(
        "index",
        mockAnalysis,
        mockConfig,
        mockDesignSystem
      );

      expect(result).toContain("Test Repository");
      expect(result).toContain("A powerful testing library");
      expect(result).toContain("Built for developers who care about quality");
    });

    it("should generate docs page with documentation content", async () => {
      vi.mocked(
        siteGenerator.anthropicClient.generateContent
      ).mockResolvedValue({
        features: {
          title: "Features",
          items: [
            { title: "Type Safety", description: "Full TypeScript support" },
            { title: "Performance", description: "Optimized for speed" },
          ],
        },
      });

      const result = await siteGenerator.generatePage(
        "docs",
        mockAnalysis,
        mockConfig,
        mockDesignSystem
      );

      expect(result).toContain("Documentation");
      expect(result).toContain("Installation");
      expect(result).toContain("Usage");
    });

    it("should generate API page with API documentation", async () => {
      const result = await siteGenerator.generatePage(
        "api",
        mockAnalysis,
        mockConfig,
        mockDesignSystem
      );

      expect(result).toContain("API Reference");
      expect(result).toContain("TypeScript");
      expect(result).toContain("Functions");
    });
  });

  describe("generateCSS", () => {
    it("should generate responsive CSS with design system", () => {
      const result = siteGenerator.generateCSS(mockDesignSystem, mockConfig);

      expect(result).toContain(":root {");
      expect(result).toContain("--primary-color: #007acc");
      expect(result).toContain("@media (max-width: 768px)");
      expect(result).toContain("--font-heading: Inter, sans-serif");
    });

    it("should include layout-specific styles", () => {
      const configWithMinimal = {
        ...mockConfig,
        site: { ...mockConfig.site, layout: "minimal" as const },
      };

      const result = siteGenerator.generateCSS(
        mockDesignSystem,
        configWithMinimal
      );

      expect(result).toContain(".hero-section");
      expect(result).toContain(".features-grid");
      expect(result).toContain(".container");
    });
  });

  describe("generateJavaScript", () => {
    it("should generate interactive navigation script", () => {
      const result = siteGenerator.generateJavaScript(mockConfig);

      expect(result).toContain("DOMContentLoaded");
      expect(result).toContain("mobile-menu");
      expect(result).toContain("addEventListener");
    });

    it("should include scroll-based interactions", () => {
      const result = siteGenerator.generateJavaScript(mockConfig);

      expect(result).toContain("scroll");
      expect(result).toContain("scrollY");
    });
  });
});
