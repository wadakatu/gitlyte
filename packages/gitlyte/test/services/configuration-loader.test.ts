import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationLoader } from "../../services/configuration-loader.js";
import type { GitLyteConfig } from "../../types/config.js";

// Mock fs module
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  constants: { F_OK: 0 },
}));

// Mock path module
vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
  resolve: vi.fn((...args) => args.join("/")),
}));

describe("Configuration Loader", () => {
  let configLoader: ConfigurationLoader;
  let mockValidConfig: GitLyteConfig;

  beforeEach(() => {
    configLoader = new ConfigurationLoader();

    mockValidConfig = {
      version: "1.0",
      site: {
        title: "Test Repository",
        description: "A test repository for testing",
        layout: "hero-focused",
        url: "https://example.com",
      },
      design: {
        theme: "professional",
        colors: {
          primary: "#007acc",
          secondary: "#005999",
          accent: "#ff6b35",
        },
        typography: {
          headings: "Inter, sans-serif",
          body: "System UI, sans-serif",
        },
      },
      content: {
        hero: {
          title: "Custom Hero Title",
          subtitle: "Custom subtitle",
          description: "Custom description",
        },
        features: [
          { title: "Feature 1", description: "Description 1" },
          { title: "Feature 2", description: "Description 2" },
        ],
      },
      pages: {
        generate: ["index", "docs", "api"],
      },
      integrations: {
        analytics: {
          google: "GA-123456789",
        },
        social: {
          twitter: "@example",
        },
      },
      seo: {
        keywords: ["test", "repository", "library"],
        author: "Test Author",
      },
      generation: {
        branches: ["main"],
        labels: ["enhancement"],
        outputDirectory: "custom-output",
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("loadConfiguration", () => {
    it("should load valid gitlyte.json configuration", async () => {
      const configJson = JSON.stringify(mockValidConfig, null, 2);

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(configJson);

      const result = await configLoader.loadConfiguration("/test/path");

      expect(result.found).toBe(true);
      expect(result.config.version).toBe(mockValidConfig.version);
      expect(result.config.site?.title).toBe(mockValidConfig.site?.title);
      expect(result.config.design?.colors?.primary).toBe(
        mockValidConfig.design?.colors?.primary
      );
      expect(result.config.generation?.outputDirectory).toBe("custom-output");
      expect(result.source).toBe("/test/path/gitlyte.json");
    });

    it("should load legacy .gitlyte.json configuration", async () => {
      vi.mocked(fs.access)
        .mockRejectedValueOnce(new Error("File not found")) // gitlyte.json
        .mockResolvedValueOnce(undefined); // .gitlyte.json

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockValidConfig));

      const result = await configLoader.loadConfiguration("/test/path");

      expect(result.found).toBe(true);
      expect(result.config.version).toBe(mockValidConfig.version);
      expect(result.config.site?.title).toBe(mockValidConfig.site?.title);
      expect(result.source).toBe("/test/path/.gitlyte.json");
    });

    it("should return default configuration when no config file exists", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("File not found"));

      const result = await configLoader.loadConfiguration("/test/path");

      expect(result.found).toBe(false);
      expect(result.config).toBeDefined();
      expect(result.config.version).toBe("1.0");
      expect(result.source).toBeUndefined();
    });

    it("should handle malformed JSON gracefully", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue("{ invalid json }");

      const result = await configLoader.loadConfiguration("/test/path");

      expect(result.found).toBe(false);
      expect(result.config).toBeDefined();
      expect(result.source).toBeUndefined();
    });

    it("should handle file read errors gracefully", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error("Permission denied"));

      const result = await configLoader.loadConfiguration("/test/path");

      expect(result.found).toBe(false);
      expect(result.config).toBeDefined();
      expect(result.source).toBeUndefined();
    });

    it("should search in current directory by default", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockValidConfig));

      const result = await configLoader.loadConfiguration();

      expect(vi.mocked(path.resolve)).toHaveBeenCalledWith(process.cwd());
      expect(result.found).toBe(true);
    });
  });

  describe("validateConfiguration", () => {
    it("should validate valid configuration", () => {
      const validation = configLoader.validateConfiguration(mockValidConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it("should detect invalid layout values", () => {
      const invalidConfig = {
        ...mockValidConfig,
        site: {
          ...mockValidConfig.site,
          layout: "invalid-layout" as never,
        },
      };

      const validation = configLoader.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("Invalid layout value")
      );
    });

    it("should detect invalid theme values", () => {
      const invalidConfig = {
        ...mockValidConfig,
        design: {
          ...mockValidConfig.design,
          theme: "invalid-theme" as never,
        },
      };

      const validation = configLoader.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("Invalid theme value")
      );
    });

    it("should detect invalid color values", () => {
      const invalidConfig = {
        ...mockValidConfig,
        design: {
          ...mockValidConfig.design,
          colors: {
            primary: "not-a-color",
            secondary: "#invalid",
          },
        },
      };

      const validation = configLoader.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should provide warnings for missing recommended fields", () => {
      const minimalConfig: GitLyteConfig = {
        version: "1.0",
      };

      const validation = configLoader.validateConfiguration(minimalConfig);

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings).toContainEqual(
        expect.stringContaining("site configuration is missing")
      );
    });

    it("should detect invalid page generation options", () => {
      const invalidConfig = {
        ...mockValidConfig,
        pages: {
          generate: ["index", "invalid-page"],
        },
      } as never;

      const validation = configLoader.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringContaining("Invalid page type")
      );
    });

    it("should validate outputDirectory configuration", () => {
      const configWithOutputDir = {
        ...mockValidConfig,
        generation: {
          outputDirectory: "build",
          branches: ["main"],
        },
      };

      const validation =
        configLoader.validateConfiguration(configWithOutputDir);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should handle empty outputDirectory gracefully", () => {
      const configWithEmptyOutputDir = {
        ...mockValidConfig,
        generation: {
          outputDirectory: "",
          branches: ["main"],
        },
      };

      const validation = configLoader.validateConfiguration(
        configWithEmptyOutputDir
      );

      expect(validation.valid).toBe(true);
    });
  });

  describe("mergeWithDefaults", () => {
    it("should merge user config with defaults", () => {
      const userConfig: GitLyteConfig = {
        site: {
          title: "Custom Title",
        },
        design: {
          colors: {
            primary: "#custom",
          },
        },
      };

      const merged = configLoader.mergeWithDefaults(userConfig);

      expect(merged.site?.title).toBe("Custom Title");
      expect(merged.design?.colors?.primary).toBe("#custom");
      expect(merged.version).toBe("1.0"); // From defaults
      expect(merged.design?.theme).toBe("professional"); // From defaults
    });

    it("should handle nested object merging", () => {
      const userConfig: GitLyteConfig = {
        design: {
          colors: {
            primary: "#custom",
          },
        },
      };

      const merged = configLoader.mergeWithDefaults(userConfig);

      expect(merged.design?.colors?.primary).toBe("#custom");
      expect(merged.design?.colors?.secondary).toBeDefined(); // From defaults
      expect(merged.design?.theme).toBeDefined(); // From defaults
    });

    it("should preserve arrays without merging", () => {
      const userConfig: GitLyteConfig = {
        pages: {
          generate: ["index", "docs"],
        },
        seo: {
          keywords: ["custom", "keywords"],
        },
      };

      const merged = configLoader.mergeWithDefaults(userConfig);

      expect(merged.pages?.generate).toEqual(["index", "docs"]);
      expect(merged.seo?.keywords).toEqual(["custom", "keywords"]);
    });

    it("should merge outputDirectory with defaults", () => {
      const userConfig: GitLyteConfig = {
        generation: {
          outputDirectory: "build",
        },
      };

      const merged = configLoader.mergeWithDefaults(userConfig);

      expect(merged.generation?.outputDirectory).toBe("build");
      expect(merged.generation?.branches).toBeDefined(); // From defaults
    });
  });

  describe("getDefaultConfiguration", () => {
    it("should return valid default configuration", () => {
      const defaults = configLoader.getDefaultConfiguration();

      expect(defaults.version).toBe("1.0");
      expect(defaults.site?.layout).toBe("hero-focused");
      expect(defaults.design?.theme).toBe("professional");
      expect(defaults.pages?.generate).toContain("index");
      expect(defaults.generation?.outputDirectory).toBe("docs"); // Default value
    });

    it("should have all required fields", () => {
      const defaults = configLoader.getDefaultConfiguration();

      expect(defaults.version).toBeDefined();
      expect(defaults.site).toBeDefined();
      expect(defaults.design).toBeDefined();
      expect(defaults.pages).toBeDefined();
    });
  });

  describe("saveConfiguration", () => {
    it("should save configuration to gitlyte.json", async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await configLoader.saveConfiguration(mockValidConfig, "/test/path");

      expect(fs.writeFile).toHaveBeenCalledWith(
        "/test/path/gitlyte.json",
        expect.stringContaining('"version": "1.0"'),
        "utf8"
      );
    });

    it("should format JSON with proper indentation", async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await configLoader.saveConfiguration(mockValidConfig, "/test/path");

      const savedContent = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(savedContent).toContain("  "); // Should have indentation
      expect(savedContent).toMatch(/^\{[\s\S]*\}$/); // Should be valid JSON format
    });

    it("should handle write errors gracefully", async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error("Permission denied"));

      await expect(
        configLoader.saveConfiguration(mockValidConfig, "/test/path")
      ).rejects.toThrow("Failed to save configuration");
    });
  });

  describe("migrateConfiguration", () => {
    it("should migrate legacy configuration format", () => {
      const legacyConfig = {
        logo: { path: "/logo.png", alt: "Logo" },
        favicon: { path: "/favicon.ico" },
        site: {
          theme: { primary: "#old-color" },
        },
      };

      const migrated = configLoader.migrateConfiguration(legacyConfig);

      expect(migrated.site?.logo).toBe("/logo.png");
      expect(migrated.site?.favicon).toBe("/favicon.ico");
      expect(migrated.design?.colors?.primary).toBe("#old-color");
    });

    it("should preserve non-legacy fields", () => {
      const config = {
        version: "1.0",
        site: { title: "Test" },
        design: { theme: "professional" as const },
      };

      const migrated = configLoader.migrateConfiguration(config);

      expect(migrated.version).toBe("1.0");
      expect(migrated.site?.title).toBe("Test");
      expect(migrated.design?.theme).toBe("professional");
    });

    it("should migrate legacy config without errors", () => {
      const legacyConfig = {
        logo: { path: "/logo.png" },
      };

      const migrated = configLoader.migrateConfiguration(legacyConfig);
      const validation = configLoader.validateConfiguration(migrated);

      expect(migrated.site?.logo).toBe("/logo.png");
      expect(validation.valid).toBe(true);
    });
  });
});
