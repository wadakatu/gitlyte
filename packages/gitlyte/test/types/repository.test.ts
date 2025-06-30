import { describe, expect, it } from "vitest";
import type {
  CodeAnalysis,
  ContentAnalysis,
  RepoData,
  RepositoryAnalysis,
} from "../../types/repository.js";

describe("Repository Types", () => {
  describe("RepositoryAnalysis", () => {
    it("should have required basic info structure", () => {
      const analysis: RepositoryAnalysis = {
        basicInfo: {
          name: "test-repo",
          description: "A test repository",
          topics: ["javascript", "testing"],
          language: "TypeScript",
          license: "MIT",
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
            content: "# Test Repo",
            sections: ["Installation", "Usage"],
            hasInstallation: true,
            hasUsage: true,
            hasExamples: false,
          },
          hasChangelog: false,
          hasContributing: true,
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
          frontend: ["React"],
          backend: ["Node.js"],
          database: [],
          deployment: ["npm"],
          testing: ["Vitest"],
        },
        uniqueFeatures: ["Type safety", "Easy integration"],
        competitiveAdvantages: ["Performance", "Developer experience"],
        suggestedUseCases: ["Web development", "Component library"],
      };

      expect(analysis.basicInfo.name).toBe("test-repo");
      expect(analysis.codeAnalysis.hasTests).toBe(true);
      expect(analysis.contentAnalysis.readme.exists).toBe(true);
      expect(analysis.projectCharacteristics.type).toBe("library");
      expect(analysis.technicalStack.frontend).toContain("React");
    });

    it("should validate project type enum values", () => {
      const validTypes = [
        "library",
        "application",
        "tool",
        "framework",
        "game",
        "website",
      ];
      validTypes.forEach((type) => {
        expect([
          "library",
          "application",
          "tool",
          "framework",
          "game",
          "website",
        ]).toContain(type);
      });
    });

    it("should validate industry enum values", () => {
      const validIndustries = [
        "web",
        "mobile",
        "ai",
        "data",
        "devtools",
        "gaming",
        "fintech",
        "other",
      ];
      validIndustries.forEach((industry) => {
        expect([
          "web",
          "mobile",
          "ai",
          "data",
          "devtools",
          "gaming",
          "fintech",
          "other",
        ]).toContain(industry);
      });
    });

    it("should validate code complexity enum values", () => {
      const validComplexities = ["simple", "moderate", "complex"];
      validComplexities.forEach((complexity) => {
        expect(["simple", "moderate", "complex"]).toContain(complexity);
      });
    });
  });

  describe("RepoData", () => {
    it("should have required repository data structure", () => {
      const repoData: RepoData = {
        basicInfo: {
          name: "test-repo",
          description: "Test repository",
          html_url: "https://github.com/user/test-repo",
          stargazers_count: 100,
          forks_count: 20,
          topics: ["javascript"],
          language: "TypeScript",
          license: { key: "mit", name: "MIT License" },
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-12-01T00:00:00Z",
          default_branch: "main",
        },
        readme: "# Test Repository\n\nThis is a test.",
        packageJson: {
          name: "test-repo",
          version: "1.0.0",
          dependencies: { react: "^18.0.0" },
        },
        languages: { TypeScript: 80, JavaScript: 20 },
        issues: [],
        pullRequests: [],
        configFile: null,
        codeStructure: {
          files: ["src/index.ts", "README.md"],
          directories: ["src", "test"],
          hasTests: true,
          testFiles: ["test/index.test.ts"],
        },
        prs: [],
        fileStructure: [],
      };

      expect(repoData.basicInfo.name).toBe("test-repo");
      expect(repoData.readme).toContain("Test Repository");
      expect(repoData.languages.TypeScript).toBe(80);
      expect(repoData.codeStructure.hasTests).toBe(true);
    });
  });

  describe("CodeAnalysis", () => {
    it("should analyze code structure correctly", () => {
      const codeAnalysis: CodeAnalysis = {
        files: ["src/index.ts", "src/utils.ts", "test/index.test.ts"],
        directories: ["src", "test", "docs"],
        hasTests: true,
        testFiles: ["test/index.test.ts"],
        hasTypeScript: true,
        hasTsConfig: true,
        hasPackageJson: true,
        testFramework: "vitest",
        buildTool: "vite",
        lintingSetup: ["eslint", "prettier"],
        complexity: "moderate",
      };

      expect(codeAnalysis.hasTests).toBe(true);
      expect(codeAnalysis.hasTypeScript).toBe(true);
      expect(codeAnalysis.testFramework).toBe("vitest");
      expect(codeAnalysis.testFiles).toHaveLength(1);
    });
  });

  describe("ContentAnalysis", () => {
    it("should analyze repository content correctly", () => {
      const contentAnalysis: ContentAnalysis = {
        readmeStructure: {
          sections: ["Installation", "Usage", "API", "Contributing"],
          hasInstallation: true,
          hasUsage: true,
          hasExamples: false,
          hasAPI: true,
          codeBlocks: 3,
          wordCount: 500,
        },
        documentationQuality: "good",
        hasChangelog: true,
        hasContributing: true,
        hasCodeOfConduct: false,
        hasIssueTemplates: true,
        hasPRTemplates: false,
        hasExamplesFolder: false,
        hasDocsFolder: true,
      };

      expect(contentAnalysis.readmeStructure.hasInstallation).toBe(true);
      expect(contentAnalysis.documentationQuality).toBe("good");
      expect(contentAnalysis.hasChangelog).toBe(true);
    });
  });
});
