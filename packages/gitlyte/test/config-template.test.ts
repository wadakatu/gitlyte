import { describe, it, expect } from "vitest";
import {
  generateConfigTemplate,
  generateConfigFileContent,
  generateConfigDocumentation,
  getRecommendedLogoFormat,
  adjustColorsForAudience,
} from "../utils/config-template.js";
import type { RepoData } from "../types.js";
import type { RepoAnalysis, DesignStrategy } from "../services/ai-analyzer.js";

describe("Config Template Generator", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-project",
      full_name: "user/test-project",
      description: "A test project",
      html_url: "https://github.com/user/test-project",
      stargazers_count: 100,
      forks_count: 20,
      language: "TypeScript",
      topics: ["test", "config"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      pushed_at: "2023-12-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    prs: [],
    issues: [],
    readme: "# Test Project",
  };

  const mockAnalysis: RepoAnalysis = {
    projectType: "library",
    techStack: ["TypeScript", "React"],
    primaryLanguage: "TypeScript",
    activity: "high",
    audience: "developer",
    purpose: "A testing library for developers",
    tone: "professional",
    complexity: "moderate",
  };

  const mockDesignStrategy: DesignStrategy = {
    colorScheme: {
      primary: "#667eea",
      secondary: "#764ba2",
      accent: "#f093fb",
      background: "#ffffff",
    },
    typography: {
      heading: "Inter, sans-serif",
      body: "system-ui, sans-serif",
      code: "JetBrains Mono, monospace",
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

  describe("generateConfigTemplate", () => {
    it("should generate config template for library project", () => {
      const result = generateConfigTemplate(
        mockRepoData,
        mockAnalysis,
        mockDesignStrategy
      );

      expect(result.logo?.path).toBe("./assets/logo.svg");
      expect(result.logo?.alt).toBe("test-project Logo");
      expect(result.favicon?.path).toBe("./assets/favicon.ico");
      expect(result.site?.theme?.primary).toBeDefined();
      expect(result.site?.theme?.secondary).toBeDefined();
      expect(result.site?.theme?.accent).toBeDefined();
    });

    it("should adjust logo format based on tech stack", () => {
      const gameAnalysis = {
        ...mockAnalysis,
        projectType: "game" as const,
        techStack: ["Unity", "C#"],
      };

      const result = generateConfigTemplate(
        mockRepoData,
        gameAnalysis,
        mockDesignStrategy
      );

      expect(result.logo?.path).toBe("./assets/logo.png");
    });

    it("should adjust colors for business audience", () => {
      const businessAnalysis = {
        ...mockAnalysis,
        audience: "business" as const,
        tone: "professional" as const,
      };

      const result = generateConfigTemplate(
        mockRepoData,
        businessAnalysis,
        mockDesignStrategy
      );

      // プロフェッショナル向けに調整された色になっているか確認
      expect(result.site?.theme?.primary).not.toBe(
        mockDesignStrategy.colorScheme.primary
      );
    });

    it("should adjust colors for academic audience", () => {
      const academicAnalysis = {
        ...mockAnalysis,
        audience: "academic" as const,
      };

      const result = generateConfigTemplate(
        mockRepoData,
        academicAnalysis,
        mockDesignStrategy
      );

      // アカデミック向けに調整された色になっているか確認
      expect(result.site?.theme?.primary).not.toBe(
        mockDesignStrategy.colorScheme.primary
      );
    });

    it("should use different paths for different project types", () => {
      const applicationAnalysis = {
        ...mockAnalysis,
        projectType: "application" as const,
      };

      const result = generateConfigTemplate(
        mockRepoData,
        applicationAnalysis,
        mockDesignStrategy
      );

      expect(result.logo?.path).toBe("./public/logo.svg");
      expect(result.favicon?.path).toBe("./public/favicon.ico");
    });
  });

  describe("getRecommendedLogoFormat", () => {
    it("should recommend SVG for React projects", () => {
      const result = getRecommendedLogoFormat(["React", "TypeScript"]);
      expect(result).toBe("svg");
    });

    it("should recommend PNG for game projects", () => {
      const result = getRecommendedLogoFormat(["Unity", "C#"]);
      expect(result).toBe("png");
    });

    it("should default to SVG for unknown tech stacks", () => {
      const result = getRecommendedLogoFormat(["SomeUnknownTech"]);
      expect(result).toBe("svg");
    });
  });

  describe("adjustColorsForAudience", () => {
    const originalColors = {
      primary: "#667eea",
      secondary: "#764ba2",
      accent: "#f093fb",
    };

    it("should adjust colors for business + professional", () => {
      const result = adjustColorsForAudience(
        originalColors,
        "business",
        "professional"
      );

      expect(result.primary).not.toBe(originalColors.primary);
      expect(result.primary).toBe("#4f46e5"); // より保守的な色
    });

    it("should adjust colors for academic audience", () => {
      const result = adjustColorsForAudience(
        originalColors,
        "academic",
        "professional"
      );

      expect(result.primary).not.toBe(originalColors.primary);
      expect(result.primary).toBe("#1e40af"); // より信頼性重視の色
    });

    it("should keep original colors for developer audience", () => {
      const result = adjustColorsForAudience(
        originalColors,
        "developer",
        "friendly"
      );

      expect(result).toEqual(originalColors);
    });
  });

  describe("generateConfigFileContent", () => {
    it("should generate valid JSON content", () => {
      const config = generateConfigTemplate(
        mockRepoData,
        mockAnalysis,
        mockDesignStrategy
      );
      const result = generateConfigFileContent(config);

      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed.logo).toBeDefined();
      expect(parsed.favicon).toBeDefined();
      expect(parsed.site.theme).toBeDefined();
    });

    it("should format JSON with proper indentation", () => {
      const config = generateConfigTemplate(
        mockRepoData,
        mockAnalysis,
        mockDesignStrategy
      );
      const result = generateConfigFileContent(config);

      expect(result).toContain("  "); // インデントが含まれている
      expect(result.split("\n").length).toBeGreaterThan(1); // 複数行になっている
    });
  });

  describe("generateConfigDocumentation", () => {
    it("should generate documentation with config example", () => {
      const config = generateConfigTemplate(
        mockRepoData,
        mockAnalysis,
        mockDesignStrategy
      );
      const result = generateConfigDocumentation(
        config,
        mockRepoData.repo.name
      );

      expect(result).toContain("GitLyte Configuration");
      expect(result).toContain(".gitlyte.json");
      expect(result).toContain("logo.path");
      expect(result).toContain(config.logo?.path);
      expect(result).toContain(config.favicon?.path);
    });

    it("should include configuration explanations", () => {
      const config = generateConfigTemplate(
        mockRepoData,
        mockAnalysis,
        mockDesignStrategy
      );
      const result = generateConfigDocumentation(
        config,
        mockRepoData.repo.name
      );

      expect(result).toContain("設定項目");
      expect(result).toContain("primary");
      expect(result).toContain("secondary");
      expect(result).toContain("accent");
    });
  });

  describe("integration test", () => {
    it("should generate complete config for different project types", () => {
      const projectTypes = [
        "library",
        "application",
        "tool",
        "website",
        "game",
        "documentation",
      ] as const;

      for (const projectType of projectTypes) {
        const analysis = { ...mockAnalysis, projectType };
        const config = generateConfigTemplate(
          mockRepoData,
          analysis,
          mockDesignStrategy
        );

        expect(config.logo?.path).toBeDefined();
        expect(config.favicon?.path).toBeDefined();
        expect(config.site?.theme?.primary).toBeDefined();

        // JSON として有効か確認
        const jsonContent = generateConfigFileContent(config);
        expect(() => JSON.parse(jsonContent)).not.toThrow();
      }
    });
  });
});
