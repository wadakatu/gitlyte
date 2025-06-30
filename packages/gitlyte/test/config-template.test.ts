import { describe, expect, it } from "vitest";
import type { RepositoryAnalysis } from "../types/repository.js";
import type { DesignSystem } from "../types/generated-site.js";
import type { RepoData } from "../types/repository.js";
import {
  adjustColorsForAudience,
  generateConfigDocumentation,
  generateConfigFileContent,
  generateConfigTemplate,
  getRecommendedLogoFormat,
} from "../utils/config-template.js";

describe("Config Template Generator", () => {
  const mockRepoData: RepoData = {
    basicInfo: {
      name: "test-project",
      description: "A test project",
      html_url: "https://github.com/user/test-project",
      stargazers_count: 100,
      forks_count: 20,
      language: "TypeScript",
      topics: ["test", "config"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    readme: "# Test Project",
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

  const mockAnalysis: RepositoryAnalysis = {
    basicInfo: {
      name: "test-project",
      description: "A test project",
      topics: ["test", "config"],
      language: "TypeScript",
      license: "MIT License",
    },
    codeAnalysis: {
      languages: { TypeScript: 90, JavaScript: 10 },
      hasTests: true,
      testCoverage: 85,
      hasDocumentation: true,
      codeComplexity: "moderate",
    },
    contentAnalysis: {
      readme: {
        exists: true,
        content: "# Test Project",
        sections: ["Installation", "Usage", "API"],
        hasInstallation: true,
        hasUsage: true,
        hasExamples: true,
      },
      hasChangelog: false,
      hasContributing: false,
      hasLicense: true,
      hasExamples: true,
    },
    projectCharacteristics: {
      type: "library",
      industry: "devtools",
      audience: "developers",
      maturity: "stable",
    },
    technicalStack: {
      frontend: ["TypeScript", "React"],
      backend: [],
      database: [],
      deployment: [],
      testing: ["Jest"],
    },
    uniqueFeatures: ["High performance", "Easy to use"],
    competitiveAdvantages: ["Battle-tested", "Well documented"],
    suggestedUseCases: ["Development tools", "Testing utilities"],
  };

  const mockDesignStrategy: DesignSystem = {
    colors: {
      primary: "#667eea",
      secondary: "#764ba2",
      accent: "#f093fb",
      background: "#ffffff",
      text: "#2d3748",
      surface: "#f8fafc",
      border: "#e2e8f0",
    },
    typography: {
      headings: "Inter, sans-serif",
      body: "system-ui, sans-serif",
      mono: "JetBrains Mono, monospace",
    },
    effects: {
      borderRadius: "8px",
      shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      transition: "all 0.3s ease",
      blur: "8px",
    },
    spacing: {
      unit: "rem",
      scale: {
        xs: "0.5rem",
        sm: "1rem",
        md: "1.5rem",
        lg: "2rem",
        xl: "3rem",
      },
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
      expect(result.site?.layout).toBe("hero-focused");
      expect(result.site?.theme?.primary).toBeDefined();
      expect(result.site?.theme?.secondary).toBeDefined();
      expect(result.site?.theme?.accent).toBeDefined();
    });

    it("should adjust logo format based on tech stack", () => {
      const gameAnalysis = {
        ...mockAnalysis,
        projectCharacteristics: {
          ...mockAnalysis.projectCharacteristics,
          type: "game" as const,
        },
        technicalStack: {
          ...mockAnalysis.technicalStack,
          frontend: ["Unity", "C#"],
        },
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
        projectCharacteristics: {
          ...mockAnalysis.projectCharacteristics,
          audience: "enterprise" as const,
        },
      };

      const result = generateConfigTemplate(
        mockRepoData,
        businessAnalysis,
        mockDesignStrategy
      );

      // プロフェッショナル向けに調整された色になっているか確認
      expect(result.site?.theme?.primary).not.toBe(
        mockDesignStrategy.colors.primary
      );
    });

    it("should adjust colors for academic audience", () => {
      const academicAnalysis = {
        ...mockAnalysis,
        projectCharacteristics: {
          ...mockAnalysis.projectCharacteristics,
          audience: "researchers" as const,
        },
      };

      const result = generateConfigTemplate(
        mockRepoData,
        academicAnalysis,
        mockDesignStrategy
      );

      // アカデミック向けに調整された色になっているか確認
      expect(result.site?.theme?.primary).not.toBe(
        mockDesignStrategy.colors.primary
      );
    });

    it("should use different paths for different project types", () => {
      const applicationAnalysis = {
        ...mockAnalysis,
        projectCharacteristics: {
          ...mockAnalysis.projectCharacteristics,
          type: "application" as const,
        },
      };

      const result = generateConfigTemplate(
        mockRepoData,
        applicationAnalysis,
        mockDesignStrategy
      );

      expect(result.logo?.path).toBe("./public/logo.svg");
      expect(result.favicon?.path).toBe("./public/favicon.ico");
    });

    it("should include layout from design strategy", () => {
      const minimalDesignStrategy = {
        ...mockDesignStrategy,
        layout: "minimal" as const,
      };

      const result = generateConfigTemplate(
        mockRepoData,
        mockAnalysis,
        minimalDesignStrategy
      );

      expect(result.site?.layout).toBe("minimal");
    });

    it("should include different layout types", () => {
      const layoutTypes = ["grid", "sidebar", "content-heavy"] as const;

      for (const layout of layoutTypes) {
        const designStrategy = {
          ...mockDesignStrategy,
          layout,
        };

        const result = generateConfigTemplate(
          mockRepoData,
          mockAnalysis,
          designStrategy
        );

        expect(result.site?.layout).toBe(layout);
      }
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
        mockRepoData.basicInfo.name
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
        mockRepoData.basicInfo.name
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
        "framework",
      ] as const;

      for (const projectType of projectTypes) {
        const analysis = {
          ...mockAnalysis,
          projectCharacteristics: {
            ...mockAnalysis.projectCharacteristics,
            type: projectType,
          },
        };
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
