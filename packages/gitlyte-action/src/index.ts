import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "node:fs";
import * as path from "node:path";
import { generateSite } from "./site-generator.js";
import { createAIProvider, type AIProvider } from "./ai-provider.js";

async function run(): Promise<void> {
  try {
    // Get inputs
    const apiKey = core.getInput("api-key", { required: true });
    const provider = core.getInput("provider") as AIProvider;
    const quality = core.getInput("quality") as "standard" | "high";
    const outputDirectory = core.getInput("output-directory") || "docs";

    // Validate provider
    if (!["anthropic", "openai", "google"].includes(provider)) {
      throw new Error(
        `Invalid provider: ${provider}. Must be one of: anthropic, openai, google`
      );
    }

    // Get context
    const { context } = github;
    const octokit = github.getOctokit(
      core.getInput("github-token") || process.env.GITHUB_TOKEN || ""
    );

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
    } catch {
      core.info("📄 No README found, proceeding without it");
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
        const parsedConfig = JSON.parse(configContent);
        config = {
          outputDirectory: parsedConfig.outputDirectory || outputDirectory,
          theme: { mode: parsedConfig.theme?.mode || "dark" },
          prompts: { siteInstructions: parsedConfig.prompts?.siteInstructions },
        };
      }
    } catch {
      core.info("📄 No .gitlyte.json found, using defaults");
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
      core.setFailed(error.message);
    } else {
      core.setFailed("An unknown error occurred");
    }
  }
}

run();
