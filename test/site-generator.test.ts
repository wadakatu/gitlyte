import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateSite,
  THEME_MODES,
  isValidThemeMode,
  type RepoInfo,
  type SiteConfig,
  type GeneratedSite,
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
});
