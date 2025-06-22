import { describe, it, expect } from "vitest";
import {
  mergeConfigWithDefaults,
  hasConfigChanged,
} from "../../utils/config-loader.js";
import type { GitLyteConfig } from "../../types/config.js";

describe("Config Merge Functions", () => {
  describe("mergeConfigWithDefaults", () => {
    it("should add missing layout to existing config", () => {
      const existingConfig: GitLyteConfig = {
        site: {
          theme: {
            primary: "#ff0000",
          },
        },
      };

      const defaultConfig: GitLyteConfig = {
        site: {
          layout: "minimal",
          theme: {
            primary: "#000000",
            secondary: "#666666",
          },
        },
      };

      const result = mergeConfigWithDefaults(existingConfig, defaultConfig);

      expect(result.site?.layout).toBe("minimal");
      expect(result.site?.theme?.primary).toBe("#ff0000"); // 既存値を保持
      expect(result.site?.theme?.secondary).toBe("#666666"); // 新しい値を追加
    });

    it("should not override existing layout", () => {
      const existingConfig: GitLyteConfig = {
        site: {
          layout: "grid",
          theme: {
            primary: "#ff0000",
          },
        },
      };

      const defaultConfig: GitLyteConfig = {
        site: {
          layout: "minimal",
          theme: {
            secondary: "#666666",
          },
        },
      };

      const result = mergeConfigWithDefaults(existingConfig, defaultConfig);

      expect(result.site?.layout).toBe("grid"); // 既存値を保持
      expect(result.site?.theme?.primary).toBe("#ff0000");
      expect(result.site?.theme?.secondary).toBe("#666666");
    });

    it("should add missing logo and favicon", () => {
      const existingConfig: GitLyteConfig = {
        site: {
          theme: {
            primary: "#ff0000",
          },
        },
      };

      const defaultConfig: GitLyteConfig = {
        logo: {
          path: "./assets/logo.svg",
          alt: "Logo",
        },
        favicon: {
          path: "./assets/favicon.ico",
        },
        site: {
          layout: "minimal",
        },
      };

      const result = mergeConfigWithDefaults(existingConfig, defaultConfig);

      expect(result.logo?.path).toBe("./assets/logo.svg");
      expect(result.favicon?.path).toBe("./assets/favicon.ico");
      expect(result.site?.layout).toBe("minimal");
    });

    it("should not override existing logo and favicon", () => {
      const existingConfig: GitLyteConfig = {
        logo: {
          path: "./existing-logo.png",
          alt: "Existing Logo",
        },
        favicon: {
          path: "./existing-favicon.ico",
        },
      };

      const defaultConfig: GitLyteConfig = {
        logo: {
          path: "./assets/logo.svg",
          alt: "Default Logo",
        },
        favicon: {
          path: "./assets/favicon.ico",
        },
      };

      const result = mergeConfigWithDefaults(existingConfig, defaultConfig);

      expect(result.logo?.path).toBe("./existing-logo.png");
      expect(result.logo?.alt).toBe("Existing Logo");
      expect(result.favicon?.path).toBe("./existing-favicon.ico");
    });

    it("should handle empty existing config", () => {
      const existingConfig: GitLyteConfig = {};

      const defaultConfig: GitLyteConfig = {
        site: {
          layout: "hero-focused",
          theme: {
            primary: "#667eea",
            secondary: "#764ba2",
            accent: "#f093fb",
          },
        },
        logo: {
          path: "./assets/logo.svg",
          alt: "Logo",
        },
      };

      const result = mergeConfigWithDefaults(existingConfig, defaultConfig);

      expect(result.site?.layout).toBe("hero-focused");
      expect(result.site?.theme?.primary).toBe("#667eea");
      expect(result.logo?.path).toBe("./assets/logo.svg");
    });
  });

  describe("hasConfigChanged", () => {
    it("should detect when layout is added", () => {
      const original: GitLyteConfig = {
        site: {
          theme: {
            primary: "#ff0000",
          },
        },
      };

      const updated: GitLyteConfig = {
        site: {
          layout: "minimal",
          theme: {
            primary: "#ff0000",
          },
        },
      };

      expect(hasConfigChanged(original, updated)).toBe(true);
    });

    it("should detect when theme colors are added", () => {
      const original: GitLyteConfig = {
        site: {
          theme: {
            primary: "#ff0000",
          },
        },
      };

      const updated: GitLyteConfig = {
        site: {
          theme: {
            primary: "#ff0000",
            secondary: "#666666",
          },
        },
      };

      expect(hasConfigChanged(original, updated)).toBe(true);
    });

    it("should return false when configs are identical", () => {
      const config: GitLyteConfig = {
        site: {
          layout: "minimal",
          theme: {
            primary: "#ff0000",
            secondary: "#666666",
          },
        },
      };

      expect(hasConfigChanged(config, config)).toBe(false);
    });

    it("should return false when configs have same content", () => {
      const original: GitLyteConfig = {
        site: {
          layout: "minimal",
          theme: {
            primary: "#ff0000",
          },
        },
      };

      const updated: GitLyteConfig = {
        site: {
          layout: "minimal",
          theme: {
            primary: "#ff0000",
          },
        },
      };

      expect(hasConfigChanged(original, updated)).toBe(false);
    });
  });
});
