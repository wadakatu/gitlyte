#!/usr/bin/env node
import { SiteGenerator } from "../services/site-generator.js";
import { RepositoryAnalyzer } from "../services/repository-analyzer.js";
import { ConfigurationLoader } from "../services/configuration-loader.js";
import type { RepoData } from "../types/repository.js";
import * as dotenv from "dotenv";
import { resolve } from "node:path";
import * as fs from "node:fs/promises";
import * as path from "node:path";

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), ".env") });

async function generateSite() {
  console.log("🚀 Starting GitLyte site generation...");

  // Initialize services
  const configLoader = new ConfigurationLoader();
  const repositoryAnalyzer = new RepositoryAnalyzer();
  const siteGenerator = new SiteGenerator();

  // Load configuration
  const configResult = await configLoader.loadConfiguration(process.cwd());
  if (!configResult.config) {
    console.error("❌ Failed to load configuration");
    process.exit(1);
  }
  const config = configResult.config;
  console.log("📝 Configuration loaded:", JSON.stringify(config, null, 2));

  // Create repository data
  console.log("🔍 Analyzing repository...");
  const repoFiles = await readRepository(process.cwd());

  // Create RepoData object
  const packageJsonPath = path.join(process.cwd(), "package.json");
  let packageJson = null;
  try {
    const pkgContent = await fs.readFile(packageJsonPath, "utf-8");
    packageJson = JSON.parse(pkgContent);
  } catch {}

  const repoData: RepoData = {
    basicInfo: {
      name: "gitlyte",
      description: "AI-powered website generator for GitHub repositories",
      html_url: "https://github.com/wadakatu/gitlyte",
      stargazers_count: 0,
      forks_count: 0,
      topics: ["github-app", "ai", "website-generator", "anthropic", "claude"],
      language: "TypeScript",
      license: { key: "mit", name: "MIT License" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      default_branch: "main",
    },
    readme: "",
    packageJson,
    languages: { TypeScript: 80, JavaScript: 20 },
    issues: [],
    pullRequests: [],
    prs: [],
    configFile: ".gitlyte.json",
    codeStructure: {
      files: repoFiles.map((f) => f.path),
      directories: [
        ...new Set(
          repoFiles.map((f) => path.dirname(f.path)).filter((d) => d !== ".")
        ),
      ],
      hasTests: true,
      testFiles: repoFiles
        .filter((f) => f.path.includes("test"))
        .map((f) => f.path),
      hasTypeScript: true,
      hasTsConfig: true,
      hasPackageJson: true,
      testFramework: "vitest",
      buildTool: "typescript",
      lintingSetup: ["biome"],
      complexity: "moderate",
    },
    fileStructure: repoFiles.map((f) => ({
      name: path.basename(f.path),
      path: f.path,
      type: "file" as const,
      children: [],
    })),
  };

  // Read README
  try {
    const readmePath = path.join(process.cwd(), "README.md");
    repoData.readme = await fs.readFile(readmePath, "utf-8");
  } catch {}

  const analysis = await repositoryAnalyzer.analyzeRepositoryData(repoData);
  console.log("📊 Repository analyzed:", JSON.stringify(analysis, null, 2));

  // Generate site
  console.log("🎨 Generating site...");
  const generatedSite = await siteGenerator.generateSite(analysis, config);

  // Save files locally
  const outputDir = config.generation?.outputDirectory || "docs/sites";

  // Save pages
  for (const [filename, content] of Object.entries(generatedSite.pages)) {
    const filePath = path.join(outputDir, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`📁 Created: ${filePath}`);
  }

  // Save assets
  for (const [filename, content] of Object.entries(generatedSite.assets)) {
    const filePath = path.join(outputDir, "assets", filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`📁 Created: ${filePath}`);
  }

  // Save meta files
  if (generatedSite.meta) {
    if (generatedSite.meta.sitemap) {
      const filePath = path.join(outputDir, "sitemap.xml");
      await fs.writeFile(filePath, generatedSite.meta.sitemap);
      console.log(`📁 Created: ${filePath}`);
    }
    if (generatedSite.meta.robotsTxt) {
      const filePath = path.join(outputDir, "robots.txt");
      await fs.writeFile(filePath, generatedSite.meta.robotsTxt);
      console.log(`📁 Created: ${filePath}`);
    }
  }

  console.log("🎉 Site generation complete!");
  console.log(`✨ View your site at: ${outputDir}/index.html`);
}

async function readRepository(
  repoPath: string
): Promise<{ path: string; content: string }[]> {
  const readDirRecursive = async (
    dir: string,
    base = ""
  ): Promise<{ path: string; content: string }[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);

        if (entry.isDirectory()) {
          if (
            entry.name === ".git" ||
            entry.name === "node_modules" ||
            entry.name === "dist" ||
            entry.name === "docs/sites"
          ) {
            return [];
          }
          return readDirRecursive(fullPath, relativePath);
        }
        if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath, "utf-8");
            return [{ path: relativePath, content }];
          } catch {
            // Skip binary files
            return [];
          }
        }
        return [];
      })
    );
    return files.flat();
  };

  return readDirRecursive(repoPath);
}

generateSite().catch(console.error);
