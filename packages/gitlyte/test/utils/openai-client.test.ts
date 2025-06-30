import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignSystem } from "../../types/generated-site.js";
import type { RepoData, RepositoryAnalysis } from "../../types/repository.js";
import { OpenAIClient } from "../../utils/openai-client.js";

// Mock OpenAI
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn(),
      },
    };
  },
}));

describe("OpenAI Client", () => {
  let openaiClient: OpenAIClient;
  let mockRepoData: RepoData;
  let mockAnalysis: RepositoryAnalysis;

  beforeEach(() => {
    // Mock environment variable for testing
    vi.stubEnv("OPENAI_API_KEY", "test-api-key");
    openaiClient = new OpenAIClient();

    mockRepoData = {
      basicInfo: {
        name: "test-repo",
        description: "A test repository",
        html_url: "https://github.com/user/test-repo",
        stargazers_count: 100,
        forks_count: 20,
        topics: ["javascript", "library"],
        language: "TypeScript",
        license: { key: "mit", name: "MIT License" },
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-12-01T00:00:00Z",
        default_branch: "main",
      },
      readme: "# Test Repo\n\nA test repository for testing.",
      packageJson: { name: "test-repo", version: "1.0.0" },
      languages: { TypeScript: 80, JavaScript: 20 },
      issues: [],
      pullRequests: [],
      configFile: null,
      codeStructure: {
        files: ["src/index.ts"],
        directories: ["src"],
        hasTests: true,
        testFiles: ["test/index.test.ts"],
      },
      prs: [],
      fileStructure: [],
    };

    mockAnalysis = {
      basicInfo: {
        name: "test-repo",
        description: "A test repository",
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
          content: "# Test Repo",
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
      uniqueFeatures: ["Type safety"],
      competitiveAdvantages: ["Performance"],
      suggestedUseCases: ["Web development"],
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("analyzeRepository", () => {
    it("should analyze repository data using AI", async () => {
      // Mock successful OpenAI response
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                projectType: "library",
                industry: "devtools",
                audience: "developers",
                features: ["Type safety", "Easy integration"],
              }),
            },
          },
        ],
      };

      // Mock the OpenAI API call
      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      const result = await openaiClient.analyzeRepository(mockRepoData);

      expect(result).toBeDefined();
      expect(result.projectType).toBe("library");
      expect(result.industry).toBe("devtools");
      expect(result.audience).toBe("developers");
    });

    it("should handle OpenAI API errors gracefully", async () => {
      // Mock API failure
      vi.mocked(openaiClient.client.chat.completions.create).mockRejectedValue(
        new Error("API Error")
      );

      await expect(
        openaiClient.analyzeRepository(mockRepoData)
      ).rejects.toThrow("Failed to analyze repository");
    });

    it("should clean markdown code blocks from response", async () => {
      // Mock response with markdown code blocks
      const mockResponse = {
        choices: [
          {
            message: {
              content: '```json\n{"projectType": "library"}\n```',
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      const result = await openaiClient.analyzeRepository(mockRepoData);
      expect(result.projectType).toBe("library");
    });
  });

  describe("generateContent", () => {
    it("should generate site content from analysis", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                hero: {
                  title: "Test Repository",
                  subtitle: "A powerful testing library",
                  description: "Built for developers who care about quality",
                },
              }),
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      const result = await openaiClient.generateContent(mockAnalysis, "hero");

      expect(result).toBeDefined();
      expect(result.hero!.title).toBe("Test Repository");
      expect(result.hero!.subtitle).toBe("A powerful testing library");
    });

    it("should handle different content types", async () => {
      const contentTypes = ["hero", "features", "stats"] as const;

      for (const contentType of contentTypes) {
        const mockResponse = {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  [contentType]: { title: `Generated ${contentType}` },
                }),
              },
            },
          ],
        };

        vi.mocked(
          openaiClient.client.chat.completions.create
        ).mockResolvedValue(mockResponse as never);

        const result = await openaiClient.generateContent(
          mockAnalysis,
          contentType
        );
        expect(result).toBeDefined();
      }
    });
  });

  describe("generateDesign", () => {
    it("should generate design system from analysis", async () => {
      const mockDesignSystem: DesignSystem = {
        colors: {
          primary: "#3B82F6",
          secondary: "#8B5CF6",
          accent: "#06B6D4",
          background: "#FFFFFF",
          text: "#1F2937",
          surface: "#F9FAFB",
          border: "#E5E7EB",
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

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockDesignSystem),
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      const result = await openaiClient.generateDesign(mockAnalysis);

      expect(result).toBeDefined();
      expect(result.colors.primary).toBe("#3B82F6");
      expect(result.typography.headings).toBe("Inter, sans-serif");
      expect(result.effects.borderRadius).toBe("8px");
    });

    it("should respect design preferences when provided", async () => {
      const preferences = {
        preferredColors: { primary: "#FF0000" },
        style: "minimal",
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                colors: { primary: "#FF0000" },
                style: "minimal",
              }),
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      const result = await openaiClient.generateDesign(
        mockAnalysis,
        preferences
      );
      expect(result.colors.primary).toBe("#FF0000");
    });
  });

  describe("suggestImprovements", () => {
    it("should generate improvement suggestions", async () => {
      const mockConfig = {
        version: "1.0",
        design: {
          colors: { primary: "#000000" }, // Poor contrast
        },
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify([
                {
                  type: "accessibility",
                  message: "Low color contrast detected",
                  suggestion:
                    "Use a lighter primary color for better readability",
                  priority: "high",
                },
              ]),
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      const result = await openaiClient.suggestImprovements(
        mockConfig,
        mockAnalysis
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("accessibility");
      expect(result[0].priority).toBe("high");
    });
  });

  describe("error handling", () => {
    it("should handle malformed JSON responses", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "invalid json {",
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      await expect(
        openaiClient.analyzeRepository(mockRepoData)
      ).rejects.toThrow();
    });

    it("should handle empty responses", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "",
            },
          },
        ],
      };

      vi.mocked(openaiClient.client.chat.completions.create).mockResolvedValue(
        mockResponse as never
      );

      await expect(
        openaiClient.analyzeRepository(mockRepoData)
      ).rejects.toThrow();
    });
  });
});
