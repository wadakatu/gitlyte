import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RepositoryAnalyzer } from "../../services/repository-analyzer.js";
import type { RepoData } from "../../types/repository.js";
import { OpenAIClient } from "../../utils/openai-client.js";

interface MockOpenAI {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
}

// OpenAI mockを作成
const createMockOpenAI = (): MockOpenAI => ({
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
});

describe("Repository Analyzer", () => {
  let repositoryAnalyzer: RepositoryAnalyzer;

  beforeEach(() => {
    // Mock the OpenAI environment variable
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    
    repositoryAnalyzer = new RepositoryAnalyzer();
    
    // Mock OpenAI client methods
    vi.spyOn(OpenAIClient.prototype, 'analyzeRepository').mockImplementation(async () => ({
      projectType: "application",
      industry: "web",
      audience: "developers",
      features: ["feature1", "feature2"]
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("analyzeRepositoryData", () => {
    const mockRepoData: RepoData = {
      basicInfo: {
        name: "test-repo",
        description: "A test repository",
        html_url: "https://github.com/test/test-repo",
        stargazers_count: 10,
        forks_count: 5,
        language: "TypeScript",
        topics: ["test"],
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-12-01T00:00:00Z",
        default_branch: "main",
        license: { key: "mit", name: "MIT License" },
      },
      readme: "# Test Repo\nThis is a test repository for testing.",
      packageJson: null,
      languages: {},
      issues: [
        {
          title: "Fix bug",
          number: 1,
          state: "open",
          user: { login: "testuser" },
          created_at: "2023-01-01T00:00:00Z",
        },
      ],
      pullRequests: [],
      prs: [
        {
          title: "Add feature",
          user: { login: "testuser" },
          merged_at: "2023-01-01T00:00:00Z",
        },
      ],
      configFile: null,
      codeStructure: {
        files: [],
        directories: [],
        hasTests: false,
        testFiles: [],
      },
      fileStructure: [],
    };

    it("should analyze repository data successfully", async () => {
      const result = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result).toBeDefined();
      expect(result.basicInfo).toBeDefined();
      expect(result.basicInfo.name).toBe("test-repo");
      expect(result.basicInfo.description).toBe("A test repository");
      expect(result.basicInfo.language).toBe("TypeScript");
      expect(result.projectCharacteristics).toBeDefined();
      expect(result.projectCharacteristics.type).toBe("application");
      expect(result.codeAnalysis).toBeDefined();
      expect(result.contentAnalysis).toBeDefined();
    });

    it("should extract basic info correctly", async () => {
      const result = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.basicInfo.name).toBe("test-repo");
      expect(result.basicInfo.description).toBe("A test repository");
      expect(result.basicInfo.language).toBe("TypeScript");
      expect(result.basicInfo.license).toBe("mit");
    });

    it("should analyze code structure", async () => {
      const result = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.codeAnalysis.hasTests).toBe(false);
      expect(result.codeAnalysis.testCoverage).toBe(0);
      expect(result.codeAnalysis.hasDocumentation).toBe(true); // has README
    });

    it("should analyze content", async () => {
      const result = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.contentAnalysis.readme.exists).toBe(true);
      expect(result.contentAnalysis.readme.content).toContain("Test Repo");
      expect(result.contentAnalysis.hasLicense).toBe(true);
    });

    it("should determine project maturity", async () => {
      const result = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(result.projectCharacteristics.maturity).toBe("alpha"); // 10 stars, has license but no tests
    });

    it("should handle error gracefully", async () => {
      vi.spyOn(OpenAIClient.prototype, 'analyzeRepository').mockRejectedValue(new Error("API Error"));

      await expect(repositoryAnalyzer.analyzeRepositoryData(mockRepoData)).rejects.toThrow("Failed to analyze repository");
    });
  });
});
