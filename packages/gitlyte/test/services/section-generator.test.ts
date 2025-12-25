import { describe, it, expect, vi } from "vitest";
import {
  analyzeSections,
  generateSection,
  generateSectionsParallel,
  assembleHtml,
  type SectionContext,
  type SectionPlan,
} from "../../services/section-generator.js";
import type { AIProviderInstance } from "../../utils/ai-provider.js";
import type {
  RepositoryAnalysis,
  DesignSystem,
} from "../../services/v2-site-generator.js";

// Mock AI provider
function createMockAIProvider(
  responses: Record<string, string>
): AIProviderInstance {
  let callCount = 0;
  const responseKeys = Object.keys(responses);

  return {
    provider: "anthropic",
    quality: "standard",
    generateText: vi.fn().mockImplementation(async ({ prompt }) => {
      // Try to match prompt to a specific response
      for (const key of responseKeys) {
        if (prompt.includes(key)) {
          return { text: responses[key] };
        }
      }
      // Default: cycle through responses
      const key = responseKeys[callCount % responseKeys.length];
      callCount++;
      return { text: responses[key] };
    }),
  };
}

// Test fixtures
const mockAnalysis: RepositoryAnalysis = {
  name: "test-project",
  description: "A test project for unit testing",
  projectType: "library",
  primaryLanguage: "TypeScript",
  audience: "developers",
  style: "professional",
  keyFeatures: ["Fast", "Type-safe", "Easy to use"],
};

const mockDesign: DesignSystem = {
  colors: {
    light: {
      primary: "blue-600",
      secondary: "indigo-500",
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

const mockSectionContext: SectionContext = {
  analysis: mockAnalysis,
  design: mockDesign,
  repoInfo: {
    name: "test-project",
    description: "A test project",
    readme: "# Test Project\n\nThis is a test.",
    url: "https://github.com/test/test-project",
  },
  themeMode: "dark",
};

describe("section-generator", () => {
  describe("analyzeSections", () => {
    it("should return sections from AI response", async () => {
      const mockProvider = createMockAIProvider({
        Analyze: JSON.stringify({
          sections: ["hero", "features", "installation", "footer"],
          reasoning: "Standard library sections",
        }),
      });

      const result = await analyzeSections(
        mockAnalysis,
        "# README\nInstallation: npm install test",
        mockProvider
      );

      expect(result.sections).toContain("hero");
      expect(result.sections).toContain("footer");
      expect(result.reasoning).toBeDefined();
    });

    it("should ensure hero and footer are always present", async () => {
      const mockProvider = createMockAIProvider({
        Analyze: JSON.stringify({
          sections: ["features"], // Missing hero and footer
          reasoning: "Only features needed",
        }),
      });

      const result = await analyzeSections(
        mockAnalysis,
        undefined,
        mockProvider
      );

      expect(result.sections[0]).toBe("hero");
      expect(result.sections[result.sections.length - 1]).toBe("footer");
    });

    it("should return fallback sections on parse error", async () => {
      const mockProvider = createMockAIProvider({
        Analyze: "Invalid JSON response",
      });

      const result = await analyzeSections(
        mockAnalysis,
        undefined,
        mockProvider
      );

      expect(result.sections).toContain("hero");
      expect(result.sections).toContain("footer");
      expect(result.reasoning).toContain("parsing error");
    });
  });

  describe("generateSection", () => {
    it("should generate a hero section", async () => {
      const mockProvider = createMockAIProvider({
        hero: '<section id="hero" class="py-20"><h1>Welcome</h1></section>',
      });

      const result = await generateSection(
        "hero",
        mockSectionContext,
        0,
        mockProvider
      );

      expect(result.type).toBe("hero");
      expect(result.html).toContain("<section");
      expect(result.order).toBe(0);
    });

    it("should wrap non-section HTML in section tags", async () => {
      const mockProvider = createMockAIProvider({
        features: '<div class="features"><h2>Features</h2></div>',
      });

      const result = await generateSection(
        "features",
        mockSectionContext,
        1,
        mockProvider
      );

      expect(result.html).toContain('<section id="features"');
    });

    it("should clean markdown code blocks from response", async () => {
      const mockProvider = createMockAIProvider({
        footer:
          '```html\n<section id="footer"><footer>Copyright</footer></section>\n```',
      });

      const result = await generateSection(
        "footer",
        mockSectionContext,
        2,
        mockProvider
      );

      expect(result.html).not.toContain("```");
      expect(result.html).toContain("<section");
    });

    it("should include light mode palette in AI prompt when themeMode is light", async () => {
      const lightContext: SectionContext = {
        ...mockSectionContext,
        themeMode: "light",
      };

      const mockProvider = createMockAIProvider({
        hero: '<section id="hero"><h1>Welcome</h1></section>',
      });

      await generateSection("hero", lightContext, 0, mockProvider);

      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("light mode"),
        })
      );
      // Light mode palette should have white background
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Background: white"),
        })
      );
    });

    it("should include siteInstructions in AI prompt when provided", async () => {
      const contextWithInstructions: SectionContext = {
        ...mockSectionContext,
        siteInstructions: "技術的で簡潔なトーンで、日本語で生成してください",
      };

      const mockProvider = createMockAIProvider({
        hero: '<section id="hero"><h1>ようこそ</h1></section>',
      });

      await generateSection("hero", contextWithInstructions, 0, mockProvider);

      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("CUSTOM INSTRUCTIONS"),
        })
      );
      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining(
            "技術的で簡潔なトーンで、日本語で生成してください"
          ),
        })
      );
    });

    it("should not include CUSTOM INSTRUCTIONS section when siteInstructions is not provided", async () => {
      const contextWithoutInstructions: SectionContext = {
        ...mockSectionContext,
        siteInstructions: undefined,
      };

      const mockProvider = createMockAIProvider({
        hero: '<section id="hero"><h1>Welcome</h1></section>',
      });

      await generateSection(
        "hero",
        contextWithoutInstructions,
        0,
        mockProvider
      );

      expect(mockProvider.generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.not.stringContaining("CUSTOM INSTRUCTIONS"),
        })
      );
    });
  });

  describe("generateSectionsParallel", () => {
    it("should generate multiple sections in parallel", async () => {
      const mockProvider = createMockAIProvider({
        hero: '<section id="hero"><h1>Hero</h1></section>',
        features: '<section id="features"><h2>Features</h2></section>',
        footer: '<section id="footer"><footer>Footer</footer></section>',
      });

      const sectionPlan: SectionPlan = {
        sections: ["hero", "features", "footer"],
        reasoning: "Test sections",
      };

      const results = await generateSectionsParallel(
        sectionPlan,
        mockSectionContext,
        mockProvider
      );

      expect(results).toHaveLength(3);
      expect(results[0].type).toBe("hero");
      expect(results[1].type).toBe("features");
      expect(results[2].type).toBe("footer");
    });

    it("should maintain correct order after parallel execution", async () => {
      const mockProvider = createMockAIProvider({
        hero: '<section id="hero"></section>',
        features: '<section id="features"></section>',
        installation: '<section id="installation"></section>',
        footer: '<section id="footer"></section>',
      });

      const sectionPlan: SectionPlan = {
        sections: ["hero", "features", "installation", "footer"],
        reasoning: "Test order",
      };

      const results = await generateSectionsParallel(
        sectionPlan,
        mockSectionContext,
        mockProvider
      );

      expect(results[0].order).toBe(0);
      expect(results[1].order).toBe(1);
      expect(results[2].order).toBe(2);
      expect(results[3].order).toBe(3);
    });
  });

  describe("assembleHtml", () => {
    it("should create a complete HTML document", () => {
      const sections = [
        {
          type: "hero" as const,
          html: '<section id="hero"><h1>Welcome</h1></section>',
          order: 0,
        },
        {
          type: "footer" as const,
          html: '<section id="footer"><footer>Copyright</footer></section>',
          order: 1,
        },
      ];

      const html = assembleHtml(sections, mockSectionContext, {});

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("tailwindcss");
      expect(html).toContain('<section id="hero">');
      expect(html).toContain('<section id="footer">');
    });

    it("should include navigation", () => {
      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
        { type: "features" as const, html: "<section></section>", order: 1 },
        { type: "footer" as const, html: "<section></section>", order: 2 },
      ];

      const html = assembleHtml(sections, mockSectionContext, {});

      expect(html).toContain("<nav");
      expect(html).toContain('href="#hero"');
      expect(html).toContain('href="#features"');
    });

    it("should include favicon when configured", () => {
      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
      ];

      const html = assembleHtml(sections, mockSectionContext, {
        favicon: { path: "/favicon.ico" },
      });

      expect(html).toContain('rel="icon"');
      expect(html).toContain("/favicon.ico");
    });

    it("should include GitHub link", () => {
      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
      ];

      const html = assembleHtml(sections, mockSectionContext, {});

      expect(html).toContain("https://github.com/test/test-project");
      expect(html).toContain("GitHub");
    });

    it("should use light mode palette when themeMode is light", () => {
      const lightModeContext: SectionContext = {
        ...mockSectionContext,
        themeMode: "light",
      };

      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
      ];

      const html = assembleHtml(sections, lightModeContext, {});

      // Light mode should use light background colors
      expect(html).toContain("bg-white");
      expect(html).toContain("bg-white/90"); // light mode nav background
    });

    it("should use dark mode palette when themeMode is dark", () => {
      const darkModeContext: SectionContext = {
        ...mockSectionContext,
        themeMode: "dark",
      };

      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
      ];

      const html = assembleHtml(sections, darkModeContext, {});

      // Dark mode should use dark background colors
      expect(html).toContain("bg-gray-950");
      expect(html).toContain("bg-gray-900/90"); // dark mode nav background
    });

    it("should use correct GitHub button text color for light mode", () => {
      const lightModeContext: SectionContext = {
        ...mockSectionContext,
        themeMode: "light",
      };

      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
      ];

      const html = assembleHtml(sections, lightModeContext, {});

      // Light mode should use white text on colored buttons for contrast
      expect(html).toContain("text-white");
    });

    it("should use correct GitHub button text color for dark mode", () => {
      const darkModeContext: SectionContext = {
        ...mockSectionContext,
        themeMode: "dark",
      };

      const sections = [
        { type: "hero" as const, html: "<section></section>", order: 0 },
      ];

      const html = assembleHtml(sections, darkModeContext, {});

      // Dark mode should use dark text on colored buttons for contrast
      expect(html).toContain("text-gray-900");
    });
  });
});
