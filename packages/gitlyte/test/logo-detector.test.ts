import { describe, expect, it } from "vitest";
import type { RepoData } from "../types/repository.js";
import { detectRepoLogo } from "../utils/logo-detector.js";

describe("Logo Detector", () => {
  const mockRepoData: RepoData = {
    basicInfo: {
      name: "test-repo",
      description: "A test repository",
      html_url: "https://github.com/user/test-repo",
      stargazers_count: 100,
      forks_count: 20,
      language: "TypeScript",
      topics: ["test", "logo"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    readme: "",
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

  describe("detectRepoLogo", () => {
    it("should detect logo from config file", async () => {
      const repoDataWithConfig = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: { path: "./assets/logo.png", alt: "Project Logo" },
        }),
      };

      const result = await detectRepoLogo(repoDataWithConfig);

      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe(
        "https://github.com/user/test-repo/raw/main/assets/logo.png"
      );
      expect(result.logoPath).toBe("./assets/logo.png");
      expect(result.source).toBe("config");
    });

    it("should detect logo from package.json gitlyte section", async () => {
      const repoDataWithPackageJson = {
        ...mockRepoData,
        packageJson: {
          name: "test-package",
          gitlyte: {
            logo: { path: "./logo.svg" },
          },
        },
      };

      const result = await detectRepoLogo(repoDataWithPackageJson);

      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe(
        "https://github.com/user/test-repo/raw/main/logo.svg"
      );
      expect(result.source).toBe("config");
    });

    it("should prioritize .gitlyte.json over package.json", async () => {
      const repoDataWithBoth = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: { path: "./gitlyte-logo.png" },
        }),
        packageJson: {
          gitlyte: { logo: { path: "./package-logo.png" } },
        },
      };

      const result = await detectRepoLogo(repoDataWithBoth);

      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe(
        "https://github.com/user/test-repo/raw/main/gitlyte-logo.png"
      );
      expect(result.source).toBe("config");
    });

    it("should return none when no config file exists", async () => {
      const result = await detectRepoLogo(mockRepoData);

      expect(result.hasLogo).toBe(false);
      expect(result.source).toBe("none");
    });

    it("should handle absolute URLs correctly", async () => {
      const repoDataWithAbsoluteUrl = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: { path: "https://example.com/logo.png" },
        }),
      };

      const result = await detectRepoLogo(repoDataWithAbsoluteUrl);

      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe("https://example.com/logo.png");
      expect(result.source).toBe("config");
    });

    it("should set favicon URL correctly", async () => {
      const repoDataWithFavicon = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: { path: "./logo.png" },
          favicon: { path: "./favicon.ico" },
        }),
      };

      const result = await detectRepoLogo(repoDataWithFavicon);

      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe(
        "https://github.com/user/test-repo/raw/main/logo.png"
      );
      expect(result.faviconUrl).toBe(
        "https://github.com/user/test-repo/raw/main/favicon.ico"
      );
      expect(result.source).toBe("config");
    });
  });
});
