import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignSystem } from "../../types/generated-site.js";
import type { RepoData, RepositoryAnalysis } from "../../types/repository.js";
import { AnthropicClient } from "../../utils/anthropic-client.js";

// Mock Anthropic
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn(),
    };
  },
}));

describe("Anthropic Client", () => {
  let anthropicClient: AnthropicClient;
  let mockRepoData: RepoData;
  let mockAnalysis: RepositoryAnalysis;

  beforeEach(() => {
    // Mock environment variable for testing
    vi.stubEnv("ANTHROPIC_API_KEY", "test-api-key");
    anthropicClient = new AnthropicClient();

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
        testFiles: ["src/index.test.ts"],
      },
      fileStructure: [],
      prs: [],
    };

    mockAnalysis = {
      basicInfo: {
        name: "test-repo",
        description: "A test repository",
        topics: ["javascript", "library"],
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
          content: "# Test Repo\n\nA test repository for testing.",
          sections: ["Installation", "Usage"],
          hasInstallation: true,
          hasUsage: true,
          hasExamples: false,
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
        maturity: "stable",
      },
      technicalStack: {
        frontend: ["TypeScript"],
        backend: [],
        database: [],
        deployment: ["npm"],
        testing: ["vitest"],
      },
      uniqueFeatures: ["lightweight", "type-safe"],
      competitiveAdvantages: ["small bundle size"],
      suggestedUseCases: ["building libraries"],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("analyzeRepository", () => {
    it("should analyze repository and return analysis result", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              projectType: "library",
              industry: "devtools",
              audience: "developers",
              features: ["lightweight", "type-safe"],
            }),
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      const result = await anthropicClient.analyzeRepository(mockRepoData);

      expect(result).toEqual({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["lightweight", "type-safe"],
      });

      expect(anthropicClient.client.messages.create).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: expect.stringContaining("Analyze this repository"),
          },
        ],
        system: expect.stringContaining(
          "expert at analyzing software repositories"
        ),
        temperature: 0.3,
        max_tokens: 1500,
      });
    });

    it("should handle API errors gracefully", async () => {
      vi.mocked(anthropicClient.client.messages.create).mockRejectedValue(
        new Error("API Error")
      );

      await expect(
        anthropicClient.analyzeRepository(mockRepoData)
      ).rejects.toThrow("Failed to analyze repository: API Error");
    });

    it("should clean JSON response correctly", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: '```json\n{"projectType": "library"}```',
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      const result = await anthropicClient.analyzeRepository(mockRepoData);
      expect(result).toEqual({ projectType: "library" });
    });
  });

  describe("generateContent", () => {
    it("should generate hero content", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              hero: {
                title: "Test Repo",
                subtitle: "A powerful library",
                description: "Build amazing things",
              },
            }),
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      const result = await anthropicClient.generateContent(
        mockAnalysis,
        "hero"
      );

      expect(result).toEqual({
        hero: {
          title: "Test Repo",
          subtitle: "A powerful library",
          description: "Build amazing things",
        },
      });
    });

    it("should generate features content", async () => {
      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              features: {
                title: "Key Features",
                items: [
                  { title: "Fast", description: "Lightning quick" },
                  { title: "Reliable", description: "Rock solid" },
                ],
              },
            }),
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      const result = await anthropicClient.generateContent(
        mockAnalysis,
        "features"
      );

      expect(result).toEqual({
        features: {
          title: "Key Features",
          items: [
            { title: "Fast", description: "Lightning quick" },
            { title: "Reliable", description: "Rock solid" },
          ],
        },
      });
    });
  });

  describe("generateDesign", () => {
    it("should generate design system", async () => {
      const mockDesign: DesignSystem = {
        colors: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#f093fb",
          background: "#ffffff",
          text: "#1f2937",
          surface: "#f8fafc",
          border: "#e5e7eb",
        },
        typography: {
          headings: "Inter, sans-serif",
          body: "system-ui, sans-serif",
          mono: "JetBrains Mono, monospace",
        },
        effects: {
          borderRadius: "8px",
          shadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
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
        content: [
          {
            type: "text",
            text: JSON.stringify(mockDesign),
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      const result = await anthropicClient.generateDesign(mockAnalysis);
      expect(result).toEqual(mockDesign);
    });

    it("should include design preferences if provided", async () => {
      const preferences = {
        preferredColors: { primary: "#ff0000" },
        style: "modern",
      };

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              colors: { primary: "#ff0000" },
            }),
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      await anthropicClient.generateDesign(mockAnalysis, preferences);

      expect(anthropicClient.client.messages.create).toHaveBeenCalledWith({
        model: "claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: expect.stringContaining(JSON.stringify(preferences)),
          },
        ],
        system: expect.any(String),
        temperature: 0.5,
        max_tokens: 2000,
      });
    });
  });

  describe("suggestImprovements", () => {
    it("should generate improvement suggestions", async () => {
      const mockConfig = {
        site: {
          title: "Test Site",
          layout: "hero-focused",
        },
      };

      const mockSuggestions = [
        {
          type: "enhancement",
          message: "Consider adding more features",
          suggestion: "Add testimonials section",
          priority: "medium",
        },
      ];

      const mockResponse = {
        content: [
          {
            type: "text",
            text: JSON.stringify(mockSuggestions),
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      const result = await anthropicClient.suggestImprovements(
        mockConfig as unknown as Parameters<
          typeof anthropicClient.suggestImprovements
        >[0],
        mockAnalysis
      );

      expect(result).toEqual(mockSuggestions);
    });
  });

  describe("error handling", () => {
    it("should throw error when API key is missing", () => {
      vi.unstubAllEnvs();
      expect(() => new AnthropicClient()).toThrow(
        "ANTHROPIC_API_KEY environment variable is required"
      );
    });

    it("should handle empty API response", async () => {
      const mockResponse = {
        content: [],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      await expect(
        anthropicClient.analyzeRepository(mockRepoData)
      ).rejects.toThrow("Empty response from Anthropic");
    });

    it("should handle non-text response", async () => {
      const mockResponse = {
        content: [
          {
            type: "image",
            image: {},
          },
        ],
      };

      vi.mocked(anthropicClient.client.messages.create).mockResolvedValue(
        mockResponse as unknown as Awaited<
          ReturnType<typeof anthropicClient.client.messages.create>
        >
      );

      await expect(
        anthropicClient.analyzeRepository(mockRepoData)
      ).rejects.toThrow("Empty response from Anthropic");
    });
  });
});
