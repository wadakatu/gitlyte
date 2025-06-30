import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationLoader } from "../../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../../services/repository-analyzer.js";
import { SiteGenerator } from "../../services/site-generator.js";
import type { GitLyteConfig } from "../../types/config.js";
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

describe("Layout Configuration Override", () => {
  let mockOpenAI: MockOpenAI;
  let configLoader: ConfigurationLoader;
  let repositoryAnalyzer: RepositoryAnalyzer;
  let siteGenerator: SiteGenerator;

  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    
    // Mock the OpenAI environment variable
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    
    configLoader = new ConfigurationLoader();
    repositoryAnalyzer = new RepositoryAnalyzer();
    siteGenerator = new SiteGenerator();
    
    // Mock OpenAI client
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

  describe("Configuration Loader with layout config", () => {
    it("should use configured layout when provided", async () => {
      const config: GitLyteConfig = {
        site: {
          layout: "minimal",
        },
      };

      const merged = configLoader.mergeWithDefaults(config);
      expect(merged.site?.layout).toBe("minimal");
    });

    it("should use default layout when not configured", async () => {
      const config: GitLyteConfig = {};

      const merged = configLoader.mergeWithDefaults(config);
      expect(merged.site?.layout).toBe("hero-focused"); // default
    });

    it("should validate layout configuration", () => {
      const config: GitLyteConfig = {
        site: {
          layout: "minimal",
        },
      };

      const validation = configLoader.validateConfiguration(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should reject invalid layout values", () => {
      const config: GitLyteConfig = {
        site: {
          layout: "invalid-layout" as any,
        },
      };

      const validation = configLoader.validateConfiguration(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain("Invalid layout value");
    });
  });

  describe("Repository Analyzer integration", () => {
    it("should analyze repository data successfully", async () => {
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);

      expect(analysis).toBeDefined();
      expect(analysis.basicInfo).toBeDefined();
      expect(analysis.basicInfo.name).toBe("test-repo");
      expect(analysis.projectCharacteristics).toBeDefined();
    });
  });

  describe("Site Generator with layout config", () => {
    it("should generate site with configured layout", async () => {
      const config: GitLyteConfig = {
        site: {
          layout: "minimal",
        },
      };

      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, config);

      expect(site).toBeDefined();
      expect(site.pages).toBeDefined();
      expect(site.pages["index.html"]).toBeDefined();
      expect(site.assets).toBeDefined();
      expect(site.meta).toBeDefined();
    });
  });
});
