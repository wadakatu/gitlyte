import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG_V2,
  resolveConfigV2,
  validateConfigV2,
} from "../../types/v2-config.js";

describe("v2-config", () => {
  describe("resolveConfigV2", () => {
    it("should return default values when no config provided", () => {
      const result = resolveConfigV2({});

      expect(result.enabled).toBe(true);
      expect(result.outputDirectory).toBe("docs");
      expect(result.ai.provider).toBe("anthropic");
      expect(result.ai.quality).toBe("standard");
      expect(result.pages).toEqual([]);
      expect(result.logo).toBeUndefined();
      expect(result.favicon).toBeUndefined();
      expect(result.theme.mode).toBe("dark"); // default theme mode
      expect(result.generation.mode).toBe("webhook"); // default generation mode
    });

    it("should override default values with provided config", () => {
      const result = resolveConfigV2({
        enabled: false,
        outputDirectory: "public",
        ai: {
          provider: "openai",
          quality: "high",
        },
        pages: ["features", "docs"],
      });

      expect(result.enabled).toBe(false);
      expect(result.outputDirectory).toBe("public");
      expect(result.ai.provider).toBe("openai");
      expect(result.ai.quality).toBe("high");
      expect(result.pages).toEqual(["features", "docs"]);
    });

    it("should handle partial ai config", () => {
      const result = resolveConfigV2({
        ai: {
          provider: "google",
        },
      });

      expect(result.ai.provider).toBe("google");
      expect(result.ai.quality).toBe("standard"); // default
    });

    it("should preserve logo and favicon when provided", () => {
      const result = resolveConfigV2({
        logo: {
          path: "./logo.svg",
          alt: "My Logo",
        },
        favicon: {
          path: "./favicon.ico",
        },
      });

      expect(result.logo?.path).toBe("./logo.svg");
      expect(result.logo?.alt).toBe("My Logo");
      expect(result.favicon?.path).toBe("./favicon.ico");
    });

    it("should use DEFAULT_CONFIG_V2 values", () => {
      const result = resolveConfigV2();

      expect(result.enabled).toBe(DEFAULT_CONFIG_V2.enabled);
      expect(result.outputDirectory).toBe(DEFAULT_CONFIG_V2.outputDirectory);
      expect(result.ai.provider).toBe(DEFAULT_CONFIG_V2.ai.provider);
      expect(result.ai.quality).toBe(DEFAULT_CONFIG_V2.ai.quality);
      expect(result.theme.mode).toBe(DEFAULT_CONFIG_V2.theme.mode);
    });

    it("should override theme.mode when provided", () => {
      const result = resolveConfigV2({
        theme: {
          mode: "light",
        },
      });

      expect(result.theme.mode).toBe("light");
    });

    it("should use default theme.mode when theme object is empty", () => {
      const result = resolveConfigV2({
        theme: {},
      });

      expect(result.theme.mode).toBe("dark"); // default
    });

    it("should return undefined siteInstructions when not provided", () => {
      const result = resolveConfigV2({});

      expect(result.prompts.siteInstructions).toBeUndefined();
    });

    it("should preserve siteInstructions when provided", () => {
      const result = resolveConfigV2({
        prompts: {
          siteInstructions: "技術的で簡潔なトーンで、日本語で生成してください",
        },
      });

      expect(result.prompts.siteInstructions).toBe(
        "技術的で簡潔なトーンで、日本語で生成してください"
      );
    });

    it("should handle empty prompts object", () => {
      const result = resolveConfigV2({
        prompts: {},
      });

      expect(result.prompts.siteInstructions).toBeUndefined();
    });
  });

  describe("validateConfigV2", () => {
    it("should validate a valid config", () => {
      const result = validateConfigV2({
        enabled: true,
        outputDirectory: "docs",
        ai: {
          provider: "anthropic",
          quality: "standard",
        },
        pages: ["features"],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("should return error for non-object config", () => {
      const result = validateConfigV2(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Configuration must be an object");
    });

    it("should return error for invalid enabled type", () => {
      const result = validateConfigV2({
        enabled: "true", // should be boolean
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'enabled' must be a boolean");
    });

    it("should return error for invalid outputDirectory type", () => {
      const result = validateConfigV2({
        outputDirectory: 123, // should be string
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'outputDirectory' must be a string");
    });

    it("should return error for invalid logo object", () => {
      const result = validateConfigV2({
        logo: "logo.svg", // should be object
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'logo' must be an object");
    });

    it("should return error for missing logo.path", () => {
      const result = validateConfigV2({
        logo: {
          alt: "Logo",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'logo.path' must be a string");
    });

    it("should return error for invalid logo.alt type", () => {
      const result = validateConfigV2({
        logo: {
          path: "./logo.svg",
          alt: 123, // should be string
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'logo.alt' must be a string");
    });

    it("should return error for invalid favicon object", () => {
      const result = validateConfigV2({
        favicon: null, // should be object
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'favicon' must be an object");
    });

    it("should return error for missing favicon.path", () => {
      const result = validateConfigV2({
        favicon: {},
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'favicon.path' must be a string");
    });

    it("should return error for invalid ai object", () => {
      const result = validateConfigV2({
        ai: "anthropic", // should be object
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'ai' must be an object");
    });

    it("should return error for invalid ai.provider", () => {
      const result = validateConfigV2({
        ai: {
          provider: "invalid-provider",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "'ai.provider' must be one of: anthropic, openai, google"
      );
    });

    it("should return error for invalid ai.quality", () => {
      const result = validateConfigV2({
        ai: {
          quality: "ultra",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "'ai.quality' must be one of: standard, high"
      );
    });

    it("should return error for non-array pages", () => {
      const result = validateConfigV2({
        pages: "features", // should be array
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'pages' must be an array");
    });

    it("should return warning for unknown page type", () => {
      const result = validateConfigV2({
        pages: ["features", "unknown-page"],
      });

      expect(result.valid).toBe(true); // warnings don't invalidate
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Unknown page type: 'unknown-page'");
    });

    it("should return warning for unknown config fields", () => {
      const result = validateConfigV2({
        enabled: true,
        unknownField: "value",
      });

      expect(result.valid).toBe(true); // warnings don't invalidate
      expect(result.warnings).toContain(
        "Unknown configuration field: 'unknownField'"
      );
    });

    it("should validate all valid page types", () => {
      const result = validateConfigV2({
        pages: ["features", "docs", "api", "examples", "changelog"],
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should validate all valid providers", () => {
      for (const provider of ["anthropic", "openai", "google"]) {
        const result = validateConfigV2({
          ai: { provider },
        });
        expect(result.valid).toBe(true);
      }
    });

    it("should validate all valid quality modes", () => {
      for (const quality of ["standard", "high"]) {
        const result = validateConfigV2({
          ai: { quality },
        });
        expect(result.valid).toBe(true);
      }
    });

    it("should return error for invalid theme object", () => {
      const result = validateConfigV2({
        theme: "dark", // should be object
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'theme' must be an object");
    });

    it("should return error for invalid theme.mode", () => {
      const result = validateConfigV2({
        theme: {
          mode: "invalid-mode",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "'theme.mode' must be one of: light, dark"
      );
    });

    it("should validate all valid theme modes", () => {
      for (const mode of ["light", "dark"]) {
        const result = validateConfigV2({
          theme: { mode },
        });
        expect(result.valid).toBe(true);
      }
    });

    it("should return error for invalid generation.mode", () => {
      const result = validateConfigV2({
        generation: {
          mode: "invalid-mode",
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "'generation.mode' must be one of: webhook, workflow"
      );
    });

    it("should validate all valid generation modes", () => {
      for (const mode of ["webhook", "workflow"]) {
        const result = validateConfigV2({
          generation: { mode },
        });
        expect(result.valid).toBe(true);
      }
    });

    it("should validate config with theme setting", () => {
      const result = validateConfigV2({
        enabled: true,
        theme: {
          mode: "dark",
        },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for invalid prompts object", () => {
      const result = validateConfigV2({
        prompts: "custom instructions", // should be object
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("'prompts' must be an object");
    });

    it("should return error for invalid prompts.siteInstructions type", () => {
      const result = validateConfigV2({
        prompts: {
          siteInstructions: 123, // should be string
        },
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "'prompts.siteInstructions' must be a string"
      );
    });

    it("should validate valid prompts config", () => {
      const result = validateConfigV2({
        prompts: {
          siteInstructions: "Use a friendly tone for beginners",
        },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate empty prompts object", () => {
      const result = validateConfigV2({
        prompts: {},
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return warning for very long siteInstructions", () => {
      const longInstructions = "a".repeat(2500); // 2500 characters

      const result = validateConfigV2({
        prompts: {
          siteInstructions: longInstructions,
        },
      });

      expect(result.valid).toBe(true); // warnings don't invalidate
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("2500 characters");
      expect(result.warnings[0]).toContain("token limit");
    });

    it("should not warn for siteInstructions under 2000 characters", () => {
      const shortInstructions = "a".repeat(1999);

      const result = validateConfigV2({
        prompts: {
          siteInstructions: shortInstructions,
        },
      });

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });
});
