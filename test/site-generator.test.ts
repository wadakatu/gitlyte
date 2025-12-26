import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateSite,
  generateSitemap,
  generateRobots,
  formatCount,
  formatRelativeDate,
  buildContributorsRequirements,
  generateContributorsPage,
  THEME_MODES,
  SITEMAP_CHANGEFREQ,
  isValidThemeMode,
  type RepoInfo,
  type RepoStats,
  type SiteConfig,
  type GeneratedSite,
  type GeneratedPage,
  type Contributor,
} from "../src/site-generator.js";
import type { AIProviderInstance } from "../src/ai-provider.js";
import { selfRefine } from "../src/self-refine.js";

// Mock @actions/core
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

// Mock self-refine module
vi.mock("../src/self-refine.js", () => ({
  selfRefine: vi.fn(),
}));

// Helper to create mock AI provider
function createMockAIProvider(
  responses: Record<string, string>
): AIProviderInstance {
  let callCount = 0;
  const responseArray = Object.values(responses);

  return {
    provider: "anthropic",
    quality: "standard",
    generateText: vi.fn().mockImplementation(async () => {
      // Use nullish coalescing to handle empty strings correctly
      const response = responseArray[callCount] ?? "{}";
      callCount++;
      return { text: response };
    }),
  };
}

// Sample valid responses
const VALID_ANALYSIS_RESPONSE = JSON.stringify({
  name: "test-repo",
  description: "A test repository",
  projectType: "library",
  primaryLanguage: "TypeScript",
  audience: "developers",
  style: "professional",
  keyFeatures: ["feature1", "feature2", "feature3"],
});

const VALID_DESIGN_RESPONSE = JSON.stringify({
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
});

const VALID_HTML_RESPONSE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Repo</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-gray-50">
  <main class="container mx-auto px-4">
    <h1 class="text-4xl font-bold">Test Repo</h1>
    <p>A test repository</p>
    <a href="https://github.com/test/repo">View on GitHub</a>
  </main>
</body>
</html>`;

describe("Site Generator", () => {
  const defaultRepoInfo: RepoInfo = {
    name: "test-repo",
    fullName: "owner/test-repo",
    description: "A test repository",
    htmlUrl: "https://github.com/owner/test-repo",
    language: "TypeScript",
    topics: ["typescript", "testing"],
    readme: "# Test Repo\n\nThis is a test repository.",
  };

  const defaultConfig: SiteConfig = {
    outputDirectory: "docs",
    theme: { mode: "dark", toggle: false },
    prompts: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("generateSite", () => {
    it("should generate a complete site with valid responses", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].path).toBe("index.html");
      expect(result.pages[0].html).toContain("<!DOCTYPE html>");
      expect(result.assets).toEqual([]);
    });

    it("should call AI provider three times (analysis, design, HTML)", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(mockProvider.generateText).toHaveBeenCalledTimes(3);
    });

    it("should log progress messages", async () => {
      const core = await import("@actions/core");
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(core.info).toHaveBeenCalledWith("Starting site generation...");
      expect(core.info).toHaveBeenCalledWith("Analyzing repository...");
      expect(core.info).toHaveBeenCalledWith("Generating design system...");
      expect(core.info).toHaveBeenCalledWith("Generating index page...");
      expect(core.info).toHaveBeenCalledWith("Site generation complete!");
    });

    it("should use light theme when configured", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const lightConfig: SiteConfig = {
        ...defaultConfig,
        theme: { mode: "light", toggle: false },
      };

      await generateSite(defaultRepoInfo, mockProvider, lightConfig);

      // The third call should mention light mode
      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("light mode");
    });

    it("should include custom instructions when provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithInstructions: SiteConfig = {
        ...defaultConfig,
        prompts: { siteInstructions: "Use a friendly tone" },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithInstructions);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("Use a friendly tone");
    });

    it("should include logo in prompt when provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithLogo: SiteConfig = {
        ...defaultConfig,
        logo: { path: "logo.svg", alt: "My Logo" },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithLogo);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("logo.svg");
      expect(htmlPrompt).toContain("My Logo");
      expect(htmlPrompt).toContain("LOGO:");
    });

    it("should include favicon in prompt when provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithFavicon: SiteConfig = {
        ...defaultConfig,
        favicon: { path: "favicon.ico" },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithFavicon);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("favicon.ico");
      expect(htmlPrompt).toContain("FAVICON:");
    });

    it("should include both logo and favicon in prompt when provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithBoth: SiteConfig = {
        ...defaultConfig,
        logo: { path: "logo.png", alt: "Project Logo" },
        favicon: { path: "icon.ico" },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithBoth);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("logo.png");
      expect(htmlPrompt).toContain("Project Logo");
      expect(htmlPrompt).toContain("icon.ico");
      expect(htmlPrompt).toContain("except for the provided logo");
    });
  });

  describe("Repository Analysis", () => {
    it("should throw error when AI returns invalid JSON", async () => {
      const mockProvider = createMockAIProvider({
        analysis: "not valid json",
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("Repository analysis failed: AI returned invalid JSON");
    });

    it("should throw error when AI returns empty response", async () => {
      const mockProvider = createMockAIProvider({
        analysis: "",
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      // Empty string causes JSON.parse to fail, which triggers the error handler
      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("AI returned invalid JSON");
    });

    it("should handle JSON wrapped in markdown code blocks", async () => {
      const wrappedResponse = "```json\n" + VALID_ANALYSIS_RESPONSE + "\n```";
      const mockProvider = createMockAIProvider({
        analysis: wrappedResponse,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );

      expect(result.pages).toHaveLength(1);
    });

    it("should use fallback values for invalid projectType", async () => {
      const analysisWithInvalidType = JSON.stringify({
        ...JSON.parse(VALID_ANALYSIS_RESPONSE),
        projectType: "invalid-type",
      });

      const mockProvider = createMockAIProvider({
        analysis: analysisWithInvalidType,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      // Should not throw - falls back to "other"
      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });

    it("should use fallback values for invalid audience", async () => {
      const analysisWithInvalidAudience = JSON.stringify({
        ...JSON.parse(VALID_ANALYSIS_RESPONSE),
        audience: "invalid-audience",
      });

      const mockProvider = createMockAIProvider({
        analysis: analysisWithInvalidAudience,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      // Should not throw - falls back to "developers"
      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });

    it("should use fallback values for invalid style", async () => {
      const analysisWithInvalidStyle = JSON.stringify({
        ...JSON.parse(VALID_ANALYSIS_RESPONSE),
        style: "invalid-style",
      });

      const mockProvider = createMockAIProvider({
        analysis: analysisWithInvalidStyle,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      // Should not throw - falls back to "professional"
      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });

    it("should handle missing keyFeatures array", async () => {
      const analysisWithoutFeatures = JSON.stringify({
        ...JSON.parse(VALID_ANALYSIS_RESPONSE),
        keyFeatures: null,
      });

      const mockProvider = createMockAIProvider({
        analysis: analysisWithoutFeatures,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });

    it("should include README in prompt when available", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const analysisPrompt = calls[0][0].prompt;
      expect(analysisPrompt).toContain("README");
      expect(analysisPrompt).toContain("# Test Repo");
    });

    it("should handle missing README gracefully", async () => {
      const repoWithoutReadme = { ...defaultRepoInfo, readme: undefined };
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(
        repoWithoutReadme,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });
  });

  describe("Design System Generation", () => {
    it("should throw error when AI returns invalid design JSON", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: "invalid json",
        html: VALID_HTML_RESPONSE,
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("Design system generation failed");
    });

    it("should throw error when design is missing colors.light", async () => {
      const invalidDesign = JSON.stringify({
        colors: { dark: {} },
        typography: {},
      });

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: invalidDesign,
        html: VALID_HTML_RESPONSE,
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("Design system generation failed");
    });

    it("should throw error when design is missing colors.dark", async () => {
      const invalidDesign = JSON.stringify({
        colors: { light: {} },
        typography: {},
      });

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: invalidDesign,
        html: VALID_HTML_RESPONSE,
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("Design system generation failed");
    });

    it("should throw error when design is missing typography", async () => {
      const invalidDesign = JSON.stringify({
        colors: { light: {}, dark: {} },
      });

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: invalidDesign,
        html: VALID_HTML_RESPONSE,
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("Design system generation failed");
    });

    it("should handle markdown-wrapped design JSON", async () => {
      const wrappedDesign = "```json\n" + VALID_DESIGN_RESPONSE + "\n```";
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: wrappedDesign,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });
  });

  describe("HTML Generation", () => {
    it("should throw error when HTML is too short", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: "short",
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("AI returned empty or invalid response");
    });

    it("should throw error when HTML is empty", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: "",
      });

      await expect(
        generateSite(defaultRepoInfo, mockProvider, defaultConfig)
      ).rejects.toThrow("AI returned empty or invalid response");
    });

    it("should add closing tags when HTML is incomplete", async () => {
      const core = await import("@actions/core");
      const incompleteHtml = `<!DOCTYPE html>
<html>
<head><script src="https://cdn.tailwindcss.com"></script></head>
<body>
  <h1>Test</h1>
  <p>Content that goes on and on to meet the minimum length requirement for validation purposes.</p>`;

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: incompleteHtml,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );

      expect(result.pages[0].html).toContain("</html>");
      expect(core.warning).toHaveBeenCalledWith(
        "Generated HTML was incomplete, adding missing closing tags."
      );
    });

    it("should inject Tailwind CDN when missing", async () => {
      const htmlWithoutTailwind = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body>
  <h1>Test</h1>
  <p>Content that goes on and on to meet the minimum length requirement for validation purposes.</p>
</body>
</html>`;

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: htmlWithoutTailwind,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );

      expect(result.pages[0].html).toContain("cdn.tailwindcss.com");
    });

    it("should warn when HTML missing DOCTYPE and html tag", async () => {
      const core = await import("@actions/core");
      const malformedHtml = `<head><script src="https://cdn.tailwindcss.com"></script></head>
<body>
  <h1>Test Page</h1>
  <p>Some content here that is long enough to pass the minimum length check for validation.</p>
</body>
</html>`;

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: malformedHtml,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("Generated HTML may be malformed")
      );
    });

    it("should strip markdown code blocks from HTML", async () => {
      const wrappedHtml = "```html\n" + VALID_HTML_RESPONSE + "\n```";
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: wrappedHtml,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );

      expect(result.pages[0].html).not.toContain("```");
      expect(result.pages[0].html).toContain("<!DOCTYPE html>");
    });

    it("should warn when cannot inject Tailwind (no head tag)", async () => {
      const core = await import("@actions/core");
      // HTML with html tag (to avoid first warning) but no </head> tag
      const htmlNoHead = `<!DOCTYPE html>
<html>
<body>
  <h1>Test Page Without Head Tag</h1>
  <p>Some content here that is long enough to pass the minimum length check for validation purposes.</p>
</body>
</html>`;

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: htmlNoHead,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(core.warning).toHaveBeenCalledWith(
        "Generated HTML missing </head> tag, cannot inject Tailwind CDN."
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle repo with no description", async () => {
      const repoNoDesc = { ...defaultRepoInfo, description: undefined };
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(repoNoDesc, mockProvider, defaultConfig);
      expect(result.pages).toHaveLength(1);
    });

    it("should handle repo with no language", async () => {
      const repoNoLang = { ...defaultRepoInfo, language: undefined };
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(repoNoLang, mockProvider, defaultConfig);
      expect(result.pages).toHaveLength(1);
    });

    it("should handle repo with empty topics", async () => {
      const repoNoTopics = { ...defaultRepoInfo, topics: [] };
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const result = await generateSite(
        repoNoTopics,
        mockProvider,
        defaultConfig
      );
      expect(result.pages).toHaveLength(1);
    });

    it("should truncate long README in prompt", async () => {
      const longReadme = "# Long README\n\n" + "x".repeat(5000);
      const repoLongReadme = { ...defaultRepoInfo, readme: longReadme };
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(repoLongReadme, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const analysisPrompt = calls[0][0].prompt;
      // Should only include first 2000 chars
      expect(analysisPrompt.length).toBeLessThan(longReadme.length + 500);
    });
  });

  describe("High Quality Mode", () => {
    // Helper to create high quality provider
    function createHighQualityProvider(
      responses: Record<string, string>
    ): AIProviderInstance {
      let callCount = 0;
      const responseArray = Object.values(responses);

      return {
        provider: "anthropic",
        quality: "high",
        generateText: vi.fn().mockImplementation(async () => {
          const response = responseArray[callCount] ?? "{}";
          callCount++;
          return { text: response };
        }),
      };
    }

    it("should apply Self-Refine for high quality mode", async () => {
      const mockProvider = createHighQualityProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      // Mock selfRefine to return improved HTML
      const refinedHtml = "<!DOCTYPE html><html><body>Refined Content</body></html>";
      vi.mocked(selfRefine).mockResolvedValue({
        html: refinedHtml,
        evaluation: {
          score: 9,
          feedback: "Excellent design",
          strengths: ["Modern", "Responsive"],
          improvements: [],
        },
        iterations: 2,
        improved: true,
      });

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        defaultConfig
      );

      expect(selfRefine).toHaveBeenCalled();
      expect(result.pages[0].html).toBe(refinedHtml);
    });

    it("should not apply Self-Refine for standard quality mode", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(selfRefine).not.toHaveBeenCalled();
    });

    it("should log Self-Refine progress for high quality mode", async () => {
      const core = await import("@actions/core");
      const mockProvider = createHighQualityProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      vi.mocked(selfRefine).mockResolvedValue({
        html: "<!DOCTYPE html><html></html>",
        evaluation: {
          score: 8,
          feedback: "Good",
          strengths: [],
          improvements: [],
        },
        iterations: 1,
        improved: true,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(core.info).toHaveBeenCalledWith(
        "🎯 High quality mode: applying Self-Refine..."
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("Self-Refine:")
      );
    });

    it("should pass correct config to selfRefine", async () => {
      const mockProvider = createHighQualityProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      vi.mocked(selfRefine).mockResolvedValue({
        html: "<!DOCTYPE html><html></html>",
        evaluation: {
          score: 8,
          feedback: "Good",
          strengths: [],
          improvements: [],
        },
        iterations: 0,
        improved: true,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      expect(selfRefine).toHaveBeenCalledWith(
        expect.any(String), // Initial HTML
        expect.objectContaining({
          maxIterations: 3,
          targetScore: 8,
          projectName: expect.any(String),
          projectDescription: expect.any(String),
          requirements: expect.stringContaining("Tailwind CSS"),
        }),
        mockProvider
      );
    });

    it("should use theme mode in requirements", async () => {
      const mockProvider = createHighQualityProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      vi.mocked(selfRefine).mockResolvedValue({
        html: "<!DOCTYPE html><html></html>",
        evaluation: { score: 8, feedback: "", strengths: [], improvements: [] },
        iterations: 0,
        improved: true,
      });

      const lightConfig = { ...defaultConfig, theme: { mode: "light" as const, toggle: false } };
      await generateSite(defaultRepoInfo, mockProvider, lightConfig);

      expect(selfRefine).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          requirements: expect.stringContaining("light mode"),
        }),
        mockProvider
      );
    });
  });

  describe("Theme Toggle", () => {
    it("should include dark mode toggle instructions when toggle is enabled", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const toggleConfig: SiteConfig = {
        ...defaultConfig,
        theme: { mode: "dark", toggle: true },
      };

      await generateSite(defaultRepoInfo, mockProvider, toggleConfig);

      // Check that the prompt includes dark mode toggle instructions
      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPromptCall = calls[2]; // Third call is HTML generation
      const prompt = htmlPromptCall[0].prompt;

      expect(prompt).toContain("Light/Dark mode toggle");
      expect(prompt).toContain("LIGHT MODE COLORS");
      expect(prompt).toContain("DARK MODE COLORS");
      expect(prompt).toContain("darkMode: 'class'");
    });

    it("should use single theme prompt when toggle is disabled", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      // Check that the prompt uses single theme mode
      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPromptCall = calls[2];
      const prompt = htmlPromptCall[0].prompt;

      expect(prompt).toContain("dark mode");
      expect(prompt).not.toContain("Light/Dark mode toggle");
    });

    it("should handle auto mode by defaulting to dark for single theme", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const autoConfig: SiteConfig = {
        ...defaultConfig,
        theme: { mode: "auto", toggle: false },
      };

      await generateSite(defaultRepoInfo, mockProvider, autoConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPromptCall = calls[2];
      const prompt = htmlPromptCall[0].prompt;

      // Auto mode should default to dark when toggle is disabled
      expect(prompt).toContain("dark mode");
    });

    it("should include system preference in toggle prompt for auto mode", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const autoToggleConfig: SiteConfig = {
        ...defaultConfig,
        theme: { mode: "auto", toggle: true },
      };

      await generateSite(defaultRepoInfo, mockProvider, autoToggleConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPromptCall = calls[2];
      const prompt = htmlPromptCall[0].prompt;

      expect(prompt).toContain("system preference");
    });

    it("should emit warning when auto mode is used without toggle", async () => {
      const core = await import("@actions/core");
      const mockWarning = vi.mocked(core.warning);
      mockWarning.mockClear();

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const autoNoToggleConfig: SiteConfig = {
        ...defaultConfig,
        theme: { mode: "auto", toggle: false },
      };

      await generateSite(defaultRepoInfo, mockProvider, autoNoToggleConfig);

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('Theme mode "auto" requires toggle to be enabled')
      );
    });
  });

  describe("isValidThemeMode", () => {
    it("should return true for valid theme modes", () => {
      expect(isValidThemeMode("light")).toBe(true);
      expect(isValidThemeMode("dark")).toBe(true);
      expect(isValidThemeMode("auto")).toBe(true);
    });

    it("should return false for invalid theme modes", () => {
      expect(isValidThemeMode("night")).toBe(false);
      expect(isValidThemeMode("purple")).toBe(false);
      expect(isValidThemeMode("")).toBe(false);
      expect(isValidThemeMode(null)).toBe(false);
      expect(isValidThemeMode(undefined)).toBe(false);
      expect(isValidThemeMode(123)).toBe(false);
    });
  });

  describe("THEME_MODES", () => {
    it("should contain exactly light, dark, and auto", () => {
      expect(THEME_MODES).toEqual(["light", "dark", "auto"]);
    });

    it("should be readonly", () => {
      // TypeScript ensures this at compile time, but we can verify the values
      expect(THEME_MODES.length).toBe(3);
    });
  });

  describe("SEO Configuration", () => {
    it("should include SEO requirements in prompt when provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithSeo: SiteConfig = {
        ...defaultConfig,
        seo: {
          title: "My Custom Title",
          description: "My custom description for search engines",
          keywords: ["test", "seo", "keywords"],
          twitterHandle: "@myhandle",
          siteUrl: "https://example.com",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithSeo);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("SEO AND OPEN GRAPH REQUIREMENTS");
      expect(htmlPrompt).toContain("My Custom Title");
      expect(htmlPrompt).toContain("My custom description for search engines");
      expect(htmlPrompt).toContain("test, seo, keywords");
      expect(htmlPrompt).toContain("@myhandle");
      expect(htmlPrompt).toContain("https://example.com");
    });

    it("should use repo data as fallback for SEO values", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithEmptySeo: SiteConfig = {
        ...defaultConfig,
        seo: {},
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithEmptySeo);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      // Should use repo name as title fallback
      expect(htmlPrompt).toContain("test-repo");
      // Should use repo description as description fallback
      expect(htmlPrompt).toContain("A test repository");
      // Should use repo topics as keywords fallback
      expect(htmlPrompt).toContain("typescript, testing");
    });

    it("should generate absolute OG image URL when siteUrl is provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithOgImage: SiteConfig = {
        ...defaultConfig,
        seo: {
          ogImage: { path: "og-image.png" },
          siteUrl: "https://example.com",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithOgImage);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      // OG image should be absolute URL
      expect(htmlPrompt).toContain("https://example.com/og-image.png");
    });

    it("should use relative OG image path when siteUrl is not provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithOgImageOnly: SiteConfig = {
        ...defaultConfig,
        seo: {
          ogImage: { path: "og-image.png" },
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithOgImageOnly);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      // Should use relative path when no siteUrl (for og:image)
      expect(htmlPrompt).toContain("og-image.png");
      // Note: og:url still uses repo htmlUrl, so https:// will be present there
      // We just verify the og:image is not an absolute URL with siteUrl
      expect(htmlPrompt).not.toContain("undefined/og-image.png");
    });

    it("should normalize Twitter handle to ensure @ prefix", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithTwitterNoAt: SiteConfig = {
        ...defaultConfig,
        seo: {
          twitterHandle: "myhandle",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithTwitterNoAt);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      // Should add @ prefix
      expect(htmlPrompt).toContain("@myhandle");
    });

    it("should not double @ prefix on Twitter handle", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithTwitterAt: SiteConfig = {
        ...defaultConfig,
        seo: {
          twitterHandle: "@myhandle",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithTwitterAt);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      // Should have exactly one @ prefix, not @@myhandle
      expect(htmlPrompt).toContain("@myhandle");
      expect(htmlPrompt).not.toContain("@@myhandle");
    });

    it("should include Twitter Card with summary_large_image when OG image is provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithOgImage: SiteConfig = {
        ...defaultConfig,
        seo: {
          ogImage: { path: "og-image.png" },
          siteUrl: "https://example.com",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithOgImage);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain('twitter:card" content="summary_large_image"');
    });

    it("should include Twitter Card with summary when no OG image", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithoutOgImage: SiteConfig = {
        ...defaultConfig,
        seo: {
          title: "Test Title",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithoutOgImage);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain('twitter:card" content="summary"');
    });

    it("should strip trailing slash from siteUrl when building OG image URL", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithTrailingSlash: SiteConfig = {
        ...defaultConfig,
        seo: {
          ogImage: { path: "og-image.png" },
          siteUrl: "https://example.com/",
        },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithTrailingSlash);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      // Should not have double slash
      expect(htmlPrompt).toContain("https://example.com/og-image.png");
      expect(htmlPrompt).not.toContain("https://example.com//og-image.png");
    });
  });

  describe("generateSitemap", () => {
    it("should generate valid sitemap XML", () => {
      const pages: GeneratedPage[] = [{ path: "index.html", html: "<html></html>" }];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain("<urlset");
      expect(result).toContain("</urlset>");
      expect(result).toContain("<url>");
      expect(result).toContain("<loc>https://example.com</loc>");
    });

    it("should use siteUrl as loc for index.html", () => {
      const pages: GeneratedPage[] = [{ path: "index.html", html: "" }];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
    });

    it("should generate proper URL for non-index pages", () => {
      const pages: GeneratedPage[] = [
        { path: "index.html", html: "" },
        { path: "about.html", html: "" },
      ];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
      expect(result).toContain("<loc>https://example.com/about</loc>");
    });

    it("should use default changefreq and priority", () => {
      const pages: GeneratedPage[] = [{ path: "index.html", html: "" }];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<changefreq>weekly</changefreq>");
      expect(result).toContain("<priority>0.8</priority>");
    });

    it("should use custom changefreq and priority", () => {
      const pages: GeneratedPage[] = [{ path: "index.html", html: "" }];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl, {
        changefreq: "daily",
        priority: 1.0,
      });

      expect(result).toContain("<changefreq>daily</changefreq>");
      expect(result).toContain("<priority>1</priority>");
    });

    it("should include lastmod with today's date", () => {
      const pages: GeneratedPage[] = [{ path: "index.html", html: "" }];
      const siteUrl = "https://example.com";
      const today = new Date().toISOString().split("T")[0];

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain(`<lastmod>${today}</lastmod>`);
    });

    it("should strip trailing slash from siteUrl", () => {
      const pages: GeneratedPage[] = [{ path: "index.html", html: "" }];
      const siteUrl = "https://example.com/";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
      expect(result).not.toContain("https://example.com/</loc>");
    });

    it("should only include .html files", () => {
      const pages: GeneratedPage[] = [
        { path: "index.html", html: "" },
        { path: "sitemap.xml", html: "" },
        { path: "robots.txt", html: "" },
      ];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
      expect(result).not.toContain("sitemap.xml");
      expect(result).not.toContain("robots.txt");
    });

    it("should handle subdirectory HTML files", () => {
      const pages: GeneratedPage[] = [
        { path: "index.html", html: "" },
        { path: "docs/guide.html", html: "" },
        { path: "docs/api.html", html: "" },
      ];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
      expect(result).toContain("<loc>https://example.com/docs/guide</loc>");
      expect(result).toContain("<loc>https://example.com/docs/api</loc>");
    });

    it("should handle subdirectory index.html files", () => {
      const pages: GeneratedPage[] = [
        { path: "index.html", html: "" },
        { path: "docs/index.html", html: "" },
        { path: "about/index.html", html: "" },
      ];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
      expect(result).toContain("<loc>https://example.com/docs/</loc>");
      expect(result).toContain("<loc>https://example.com/about/</loc>");
    });

    it("should handle deeply nested paths", () => {
      const pages: GeneratedPage[] = [
        { path: "index.html", html: "" },
        { path: "docs/api/v2/index.html", html: "" },
        { path: "docs/api/v2/endpoints.html", html: "" },
      ];
      const siteUrl = "https://example.com";

      const result = generateSitemap(pages, siteUrl);

      expect(result).toContain("<loc>https://example.com</loc>");
      expect(result).toContain("<loc>https://example.com/docs/api/v2/</loc>");
      expect(result).toContain("<loc>https://example.com/docs/api/v2/endpoints</loc>");
    });
  });

  describe("generateRobots", () => {
    it("should generate valid robots.txt content", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl);

      expect(result).toContain("User-agent: *");
      expect(result).toContain("Allow: /");
      expect(result).toContain("Sitemap: https://example.com/sitemap.xml");
    });

    it("should strip trailing slash from siteUrl", () => {
      const siteUrl = "https://example.com/";

      const result = generateRobots(siteUrl);

      expect(result).toContain("Sitemap: https://example.com/sitemap.xml");
      expect(result).not.toContain("https://example.com//sitemap.xml");
    });

    it("should include additional rules when provided", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl, {
        additionalRules: ["Disallow: /private/", "Disallow: /admin/"],
      });

      expect(result).toContain("Disallow: /private/");
      expect(result).toContain("Disallow: /admin/");
    });

    it("should handle empty additional rules", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl, { additionalRules: [] });

      expect(result).toContain("User-agent: *");
      expect(result).toContain("Allow: /");
      expect(result).toContain("Sitemap:");
    });

    it("should include sitemap reference by default", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl);

      expect(result).toContain("Sitemap: https://example.com/sitemap.xml");
    });

    it("should not include sitemap reference when includeSitemap is false", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl, { includeSitemap: false });

      expect(result).toContain("User-agent: *");
      expect(result).toContain("Allow: /");
      expect(result).not.toContain("Sitemap:");
    });

    it("should include sitemap reference when includeSitemap is true", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl, { includeSitemap: true });

      expect(result).toContain("Sitemap: https://example.com/sitemap.xml");
    });

    it("should filter out empty strings from additional rules", () => {
      const siteUrl = "https://example.com";

      const result = generateRobots(siteUrl, {
        additionalRules: ["Disallow: /private/", "", "  ", "Disallow: /admin/"],
      });

      expect(result).toContain("Disallow: /private/");
      expect(result).toContain("Disallow: /admin/");
      // Should not have extra blank lines from empty rules
      expect(result).not.toMatch(/\n\s*\n\s*\n/);
    });
  });

  describe("Sitemap and Robots Integration", () => {
    it("should generate sitemap.xml when siteUrl is set and sitemap is enabled", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithSiteUrl: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
        sitemap: { enabled: true },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configWithSiteUrl
      );

      expect(result.pages.length).toBeGreaterThan(1);
      const sitemapPage = result.pages.find((p) => p.path === "sitemap.xml");
      expect(sitemapPage).toBeDefined();
      expect(sitemapPage?.html).toContain("<urlset");
      expect(sitemapPage?.html).toContain("https://example.com");
    });

    it("should generate robots.txt when siteUrl is set and robots is enabled", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithSiteUrl: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
        robots: { enabled: true },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configWithSiteUrl
      );

      const robotsPage = result.pages.find((p) => p.path === "robots.txt");
      expect(robotsPage).toBeDefined();
      expect(robotsPage?.html).toContain("User-agent: *");
      expect(robotsPage?.html).toContain("Sitemap:");
    });

    it("should not generate sitemap.xml when siteUrl is not set", async () => {
      const core = await import("@actions/core");
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithoutSiteUrl: SiteConfig = {
        ...defaultConfig,
        sitemap: { enabled: true },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configWithoutSiteUrl
      );

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].path).toBe("index.html");
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("Sitemap generation skipped")
      );
    });

    it("should not generate robots.txt when siteUrl is not set", async () => {
      const core = await import("@actions/core");
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithoutSiteUrl: SiteConfig = {
        ...defaultConfig,
        robots: { enabled: true },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configWithoutSiteUrl
      );

      expect(result.pages).toHaveLength(1);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("Robots.txt generation skipped")
      );
    });

    it("should not generate sitemap.xml when explicitly disabled", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configDisabled: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
        sitemap: { enabled: false },
        robots: { enabled: false },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configDisabled
      );

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].path).toBe("index.html");
    });

    it("should use custom sitemap options from config", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithOptions: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
        sitemap: {
          enabled: true,
          changefreq: "daily",
          priority: 1.0,
        },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configWithOptions
      );

      const sitemapPage = result.pages.find((p) => p.path === "sitemap.xml");
      expect(sitemapPage?.html).toContain("<changefreq>daily</changefreq>");
      expect(sitemapPage?.html).toContain("<priority>1</priority>");
    });

    it("should include additional rules in robots.txt from config", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithRules: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
        robots: {
          enabled: true,
          additionalRules: ["Disallow: /private/"],
        },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configWithRules
      );

      const robotsPage = result.pages.find((p) => p.path === "robots.txt");
      expect(robotsPage?.html).toContain("Disallow: /private/");
    });

    it("should generate both sitemap and robots by default when siteUrl is set", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configDefaultEnabled: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
      };

      const result = await generateSite(
        defaultRepoInfo,
        mockProvider,
        configDefaultEnabled
      );

      expect(result.pages).toHaveLength(3);
      expect(result.pages.map((p) => p.path)).toContain("index.html");
      expect(result.pages.map((p) => p.path)).toContain("sitemap.xml");
      expect(result.pages.map((p) => p.path)).toContain("robots.txt");
    });

    it("should log generated files in summary", async () => {
      const core = await import("@actions/core");
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithSiteUrl: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithSiteUrl);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("Generated: index.html, sitemap.xml, robots.txt")
      );
    });

    it("should log skipped files when site-url is not set", async () => {
      const core = await import("@actions/core");
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithoutSiteUrl: SiteConfig = {
        ...defaultConfig,
        sitemap: { enabled: true },
        robots: { enabled: true },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithoutSiteUrl);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipped:")
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("sitemap.xml (no site-url)")
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("robots.txt (no site-url)")
      );
    });

    it("should log skipped files when features are disabled", async () => {
      const core = await import("@actions/core");
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configDisabled: SiteConfig = {
        ...defaultConfig,
        sitemap: { enabled: false },
        robots: { enabled: false },
      };

      await generateSite(defaultRepoInfo, mockProvider, configDisabled);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipped:")
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("sitemap.xml (disabled)")
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining("robots.txt (disabled)")
      );
    });

    it("should not log skipped line when all features are generated", async () => {
      const core = await import("@actions/core");
      vi.mocked(core.info).mockClear();

      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const configWithSiteUrl: SiteConfig = {
        ...defaultConfig,
        seo: { siteUrl: "https://example.com" },
        sitemap: { enabled: true },
        robots: { enabled: true },
      };

      await generateSite(defaultRepoInfo, mockProvider, configWithSiteUrl);

      // Check that no "Skipped:" line was logged
      const infoCalls = vi.mocked(core.info).mock.calls.map((call) => call[0]);
      const skippedCalls = infoCalls.filter((msg) => msg.includes("Skipped:"));
      expect(skippedCalls).toHaveLength(0);
    });
  });

  describe("SITEMAP_CHANGEFREQ", () => {
    it("should contain valid changefreq values", () => {
      expect(SITEMAP_CHANGEFREQ).toEqual([
        "always",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "yearly",
        "never",
      ]);
    });
  });

  describe("formatCount", () => {
    it("should return number as-is when less than 1000", () => {
      expect(formatCount(0)).toBe("0");
      expect(formatCount(1)).toBe("1");
      expect(formatCount(100)).toBe("100");
      expect(formatCount(999)).toBe("999");
    });

    it("should format thousands with K suffix", () => {
      expect(formatCount(1000)).toBe("1.0K");
      expect(formatCount(1500)).toBe("1.5K");
      expect(formatCount(10000)).toBe("10.0K");
      expect(formatCount(999999)).toBe("1000.0K");
    });

    it("should format millions with M suffix", () => {
      expect(formatCount(1000000)).toBe("1.0M");
      expect(formatCount(1500000)).toBe("1.5M");
      expect(formatCount(10000000)).toBe("10.0M");
    });

    it("should handle negative numbers gracefully", () => {
      // Negative numbers are not expected in GitHub stats, but handle gracefully
      expect(formatCount(-1)).toBe("-1");
      expect(formatCount(-100)).toBe("-100");
      expect(formatCount(-1000)).toBe("-1000");
    });
  });

  describe("formatRelativeDate", () => {
    it("should return 'today' for today's date", () => {
      const today = new Date().toISOString();
      expect(formatRelativeDate(today)).toBe("today");
    });

    it("should return 'yesterday' for yesterday's date", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(yesterday)).toBe("yesterday");
    });

    it("should return 'X days ago' for dates within a week", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(threeDaysAgo)).toBe("3 days ago");

      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(sixDaysAgo)).toBe("6 days ago");
    });

    it("should return 'X weeks ago' for dates within a month", () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(oneWeekAgo)).toBe("1 week ago");

      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(twoWeeksAgo)).toBe("2 weeks ago");

      const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(threeWeeksAgo)).toBe("3 weeks ago");
    });

    it("should return 'X months ago' for dates within a year", () => {
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(oneMonthAgo)).toBe("1 month ago");

      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(twoMonthsAgo)).toBe("2 months ago");

      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(sixMonthsAgo)).toBe("6 months ago");
    });

    it("should return 'X years ago' for dates older than a year with correct grammar", () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(oneYearAgo)).toBe("1 year ago");

      const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(twoYearsAgo)).toBe("2 years ago");
    });

    it("should return 'unknown' for invalid date strings", () => {
      expect(formatRelativeDate("not-a-date")).toBe("unknown");
      expect(formatRelativeDate("")).toBe("unknown");
      expect(formatRelativeDate("invalid")).toBe("unknown");
    });

    it("should return 'recently' for future dates", () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(tomorrow)).toBe("recently");

      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeDate(nextWeek)).toBe("recently");
    });
  });

  describe("GitHub Statistics", () => {
    const defaultRepoInfo: RepoInfo = {
      name: "test-repo",
      fullName: "owner/test-repo",
      description: "A test repository",
      htmlUrl: "https://github.com/owner/test-repo",
      language: "TypeScript",
      topics: ["typescript", "testing"],
      readme: "# Test Repo\n\nThis is a test repository.",
    };

    const defaultConfig: SiteConfig = {
      outputDirectory: "docs",
      theme: { mode: "dark", toggle: false },
      prompts: {},
    };

    const sampleStats: RepoStats = {
      stars: 1234,
      forks: 567,
      watchers: 89,
      openIssues: 12,
      createdAt: "2023-01-15T10:30:00Z",
      updatedAt: "2024-12-20T15:45:00Z",
      license: "MIT License",
      latestRelease: "v1.2.3",
      contributorCount: 42,
    };

    it("should include stats in prompt when provided", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const repoInfoWithStats: RepoInfo = {
        ...defaultRepoInfo,
        stats: sampleStats,
      };

      await generateSite(repoInfoWithStats, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("GITHUB STATISTICS");
      expect(htmlPrompt).toContain("1.2K"); // formatted stars
      expect(htmlPrompt).toContain("567"); // forks
      expect(htmlPrompt).toContain("MIT License");
      expect(htmlPrompt).toContain("v1.2.3");
      expect(htmlPrompt).toContain("42"); // contributors
    });

    it("should not include stats section when stats is undefined", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      await generateSite(defaultRepoInfo, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).not.toContain("GITHUB STATISTICS");
    });

    it("should handle stats without optional fields", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const statsWithoutOptional: RepoStats = {
        stars: 100,
        forks: 50,
        watchers: 25,
        openIssues: 5,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
      };

      const repoInfoWithMinimalStats: RepoInfo = {
        ...defaultRepoInfo,
        stats: statsWithoutOptional,
      };

      await generateSite(repoInfoWithMinimalStats, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("GITHUB STATISTICS");
      expect(htmlPrompt).toContain("100"); // stars
      expect(htmlPrompt).not.toContain("License:");
      expect(htmlPrompt).not.toContain("Latest Release:");
      expect(htmlPrompt).not.toContain("Contributors:");
    });

    it("should format large numbers with K and M suffixes", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const statsWithLargeNumbers: RepoStats = {
        stars: 50000,
        forks: 12345,
        watchers: 1500000,
        openIssues: 999,
        createdAt: "2020-01-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
      };

      const repoInfoWithLargeStats: RepoInfo = {
        ...defaultRepoInfo,
        stats: statsWithLargeNumbers,
      };

      await generateSite(repoInfoWithLargeStats, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("50.0K"); // stars
      expect(htmlPrompt).toContain("12.3K"); // forks
      expect(htmlPrompt).toContain("1.5M"); // watchers
    });

    it("should handle stats with zero values", async () => {
      const mockProvider = createMockAIProvider({
        analysis: VALID_ANALYSIS_RESPONSE,
        design: VALID_DESIGN_RESPONSE,
        html: VALID_HTML_RESPONSE,
      });

      const statsWithZeros: RepoStats = {
        stars: 0,
        forks: 0,
        watchers: 0,
        openIssues: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
      };

      const repoInfoWithZeroStats: RepoInfo = {
        ...defaultRepoInfo,
        stats: statsWithZeros,
      };

      await generateSite(repoInfoWithZeroStats, mockProvider, defaultConfig);

      const calls = vi.mocked(mockProvider.generateText).mock.calls;
      const htmlPrompt = calls[2][0].prompt;
      expect(htmlPrompt).toContain("GITHUB STATISTICS");
      expect(htmlPrompt).toContain("Stars: 0");
      expect(htmlPrompt).toContain("Forks: 0");
      expect(htmlPrompt).toContain("Watchers: 0");
    });
  });

  describe("Contributors page generation", () => {
    const sampleContributors: Contributor[] = [
      {
        login: "user1",
        avatarUrl: "https://avatars.githubusercontent.com/user1",
        profileUrl: "https://github.com/user1",
        contributions: 150,
        type: "User",
      },
      {
        login: "user2",
        avatarUrl: "https://avatars.githubusercontent.com/user2",
        profileUrl: "https://github.com/user2",
        contributions: 75,
        type: "User",
      },
      {
        login: "user3",
        avatarUrl: "https://avatars.githubusercontent.com/user3",
        profileUrl: "https://github.com/user3",
        contributions: 30,
        type: "User",
      },
    ];

    const VALID_CONTRIBUTORS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contributors - Test Repo</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <h1>Contributors</h1>
  <div class="grid">
    <div class="contributor-card">user1</div>
    <div class="contributor-card">user2</div>
    <div class="contributor-card">user3</div>
  </div>
</body>
</html>`;

    describe("buildContributorsRequirements", () => {
      it("should build requirements string with contributor data", () => {
        const requirements = buildContributorsRequirements(
          sampleContributors,
          defaultRepoInfo
        );

        expect(requirements).toContain("CONTRIBUTORS DATA:");
        expect(requirements).toContain("Total contributors: 3");
        expect(requirements).toContain("Repository: test-repo");
        expect(requirements).toContain("user1 (150 contributions)");
        expect(requirements).toContain("user2 (75 contributions)");
        expect(requirements).toContain("user3 (30 contributions)");
      });

      it("should limit top contributors to 10 in prompt", () => {
        const manyContributors: Contributor[] = Array.from(
          { length: 15 },
          (_, i) => ({
            login: `user${i + 1}`,
            avatarUrl: `https://avatars.githubusercontent.com/user${i + 1}`,
            profileUrl: `https://github.com/user${i + 1}`,
            contributions: 100 - i,
            type: "User" as const,
          })
        );

        const requirements = buildContributorsRequirements(
          manyContributors,
          defaultRepoInfo
        );

        expect(requirements).toContain("Total contributors: 15");
        expect(requirements).toContain("user1");
        expect(requirements).toContain("user10");
        expect(requirements).not.toContain("user11");
        expect(requirements).not.toContain("user15");
      });

      it("should handle empty contributors array", () => {
        const requirements = buildContributorsRequirements([], defaultRepoInfo);

        expect(requirements).toContain("Total contributors: 0");
      });
    });

    describe("generateContributorsPage", () => {
      it("should generate valid HTML for contributors page", async () => {
        const mockProvider = createMockAIProvider({
          contributors: VALID_CONTRIBUTORS_HTML,
        });

        const design = {
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
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        };

        const html = await generateContributorsPage(
          defaultRepoInfo,
          sampleContributors,
          design,
          defaultConfig,
          mockProvider
        );

        expect(html).toContain("<!DOCTYPE html>");
        expect(html).toContain("Contributors");
        expect(html).toContain("tailwindcss");
      });

      it("should include all contributors in prompt", async () => {
        const mockProvider = createMockAIProvider({
          contributors: VALID_CONTRIBUTORS_HTML,
        });

        const design = {
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
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        };

        await generateContributorsPage(
          defaultRepoInfo,
          sampleContributors,
          design,
          defaultConfig,
          mockProvider
        );

        const calls = vi.mocked(mockProvider.generateText).mock.calls;
        const prompt = calls[0][0].prompt;
        expect(prompt).toContain("user1");
        expect(prompt).toContain("user2");
        expect(prompt).toContain("user3");
        expect(prompt).toContain("150"); // contributions
      });

      it("should inject Tailwind CDN if missing", async () => {
        const htmlWithoutTailwind = `<!DOCTYPE html>
<html>
<head><title>Contributors</title></head>
<body>Contributors page</body>
</html>`;

        const mockProvider = createMockAIProvider({
          contributors: htmlWithoutTailwind,
        });

        const design = {
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
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        };

        const html = await generateContributorsPage(
          defaultRepoInfo,
          sampleContributors,
          design,
          defaultConfig,
          mockProvider
        );

        expect(html).toContain("tailwindcss");
      });

      it("should throw error for empty AI response", async () => {
        const mockProvider = createMockAIProvider({
          contributors: "",
        });

        const design = {
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
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        };

        await expect(
          generateContributorsPage(
            defaultRepoInfo,
            sampleContributors,
            design,
            defaultConfig,
            mockProvider
          )
        ).rejects.toThrow("Contributors page generation failed");
      });
    });

    describe("generateSite with contributors", () => {
      it("should generate contributors page when enabled and contributors provided", async () => {
        const mockProvider = createMockAIProvider({
          analysis: VALID_ANALYSIS_RESPONSE,
          design: VALID_DESIGN_RESPONSE,
          html: VALID_HTML_RESPONSE,
          contributors: VALID_CONTRIBUTORS_HTML,
        });

        const configWithContributors: SiteConfig = {
          ...defaultConfig,
          contributors: {
            enabled: true,
            maxContributors: 50,
          },
        };

        const repoInfoWithContributors: RepoInfo = {
          ...defaultRepoInfo,
          contributors: sampleContributors,
        };

        const result = await generateSite(
          repoInfoWithContributors,
          mockProvider,
          configWithContributors
        );

        expect(result.pages).toHaveLength(2);
        expect(result.pages.map((p) => p.path)).toContain("index.html");
        expect(result.pages.map((p) => p.path)).toContain("contributors.html");
      });

      it("should skip contributors page when disabled", async () => {
        const mockProvider = createMockAIProvider({
          analysis: VALID_ANALYSIS_RESPONSE,
          design: VALID_DESIGN_RESPONSE,
          html: VALID_HTML_RESPONSE,
        });

        const configWithoutContributors: SiteConfig = {
          ...defaultConfig,
          contributors: {
            enabled: false,
            maxContributors: 50,
          },
        };

        const repoInfoWithContributors: RepoInfo = {
          ...defaultRepoInfo,
          contributors: sampleContributors,
        };

        const result = await generateSite(
          repoInfoWithContributors,
          mockProvider,
          configWithoutContributors
        );

        expect(result.pages).toHaveLength(1);
        expect(result.pages[0].path).toBe("index.html");
      });

      it("should skip contributors page when no contributors data", async () => {
        const mockProvider = createMockAIProvider({
          analysis: VALID_ANALYSIS_RESPONSE,
          design: VALID_DESIGN_RESPONSE,
          html: VALID_HTML_RESPONSE,
        });

        const configWithContributors: SiteConfig = {
          ...defaultConfig,
          contributors: {
            enabled: true,
            maxContributors: 50,
          },
        };

        // No contributors in repoInfo
        const result = await generateSite(
          defaultRepoInfo,
          mockProvider,
          configWithContributors
        );

        expect(result.pages).toHaveLength(1);
        expect(result.pages[0].path).toBe("index.html");
      });

      it("should skip contributors page when contributors array is empty", async () => {
        const mockProvider = createMockAIProvider({
          analysis: VALID_ANALYSIS_RESPONSE,
          design: VALID_DESIGN_RESPONSE,
          html: VALID_HTML_RESPONSE,
        });

        const configWithContributors: SiteConfig = {
          ...defaultConfig,
          contributors: {
            enabled: true,
            maxContributors: 50,
          },
        };

        const repoInfoWithEmptyContributors: RepoInfo = {
          ...defaultRepoInfo,
          contributors: [],
        };

        const result = await generateSite(
          repoInfoWithEmptyContributors,
          mockProvider,
          configWithContributors
        );

        expect(result.pages).toHaveLength(1);
        expect(result.pages[0].path).toBe("index.html");
      });
    });
  });
});
