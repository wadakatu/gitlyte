import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StaticFileDeployer } from "../../services/static-file-deployer.js";
import type { GitLyteConfig } from "../../types/config.js";
import type { GeneratedSite } from "../../types/generated-site.js";

// Mock fs module
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
  rm: vi.fn(),
  constants: { F_OK: 0 },
}));

// Mock path module
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
  resolve: vi.fn((...args) => args.join("/")),
  basename: vi.fn((p) => p.split("/").pop() || ""),
  dirname: vi.fn((p) => p.split("/").slice(0, -1).join("/") || "/"),
}));

describe("Static File Deployer", () => {
  let deployer: StaticFileDeployer;
  let mockGeneratedSite: GeneratedSite;
  let mockConfig: GitLyteConfig;

  beforeEach(() => {
    deployer = new StaticFileDeployer();

    mockGeneratedSite = {
      pages: {
        "index.html":
          "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test Site</h1></body></html>",
        "docs.html":
          "<!DOCTYPE html><html><head><title>Docs</title></head><body><h1>Documentation</h1></body></html>",
        "api.html":
          "<!DOCTYPE html><html><head><title>API</title></head><body><h1>API Reference</h1></body></html>",
      },
      assets: {
        "style.css": "body { font-family: Arial; }",
        "navigation.js":
          'document.addEventListener("DOMContentLoaded", function() { console.log("Ready"); });',
      },
      meta: {
        sitemap: '<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>',
        robotsTxt: "User-agent: *\nAllow: /",
      },
    };

    mockConfig = {
      version: "1.0",
      site: {
        title: "Test Site",
        description: "A test site",
        url: "https://example.com",
      },
      pages: {
        generate: ["index", "docs", "api"],
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("deployToDirectory", () => {
    it("should deploy all files to specified directory", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.deployedFiles).toHaveLength(7); // 3 pages + 2 assets + 2 meta files
      expect(result.outputPath).toBe("/output/path");

      // Verify directory creation
      expect(fs.mkdir).toHaveBeenCalledWith("/output/path", {
        recursive: true,
      });

      // Verify file writes
      expect(fs.writeFile).toHaveBeenCalledWith(
        "/output/path/index.html",
        mockGeneratedSite.pages["index.html"],
        "utf8"
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        "/output/path/style.css",
        mockGeneratedSite.assets["style.css"],
        "utf8"
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        "/output/path/sitemap.xml",
        expect.stringContaining('<?xml version="1.0" encoding="UTF-8"?>'),
        "utf8"
      );
    });

    it("should create subdirectories for organized output", async () => {
      const configWithAssetDir = {
        ...mockConfig,
        deployment: {
          assets: {
            directory: "assets",
          },
        },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        configWithAssetDir
      );

      expect(fs.mkdir).toHaveBeenCalledWith("/output/path/assets", {
        recursive: true,
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        "/output/path/assets/style.css",
        mockGeneratedSite.assets["style.css"],
        "utf8"
      );
    });

    it("should handle file write errors gracefully", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockRejectedValue(new Error("Permission denied"));

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(
        result.errors.some((error) => error.includes("Permission denied"))
      ).toBe(true);
    });

    it("should handle directory creation errors", async () => {
      vi.mocked(fs.mkdir).mockRejectedValue(
        new Error("Cannot create directory")
      );

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(
        result.errors.some((error) => error.includes("Cannot create directory"))
      ).toBe(true);
    });

    it("should clean existing directory when specified", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.rm).mockResolvedValue(undefined);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig,
        { clean: true }
      );

      expect(fs.rm).toHaveBeenCalledWith("/output/path", {
        recursive: true,
        force: true,
      });
      expect(fs.mkdir).toHaveBeenCalledWith("/output/path", {
        recursive: true,
      });
    });

    it("should skip cleaning when directory does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("Directory not found"));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig,
        { clean: true }
      );

      expect(fs.rm).not.toHaveBeenCalled();
      expect(fs.mkdir).toHaveBeenCalledWith("/output/path", {
        recursive: true,
      });
    });
  });

  describe("validateOutput", () => {
    it("should validate generated site structure", () => {
      const validation = deployer.validateOutput(mockGeneratedSite);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it("should detect missing index.html", () => {
      const siteWithoutIndex = {
        ...mockGeneratedSite,
        pages: {
          "docs.html": mockGeneratedSite.pages["docs.html"],
        },
      };

      const validation = deployer.validateOutput(siteWithoutIndex as never);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("index.html")
      );
    });

    it("should detect missing required assets", () => {
      const siteWithoutAssets = {
        ...mockGeneratedSite,
        assets: {},
      };

      const validation = deployer.validateOutput(siteWithoutAssets as never);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("style.css")
      );
    });

    it("should detect malformed HTML", () => {
      const siteWithBadHTML = {
        ...mockGeneratedSite,
        pages: {
          "index.html":
            "<!DOCTYPE html><html><head><title>Bad HTML</title></head><body><h1>Missing closing tags<p>Unclosed paragraph",
        },
      };

      const validation = deployer.validateOutput(siteWithBadHTML);

      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    it("should validate CSS syntax", () => {
      const siteWithBadCSS = {
        ...mockGeneratedSite,
        assets: {
          "style.css": "body { font-family: ; color: invalid-color; }",
        },
      };

      const validation = deployer.validateOutput(siteWithBadCSS as never);

      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("generateDeploymentManifest", () => {
    it("should generate deployment manifest with file details", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );
      const manifest = deployer.generateDeploymentManifest(result, mockConfig);

      expect(manifest.timestamp).toBeDefined();
      expect(manifest.version).toBe("1.0");
      expect(manifest.files).toHaveLength(7);
      expect(manifest.config).toBeDefined();
    });

    it("should include file sizes and checksums", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );
      const manifest = deployer.generateDeploymentManifest(result, mockConfig);

      const indexFile = manifest.files.find((f) => f.name === "index.html");
      expect(indexFile?.size).toBeGreaterThan(0);
      expect(indexFile?.checksum).toBeDefined();
    });
  });

  describe("copyAssets", () => {
    it("should copy external assets when specified", async () => {
      const configWithAssets = {
        ...mockConfig,
        assets: {
          copy: [
            { src: "/source/logo.png", dest: "images/logo.png" },
            { src: "/source/favicon.ico", dest: "favicon.ico" },
          ],
        },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("fake-image-data"));

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        configWithAssets
      );

      expect(result.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalledWith("/output/path/images", {
        recursive: true,
      });
    });

    it("should handle asset copy errors gracefully", async () => {
      const configWithAssets = {
        ...mockConfig,
        assets: {
          copy: [{ src: "/source/missing.png", dest: "images/missing.png" }],
        },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        configWithAssets
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("File not found")
      );
    });
  });

  describe("optimizeOutput", () => {
    it("should minify HTML when optimization is enabled", async () => {
      const configWithOptimization = {
        ...mockConfig,
        optimization: {
          minify: true,
          compress: false,
        },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        configWithOptimization
      );

      expect(result.success).toBe(true);
      // Verify minification occurred (content should be different)
      const minifiedCall = vi
        .mocked(fs.writeFile)
        .mock.calls.find((call) => call[0].toString().endsWith("index.html"));
      expect(minifiedCall?.[1]).not.toEqual(
        mockGeneratedSite.pages["index.html"]
      );
    });

    it("should compress CSS when optimization is enabled", async () => {
      const configWithOptimization = {
        ...mockConfig,
        optimization: {
          minify: true,
          compress: true,
        },
      };

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        configWithOptimization
      );

      const cssCall = vi
        .mocked(fs.writeFile)
        .mock.calls.find((call) => call[0].toString().endsWith("style.css"));
      expect(cssCall?.[1]).not.toEqual(mockGeneratedSite.assets["style.css"]);
    });
  });

  describe("generateSitemap", () => {
    it("should generate sitemap with correct URLs", () => {
      const sitemap = deployer.generateSitemap(mockGeneratedSite, mockConfig);

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain("<urlset");
      expect(sitemap).toContain("https://example.com/");
      expect(sitemap).toContain("https://example.com/docs.html");
    });

    it("should handle missing base URL gracefully", () => {
      const configWithoutUrl = {
        ...mockConfig,
        site: {
          ...mockConfig.site,
          url: undefined,
        },
      };

      const sitemap = deployer.generateSitemap(
        mockGeneratedSite,
        configWithoutUrl
      );

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain("<urlset");
    });
  });

  describe("deployment reporting", () => {
    it("should provide detailed deployment report", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );

      expect(result.summary).toBeDefined();
      expect(result.summary.totalFiles).toBe(7);
      expect(result.summary.totalSize).toBeGreaterThan(0);
      expect(result.summary.duration).toBeGreaterThan(0);
    });

    it("should track deployment performance metrics", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const startTime = Date.now();
      const result = await deployer.deployToDirectory(
        mockGeneratedSite,
        "/output/path",
        mockConfig
      );
      const endTime = Date.now();

      // Duration should be reasonable (either actual time or minimum 1ms)
      expect(result.summary.duration).toBeGreaterThanOrEqual(0);
      expect(result.summary.duration).toBeLessThanOrEqual(
        Math.max(endTime - startTime, 10)
      ); // Allow up to 10ms tolerance
      expect(result.summary.filesPerSecond).toBeGreaterThan(0);
    });
  });
});
