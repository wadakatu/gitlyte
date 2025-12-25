/**
 * GitLyte v2 Configuration Schema
 *
 * Simplified configuration focused on:
 * - Zero configuration by default
 * - AI-first design (no manual theme/layout)
 * - Multiple AI provider support
 */

/** Valid AI provider values */
export const AI_PROVIDERS = ["anthropic", "openai", "google"] as const;
/** AI Provider options */
export type AIProvider = (typeof AI_PROVIDERS)[number];

/** Valid quality mode values */
export const QUALITY_MODES = ["standard", "high"] as const;
/** Quality mode for generation */
export type QualityMode = (typeof QUALITY_MODES)[number];

/** Valid trigger mode values */
export const TRIGGER_MODES = ["auto", "manual"] as const;
/** Trigger mode for site generation */
export type TriggerMode = (typeof TRIGGER_MODES)[number];

/** Valid generation mode values */
export const GENERATION_MODES = ["webhook", "workflow"] as const;
/**
 * Generation mode for site generation
 * - webhook: Use GitHub App webhook (server's API key)
 * - workflow: Use GitHub Actions workflow (user's API key from secrets)
 */
export type GenerationMode = (typeof GENERATION_MODES)[number];

/** Valid theme mode values */
export const THEME_MODES = ["light", "dark"] as const;
/** Theme mode for generated site */
export type ThemeMode = (typeof THEME_MODES)[number];

/** Valid generatable page values */
export const GENERATABLE_PAGES = [
  "features",
  "docs",
  "api",
  "examples",
  "changelog",
] as const;
/** Additional pages that can be generated */
export type GeneratablePage = (typeof GENERATABLE_PAGES)[number];

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

  /**
   * Generation trigger configuration
   */
  generation?: {
    /**
     * Trigger mode for site generation
     * - auto: Generate on every push to default branch
     * - manual: Generate only via @gitlyte generate command
     * @default "manual"
     */
    trigger?: TriggerMode;

    /**
     * Generation mode
     * - webhook: Use GitHub App webhook (server's API key, operator pays)
     * - workflow: Use GitHub Actions workflow (user's API key from secrets)
     * @default "webhook"
     */
    mode?: GenerationMode;
  };

  /**
   * Theme configuration
   */
  theme?: {
    /**
     * Color mode for generated site
     * - light: Light background with dark text
     * - dark: Dark background with light text
     * @default "dark"
     */
    mode?: ThemeMode;
  };

  /**
   * Custom prompts configuration
   */
  prompts?: {
    /**
     * Custom instructions to include in all AI generation prompts.
     * Use this to customize the tone, language, or style of the generated site.
     * @example "技術的で簡潔なトーンで、日本語で生成してください"
     * @example "Use a friendly, approachable tone suitable for beginners"
     */
    siteInstructions?: string;
  };
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
  generation: {
    trigger: "manual" as const,
    mode: "webhook" as const,
  },
  theme: {
    mode: "dark" as const,
  },
  prompts: {
    siteInstructions: undefined,
  },
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
  generation: {
    trigger: TriggerMode;
    mode: GenerationMode;
  };
  theme: {
    mode: ThemeMode;
  };
  prompts: {
    siteInstructions?: string;
  };
}

/**
 * Apply defaults to a partial configuration
 */
export function resolveConfigV2(
  config: GitLyteConfigV2 = {}
): ResolvedConfigV2 {
  const defaultProvider: AIProvider = DEFAULT_CONFIG_V2.ai.provider;
  const defaultQuality: QualityMode = DEFAULT_CONFIG_V2.ai.quality;
  const defaultTrigger: TriggerMode = DEFAULT_CONFIG_V2.generation.trigger;
  const defaultMode: GenerationMode = DEFAULT_CONFIG_V2.generation.mode;
  const defaultThemeMode: ThemeMode = DEFAULT_CONFIG_V2.theme.mode;

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
    generation: {
      trigger: config.generation?.trigger ?? defaultTrigger,
      mode: config.generation?.mode ?? defaultMode,
    },
    theme: {
      mode: config.theme?.mode ?? defaultThemeMode,
    },
    prompts: {
      siteInstructions: config.prompts?.siteInstructions,
    },
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

      if (
        ai.provider !== undefined &&
        !(AI_PROVIDERS as readonly string[]).includes(ai.provider as string)
      ) {
        errors.push(`'ai.provider' must be one of: ${AI_PROVIDERS.join(", ")}`);
      }
      if (
        ai.quality !== undefined &&
        !(QUALITY_MODES as readonly string[]).includes(ai.quality as string)
      ) {
        errors.push(`'ai.quality' must be one of: ${QUALITY_MODES.join(", ")}`);
      }
    }
  }

  // Validate pages
  if (cfg.pages !== undefined) {
    if (!Array.isArray(cfg.pages)) {
      errors.push("'pages' must be an array");
    } else {
      for (const page of cfg.pages) {
        if (
          !(GENERATABLE_PAGES as readonly string[]).includes(page as string)
        ) {
          warnings.push(
            `Unknown page type: '${page}'. Valid types: ${GENERATABLE_PAGES.join(", ")}`
          );
        }
      }
    }
  }

  // Validate generation
  if (cfg.generation !== undefined) {
    if (typeof cfg.generation !== "object" || cfg.generation === null) {
      errors.push("'generation' must be an object");
    } else {
      const generation = cfg.generation as Record<string, unknown>;

      if (
        generation.trigger !== undefined &&
        !(TRIGGER_MODES as readonly string[]).includes(
          generation.trigger as string
        )
      ) {
        errors.push(
          `'generation.trigger' must be one of: ${TRIGGER_MODES.join(", ")}`
        );
      }

      if (
        generation.mode !== undefined &&
        !(GENERATION_MODES as readonly string[]).includes(
          generation.mode as string
        )
      ) {
        errors.push(
          `'generation.mode' must be one of: ${GENERATION_MODES.join(", ")}`
        );
      }
    }
  }

  // Validate theme
  if (cfg.theme !== undefined) {
    if (typeof cfg.theme !== "object" || cfg.theme === null) {
      errors.push("'theme' must be an object");
    } else {
      const theme = cfg.theme as Record<string, unknown>;

      if (
        theme.mode !== undefined &&
        !(THEME_MODES as readonly string[]).includes(theme.mode as string)
      ) {
        errors.push(`'theme.mode' must be one of: ${THEME_MODES.join(", ")}`);
      }
    }
  }

  // Validate prompts
  if (cfg.prompts !== undefined) {
    if (typeof cfg.prompts !== "object" || cfg.prompts === null) {
      errors.push("'prompts' must be an object");
    } else {
      const prompts = cfg.prompts as Record<string, unknown>;

      if (prompts.siteInstructions !== undefined) {
        if (typeof prompts.siteInstructions !== "string") {
          errors.push("'prompts.siteInstructions' must be a string");
        } else if (prompts.siteInstructions.length > 2000) {
          warnings.push(
            `'prompts.siteInstructions' is ${prompts.siteInstructions.length} characters, ` +
              "which may cause token limit issues. Consider keeping it under 2000 characters."
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
    "generation",
    "theme",
    "prompts",
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
