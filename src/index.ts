import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  generateSite,
  THEME_MODES,
  SITEMAP_CHANGEFREQ,
  isValidThemeMode,
  type ThemeMode,
  type SeoConfig,
  type SitemapConfig,
  type RobotsConfig,
  type SitemapChangefreq,
  type RepoStats,
} from "./site-generator.js";

/**
 * Validate logo config structure from .gitlyte.json
 */
function isValidLogoConfig(
  value: unknown
): value is { path: string; alt?: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.path !== "string" || obj.path.trim() === "") {
    return false;
  }
  if (obj.alt !== undefined && typeof obj.alt !== "string") {
    return false;
  }
  return true;
}

/**
 * Validate favicon config structure from .gitlyte.json
 */
function isValidFaviconConfig(value: unknown): value is { path: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.path !== "string" || obj.path.trim() === "") {
    return false;
  }
  return true;
}

/**
 * Validate URL format (must be http or https)
 */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate Twitter handle format
 * Valid format: optional @ followed by 1-15 alphanumeric characters or underscores
 */
function isValidTwitterHandle(value: string): boolean {
  // Remove @ if present, then validate the username part
  const handle = value.startsWith("@") ? value.slice(1) : value;
  // Twitter usernames: 1-15 chars, alphanumeric and underscores only
  return /^[A-Za-z0-9_]{1,15}$/.test(handle);
}

/**
 * Validate SEO config structure from .gitlyte.json
 */
function isValidSeoConfig(value: unknown): value is SeoConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;

  if (obj.title !== undefined && typeof obj.title !== "string") {
    return false;
  }
  if (obj.description !== undefined && typeof obj.description !== "string") {
    return false;
  }
  if (obj.twitterHandle !== undefined) {
    if (typeof obj.twitterHandle !== "string") {
      return false;
    }
    if (!isValidTwitterHandle(obj.twitterHandle)) {
      return false;
    }
  }
  if (obj.siteUrl !== undefined) {
    if (typeof obj.siteUrl !== "string") {
      return false;
    }
    if (!isValidUrl(obj.siteUrl)) {
      return false;
    }
  }

  if (obj.keywords !== undefined) {
    if (!Array.isArray(obj.keywords)) {
      return false;
    }
    if (!obj.keywords.every((k) => typeof k === "string")) {
      return false;
    }
  }

  if (obj.ogImage !== undefined) {
    if (typeof obj.ogImage !== "object" || obj.ogImage === null) {
      return false;
    }
    const ogImage = obj.ogImage as Record<string, unknown>;
    if (typeof ogImage.path !== "string" || ogImage.path.trim() === "") {
      return false;
    }
  }

  return true;
}

/**
 * Validate sitemap config structure from .gitlyte.json
 */
function isValidSitemapConfig(value: unknown): value is SitemapConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;

  if (typeof obj.enabled !== "boolean") {
    return false;
  }
  if (obj.changefreq !== undefined) {
    if (
      typeof obj.changefreq !== "string" ||
      !SITEMAP_CHANGEFREQ.includes(obj.changefreq as SitemapChangefreq)
    ) {
      return false;
    }
  }
  if (obj.priority !== undefined) {
    if (
      typeof obj.priority !== "number" ||
      obj.priority < 0 ||
      obj.priority > 1
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validate robots config structure from .gitlyte.json
 */
function isValidRobotsConfig(value: unknown): value is RobotsConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;

  if (typeof obj.enabled !== "boolean") {
    return false;
  }
  if (obj.additionalRules !== undefined) {
    if (!Array.isArray(obj.additionalRules)) {
      return false;
    }
    if (!obj.additionalRules.every((r) => typeof r === "string")) {
      return false;
    }
  }

  return true;
}

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

    // SEO inputs
    const seoTitleInput = core.getInput("seo-title");
    const seoDescriptionInput = core.getInput("seo-description");
    const ogImagePathInput = core.getInput("og-image-path");
    const twitterHandleInput = core.getInput("twitter-handle");
    const siteUrlInput = core.getInput("site-url");

    // Sitemap and robots.txt inputs
    const generateSitemapInput = core.getInput("generate-sitemap");
    const generateSitemapExplicit = generateSitemapInput !== "";
    const generateSitemap = generateSitemapInput !== "false"; // default true

    const generateRobotsInput = core.getInput("generate-robots");
    const generateRobotsExplicit = generateRobotsInput !== "";
    const generateRobots = generateRobotsInput !== "false"; // default true

    // GitHub stats inputs
    const showStatsInput = core.getInput("show-stats");
    const showStats = showStatsInput !== "false"; // default true
    const fetchContributors = core.getInput("fetch-contributors") === "true"; // default false
    const fetchReleases = core.getInput("fetch-releases") === "true"; // default false

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

    // Validate SEO inputs
    if (siteUrlInput && !isValidUrl(siteUrlInput)) {
      throw new Error(
        `Invalid site-url: ${siteUrlInput}. Must be a valid URL starting with http:// or https://`
      );
    }
    if (twitterHandleInput && !isValidTwitterHandle(twitterHandleInput)) {
      throw new Error(
        `Invalid twitter-handle: ${twitterHandleInput}. Must be 1-15 characters (letters, numbers, underscores only)`
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
    if (
      seoTitleInput ||
      seoDescriptionInput ||
      ogImagePathInput ||
      siteUrlInput
    ) {
      core.info("🔍 SEO settings provided");
    }

    // Get repository info
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    // Build GitHub stats if enabled
    let repoStats: RepoStats | undefined;
    if (showStats) {
      core.info("📊 Fetching GitHub statistics...");

      repoStats = {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.subscribers_count,
        openIssues: repoData.open_issues_count,
        createdAt: repoData.created_at,
        updatedAt: repoData.pushed_at,
        license: repoData.license?.name ?? undefined,
      };

      // Optionally fetch latest release
      if (fetchReleases) {
        try {
          const { data: releases } = await octokit.rest.repos.listReleases({
            owner,
            repo,
            per_page: 1,
          });
          if (releases.length > 0) {
            repoStats.latestRelease = releases[0].tag_name;
            core.info(`🏷️ Latest release: ${releases[0].tag_name}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `⚠️ Failed to fetch latest release: ${errorMessage}. Proceeding without release info.`
          );
        }
      }

      // Optionally fetch contributor count
      if (fetchContributors) {
        try {
          // Use per_page=1 and check the Link header for total count
          const response = await octokit.rest.repos.listContributors({
            owner,
            repo,
            per_page: 1,
            anon: "false",
          });
          // Parse the Link header to get total count
          const linkHeader = response.headers.link;
          if (linkHeader) {
            // Extract last page number from Link header
            const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (lastPageMatch) {
              repoStats.contributorCount = Number.parseInt(
                lastPageMatch[1],
                10
              );
            }
          }
          if (!repoStats.contributorCount && response.data.length > 0) {
            // Fallback: if no Link header, just count what we have
            repoStats.contributorCount = response.data.length;
          }
          if (repoStats.contributorCount) {
            core.info(`👨‍💻 Contributors: ${repoStats.contributorCount}`);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `⚠️ Failed to fetch contributors: ${errorMessage}. Proceeding without contributor info.`
          );
        }
      }

      core.info(
        `📊 Stats: ⭐ ${repoStats.stars} | 🍴 ${repoStats.forks} | 👀 ${repoStats.watchers}`
      );
    }

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
            `⚠️ Logo file "${logoPathInput}" is not a file or has unexpected format. Site will be generated without a logo.`
          );
        }
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          core.warning(
            `⚠️ Logo file not found: ${logoPathInput}. Site will be generated without a logo.`
          );
        } else if (status === 403) {
          core.warning(
            `⚠️ Access denied to logo file: ${logoPathInput}. Site will be generated without a logo.`
          );
        } else if (status === 401) {
          core.warning(
            `⚠️ Authentication failed for logo file: ${logoPathInput}. Site will be generated without a logo.`
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `⚠️ Failed to fetch logo: ${errorMessage}. Site will be generated without a logo.`
          );
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
            `⚠️ Favicon file "${faviconPathInput}" is not a file or has unexpected format. Site will use browser default icon.`
          );
        }
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          core.warning(
            `⚠️ Favicon file not found: ${faviconPathInput}. Site will use browser default icon.`
          );
        } else if (status === 403) {
          core.warning(
            `⚠️ Access denied to favicon file: ${faviconPathInput}. Site will use browser default icon.`
          );
        } else if (status === 401) {
          core.warning(
            `⚠️ Authentication failed for favicon file: ${faviconPathInput}. Site will use browser default icon.`
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `⚠️ Failed to fetch favicon: ${errorMessage}. Site will use browser default icon.`
          );
        }
      }
    }

    // Fetch OG image file if specified
    let ogImageContent: Buffer | undefined;
    if (ogImagePathInput) {
      try {
        const { data: ogImageData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: ogImagePathInput,
        });
        if ("content" in ogImageData && ogImageData.encoding === "base64") {
          ogImageContent = Buffer.from(ogImageData.content, "base64");
          core.info(`✅ OG image fetched: ${ogImagePathInput}`);
        } else {
          core.warning(
            `⚠️ OG image file "${ogImagePathInput}" is not a file or has unexpected format. Social media previews will not include an image.`
          );
        }
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          core.warning(
            `⚠️ OG image file not found: ${ogImagePathInput}. Social media previews will not include an image.`
          );
        } else if (status === 403) {
          core.warning(
            `⚠️ Access denied to OG image file: ${ogImagePathInput}. Social media previews will not include an image.`
          );
        } else if (status === 401) {
          core.warning(
            `⚠️ Authentication failed for OG image file: ${ogImagePathInput}. Social media previews will not include an image.`
          );
        } else {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          core.warning(
            `⚠️ Failed to fetch OG image: ${errorMessage}. Social media previews will not include an image.`
          );
        }
      }
    }

    // Build initial SEO config from action inputs
    const buildSeoConfig = (): SeoConfig | undefined => {
      const hasSeoInput =
        seoTitleInput ||
        seoDescriptionInput ||
        ogImageContent ||
        twitterHandleInput ||
        siteUrlInput;

      if (!hasSeoInput) {
        return undefined;
      }

      return {
        title: seoTitleInput || undefined,
        description: seoDescriptionInput || undefined,
        ogImage: ogImageContent
          ? { path: path.basename(ogImagePathInput) }
          : undefined,
        twitterHandle: twitterHandleInput || undefined,
        siteUrl: siteUrlInput || undefined,
      };
    };

    // Load config from .gitlyte.json if exists
    let config: {
      outputDirectory: string;
      theme: { mode: ThemeMode; toggle: boolean };
      prompts: { siteInstructions?: string };
      logo?: { path: string; alt?: string };
      favicon?: { path: string };
      seo?: SeoConfig;
      sitemap?: SitemapConfig;
      robots?: RobotsConfig;
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
      // SEO config from action inputs
      seo: buildSeoConfig(),
      // Sitemap config from action inputs (default enabled)
      sitemap: { enabled: generateSitemap },
      // Robots config from action inputs (default enabled)
      robots: { enabled: generateRobots },
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

          // Validate SEO config if present
          if (
            parsedConfig.seo !== undefined &&
            !isValidSeoConfig(parsedConfig.seo)
          ) {
            throw new Error(
              "Invalid seo config in .gitlyte.json. " +
                `Expected { title?: string, description?: string, keywords?: string[], ogImage?: { path: string }, twitterHandle?: string, siteUrl?: string }, got: ${JSON.stringify(parsedConfig.seo)}`
            );
          }

          // Validate sitemap config if present
          if (
            parsedConfig.sitemap !== undefined &&
            !isValidSitemapConfig(parsedConfig.sitemap)
          ) {
            throw new Error(
              "Invalid sitemap config in .gitlyte.json. " +
                `Expected { enabled: boolean, changefreq?: "${SITEMAP_CHANGEFREQ.join('" | "')}", priority?: number (0.0-1.0) }, got: ${JSON.stringify(parsedConfig.sitemap)}`
            );
          }

          // Validate robots config if present
          if (
            parsedConfig.robots !== undefined &&
            !isValidRobotsConfig(parsedConfig.robots)
          ) {
            throw new Error(
              "Invalid robots config in .gitlyte.json. " +
                `Expected { enabled: boolean, additionalRules?: string[] }, got: ${JSON.stringify(parsedConfig.robots)}`
            );
          }

          // Validate and fetch logo from config file if not provided via action input
          let configLogo: { path: string; alt?: string } | undefined;
          if (!logoContent && parsedConfig.logo !== undefined) {
            if (!isValidLogoConfig(parsedConfig.logo)) {
              throw new Error(
                "Invalid logo config in .gitlyte.json. " +
                  `Expected { path: string, alt?: string }, got: ${JSON.stringify(parsedConfig.logo)}`
              );
            }
            // Fetch logo file from config
            try {
              const { data: configLogoData } =
                await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: parsedConfig.logo.path,
                });
              if (
                "content" in configLogoData &&
                configLogoData.encoding === "base64"
              ) {
                logoContent = Buffer.from(configLogoData.content, "base64");
                configLogo = {
                  path: path.basename(parsedConfig.logo.path),
                  alt: parsedConfig.logo.alt,
                };
                core.info(
                  `✅ Logo fetched from config: ${parsedConfig.logo.path}`
                );
              } else {
                core.warning(
                  `⚠️ Logo file "${parsedConfig.logo.path}" from config is not a file or has unexpected format. Site will be generated without a logo.`
                );
              }
            } catch (error) {
              const status = (error as { status?: number }).status;
              if (status === 404) {
                core.warning(
                  `⚠️ Logo file not found (from config): ${parsedConfig.logo.path}. Site will be generated without a logo.`
                );
              } else if (status === 403) {
                core.warning(
                  `⚠️ Access denied to logo file (from config): ${parsedConfig.logo.path}. Site will be generated without a logo.`
                );
              } else if (status === 401) {
                core.warning(
                  `⚠️ Authentication failed for logo file (from config): ${parsedConfig.logo.path}. Site will be generated without a logo.`
                );
              } else {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                core.warning(
                  `⚠️ Failed to fetch logo from config: ${errorMessage}. Site will be generated without a logo.`
                );
              }
            }
          }

          // Validate and fetch favicon from config file if not provided via action input
          let configFavicon: { path: string } | undefined;
          if (!faviconContent && parsedConfig.favicon !== undefined) {
            if (!isValidFaviconConfig(parsedConfig.favicon)) {
              throw new Error(
                "Invalid favicon config in .gitlyte.json. " +
                  `Expected { path: string }, got: ${JSON.stringify(parsedConfig.favicon)}`
              );
            }
            // Fetch favicon file from config
            try {
              const { data: configFaviconData } =
                await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: parsedConfig.favicon.path,
                });
              if (
                "content" in configFaviconData &&
                configFaviconData.encoding === "base64"
              ) {
                faviconContent = Buffer.from(
                  configFaviconData.content,
                  "base64"
                );
                configFavicon = {
                  path: path.basename(parsedConfig.favicon.path),
                };
                core.info(
                  `✅ Favicon fetched from config: ${parsedConfig.favicon.path}`
                );
              } else {
                core.warning(
                  `⚠️ Favicon file "${parsedConfig.favicon.path}" from config is not a file or has unexpected format. Site will use browser default icon.`
                );
              }
            } catch (error) {
              const status = (error as { status?: number }).status;
              if (status === 404) {
                core.warning(
                  `⚠️ Favicon file not found (from config): ${parsedConfig.favicon.path}. Site will use browser default icon.`
                );
              } else if (status === 403) {
                core.warning(
                  `⚠️ Access denied to favicon file (from config): ${parsedConfig.favicon.path}. Site will use browser default icon.`
                );
              } else if (status === 401) {
                core.warning(
                  `⚠️ Authentication failed for favicon file (from config): ${parsedConfig.favicon.path}. Site will use browser default icon.`
                );
              } else {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                core.warning(
                  `⚠️ Failed to fetch favicon from config: ${errorMessage}. Site will use browser default icon.`
                );
              }
            }
          }

          // Fetch OG image from config if not provided via action input
          let configOgImage: { path: string } | undefined;
          if (!ogImageContent && parsedConfig.seo?.ogImage?.path) {
            try {
              const { data: configOgImageData } =
                await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: parsedConfig.seo.ogImage.path,
                });
              if (
                "content" in configOgImageData &&
                configOgImageData.encoding === "base64"
              ) {
                ogImageContent = Buffer.from(
                  configOgImageData.content,
                  "base64"
                );
                configOgImage = {
                  path: path.basename(parsedConfig.seo.ogImage.path),
                };
                core.info(
                  `✅ OG image fetched from config: ${parsedConfig.seo.ogImage.path}`
                );
              } else {
                core.warning(
                  `⚠️ OG image file "${parsedConfig.seo.ogImage.path}" from config is not a file or has unexpected format. Social media previews will not include an image.`
                );
              }
            } catch (error) {
              const status = (error as { status?: number }).status;
              if (status === 404) {
                core.warning(
                  `⚠️ OG image file not found (from config): ${parsedConfig.seo.ogImage.path}. Social media previews will not include an image.`
                );
              } else if (status === 403) {
                core.warning(
                  `⚠️ Access denied to OG image file (from config): ${parsedConfig.seo.ogImage.path}. Social media previews will not include an image.`
                );
              } else if (status === 401) {
                core.warning(
                  `⚠️ Authentication failed for OG image file (from config): ${parsedConfig.seo.ogImage.path}. Social media previews will not include an image.`
                );
              } else {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                core.warning(
                  `⚠️ Failed to fetch OG image from config: ${errorMessage}. Social media previews will not include an image.`
                );
              }
            }
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
            // Logo: action input takes precedence, then config file (with fetched content)
            logo: logoContent
              ? logoPathInput
                ? { path: path.basename(logoPathInput), alt: repoData.name }
                : configLogo
              : undefined,
            // Favicon: action input takes precedence, then config file (with fetched content)
            favicon: faviconContent
              ? faviconPathInput
                ? { path: path.basename(faviconPathInput) }
                : configFavicon
              : undefined,
            // SEO: merge action inputs with config file, action inputs take precedence
            seo: (() => {
              const actionSeo = buildSeoConfig();
              const configSeo = parsedConfig.seo as SeoConfig | undefined;

              // If no SEO config from either source, return undefined
              if (!actionSeo && !configSeo) {
                return undefined;
              }

              // Build merged SEO config
              return {
                title: actionSeo?.title ?? configSeo?.title,
                description: actionSeo?.description ?? configSeo?.description,
                keywords: configSeo?.keywords,
                ogImage: ogImageContent
                  ? ogImagePathInput
                    ? { path: path.basename(ogImagePathInput) }
                    : configOgImage
                  : undefined,
                twitterHandle:
                  actionSeo?.twitterHandle ?? configSeo?.twitterHandle,
                siteUrl: actionSeo?.siteUrl ?? configSeo?.siteUrl,
              };
            })(),
            // Sitemap: merge action inputs with config file, action inputs take precedence
            sitemap: (() => {
              const configSitemap = parsedConfig.sitemap as
                | SitemapConfig
                | undefined;

              // Action input takes precedence for enabled flag
              const enabled = generateSitemapExplicit
                ? generateSitemap
                : (configSitemap?.enabled ?? generateSitemap);

              return {
                enabled,
                changefreq: configSitemap?.changefreq,
                priority: configSitemap?.priority,
              };
            })(),
            // Robots: merge action inputs with config file, action inputs take precedence
            robots: (() => {
              const configRobots = parsedConfig.robots as
                | RobotsConfig
                | undefined;

              // Action input takes precedence for enabled flag
              const enabled = generateRobotsExplicit
                ? generateRobots
                : (configRobots?.enabled ?? generateRobots);

              return {
                enabled,
                additionalRules: configRobots?.additionalRules,
              };
            })(),
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
          error.message.startsWith("Invalid theme.toggle") ||
          error.message.startsWith("Invalid logo config") ||
          error.message.startsWith("Invalid favicon config") ||
          error.message.startsWith("Invalid seo config") ||
          error.message.startsWith("Invalid sitemap config") ||
          error.message.startsWith("Invalid robots config"))
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
      stats: repoStats,
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

    // Write OG image file if fetched
    if (ogImageContent && config.seo?.ogImage) {
      const ogImageFilePath = path.join(outDir, config.seo.ogImage.path);
      validatePath(ogImageFilePath, config.seo.ogImage.path);
      try {
        fs.writeFileSync(ogImageFilePath, ogImageContent);
        core.info(`🔍 Written: ${ogImageFilePath}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to write OG image "${config.seo.ogImage.path}" to "${ogImageFilePath}": ${errorMessage}`,
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
