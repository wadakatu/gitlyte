import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "node:fs";
import * as path from "node:path";
import { generateSite } from "./site-generator.js";
import {
  createAIProvider,
  AI_PROVIDERS,
  QUALITY_MODES,
  type AIProvider,
  type QualityMode,
} from "./ai-provider.js";

async function run(): Promise<void> {
  try {
    // Get inputs
    const apiKey = core.getInput("api-key", { required: true });
    const provider = core.getInput("provider") as AIProvider;
    const quality = core.getInput("quality") as QualityMode;
    const outputDirectory = core.getInput("output-directory") || "docs";

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

    // Load config from .gitlyte.json if exists
    let config = {
      outputDirectory,
      theme: { mode: "dark" as const },
      prompts: {} as { siteInstructions?: string },
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
          config = {
            outputDirectory: parsedConfig.outputDirectory || outputDirectory,
            theme: { mode: parsedConfig.theme?.mode || "dark" },
            prompts: {
              siteInstructions: parsedConfig.prompts?.siteInstructions,
            },
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
      // Check if it's our JSON parse error (re-throw it)
      if (
        error instanceof Error &&
        error.message.startsWith("Invalid JSON in .gitlyte.json")
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

    for (const page of result.pages) {
      const filePath = path.join(outDir, page.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, page.html, "utf-8");
      core.info(`📝 Written: ${filePath}`);
    }

    for (const asset of result.assets) {
      const filePath = path.join(outDir, asset.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, asset.content, "utf-8");
      core.info(`📝 Written: ${filePath}`);
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

run();
