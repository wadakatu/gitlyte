import { describe, it, expect } from "vitest";
import { generateAstroSite } from "../../services/ai-code-generator.js";
import type { RepoData } from "../../types.js";
import type {
  RepoAnalysis,
  DesignStrategy,
} from "../../services/ai-analyzer.js";

describe("AI Code Generator", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "test/test-repo",
      description: "A test repository",
      html_url: "https://github.com/test/test-repo",
      stargazers_count: 15,
      forks_count: 3,
      language: "TypeScript",
      topics: ["test"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      pushed_at: "2023-12-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    readme: "# Test Repo\nThis is a test repository.",
    prs: [
      {
        title: "Add feature",
        user: { login: "testuser" },
        merged_at: "2023-01-01T00:00:00Z",
      },
    ],
    issues: [
      {
        title: "Fix bug",
        number: 1,
        state: "open",
        user: { login: "testuser" },
        created_at: "2023-01-01T00:00:00Z",
      },
    ],
  };

  const mockAnalysis: RepoAnalysis = {
    projectType: "application",
    techStack: ["JavaScript", "React"],
    primaryLanguage: "JavaScript",
    activity: "high",
    audience: "developer",
    purpose: "A web application",
    tone: "professional",
    complexity: "moderate",
  };

  const mockDesign: DesignStrategy = {
    colorScheme: {
      primary: "#007acc",
      secondary: "#005999",
      accent: "#ff6b35",
      background: "#ffffff",
    },
    typography: {
      heading: "Inter, sans-serif",
      body: "system-ui, sans-serif",
      code: "Fira Code, monospace",
    },
    layout: "hero-focused",
    style: "modern",
    animations: true,
    darkMode: false,
    effects: {
      blur: true,
      shadows: "subtle",
      borders: "rounded",
      spacing: "normal",
    },
  };

  describe("generateAstroSite", () => {
    it("should generate complete Astro site", async () => {
      const result = await generateAstroSite(
        mockRepoData,
        mockAnalysis,
        mockDesign
      );

      // 必要なファイルが全て生成されることを確認
      expect(result).toHaveProperty("packageJson");
      expect(result).toHaveProperty("astroConfig");
      expect(result).toHaveProperty("layout");
      expect(result).toHaveProperty("heroComponent");
      expect(result).toHaveProperty("featuresComponent");
      expect(result).toHaveProperty("indexPage");
      expect(result).toHaveProperty("globalStyles");

      // package.jsonの内容を確認
      const packageJson = JSON.parse(result.packageJson);
      expect(packageJson.name).toBe("test-repo-site");
      expect(packageJson.type).toBe("module");
      expect(packageJson.dependencies.astro).toBeDefined();
      expect(packageJson.scripts.build).toBe("astro build");

      // astro.configにリポジトリ名が含まれることを確認
      expect(result.astroConfig).toContain("{{REPO_NAME}}");
      expect(result.astroConfig).toContain("{{OWNER}}");

      // レイアウトにBaseLayoutインポートが含まれることを確認
      expect(result.layout).toContain(
        "import BaseLayout from '@gitlyte/shared/components/Layout/BaseLayout.astro'"
      );
      expect(result.layout).toContain("customTokens");

      // Heroコンポーネントに共有レイアウトが含まれることを確認
      expect(result.heroComponent).toContain("stats");
      expect(result.heroComponent).toContain("HeroFocusedLayout");

      // Featuresコンポーネントにpropsが含まれることを確認
      expect(result.featuresComponent).toContain("prs");
      expect(result.featuresComponent).toContain("Why Choose This Project?");

      // インデックスページにデータプレースホルダーが含まれることを確認
      expect(result.indexPage).toContain("{{REPO_DATA}}");
      expect(result.indexPage).toContain("Layout");
      expect(result.indexPage).toContain("Hero");
      expect(result.indexPage).toContain("Features");

      // グローバルスタイルにデザイン要素が含まれることを確認
      expect(result.globalStyles).toContain(mockDesign.colorScheme.primary);
      expect(result.globalStyles).toContain("font-family");
    });

    it("should handle repository with no description", async () => {
      const repoDataNoDesc = {
        ...mockRepoData,
        repo: { ...mockRepoData.repo, description: null },
      };

      const result = await generateAstroSite(
        repoDataNoDesc,
        mockAnalysis,
        mockDesign
      );

      expect(result.packageJson).toBeDefined();
      expect(result.heroComponent).toContain("HeroFocusedLayout");
    });

    it("should generate responsive CSS", async () => {
      const result = await generateAstroSite(
        mockRepoData,
        mockAnalysis,
        mockDesign
      );

      expect(result.globalStyles).toContain("@media");
      // Hero component now uses shared layout, so responsive CSS is in the shared component
      expect(result.heroComponent).toContain("HeroFocusedLayout");
    });

    it("should include proper CSS custom properties", async () => {
      const result = await generateAstroSite(
        mockRepoData,
        mockAnalysis,
        mockDesign
      );

      // Layout now uses BaseLayout with customTokens, CSS variables are generated by shared system
      expect(result.layout).toContain("BaseLayout");
      expect(result.layout).toContain("customTokens");
      expect(result.layout).toContain(mockDesign.colorScheme.primary);
      expect(result.layout).toContain(mockDesign.colorScheme.secondary);
    });
  });
});
