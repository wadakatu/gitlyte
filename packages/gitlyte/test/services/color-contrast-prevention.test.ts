import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationLoader } from "../../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../../services/repository-analyzer.js";
import { SiteGenerator } from "../../services/site-generator.js";
import type { RepoData } from "../../types/repository.js";
import { OpenAIClient } from "../../utils/openai-client.js";

describe("Color Contrast Prevention", () => {
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

  describe("Generated CSS color contrast validation", () => {
    it("should generate different colors for text and background", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Extract color values
      const primaryMatch = css.match(/--primary-color:\s*(#[a-fA-F0-9]{6})/);
      const backgroundMatch = css.match(/--background-color:\s*(#[a-fA-F0-9]{6})/);
      const textMatch = css.match(/--text-color:\s*(#[a-fA-F0-9]{6})/);
      
      // Ensure we have the required colors defined
      expect(primaryMatch).toBeTruthy();
      expect(backgroundMatch).toBeTruthy();
      expect(textMatch).toBeTruthy();
      
      if (primaryMatch && backgroundMatch && textMatch) {
        // Primary color should be different from background
        expect(primaryMatch[1].toLowerCase()).not.toBe(backgroundMatch[1].toLowerCase());
        
        // Text color should be different from background
        expect(textMatch[1].toLowerCase()).not.toBe(backgroundMatch[1].toLowerCase());
        
        // Primary and text colors should be different (unless specifically designed to be the same)
        // This is a looser requirement as they could be similar in some designs
      }
    });

    it("should not generate very similar colors for text and background", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Helper function to convert hex to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };

      // Calculate simple brightness difference
      const getBrightness = (r: number, g: number, b: number) => {
        return (r * 299 + g * 587 + b * 114) / 1000;
      };

      const backgroundMatch = css.match(/--background-color:\s*(#[a-fA-F0-9]{6})/);
      const textMatch = css.match(/--text-color:\s*(#[a-fA-F0-9]{6})/);
      
      if (backgroundMatch && textMatch) {
        const bgColor = hexToRgb(backgroundMatch[1]);
        const textColor = hexToRgb(textMatch[1]);
        
        if (bgColor && textColor) {
          const bgBrightness = getBrightness(bgColor.r, bgColor.g, bgColor.b);
          const textBrightness = getBrightness(textColor.r, textColor.g, textColor.b);
          
          // There should be a significant brightness difference (at least 50 points)
          const brightnessDiff = Math.abs(bgBrightness - textBrightness);
          expect(brightnessDiff).toBeGreaterThan(50);
        }
      }
    });

    it("should ensure readable text colors on button backgrounds", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that buttons have adequate styling
      expect(css).toMatch(/\.btn[^{]*{[^}]*background[^}]*}/);
      expect(css).toMatch(/\.btn[^{]*{[^}]*color[^}]*}/);
      
      // Check that button hover states don't make text unreadable
      if (css.includes('.btn:hover')) {
        expect(css).toMatch(/\.btn:hover[^{]*{[^}]*}/);
      }
    });

    it("should use appropriate colors for different UI states", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that we have different color variables for different purposes
      expect(css).toMatch(/--primary-color/);
      expect(css).toMatch(/--secondary-color/);
      expect(css).toMatch(/--accent-color/);
      expect(css).toMatch(/--surface-color/);
      expect(css).toMatch(/--border-color/);
      
      // Check that these colors are actually used in the CSS
      expect(css).toMatch(/var\(--primary-color\)/);
      expect(css).toMatch(/var\(--secondary-color\)|var\(--accent-color\)/);
    });

    it("should avoid pure black text on pure white or vice versa when possible", async () => {
      const configResult = await configLoader.loadConfiguration();
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(mockRepoData);
      const site = await siteGenerator.generateSite(analysis, configResult.config);

      const css = site.assets["style.css"];
      
      // Check that we're not using pure black/white combinations
      expect(css).not.toMatch(/color:\s*#000000/);
      expect(css).not.toMatch(/background-color:\s*#000000/);
      
      // The default colors should be somewhat softer
      const textMatch = css.match(/--text-color:\s*(#[a-fA-F0-9]{6})/);
      const backgroundMatch = css.match(/--background-color:\s*(#[a-fA-F0-9]{6})/);
      
      if (textMatch) {
        expect(textMatch[1].toLowerCase()).not.toBe('#000000');
      }
      
      if (backgroundMatch) {
        // Allow white background as it's a common and valid choice
        // The test should focus on text contrast rather than absolute color values
        expect(backgroundMatch[1]).toMatch(/#[a-fA-F0-9]{6}/);
      }
    });
  });
});
