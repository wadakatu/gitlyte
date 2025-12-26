import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  generateSite,
  THEME_MODES,
  isValidThemeMode,
  type ThemeMode,
} from "./site-generator.js";
import {
  createAIProvider,
  AI_PROVIDERS,
  QUALITY_MODES,
  type AIProvider,
  type QualityMode,
} from "./ai-provider.js";

export async function run(): Promise<void> {
  try {
    // Get inputs
    const apiKey = core.getInput("api-key", { required: true });
    const provider = core.getInput("provider") as AIProvider;
    const quality = core.getInput("quality") as QualityMode;
    const outputDirectory = core.getInput("output-directory") || "docs";

    // Theme inputs with explicit detection for proper config merging
    const themeModeInput = core.getInput("theme-mode");
    const themeModeExplicit = themeModeInput !== "";
    const themeModeRaw = themeModeInput || "dark";

    const themeToggleInput = core.getInput("theme-toggle");
    const themeToggleExplicit = themeToggleInput !== "";
    const themeToggle = themeToggleInput === "true";

    // Site instructions input
    const siteInstructionsInput = core.getInput("site-instructions");
    const siteInstructionsExplicit = siteInstructionsInput !== "";

    // Logo and favicon inputs
    const logoPathInput = core.getInput("logo-path");
    const faviconPathInput = core.getInput("favicon-path");

    // Validate provider
    if (!AI_PROVIDERS.includes(provider)) {
      throw new Error(
        `Invalid provider: ${provider}. Must be one of: ${AI_PROVIDERS.join(", ")}`
      );
    }

    // Validate quality mode
    if (!QUALITY_MODES.includes(quality)) {
      throw new Error(
        `Invalid quality: ${quality}. Must be one of: ${QUALITY_MODES.join(", ")}`
      );
    }

    // Validate theme mode using type guard
    if (!isValidThemeMode(themeModeRaw)) {
      throw new Error(
        `Invalid theme-mode: ${themeModeRaw}. Must be one of: ${THEME_MODES.join(", ")}`
      );
    }
    const themeMode: ThemeMode = themeModeRaw;

    // Validate GitHub token
    const githubToken =
      core.getInput("github-token") || process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error(
        "GitHub token is required. Set the 'github-token' input or GITHUB_TOKEN environment variable."
      );
    }

    // Get context
    const { context } = github;
    const octokit = github.getOctokit(githubToken);

    const owner = context.repo.owner;
    const repo = context.repo.repo;

    core.info(`🚀 Starting GitLyte site generation for ${owner}/${repo}`);
    core.info(`📦 Provider: ${provider}, Quality: ${quality}`);
    core.info(`🎨 Theme: ${themeMode}${themeToggle ? " (with toggle)" : ""}`);
    if (siteInstructionsExplicit) {
      core.info("📝 Custom site instructions provided");
    }
    if (logoPathInput) {
      core.info(`🖼️ Logo: ${logoPathInput}`);
    }
    if (faviconPathInput) {
      core.info(`⭐ Favicon: ${faviconPathInput}`);
    }

    // Get repository info
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    // Get README
    let readme: string | undefined;
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      if ("content" in readmeData) {
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
      }
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 404) {
        core.info("📄 No README found, proceeding without it");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        core.warning(
          `⚠️ Failed to fetch README: ${errorMessage}. Proceeding without it.`
        );
      }
    }

    // Fetch logo file if specified
    let logoContent: Buffer | undefined;
    if (logoPathInput) {
      try {
        const { data: logoData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: logoPathInput,
        });
        if ("content" in logoData && logoData.encoding === "base64") {
          logoContent = Buffer.from(logoData.content, "base64");
          core.info(`✅ Logo fetched: ${logoPathInput}`);
        } else {
          core.warning(
            `⚠️ Logo file "${logoPathInput}" is not a file or has unexpected format`
          );
        }
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          core.warning(`⚠️ Logo file not found: ${logoPathInput}`);
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(`⚠️ Failed to fetch logo: ${errorMessage}`);
        }
      }
    }

    // Fetch favicon file if specified
    let faviconContent: Buffer | undefined;
    if (faviconPathInput) {
      try {
        const { data: faviconData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: faviconPathInput,
        });
        if ("content" in faviconData && faviconData.encoding === "base64") {
          faviconContent = Buffer.from(faviconData.content, "base64");
          core.info(`✅ Favicon fetched: ${faviconPathInput}`);
        } else {
          core.warning(
            `⚠️ Favicon file "${faviconPathInput}" is not a file or has unexpected format`
          );
        }
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          core.warning(`⚠️ Favicon file not found: ${faviconPathInput}`);
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(`⚠️ Failed to fetch favicon: ${errorMessage}`);
        }
      }
    }

    // Load config from .gitlyte.json if exists
    let config: {
      outputDirectory: string;
      theme: { mode: ThemeMode; toggle: boolean };
      prompts: { siteInstructions?: string };
      logo?: { path: string; alt?: string };
      favicon?: { path: string };
    } = {
      outputDirectory,
      theme: {
        mode: themeMode,
        toggle: themeToggle,
      },
      prompts: {
        siteInstructions: siteInstructionsExplicit
          ? siteInstructionsInput
          : undefined,
      },
      // Logo config: use filename from input path for output path
      logo: logoContent
        ? { path: path.basename(logoPathInput), alt: repoData.name }
        : undefined,
      // Favicon config: use filename from input path for output path
      favicon: faviconContent
        ? { path: path.basename(faviconPathInput) }
        : undefined,
    };
    try {
      const { data: configFile } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: ".gitlyte.json",
      });
      if ("content" in configFile) {
        const configContent = Buffer.from(
          configFile.content,
          "base64"
        ).toString("utf-8");
        try {
          const parsedConfig = JSON.parse(configContent);

          // Validate config file theme mode if present
          const fileThemeMode = parsedConfig.theme?.mode;
          if (fileThemeMode !== undefined && !isValidThemeMode(fileThemeMode)) {
            throw new Error(
              `Invalid theme mode "${fileThemeMode}" in .gitlyte.json. ` +
                `Must be one of: ${THEME_MODES.join(", ")}`
            );
          }

          // Validate config file toggle type if present
          const fileThemeToggle = parsedConfig.theme?.toggle;
          if (
            fileThemeToggle !== undefined &&
            typeof fileThemeToggle !== "boolean"
          ) {
            throw new Error(
              `Invalid theme.toggle value "${fileThemeToggle}" in .gitlyte.json. ` +
                "Must be a boolean (true or false)."
            );
          }

          // Merge config: explicit action input > config file > default
          config = {
            outputDirectory: parsedConfig.outputDirectory || outputDirectory,
            theme: {
              // If action input was explicitly provided, use it; otherwise use config file or default
              mode: themeModeExplicit
                ? themeMode
                : (fileThemeMode ?? themeMode),
              toggle: themeToggleExplicit
                ? themeToggle
                : (fileThemeToggle ?? themeToggle),
            },
            prompts: {
              // If action input was explicitly provided, use it; otherwise use config file
              siteInstructions: siteInstructionsExplicit
                ? siteInstructionsInput
                : parsedConfig.prompts?.siteInstructions,
            },
            // Logo: action input takes precedence, then config file
            logo: logoContent
              ? { path: path.basename(logoPathInput), alt: repoData.name }
              : parsedConfig.logo,
            // Favicon: action input takes precedence, then config file
            favicon: faviconContent
              ? { path: path.basename(faviconPathInput) }
              : parsedConfig.favicon,
          };
        } catch (parseError) {
          // JSON parse error - this is a user config error, fail explicitly
          throw new Error(
            `Invalid JSON in .gitlyte.json: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
              "Please check your configuration file syntax."
          );
        }
      }
    } catch (error) {
      // Check if it's a config validation error (re-throw it)
      if (
        error instanceof Error &&
        (error.message.startsWith("Invalid JSON in .gitlyte.json") ||
          error.message.startsWith("Invalid theme mode") ||
          error.message.startsWith("Invalid theme.toggle"))
      ) {
        throw error;
      }
      // Check if file not found
      const status = (error as { status?: number }).status;
      if (status === 404) {
        core.info("📄 No .gitlyte.json found, using defaults");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        core.warning(
          `⚠️ Failed to load .gitlyte.json: ${errorMessage}. Using defaults.`
        );
      }
    }

    // Create AI provider
    const aiProvider = createAIProvider(provider, quality, apiKey);

    // Generate site
    const repoInfo = {
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description || undefined,
      htmlUrl: repoData.html_url,
      language: repoData.language || undefined,
      topics: repoData.topics || [],
      readme,
    };

    core.info("🎨 Generating site...");
    const result = await generateSite(repoInfo, aiProvider, config);

    // Write files to output directory
    const outDir = path.resolve(process.cwd(), config.outputDirectory);
    fs.mkdirSync(outDir, { recursive: true });

    /**
     * Validate that a file path is within the output directory (prevent path traversal)
     */
    function validatePath(filePath: string, itemPath: string): void {
      const resolvedPath = path.resolve(filePath);
      const resolvedOutDir = path.resolve(outDir);
      if (!resolvedPath.startsWith(resolvedOutDir + path.sep)) {
        throw new Error(
          `Invalid path "${itemPath}": path escapes output directory. ` +
            "This may indicate a security issue with the AI-generated content."
        );
      }
    }

    for (const page of result.pages) {
      const filePath = path.join(outDir, page.path);
      validatePath(filePath, page.path);
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, page.html, "utf-8");
        core.info(`📝 Written: ${filePath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to write page "${page.path}" to "${filePath}": ${errorMessage}`,
          { cause: error }
        );
      }
    }

    for (const asset of result.assets) {
      const filePath = path.join(outDir, asset.path);
      validatePath(filePath, asset.path);
      try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, asset.content, "utf-8");
        core.info(`📝 Written: ${filePath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to write asset "${asset.path}" to "${filePath}": ${errorMessage}`,
          { cause: error }
        );
      }
    }

    // Write logo file if fetched
    if (logoContent && config.logo) {
      const logoFilePath = path.join(outDir, config.logo.path);
      validatePath(logoFilePath, config.logo.path);
      try {
        fs.writeFileSync(logoFilePath, logoContent);
        core.info(`🖼️ Written: ${logoFilePath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to write logo "${config.logo.path}" to "${logoFilePath}": ${errorMessage}`,
          { cause: error }
        );
      }
    }

    // Write favicon file if fetched
    if (faviconContent && config.favicon) {
      const faviconFilePath = path.join(outDir, config.favicon.path);
      validatePath(faviconFilePath, config.favicon.path);
      try {
        fs.writeFileSync(faviconFilePath, faviconContent);
        core.info(`⭐ Written: ${faviconFilePath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to write favicon "${config.favicon.path}" to "${faviconFilePath}": ${errorMessage}`,
          { cause: error }
        );
      }
    }

    core.info(`✅ Site generated successfully in ${config.outputDirectory}/`);

    // Set outputs
    core.setOutput("output-directory", config.outputDirectory);
    core.setOutput("pages-count", result.pages.length);
  } catch (error) {
    if (error instanceof Error) {
      // Log full error details for debugging
      if (error.stack) {
        core.error(`Stack trace: ${error.stack}`);
      }
      if (error.cause) {
        const causeMessage =
          error.cause instanceof Error
            ? error.cause.message
            : String(error.cause);
        core.error(`Caused by: ${causeMessage}`);
      }
      core.setFailed(error.message);
    } else {
      core.setFailed(`An unknown error occurred: ${String(error)}`);
    }
  }
}

// Only run when not being tested
if (!process.env.VITEST) {
  run();
}
