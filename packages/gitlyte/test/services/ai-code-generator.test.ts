import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationLoader } from "../../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../../services/repository-analyzer.js";
import { SiteGenerator } from "../../services/site-generator.js";
import { StaticFileDeployer } from "../../services/static-file-deployer.js";
import type { RepoData } from "../../types/repository.js";
import { AnthropicClient } from "../../utils/anthropic-client.js";

describe("Site Generation Pipeline", () => {
  let configLoader: ConfigurationLoader;
  let repositoryAnalyzer: RepositoryAnalyzer;
  let siteGenerator: SiteGenerator;
  let deployer: StaticFileDeployer;

  beforeEach(() => {
    // Mock the Anthropic environment variable
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    configLoader = new ConfigurationLoader();
    repositoryAnalyzer = new RepositoryAnalyzer();
    siteGenerator = new SiteGenerator();
    deployer = new StaticFileDeployer();

    // Mock Anthropic client
    vi.spyOn(AnthropicClient.prototype, "analyzeRepository").mockImplementation(
      async () => ({
        projectType: "application",
        industry: "web",
        audience: "developers",
        features: ["feature1", "feature2"],
      })
    );

    vi.spyOn(AnthropicClient.prototype, "generateDesign").mockImplementation(
      async () => ({
        colors: {
          primary: "#007acc",
          secondary: "#005999",
          accent: "#ff6b35",
          background: "#ffffff",
          text: "#1f2937",
          surface: "#f9fafb",
          border: "#e5e7eb",
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
      })
    );

    vi.spyOn(AnthropicClient.prototype, "generateContent").mockImplementation(
      async () => ({
        hero: {
          title: "Test Repository",
          subtitle: "A test project",
          description: "This is a test description",
        },
      })
    );
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

  describe("Full Site Generation Pipeline", () => {
    it("should complete the full generation pipeline", async () => {
      // 1. Load configuration
      const configResult = await configLoader.loadConfiguration();
      expect(configResult.config).toBeDefined();

      // 2. Analyze repository
      const analysis =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      expect(analysis).toBeDefined();
      expect(analysis.basicInfo.name).toBe("test-repo");

      // 3. Generate site
      const site = await siteGenerator.generateSite(
        analysis,
        configResult.config
      );
      expect(site).toBeDefined();
      expect(site.pages["index.html"]).toBeDefined();
      expect(site.assets["style.css"]).toBeDefined();

      // 4. Validate output
      const validation = deployer.validateOutput(site);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should generate valid HTML pages", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(
        analysis,
        configResult.config
      );

      const indexPage = site.pages["index.html"];
      expect(indexPage).toContain("<!DOCTYPE html>");
      expect(indexPage).toContain("<html");
      expect(indexPage).toContain("<head>");
      expect(indexPage).toContain("<body>");
      expect(indexPage).toContain("Test Repository");
    });

    it("should generate CSS assets", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(
        analysis,
        configResult.config
      );

      const css = site.assets["style.css"];
      expect(css).toContain(":root");
      expect(css).toContain("--primary-color");
      expect(css).toContain(".hero-section");
      expect(css).toContain(".features-grid");
    });

    it("should generate navigation JavaScript", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(
        analysis,
        configResult.config
      );

      const js = site.assets["navigation.js"];
      expect(js).toContain("document.addEventListener");
      expect(js).toContain("mobile-menu-btn");
      expect(js).toContain("nav-links");
    });

    it("should generate meta files", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis =
        await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(
        analysis,
        configResult.config
      );

      expect(site.meta.sitemap).toContain("<?xml");
      expect(site.meta.sitemap).toContain("urlset");
      expect(site.meta.robotsTxt).toContain("User-agent: *");
    });
  });
});
