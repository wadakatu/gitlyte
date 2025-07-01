import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryAnalyzer } from "../../services/repository-analyzer.js";
import type { RepoData } from "../../types/repository.js";

// Mock Anthropic Client
vi.mock("../../utils/anthropic-client.js", () => ({
  AnthropicClient: vi.fn().mockImplementation(() => ({
    analyzeRepository: vi.fn(),
  })),
}));

// Mock GitHub utils
vi.mock("../../utils/github.js", () => ({
  collectRepoData: vi.fn(),
}));

describe("Repository Analyzer", () => {
  let repositoryAnalyzer: RepositoryAnalyzer;
  let mockRepoData: RepoData;

  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-api-key");
    repositoryAnalyzer = new RepositoryAnalyzer();

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
      prs: [],
      configFile: null,
      codeStructure: {
        files: ["src/index.ts"],
        directories: ["src"],
        hasTests: true,
        testFiles: ["test/index.test.ts"],
      },
      fileStructure: [],
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("analyzeRepository", () => {
    it("should analyze repository from GitHub context", async () => {
      const { collectRepoData } = await import("../../utils/github.js");
      const mockContext = {
        repo: () => ({ owner: "owner", repo: "repo" }),
      } as never;

      vi.mocked(collectRepoData).mockResolvedValue(mockRepoData);
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockResolvedValue({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["Type safety", "Easy integration"],
      });

      const result = await repositoryAnalyzer.analyzeRepository(mockContext);

      expect(collectRepoData).toHaveBeenCalledWith(mockContext);
      expect(result).toBeDefined();
      expect(result.basicInfo.name).toBe("test-repo");
      expect(result.projectCharacteristics.type).toBe("library");
    });

    it("should analyze repository from existing RepoData", async () => {
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockResolvedValue({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["Type safety", "Easy integration"],
      });

      const result =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result).toBeDefined();
      expect(result.basicInfo.name).toBe("test-repo");
      expect(result.projectCharacteristics.type).toBe("library");
    });

    it("should handle repository data collection errors", async () => {
      const { collectRepoData } = await import("../../utils/github.js");
      const mockContext = {
        repo: () => ({ owner: "owner", repo: "invalid" }),
      } as never;

      vi.mocked(collectRepoData).mockRejectedValue(
        new Error("Repository not found")
      );

      await expect(
        repositoryAnalyzer.analyzeRepository(mockContext)
      ).rejects.toThrow("Failed to analyze repository");
    });

    it("should handle AI analysis errors", async () => {
      const { collectRepoData } = await import("../../utils/github.js");
      const mockContext = {
        repo: () => ({ owner: "owner", repo: "repo" }),
      } as never;

      vi.mocked(collectRepoData).mockResolvedValue(mockRepoData);
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockRejectedValue(new Error("AI analysis failed"));

      await expect(
        repositoryAnalyzer.analyzeRepository(mockContext)
      ).rejects.toThrow("Failed to analyze repository");
    });

    it("should process repository metadata correctly", async () => {
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockResolvedValue({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["Type safety", "Easy integration"],
      });

      const result =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.basicInfo.name).toBe("test-repo");
      expect(result.basicInfo.description).toBe("A test repository");
      expect(result.basicInfo.language).toBe("TypeScript");
      expect(result.basicInfo.license).toBe("mit");
      expect(result.basicInfo.topics).toEqual(["javascript", "library"]);
    });

    it("should analyze code structure correctly", async () => {
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockResolvedValue({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["Type safety"],
      });

      const result =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.codeAnalysis.languages).toEqual({
        TypeScript: 80,
        JavaScript: 20,
      });
      expect(result.codeAnalysis.hasTests).toBe(true);
      expect(result.codeAnalysis.hasDocumentation).toBe(true);
      expect(result.codeAnalysis.codeComplexity).toBe("simple");
    });

    it("should analyze content structure correctly", async () => {
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockResolvedValue({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["Type safety"],
      });

      const result =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.contentAnalysis.readme.exists).toBe(true);
      expect(result.contentAnalysis.readme.content).toContain("Test Repo");
      expect(result.contentAnalysis.hasLicense).toBe(true);
    });
  });

  describe("enrichAnalysis", () => {
    it("should enrich basic analysis with detailed insights", async () => {
      vi.mocked(
        repositoryAnalyzer.anthropicClient.analyzeRepository
      ).mockResolvedValue({
        projectType: "library",
        industry: "devtools",
        audience: "developers",
        features: ["Type safety", "Easy integration"],
      });

      const baseAnalysis =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const enrichedAnalysis = await repositoryAnalyzer.enrichAnalysis(
        baseAnalysis,
        mockRepoData
      );

      expect(enrichedAnalysis.uniqueFeatures).toContain("Type safety");
      expect(enrichedAnalysis.competitiveAdvantages).toBeDefined();
      expect(enrichedAnalysis.suggestedUseCases).toBeDefined();
    });
  });
});
