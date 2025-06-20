import { describe, it, expect } from "vitest";
import { isLikelyLogo, extractLogoFromReadme } from "../src/utils/logo-detector.js";
import type { RepoData } from "../src/types.js";

describe("Logo Detector", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "user/test-repo", 
      description: "A test repository",
      html_url: "https://github.com/user/test-repo",
      stargazers_count: 100,
      forks_count: 20,
      language: "TypeScript",
      topics: ["test", "logo"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      pushed_at: "2023-12-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: { key: "mit", name: "MIT License" }
    },
    prs: [],
    issues: [],
    readme: ""
  };

  describe("isLikelyLogo", () => {
    it("should identify logo files correctly", () => {
      expect(isLikelyLogo("logo.png")).toBe(true);
      expect(isLikelyLogo("Logo.svg")).toBe(true);
      expect(isLikelyLogo("brand.jpg")).toBe(true);
      expect(isLikelyLogo("icon.webp")).toBe(true);
      expect(isLikelyLogo("favicon.ico")).toBe(true);
    });

    it("should reject non-logo files", () => {
      expect(isLikelyLogo("image.png")).toBe(false);
      expect(isLikelyLogo("screenshot.jpg")).toBe(false);
      expect(isLikelyLogo("readme.md")).toBe(false);
      expect(isLikelyLogo("logo.txt")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isLikelyLogo("LOGO.PNG")).toBe(true);
      expect(isLikelyLogo("Icon.SVG")).toBe(true);
    });
  });

  describe("extractLogoFromReadme", () => {
    it("should extract logo from README with logo alt text", () => {
      const readmeWithLogo = `# Project

![Logo](./assets/logo.png)

Description here.`;
      
      const mockRepoWithReadme = {
        ...mockRepoData,
        readme: readmeWithLogo
      };
      
      const result = extractLogoFromReadme(readmeWithLogo, mockRepoWithReadme);
      
      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe("https://github.com/user/test-repo/raw/main/./assets/logo.png");
      expect(result.logoPath).toBe("./assets/logo.png");
    });

    it("should extract logo with icon alt text", () => {
      const readmeWithIcon = `# Project

![Icon](https://example.com/icon.svg)

Description here.`;
      
      const result = extractLogoFromReadme(readmeWithIcon, mockRepoData);
      
      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe("https://example.com/icon.svg");
    });

    it("should extract logo with brand alt text", () => {
      const readmeWithBrand = `# Project

![Brand Logo](./brand.png)

Description here.`;
      
      const result = extractLogoFromReadme(readmeWithBrand, mockRepoData);
      
      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe("https://github.com/user/test-repo/raw/main/./brand.png");
    });

    it("should return no logo when no logo-like images found", () => {
      const readmeWithoutLogo = `# Project

![Screenshot](./screenshot.png)
![Diagram](./architecture.jpg)

Description here.`;
      
      const result = extractLogoFromReadme(readmeWithoutLogo, mockRepoData);
      
      expect(result.hasLogo).toBe(false);
    });

    it("should handle absolute URLs correctly", () => {
      const readmeWithAbsoluteLogo = `# Project

![Logo](https://cdn.example.com/logo.png)

Description here.`;
      
      const result = extractLogoFromReadme(readmeWithAbsoluteLogo, mockRepoData);
      
      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe("https://cdn.example.com/logo.png");
    });

    it("should handle multiple images and pick the first logo", () => {
      const readmeWithMultipleImages = `# Project

![Screenshot](./screenshot.png)
![Logo](./assets/logo.svg)
![Icon](./icon.png)

Description here.`;
      
      const result = extractLogoFromReadme(readmeWithMultipleImages, mockRepoData);
      
      expect(result.hasLogo).toBe(true);
      expect(result.logoUrl).toBe("https://github.com/user/test-repo/raw/main/./assets/logo.svg");
    });

    it("should handle empty README", () => {
      const result = extractLogoFromReadme("", mockRepoData);
      
      expect(result.hasLogo).toBe(false);
    });
  });
});