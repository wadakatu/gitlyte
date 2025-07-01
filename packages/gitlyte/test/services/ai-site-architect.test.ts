import { beforeEach, describe, expect, it } from "vitest";
import type { RepositoryAnalysis } from "../../types/repository.js";
import {
  designSiteArchitecture,
  generateComponentSpecs,
  setAnthropicClient,
} from "../../services/ai-site-architect.js";
import type { RepoData } from "../../types/repository.js";

// Mock Anthropic client
const mockAnthropic = {
  messages: {
    create: async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            concept: {
              theme: "Modern Developer Tool",
              mood: "professional",
              target_impression: "innovative",
            },
            layout: {
              structure: "single-page",
              navigation: "sticky-header",
              sections: [
                {
                  id: "hero",
                  type: "hero",
                  position: 1,
                  content_strategy: {
                    focus: "repository-overview",
                    tone: "welcoming",
                    data_source: ["repo"],
                  },
                  design_spec: {
                    layout_pattern: "centered",
                    visual_hierarchy: "prominent",
                    interaction: "animated",
                    responsive_behavior: "stack on mobile",
                  },
                },
              ],
            },
            design: {
              color_palette: {
                primary: "#667eea",
                secondary: "#764ba2",
                accent: "#f093fb",
                background: "#ffffff",
                surface: "#f8fafc",
                text: {
                  primary: "#2d3748",
                  secondary: "#718096",
                  accent: "#667eea",
                },
              },
              typography: {
                heading: {
                  font: "Inter, sans-serif",
                  weight: "700",
                  scale: "moderate",
                },
                body: {
                  font: "system-ui, sans-serif",
                  size: "16px",
                  line_height: "1.6",
                },
                code: {
                  font: "JetBrains Mono, monospace",
                  style: "minimal",
                },
              },
              spacing: {
                scale: "normal",
                rhythm: "geometric",
              },
              visual_style: {
                approach: "gradient",
                borders: "subtle",
                shadows: "soft",
                animations: "engaging",
              },
            },
          }),
        },
      ],
    }),
  },
} as unknown as Parameters<typeof setAnthropicClient>[0];

describe("AI Site Architect", () => {
  const mockRepoData: RepoData = {
    basicInfo: {
      name: "test-repo",
      description: "A test repository",
      html_url: "https://github.com/test/test-repo",
      stargazers_count: 42,
      forks_count: 7,
      language: "TypeScript",
      topics: ["test"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    readme: "# Test Repo\nThis is a test repository for AI generation.",
    packageJson: null,
    languages: {},
    issues: [],
    pullRequests: [],
    prs: [],
    configFile: null,
    codeStructure: {
      files: [],
      directories: [],
      hasTests: false,
      testFiles: [],
    },
    fileStructure: [],
  };

  const mockAnalysis: RepositoryAnalysis = {
    basicInfo: {
      name: "test-repo",
      description: "A test repository",
      topics: ["test"],
      language: "TypeScript",
      license: "MIT License",
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
        content: "# Test Repo\nThis is a test repository for AI generation.",
        sections: ["Installation", "Usage", "API"],
        hasInstallation: true,
        hasUsage: true,
        hasExamples: true,
      },
      hasChangelog: false,
      hasContributing: false,
      hasLicense: true,
      hasExamples: false,
    },
    projectCharacteristics: {
      type: "library",
      industry: "devtools",
      audience: "developers",
      maturity: "beta",
    },
    technicalStack: {
      frontend: ["React", "TypeScript"],
      backend: [],
      database: [],
      deployment: ["npm"],
      testing: ["Vitest"],
    },
    uniqueFeatures: ["AI-powered", "Real-time analysis"],
    competitiveAdvantages: ["Fast", "Easy to use"],
    suggestedUseCases: ["Development", "Automation"],
  };

  beforeEach(() => {
    setAnthropicClient(
      mockAnthropic as unknown as Parameters<typeof setAnthropicClient>[0]
    );
  });

  describe("designSiteArchitecture", () => {
    it("should generate a complete site architecture", async () => {
      const result = await designSiteArchitecture(mockRepoData, mockAnalysis);

      expect(result).toBeDefined();
      expect(result.concept).toBeDefined();
      expect(result.concept.theme).toBe("Modern Developer Tool");
      expect(result.concept.mood).toBe("professional");
      expect(result.concept.target_impression).toBe("innovative");

      expect(result.layout).toBeDefined();
      expect(result.layout.structure).toBe("single-page");
      expect(result.layout.navigation).toBe("sticky-header");
      expect(result.layout.sections).toHaveLength(1);
      expect(result.layout.sections[0].type).toBe("hero");

      expect(result.design).toBeDefined();
      expect(result.design.color_palette.primary).toBe("#667eea");
      expect(result.design.typography.heading.font).toBe("Inter, sans-serif");
      expect(result.design.visual_style.approach).toBe("gradient");
    });

    it("should handle API errors gracefully", async () => {
      // エラーが発生するモックを設定
      const errorMockAnthropic = {
        messages: {
          create: async () => {
            throw new Error("API Error");
          },
        },
      };
      setAnthropicClient(
        errorMockAnthropic as unknown as Parameters<
          typeof setAnthropicClient
        >[0]
      );

      const result = await designSiteArchitecture(mockRepoData, mockAnalysis);

      // フォールバックのアーキテクチャが返されることを確認
      expect(result).toBeDefined();
      expect(result.concept.theme).toBe("Modern Project Showcase");
      expect(result.layout.structure).toBe("single-page");
      expect(result.design.color_palette.primary).toBe("#667eea");
    });
  });

  describe("generateComponentSpecs", () => {
    const mockSection = {
      id: "hero",
      type: "hero" as const,
      position: 1,
      content_strategy: {
        focus: "repository-overview",
        tone: "welcoming",
        data_source: ["repo"],
      },
      design_spec: {
        layout_pattern: "centered",
        visual_hierarchy: "prominent" as const,
        interaction: "animated" as const,
        responsive_behavior: "stack on mobile",
      },
    };

    const mockArchitecture = {
      concept: {
        theme: "Modern Developer Tool",
        mood: "professional",
        target_impression: "innovative",
      },
      layout: {
        structure: "single-page" as const,
        navigation: "sticky-header" as const,
        sections: [mockSection],
      },
      design: {
        color_palette: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#f093fb",
          background: "#ffffff",
          surface: "#f8fafc",
          text: {
            primary: "#2d3748",
            secondary: "#718096",
            accent: "#667eea",
          },
        },
        typography: {
          heading: {
            font: "Inter, sans-serif",
            weight: "700",
            scale: "moderate" as const,
          },
          body: {
            font: "system-ui, sans-serif",
            size: "16px",
            line_height: "1.6",
          },
          code: {
            font: "JetBrains Mono, monospace",
            style: "minimal" as const,
          },
        },
        spacing: {
          scale: "normal" as const,
          rhythm: "geometric" as const,
        },
        visual_style: {
          approach: "gradient" as const,
          borders: "subtle" as const,
          shadows: "soft" as const,
          animations: "engaging" as const,
        },
      },
    };

    it("should generate component specifications", async () => {
      // コンポーネント仕様生成用のモック
      const componentMock = {
        messages: {
          create: async () => ({
            content: [
              {
                type: "text",
                text: JSON.stringify([
                  {
                    name: "HeroSection",
                    purpose: "Display the main hero section",
                    props_interface:
                      "export interface Props { title: string; subtitle: string; }",
                    html_structure:
                      "<section class='hero'><h1>{title}</h1><p>{subtitle}</p></section>",
                    css_styles: ".hero { padding: 4rem; text-align: center; }",
                    responsive_rules:
                      "@media (max-width: 768px) { .hero { padding: 2rem; } }",
                  },
                ]),
              },
            ],
          }),
        },
      };
      setAnthropicClient(
        componentMock as unknown as Parameters<typeof setAnthropicClient>[0]
      );

      const result = await generateComponentSpecs(
        mockSection,
        mockArchitecture,
        mockRepoData
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("HeroSection");
      expect(result[0].purpose).toBe("Display the main hero section");
      expect(result[0].props_interface).toContain("export interface Props");
      expect(result[0].html_structure).toContain("<section");
      expect(result[0].css_styles).toContain(".hero");
      expect(result[0].responsive_rules).toContain("@media");
    });

    it("should provide fallback component specs on error", async () => {
      const errorMock = {
        messages: {
          create: async () => {
            throw new Error("API Error");
          },
        },
      };
      setAnthropicClient(
        errorMock as unknown as Parameters<typeof setAnthropicClient>[0]
      );

      const result = await generateComponentSpecs(
        mockSection,
        mockArchitecture,
        mockRepoData
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("HeroSection");
      expect(result[0].purpose).toBe("Display hero information");
    });
  });
});
