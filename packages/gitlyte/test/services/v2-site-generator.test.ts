import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzeRepository,
  generateDesignSystem,
  generateIndexPage,
  generateSite,
} from "../../services/v2-site-generator.js";
import type { AIProviderInstance } from "../../utils/ai-provider.js";
import { resolveConfigV2 } from "../../types/v2-config.js";

describe("v2-site-generator", () => {
  let mockAIProvider: AIProviderInstance;

  beforeEach(() => {
    mockAIProvider = {
      provider: "anthropic",
      quality: "standard",
      generateText: vi.fn(),
    };
  });

  describe("analyzeRepository", () => {
    it("should analyze repository and return analysis result", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test-repo",
          description: "A test repository",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: ["feature1", "feature2"],
        }),
      });

      const result = await analyzeRepository(
        {
          name: "test-repo",
          description: "A test repository",
          language: "TypeScript",
          topics: ["typescript", "library"],
        },
        mockAIProvider
      );

      expect(result.name).toBe("test-repo");
      expect(result.description).toBe("A test repository");
      expect(result.projectType).toBe("library");
      expect(result.primaryLanguage).toBe("TypeScript");
      expect(result.audience).toBe("developers");
      expect(result.style).toBe("professional");
      expect(result.keyFeatures).toEqual(["feature1", "feature2"]);
    });

    it("should handle markdown code blocks in response", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: '```json\n{"name":"test","description":"desc","projectType":"tool","primaryLanguage":"Go","audience":"developers","style":"minimal","keyFeatures":[]}\n```',
      });

      const result = await analyzeRepository(
        { name: "test", description: "desc" },
        mockAIProvider
      );

      expect(result.name).toBe("test");
      expect(result.projectType).toBe("tool");
    });

    it("should return fallback on parse error", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "invalid json",
      });

      const result = await analyzeRepository(
        {
          name: "test-repo",
          description: "A test repository",
          language: "Python",
        },
        mockAIProvider
      );

      expect(result.name).toBe("test-repo");
      expect(result.description).toBe("A test repository");
      expect(result.projectType).toBe("other");
      expect(result.primaryLanguage).toBe("Python");
      expect(result.audience).toBe("developers");
      expect(result.style).toBe("professional");
      expect(result.keyFeatures).toEqual([]);
    });

    it("should include README in prompt when provided", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "docs",
          primaryLanguage: "Markdown",
          audience: "general",
          style: "minimal",
          keyFeatures: [],
        }),
      });

      await analyzeRepository(
        {
          name: "test",
          description: "desc",
          readme: "# My Project\n\nThis is a project.",
        },
        mockAIProvider
      );

      expect(mockAIProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("README"),
        })
      );
    });
  });

  describe("generateDesignSystem", () => {
    it("should generate design system from analysis", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        }),
      });

      const result = await generateDesignSystem(
        {
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        },
        mockAIProvider
      );

      expect(result.colors.primary).toBe("blue-600");
      expect(result.colors.secondary).toBe("indigo-500");
      expect(result.typography.headingFont).toBe("Inter");
      expect(result.layout).toBe("hero-centered");
    });

    it("should return fallback design system on error", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "not valid json",
      });

      const result = await generateDesignSystem(
        {
          name: "test",
          description: "desc",
          projectType: "tool",
          primaryLanguage: "Go",
          audience: "developers",
          style: "minimal",
          keyFeatures: [],
        },
        mockAIProvider
      );

      expect(result.colors.primary).toBe("blue-600");
      expect(result.colors.background).toBe("white");
      expect(result.typography.headingFont).toBe(
        "Inter, system-ui, sans-serif"
      );
      expect(result.layout).toBe("hero-centered");
    });
  });

  describe("generateIndexPage", () => {
    it("should generate HTML index page", async () => {
      const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <h1>Test Project</h1>
</body>
</html>`;

      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: mockHtml,
      });

      const result = await generateIndexPage(
        {
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: ["feature1"],
        },
        {
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        },
        resolveConfigV2({}),
        mockAIProvider
      );

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).toContain("tailwindcss");
    });

    it("should add Tailwind CDN if not present", async () => {
      const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
</head>
<body></body>
</html>`;

      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: mockHtml,
      });

      const result = await generateIndexPage(
        {
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        },
        {
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        },
        resolveConfigV2({}),
        mockAIProvider
      );

      expect(result).toContain("cdn.tailwindcss.com");
    });

    it("should add favicon when configured", async () => {
      const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body></body>
</html>`;

      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: mockHtml,
      });

      const result = await generateIndexPage(
        {
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        },
        {
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        },
        resolveConfigV2({
          favicon: { path: "./favicon.ico" },
        }),
        mockAIProvider
      );

      expect(result).toContain('rel="icon"');
      expect(result).toContain("./favicon.ico");
    });

    it("should strip markdown code blocks from response", async () => {
      const mockHtml =
        "```html\n<!DOCTYPE html><html><head></head><body></body></html>\n```";

      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: mockHtml,
      });

      const result = await generateIndexPage(
        {
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        },
        {
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        },
        resolveConfigV2({}),
        mockAIProvider
      );

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).not.toContain("```");
    });
  });

  describe("generateSite", () => {
    it("should generate complete site with index page", async () => {
      // Mock for analyzeRepository
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: ["feature1"],
        }),
      });

      // Mock for generateDesignSystem
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        }),
      });

      // Mock for generateIndexPage
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body>Index</body></html>",
      });

      const result = await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
        },
        resolveConfigV2({}),
        mockAIProvider
      );

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].path).toBe("index.html");
      expect(result.pages[0].html).toContain("<!DOCTYPE html>");
      expect(result.assets).toEqual([]);
    });

    it("should generate additional pages when configured", async () => {
      // Mock for analyzeRepository
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        }),
      });

      // Mock for generateDesignSystem
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        }),
      });

      // Mock for generateIndexPage
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><head></head><body>Index</body></html>",
      });

      // Mock for features page
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><head></head><body>Features</body></html>",
      });

      const result = await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
        },
        resolveConfigV2({ pages: ["features"] }),
        mockAIProvider
      );

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].path).toBe("index.html");
      expect(result.pages[1].path).toBe("features.html");
    });

    it("should include readme in analysis when provided", async () => {
      // Mock for analyzeRepository
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test",
          description: "A great project",
          projectType: "tool",
          primaryLanguage: "Go",
          audience: "developers",
          style: "technical",
          keyFeatures: ["fast", "reliable"],
        }),
      });

      // Mock for generateDesignSystem
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            primary: "green-600",
            secondary: "teal-500",
            accent: "cyan-400",
            background: "gray-50",
            text: "gray-800",
          },
          typography: {
            headingFont: "Fira Code",
            bodyFont: "Inter",
          },
          layout: "minimal",
        }),
      });

      // Mock for generateIndexPage
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><head></head><body>Index</body></html>",
      });

      const result = await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
          readme: "# My Project\n\nThis is great!",
        },
        resolveConfigV2({}),
        mockAIProvider
      );

      expect(result.pages).toHaveLength(1);
      expect(mockAIProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("README"),
        })
      );
    });

    it("should apply Self-Refine when quality is 'high'", async () => {
      const mockEvaluation = {
        overallScore: 4.5,
        criteria: {
          aesthetics: { score: 4, reasoning: "Good" },
          modernity: { score: 4, reasoning: "Good" },
          repositoryFit: { score: 5, reasoning: "Great fit" },
          usability: { score: 4, reasoning: "Good" },
          consistency: { score: 5, reasoning: "Very consistent" },
        },
        reasoning: "Overall good design",
        suggestions: [],
      };

      // Mock for analyzeRepository
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: ["feature1"],
        }),
      });

      // Mock for generateDesignSystem
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        }),
      });

      // Mock for generateIndexPage
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body>Index</body></html>",
      });

      // Mock for Self-Refine evaluation (high score, no refinement needed)
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify(mockEvaluation),
      });

      const result = await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
        },
        resolveConfigV2({ ai: { quality: "high" } }),
        mockAIProvider
      );

      expect(result.pages).toHaveLength(1);
      expect(result.refinement).toBeDefined();
      expect(result.refinement?.iterations).toBe(0); // No refinement needed
      expect(result.refinement?.finalEvaluation.overallScore).toBe(4.5);
    });

    it("should not apply Self-Refine when quality is 'standard'", async () => {
      // Mock for analyzeRepository
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        }),
      });

      // Mock for generateDesignSystem
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            primary: "blue-600",
            secondary: "indigo-500",
            accent: "purple-400",
            background: "white",
            text: "gray-900",
          },
          typography: {
            headingFont: "Inter",
            bodyFont: "Inter",
          },
          layout: "hero-centered",
        }),
      });

      // Mock for generateIndexPage
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: "<!DOCTYPE html><html><head><script src='https://cdn.tailwindcss.com'></script></head><body>Index</body></html>",
      });

      const result = await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
        },
        resolveConfigV2({ ai: { quality: "standard" } }),
        mockAIProvider
      );

      expect(result.pages).toHaveLength(1);
      expect(result.refinement).toBeUndefined();
      // Only 3 calls: analyze, design, index page (no evaluation)
      expect(mockAIProvider.generateText).toHaveBeenCalledTimes(3);
    });
  });
});
