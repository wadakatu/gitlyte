import { describe, it, expect } from "vitest";
import {
  loadGitLyteConfig,
  resolveLogoUrl,
  resolveFaviconUrl,
} from "../utils/config-loader.js";
import type { RepoData } from "../types.js";

describe("Config Loader", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "user/test-repo",
      description: "A test repository",
      html_url: "https://github.com/user/test-repo",
      stargazers_count: 100,
      forks_count: 20,
      language: "TypeScript",
      topics: ["test"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      pushed_at: "2023-12-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    readme: "",
    prs: [],
    issues: [],
  };

  describe("loadGitLyteConfig", () => {
    it("should load config from .gitlyte.json", async () => {
      const repoDataWithConfig = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: {
            path: "./assets/logo.svg",
            alt: "Project Logo",
          },
          favicon: {
            path: "./assets/favicon.ico",
          },
          site: {
            theme: {
              primary: "#3b82f6",
              secondary: "#8b5cf6",
            },
          },
        }),
      };

      const result = await loadGitLyteConfig(repoDataWithConfig);

      expect(result.found).toBe(true);
      expect(result.source).toBe(".gitlyte.json");
      expect(result.config.logo?.path).toBe("./assets/logo.svg");
      expect(result.config.logo?.alt).toBe("Project Logo");
      expect(result.config.favicon?.path).toBe("./assets/favicon.ico");
      expect(result.config.site?.theme?.primary).toBe("#3b82f6");
    });

    it("should load config from package.json gitlyte section", async () => {
      const repoDataWithPackageJson = {
        ...mockRepoData,
        packageJson: JSON.stringify({
          name: "test-package",
          version: "1.0.0",
          gitlyte: {
            logo: {
              path: "./logo.png",
            },
          },
        }),
      };

      const result = await loadGitLyteConfig(repoDataWithPackageJson);

      expect(result.found).toBe(true);
      expect(result.source).toBe("package.json");
      expect(result.config.logo?.path).toBe("./logo.png");
    });

    it("should prioritize .gitlyte.json over package.json", async () => {
      const repoDataWithBoth = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: { path: "./gitlyte-logo.svg" },
        }),
        packageJson: JSON.stringify({
          gitlyte: { logo: { path: "./package-logo.png" } },
        }),
      };

      const result = await loadGitLyteConfig(repoDataWithBoth);

      expect(result.found).toBe(true);
      expect(result.source).toBe(".gitlyte.json");
      expect(result.config.logo?.path).toBe("./gitlyte-logo.svg");
    });

    it("should return not found when no config files exist", async () => {
      const result = await loadGitLyteConfig(mockRepoData);

      expect(result.found).toBe(false);
      expect(result.config).toEqual({});
    });

    it("should handle invalid JSON gracefully", async () => {
      const repoDataWithInvalidJson = {
        ...mockRepoData,
        configFile: "{ invalid json }",
      };

      const result = await loadGitLyteConfig(repoDataWithInvalidJson);

      expect(result.found).toBe(false);
    });

    it("should validate and filter invalid config", async () => {
      const repoDataWithInvalidConfig = {
        ...mockRepoData,
        configFile: JSON.stringify({
          logo: {
            path: "", // empty path should be filtered out
            alt: "Logo",
          },
          site: {
            theme: {
              primary: "invalid-color", // invalid color should be filtered out
              secondary: "#8b5cf6", // valid color should remain
            },
          },
        }),
      };

      const result = await loadGitLyteConfig(repoDataWithInvalidConfig);

      expect(result.found).toBe(true);
      expect(result.config.logo).toBeUndefined(); // empty path filtered out
      expect(result.config.site?.theme?.primary).toBeUndefined(); // invalid color filtered out
      expect(result.config.site?.theme?.secondary).toBe("#8b5cf6"); // valid color remains
    });
  });

  describe("resolveLogoUrl", () => {
    it("should return absolute URLs as-is", () => {
      const config = {
        logo: { path: "https://example.com/logo.png" },
      };

      const result = resolveLogoUrl(config, mockRepoData);

      expect(result).toBe("https://example.com/logo.png");
    });

    it("should convert relative paths to GitHub raw URLs", () => {
      const config = {
        logo: { path: "./assets/logo.svg" },
      };

      const result = resolveLogoUrl(config, mockRepoData);

      expect(result).toBe(
        "https://github.com/user/test-repo/raw/main/assets/logo.svg"
      );
    });

    it("should handle paths without leading ./", () => {
      const config = {
        logo: { path: "logo.png" },
      };

      const result = resolveLogoUrl(config, mockRepoData);

      expect(result).toBe(
        "https://github.com/user/test-repo/raw/main/logo.png"
      );
    });

    it("should return undefined when no logo path", () => {
      const config = {};

      const result = resolveLogoUrl(config, mockRepoData);

      expect(result).toBeUndefined();
    });
  });

  describe("resolveFaviconUrl", () => {
    it("should resolve favicon URL correctly", () => {
      const config = {
        favicon: { path: "./favicon.ico" },
      };

      const result = resolveFaviconUrl(config, mockRepoData);

      expect(result).toBe(
        "https://github.com/user/test-repo/raw/main/favicon.ico"
      );
    });

    it("should return undefined when no favicon path", () => {
      const config = {};

      const result = resolveFaviconUrl(config, mockRepoData);

      expect(result).toBeUndefined();
    });
  });
});
