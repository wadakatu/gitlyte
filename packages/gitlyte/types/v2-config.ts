/**
 * GitLyte v2 Configuration Schema
 *
 * Simplified configuration focused on:
 * - Zero configuration by default
 * - AI-first design (no manual theme/layout)
 * - Multiple AI provider support
 */

/** AI Provider options */
export type AIProvider = "anthropic" | "openai" | "google";

/** Quality mode for generation */
export type QualityMode = "standard" | "high";

/** Additional pages that can be generated */
export type GeneratablePage =
  | "features"
  | "docs"
  | "api"
  | "examples"
  | "changelog";

/**
 * GitLyte v2 Configuration
 *
 * @example
 * ```json
 * {
 *   "enabled": true,
 *   "outputDirectory": "docs",
 *   "ai": {
 *     "provider": "anthropic",
 *     "quality": "standard"
 *   }
 * }
 * ```
 */
export interface GitLyteConfigV2 {
  /**
   * Enable/disable site generation
   * @default true
   */
  enabled?: boolean;

  /**
   * Output directory for generated files
   * @default "docs"
   */
  outputDirectory?: string;

  /**
   * Logo configuration
   */
  logo?: {
    /** Path to logo image (relative to repository root) */
    path: string;
    /** Alt text for accessibility */
    alt?: string;
  };

  /**
   * Favicon configuration
   */
  favicon?: {
    /** Path to favicon file (relative to repository root) */
    path: string;
  };

  /**
   * AI configuration
   */
  ai?: {
    /**
     * AI provider to use
     * @default "anthropic"
     */
    provider?: AIProvider;

    /**
     * Quality mode
     * - standard: Single generation pass (faster, cheaper)
     * - high: Self-Refine pattern (better quality, higher cost)
     * @default "standard"
     */
    quality?: QualityMode;
  };

  /**
   * Additional pages to generate beyond the main index page
   * @default []
   */
  pages?: GeneratablePage[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG_V2 = {
  enabled: true,
  outputDirectory: "docs",
  logo: undefined as undefined,
  favicon: undefined as undefined,
  ai: {
    provider: "anthropic" as const,
    quality: "standard" as const,
  },
  pages: [] as GeneratablePage[],
};

/**
 * Resolved configuration with all defaults applied
 */
export interface ResolvedConfigV2 {
  enabled: boolean;
  outputDirectory: string;
  logo?: {
    path: string;
    alt?: string;
  };
  favicon?: {
    path: string;
  };
  ai: {
    provider: AIProvider;
    quality: QualityMode;
  };
  pages: GeneratablePage[];
}

/**
 * Apply defaults to a partial configuration
 */
export function resolveConfigV2(
  config: GitLyteConfigV2 = {}
): ResolvedConfigV2 {
  const defaultProvider: AIProvider = DEFAULT_CONFIG_V2.ai.provider;
  const defaultQuality: QualityMode = DEFAULT_CONFIG_V2.ai.quality;

  return {
    enabled: config.enabled ?? DEFAULT_CONFIG_V2.enabled,
    outputDirectory:
      config.outputDirectory ?? DEFAULT_CONFIG_V2.outputDirectory,
    logo: config.logo,
    favicon: config.favicon,
    ai: {
      provider: config.ai?.provider ?? defaultProvider,
      quality: config.ai?.quality ?? defaultQuality,
    },
    pages: config.pages ?? DEFAULT_CONFIG_V2.pages,
  };
}

/**
 * Validate configuration
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfigV2(config: unknown): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config === null || typeof config !== "object") {
    return {
      valid: false,
      errors: ["Configuration must be an object"],
      warnings: [],
    };
  }

  const cfg = config as Record<string, unknown>;

  // Validate enabled
  if (cfg.enabled !== undefined && typeof cfg.enabled !== "boolean") {
    errors.push("'enabled' must be a boolean");
  }

  // Validate outputDirectory
  if (
    cfg.outputDirectory !== undefined &&
    typeof cfg.outputDirectory !== "string"
  ) {
    errors.push("'outputDirectory' must be a string");
  }

  // Validate logo
  if (cfg.logo !== undefined) {
    if (typeof cfg.logo !== "object" || cfg.logo === null) {
      errors.push("'logo' must be an object");
    } else {
      const logo = cfg.logo as Record<string, unknown>;
      if (typeof logo.path !== "string") {
        errors.push("'logo.path' must be a string");
      }
      if (logo.alt !== undefined && typeof logo.alt !== "string") {
        errors.push("'logo.alt' must be a string");
      }
    }
  }

  // Validate favicon
  if (cfg.favicon !== undefined) {
    if (typeof cfg.favicon !== "object" || cfg.favicon === null) {
      errors.push("'favicon' must be an object");
    } else {
      const favicon = cfg.favicon as Record<string, unknown>;
      if (typeof favicon.path !== "string") {
        errors.push("'favicon.path' must be a string");
      }
    }
  }

  // Validate ai
  if (cfg.ai !== undefined) {
    if (typeof cfg.ai !== "object" || cfg.ai === null) {
      errors.push("'ai' must be an object");
    } else {
      const ai = cfg.ai as Record<string, unknown>;
      const validProviders = ["anthropic", "openai", "google"];
      const validQualities = ["standard", "high"];

      if (
        ai.provider !== undefined &&
        !validProviders.includes(ai.provider as string)
      ) {
        errors.push(
          `'ai.provider' must be one of: ${validProviders.join(", ")}`
        );
      }
      if (
        ai.quality !== undefined &&
        !validQualities.includes(ai.quality as string)
      ) {
        errors.push(
          `'ai.quality' must be one of: ${validQualities.join(", ")}`
        );
      }
    }
  }

  // Validate pages
  if (cfg.pages !== undefined) {
    if (!Array.isArray(cfg.pages)) {
      errors.push("'pages' must be an array");
    } else {
      const validPages = ["features", "docs", "api", "examples", "changelog"];
      for (const page of cfg.pages) {
        if (!validPages.includes(page as string)) {
          warnings.push(
            `Unknown page type: '${page}'. Valid types: ${validPages.join(", ")}`
          );
        }
      }
    }
  }

  // Check for unknown fields
  const knownFields = [
    "enabled",
    "outputDirectory",
    "logo",
    "favicon",
    "ai",
    "pages",
  ];
  for (const key of Object.keys(cfg)) {
    if (!knownFields.includes(key)) {
      warnings.push(`Unknown configuration field: '${key}'`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
