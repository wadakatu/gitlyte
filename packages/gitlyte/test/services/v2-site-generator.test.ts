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
      expect(result.usedFallback).toBe(true);
    });

    it("should set usedFallback to false on successful parse", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "success-repo",
          description: "Successfully parsed",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "minimal",
          keyFeatures: ["feature1"],
        }),
      });

      const result = await analyzeRepository(
        {
          name: "success-repo",
          description: "Successfully parsed",
          language: "TypeScript",
        },
        mockAIProvider
      );

      expect(result.usedFallback).toBe(false);
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
    it("should generate design system from analysis with light/dark palettes", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            light: {
              primary: "blue-600",
              secondary: "indigo-500",
              accent: "purple-400",
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

      expect(result.colors.light.primary).toBe("blue-600");
      expect(result.colors.light.secondary).toBe("indigo-500");
      expect(result.colors.dark.primary).toBe("blue-400");
      expect(result.colors.dark.background).toBe("gray-950");
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

      expect(result.colors.light.primary).toBe("blue-600");
      expect(result.colors.light.background).toBe("white");
      expect(result.colors.dark.primary).toBe("blue-400");
      expect(result.colors.dark.background).toBe("gray-950");
      expect(result.typography.headingFont).toBe(
        "Inter, system-ui, sans-serif"
      );
      expect(result.layout).toBe("hero-centered");
      expect(result.usedFallback).toBe(true);
    });

    it("should set usedFallback to false on successful parse", async () => {
      vi.mocked(mockAIProvider.generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          colors: {
            light: {
              primary: "green-600",
              secondary: "teal-500",
              accent: "cyan-400",
              background: "gray-50",
              text: "gray-800",
            },
            dark: {
              primary: "green-400",
              secondary: "teal-400",
              accent: "cyan-400",
              background: "gray-950",
              text: "gray-50",
            },
          },
          typography: {
            headingFont: "Poppins",
            bodyFont: "Open Sans",
          },
          layout: "feature-grid",
        }),
      });

      const result = await generateDesignSystem(
        {
          name: "test",
          description: "desc",
          projectType: "webapp",
          primaryLanguage: "JavaScript",
          audience: "general",
          style: "creative",
          keyFeatures: [],
        },
        mockAIProvider
      );

      expect(result.usedFallback).toBe(false);
      expect(result.colors.light.primary).toBe("green-600");
      expect(result.colors.dark.primary).toBe("green-400");
      expect(result.layout).toBe("feature-grid");
    });
  });

  describe("generateIndexPage", () => {
    const mockDesignSystem = {
      colors: {
        light: {
          primary: "blue-600",
          secondary: "indigo-500",
          accent: "purple-400",
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
      layout: "hero-centered" as const,
    };

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
        mockDesignSystem,
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
        mockDesignSystem,
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
        mockDesignSystem,
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
        mockDesignSystem,
        resolveConfigV2({}),
        mockAIProvider
      );

      expect(result).toContain("<!DOCTYPE html>");
      expect(result).not.toContain("```");
    });

    it("should use light mode palette when theme is light", async () => {
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

      await generateIndexPage(
        {
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        },
        mockDesignSystem,
        resolveConfigV2({ theme: { mode: "light" } }),
        mockAIProvider
      );

      // Verify the prompt includes light mode colors
      expect(mockAIProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("light mode"),
        })
      );
    });
  });

  describe("generateSite", () => {
    const mockDesignSystemResponse = JSON.stringify({
      colors: {
        light: {
          primary: "blue-600",
          secondary: "indigo-500",
          accent: "purple-400",
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
      typography: { headingFont: "Inter", bodyFont: "Inter" },
      layout: "hero-centered",
    });

    it("should generate complete site with index page", async () => {
      // New architecture: analyze -> design -> analyzeSections -> generateSections (parallel)
      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: ["feature1"],
        }),
        // 2. generateDesignSystem
        mockDesignSystemResponse,
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "features", "footer"],
          reasoning: "Standard library sections",
        }),
        // 4-6. generateSection calls (hero, features, footer)
        '<section id="hero"><h1>Welcome to test</h1></section>',
        '<section id="features"><h2>Features</h2></section>',
        '<section id="footer"><footer>Copyright</footer></section>',
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
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
      expect(result.pages[0].html).toContain("tailwindcss");
      expect(result.assets).toEqual([]);
    });

    it("should generate additional pages when configured", async () => {
      // New architecture flow with additional legacy pages
      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        }),
        // 2. generateDesignSystem
        mockDesignSystemResponse,
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "footer"],
          reasoning: "Minimal sections",
        }),
        // 4-5. generateSection calls (hero, footer)
        '<section id="hero"><h1>Welcome</h1></section>',
        '<section id="footer"><footer>Footer</footer></section>',
        // 6. Legacy additional page (features)
        "<!DOCTYPE html><html><head></head><body>Features</body></html>",
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
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
      // New architecture: analyze -> design -> analyzeSections -> generateSections (parallel)
      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "A great project",
          projectType: "tool",
          primaryLanguage: "Go",
          audience: "developers",
          style: "technical",
          keyFeatures: ["fast", "reliable"],
        }),
        // 2. generateDesignSystem
        JSON.stringify({
          colors: {
            light: {
              primary: "green-600",
              secondary: "teal-500",
              accent: "cyan-400",
              background: "gray-50",
              text: "gray-800",
            },
            dark: {
              primary: "green-400",
              secondary: "teal-400",
              accent: "cyan-400",
              background: "gray-950",
              text: "gray-50",
            },
          },
          typography: { headingFont: "Fira Code", bodyFont: "Inter" },
          layout: "minimal",
        }),
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "features", "footer"],
          reasoning: "Standard sections",
        }),
        // 4-6. generateSection calls (hero, features, footer)
        '<section id="hero"><h1>Welcome</h1></section>',
        '<section id="features"><h2>Features</h2></section>',
        '<section id="footer"><footer>Footer</footer></section>',
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
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
      expect(result.pages[0].html).toContain("<!DOCTYPE html>");
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

      // New architecture flow
      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: ["feature1"],
        }),
        // 2. generateDesignSystem
        mockDesignSystemResponse,
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "footer"],
          reasoning: "Minimal sections",
        }),
        // 4-5. generateSection calls (hero, footer)
        '<section id="hero"><h1>Welcome</h1></section>',
        '<section id="footer"><footer>Footer</footer></section>',
        // 6. Self-Refine evaluation
        JSON.stringify(mockEvaluation),
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
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
      // New architecture flow
      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        }),
        // 2. generateDesignSystem
        mockDesignSystemResponse,
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "footer"],
          reasoning: "Minimal sections",
        }),
        // 4-5. generateSection calls (hero, footer)
        '<section id="hero"><h1>Welcome</h1></section>',
        '<section id="footer"><footer>Footer</footer></section>',
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
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
      // New architecture: analyze(1) + design(1) + analyzeSections(1) + sections(2) = 5
      expect(mockAIProvider.generateText).toHaveBeenCalledTimes(5);
    });

    it("should use configured theme mode for site generation", async () => {
      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        }),
        // 2. generateDesignSystem
        mockDesignSystemResponse,
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "footer"],
          reasoning: "Minimal sections",
        }),
        // 4-5. generateSection calls (hero, footer)
        '<section id="hero"><h1>Welcome</h1></section>',
        '<section id="footer"><footer>Footer</footer></section>',
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
      });

      const result = await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
        },
        resolveConfigV2({ theme: { mode: "light" } }),
        mockAIProvider
      );

      expect(result.pages).toHaveLength(1);
      // Light mode should use light background
      expect(result.pages[0].html).toContain("bg-white");
    });

    it("should pass siteInstructions from config to section generator", async () => {
      const customInstructions =
        "技術的で簡潔なトーンで、日本語で生成してください";

      const mockResponses = [
        // 1. analyzeRepository
        JSON.stringify({
          name: "test",
          description: "desc",
          projectType: "library",
          primaryLanguage: "TypeScript",
          audience: "developers",
          style: "professional",
          keyFeatures: [],
        }),
        // 2. generateDesignSystem
        mockDesignSystemResponse,
        // 3. analyzeSections
        JSON.stringify({
          sections: ["hero", "footer"],
          reasoning: "Minimal sections",
        }),
        // 4-5. generateSection calls (hero, footer)
        '<section id="hero"><h1>ようこそ</h1></section>',
        '<section id="footer"><footer>フッター</footer></section>',
      ];

      let callIndex = 0;
      vi.mocked(mockAIProvider.generateText).mockImplementation(async () => {
        const response = mockResponses[callIndex] || "<section></section>";
        callIndex++;
        return { text: response };
      });

      await generateSite(
        {
          name: "test",
          description: "desc",
          url: "https://github.com/user/test",
        },
        resolveConfigV2({
          prompts: { siteInstructions: customInstructions },
        }),
        mockAIProvider
      );

      // Verify section generation calls include custom instructions
      const calls = vi.mocked(mockAIProvider.generateText).mock.calls;
      // Section generation calls are after analyze(1), design(1), analyzeSections(1)
      // So calls[3] and calls[4] should be section generation calls
      const sectionCalls = calls.slice(3);

      // At least one section call should include the custom instructions
      const hasCustomInstructions = sectionCalls.some((call) => {
        const prompt = (call[0] as { prompt: string }).prompt;
        return (
          prompt.includes("CUSTOM INSTRUCTIONS") &&
          prompt.includes(customInstructions)
        );
      });

      expect(hasCustomInstructions).toBe(true);
    });
  });
});
