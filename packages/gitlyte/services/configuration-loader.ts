import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  ConfigLoadResult,
  GitLyteConfig,
  Suggestion,
  ValidationResult,
} from "../types/config.js";

export class ConfigurationLoader {
  private readonly CONFIG_FILENAMES = ["gitlyte.json", ".gitlyte.json"];
  private readonly VALID_LAYOUTS = [
    "minimal",
    "grid",
    "sidebar",
    "hero-focused",
    "content-heavy",
  ];
  private readonly VALID_THEMES = [
    "professional",
    "creative",
    "minimal",
    "custom",
  ];
  private readonly VALID_PAGE_TYPES = [
    "index",
    "docs",
    "api",
    "examples",
    "changelog",
  ];

  async loadConfiguration(projectPath?: string): Promise<ConfigLoadResult> {
    const searchPath = projectPath
      ? path.resolve(projectPath)
      : path.resolve(process.cwd());

    // Try to find and load configuration file
    for (const filename of this.CONFIG_FILENAMES) {
      const configPath = path.join(searchPath, filename);

      try {
        await fs.access(configPath, fs.constants.F_OK);
        const configContent = await fs.readFile(configPath, "utf8");
        const config = JSON.parse(configContent);

        // Migrate legacy configuration if needed
        const migratedConfig = this.migrateConfiguration(config);
        const mergedConfig = this.mergeWithDefaults(migratedConfig);

        return {
          found: true,
          config: mergedConfig,
          source: configPath,
        };
      } catch (_error) {}
    }

    // No configuration file found, return defaults
    return {
      found: false,
      config: this.getDefaultConfiguration(),
      source: undefined,
    };
  }

  validateConfiguration(config: GitLyteConfig): ValidationResult {
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: [] as Suggestion[],
    };

    this.validateVersion(config, validation);
    this.validateSiteConfig(config, validation);
    this.validateDesignConfig(config, validation);
    this.validatePagesConfig(config, validation);
    this.addSuggestions(config, validation);

    validation.valid = validation.errors.length === 0;
    return validation;
  }

  private validateVersion(
    config: GitLyteConfig,
    validation: ValidationResult
  ): void {
    if (!config.version) {
      validation.warnings.push(
        "Configuration version is missing. Recommended to specify version for compatibility."
      );
    }
  }

  private validateSiteConfig(
    config: GitLyteConfig,
    validation: ValidationResult
  ): void {
    if (config.site) {
      if (
        config.site.layout &&
        !this.VALID_LAYOUTS.includes(config.site.layout)
      ) {
        validation.errors.push(
          `Invalid layout value: ${config.site.layout}. Must be one of: ${this.VALID_LAYOUTS.join(", ")}`
        );
      }

      if (!config.site.title) {
        validation.warnings.push(
          "site.title is recommended for better SEO and user experience."
        );
      }

      if (!config.site.description) {
        validation.warnings.push(
          "site.description is recommended for SEO meta tags."
        );
      }
    } else {
      validation.warnings.push(
        "site configuration is missing. Consider adding basic site information."
      );
    }
  }

  private validateDesignConfig(
    config: GitLyteConfig,
    validation: ValidationResult
  ): void {
    if (config.design) {
      if (
        config.design.theme &&
        !this.VALID_THEMES.includes(config.design.theme)
      ) {
        validation.errors.push(
          `Invalid theme value: ${config.design.theme}. Must be one of: ${this.VALID_THEMES.join(", ")}`
        );
      }

      if (config.design.colors) {
        const colorErrors = this.validateColors(config.design.colors);
        validation.errors.push(...colorErrors);
      }
    }
  }

  private validatePagesConfig(
    config: GitLyteConfig,
    validation: ValidationResult
  ): void {
    if (config.pages?.generate) {
      const invalidPages = config.pages.generate.filter(
        (page) => !this.VALID_PAGE_TYPES.includes(page)
      );
      if (invalidPages.length > 0) {
        validation.errors.push(
          `Invalid page type(s): ${invalidPages.join(", ")}. Must be one of: ${this.VALID_PAGE_TYPES.join(", ")}`
        );
      }
    }
  }

  private addSuggestions(
    config: GitLyteConfig,
    validation: ValidationResult
  ): void {
    // Add accessibility suggestions
    if (
      config.design?.colors &&
      !this.hasAccessibleContrast(config.design.colors)
    ) {
      validation.suggestions.push({
        type: "accessibility",
        message: "Color contrast may not meet accessibility standards",
        suggestion:
          "Consider using higher contrast colors for better readability",
        priority: "medium",
      });
    }

    // Add SEO suggestions
    if (!config.seo?.keywords) {
      validation.suggestions.push({
        type: "seo",
        message: "No SEO keywords specified",
        suggestion:
          "Add relevant keywords to improve search engine optimization",
        priority: "low",
      });
    }
  }

  mergeWithDefaults(userConfig: GitLyteConfig): GitLyteConfig {
    const defaults = this.getDefaultConfiguration();
    return this.deepMerge(
      defaults as Record<string, unknown>,
      userConfig as Record<string, unknown>
    ) as GitLyteConfig;
  }

  getDefaultConfiguration(): GitLyteConfig {
    return {
      version: "1.0",
      site: {
        title: "",
        description: "",
        layout: "hero-focused",
        url: "",
      },
      design: {
        theme: "professional",
        colors: {
          primary: "#007acc",
          secondary: "#005999",
          accent: "#ff6b35",
          background: "#ffffff",
          text: "#1f2937",
        },
        typography: {
          headings: "Inter, sans-serif",
          body: "System UI, sans-serif",
        },
        layout: "hero-focused",
      },
      content: {
        hero: {
          title: "",
          subtitle: "",
          description: "",
        },
        features: [],
        sections: ["features", "installation", "usage"],
      },
      pages: {
        generate: ["index"],
        docs: {
          source: "README.md",
          toc: true,
          search: false,
        },
        api: {
          enabled: false,
          source: "auto",
        },
      },
      integrations: {
        analytics: {},
        social: {},
      },
      seo: {
        keywords: [],
        author: "",
      },
      generation: {
        branches: [],
        labels: [],
        outputDirectory: "docs",
        preview: {
          enabled: true,
          path: "docs/preview",
        },
        push: {
          enabled: true,
          branches: [],
          ignorePaths: [],
        },
      },
    };
  }

  async saveConfiguration(
    config: GitLyteConfig,
    projectPath?: string
  ): Promise<void> {
    const searchPath = projectPath
      ? path.resolve(projectPath)
      : path.resolve(process.cwd());
    const configPath = path.join(searchPath, "gitlyte.json");

    try {
      const configJson = JSON.stringify(config, null, 2);
      await fs.writeFile(configPath, configJson, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  migrateConfiguration(
    config: Partial<GitLyteConfig> & Record<string, unknown>
  ): GitLyteConfig {
    const migratedConfig: GitLyteConfig = { ...config };

    // Migrate legacy logo configuration
    if (config.logo) {
      if (!migratedConfig.site) {
        migratedConfig.site = {};
      }
      migratedConfig.site.logo = (config.logo as Record<string, unknown>)
        ?.path as string;
    }

    // Migrate legacy favicon configuration
    if (config.favicon) {
      if (!migratedConfig.site) {
        migratedConfig.site = {};
      }
      migratedConfig.site.favicon = (config.favicon as Record<string, unknown>)
        ?.path as string;
    }

    // Migrate legacy theme configuration
    if (config.site?.theme) {
      if (!migratedConfig.design) {
        migratedConfig.design = {};
      }
      if (!migratedConfig.design.colors) {
        migratedConfig.design.colors = {};
      }

      const theme = config.site.theme as Record<string, unknown>;
      if (theme?.primary) {
        migratedConfig.design.colors.primary = theme.primary as string;
      }
      if (theme?.secondary) {
        migratedConfig.design.colors.secondary = theme.secondary as string;
      }
      if (theme?.accent) {
        migratedConfig.design.colors.accent = theme.accent as string;
      }
    }

    // Ensure version is set
    if (!migratedConfig.version) {
      migratedConfig.version = "1.0";
    }

    return migratedConfig;
  }

  private validateColors(colors: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(colors)) {
      if (typeof value === "string" && !this.isValidCSSColor(value)) {
        errors.push(
          `Invalid color value for ${key}: ${value}. Must be a valid CSS color.`
        );
      }
    }

    return errors;
  }

  private isValidCSSColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const cssColorNames = [
      "black",
      "white",
      "red",
      "green",
      "blue",
      "yellow",
      "cyan",
      "magenta",
      "transparent",
      "currentColor",
    ];

    const isValidHex = hexColorRegex.test(color);
    const isValidCssColor = cssColorNames.includes(color.toLowerCase());
    const isValidRgb = color.startsWith("rgb(") || color.startsWith("rgba(");
    const isValidHsl = color.startsWith("hsl(") || color.startsWith("hsla(");

    return isValidHex || isValidCssColor || isValidRgb || isValidHsl;
  }

  private hasAccessibleContrast(colors: Record<string, unknown>): boolean {
    // Simplified contrast check - in real implementation, would calculate actual contrast ratios
    const primaryColor = colors.primary;
    const backgroundColor = colors.background;

    if (!primaryColor || !backgroundColor) {
      return true; // Can't check without both colors
    }

    // Very basic check - proper implementation would use WCAG contrast calculations
    return primaryColor !== backgroundColor;
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(
          (target[key] as Record<string, unknown>) || {},
          source[key] as Record<string, unknown>
        );
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }
}
