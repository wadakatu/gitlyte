import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationLoader } from "../../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../../services/repository-analyzer.js";
import { SiteGenerator } from "../../services/site-generator.js";
import type { RepoData } from "../../types/repository.js";
import { OpenAIClient } from "../../utils/openai-client.js";

describe("CSS Transparency Prevention", () => {
  let configLoader: ConfigurationLoader;
  let repositoryAnalyzer: RepositoryAnalyzer;
  let siteGenerator: SiteGenerator;

  beforeEach(() => {
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

    vi.spyOn(OpenAIClient.prototype, 'generateDesign').mockImplementation(async () => ({
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
    }));

    vi.spyOn(OpenAIClient.prototype, 'generateContent').mockImplementation(async () => ({
      hero: {
        title: "Test Repository",
        subtitle: "A test project",
        description: "This is a test description"
      }
    }));
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

  describe("Generated CSS transparency handling", () => {
    it("should not use fully transparent colors in generated CSS", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that transparent colors are not used for main UI elements
      expect(css).not.toMatch(/background.*:.*transparent[^;]*;/);
      expect(css).not.toMatch(/color.*:.*transparent[^;]*;/);
      expect(css).not.toMatch(/border.*:.*transparent[^;]*;/);
      
      // Check that alpha channel is not 0 for important elements
      expect(css).not.toMatch(/rgba\([^)]*,\s*0\)/);
      expect(css).not.toMatch(/hsla\([^)]*,\s*0\)/);
    });

    it("should use solid background colors for text readability", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that body and main text areas have solid background colors
      expect(css).toMatch(/background-color:\s*var\(--background-color\)/);
      expect(css).toMatch(/--background-color:\s*#[a-fA-F0-9]{6}/);
      expect(css).toMatch(/--text-color:\s*#[a-fA-F0-9]{6}/);
    });

    it("should ensure sufficient opacity for interactive elements", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that buttons and interactive elements are not too transparent
      const opacityMatches = css.match(/opacity:\s*(0\.[0-9]+)/g) || [];
      
      for (const match of opacityMatches) {
        const opacityValue = parseFloat(match.split(':')[1].trim());
        // Opacity should be at least 0.7 for interactive elements
        expect(opacityValue).toBeGreaterThanOrEqual(0.7);
      }
    });

    it("should use proper contrast ratios", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that we have defined proper color variables
      expect(css).toMatch(/--primary-color:\s*#[a-fA-F0-9]{6}/);
      expect(css).toMatch(/--secondary-color:\s*#[a-fA-F0-9]{6}/);
      expect(css).toMatch(/--background-color:\s*#[a-fA-F0-9]{6}/);
      expect(css).toMatch(/--text-color:\s*#[a-fA-F0-9]{6}/);
      
      // Ensure colors are different enough (not the same)
      const primaryMatch = css.match(/--primary-color:\s*(#[a-fA-F0-9]{6})/);
      const backgroundMatch = css.match(/--background-color:\s*(#[a-fA-F0-9]{6})/);
      const textMatch = css.match(/--text-color:\s*(#[a-fA-F0-9]{6})/);
      
      if (primaryMatch && backgroundMatch) {
        expect(primaryMatch[1]).not.toBe(backgroundMatch[1]);
      }
      
      if (textMatch && backgroundMatch) {
        expect(textMatch[1]).not.toBe(backgroundMatch[1]);
      }
    });

    it("should avoid problematic transparent overlays", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that we don't have multiple transparent layers that could cause readability issues
      const transparentOverlays = css.match(/rgba\([^)]*,\s*0\.[0-3]\)/g) || [];
      
      // Should not have more than 2 very transparent elements
      expect(transparentOverlays.length).toBeLessThanOrEqual(2);
    });
  });
});
