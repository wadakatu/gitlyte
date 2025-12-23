/**
 * GitLyte v2 Push Handler
 *
 * Simplified push handler that:
 * - Only triggers on default branch pushes
 * - Uses the new v2 configuration schema
 * - Uses the Vercel AI SDK for generation
 */

import type { Context } from "probot";

import { generateSite } from "../services/v2-site-generator.js";
import {
  type GitLyteConfigV2,
  resolveConfigV2,
  validateConfigV2,
} from "../types/v2-config.js";
import { createAIProvider } from "../utils/ai-provider.js";
import { safeGenerateWithDeploymentGuard } from "../utils/deployment-guard.js";

/**
 * Marker to identify GitLyte-generated commits and prevent infinite loops
 */
const GITLYTE_COMMIT_MARKER = "[skip gitlyte]";

/**
 * Check if a push event contains only GitLyte-generated commits
 * This prevents infinite loops where GitLyte's own commits trigger new generations
 */
function isGitLyteGeneratedPush(commits: Array<{ message: string }>): boolean {
  if (commits.length === 0) {
    return false;
  }

  // Check if ALL commits in this push contain the GitLyte marker
  return commits.every((commit) =>
    commit.message.includes(GITLYTE_COMMIT_MARKER)
  );
}

/**
 * Handle push events for GitLyte v2
 */
export async function handlePushV2(ctx: Context): Promise<void> {
  const startTime = Date.now();

  try {
    const payload = ctx.payload as {
      ref: string;
      repository: {
        name: string;
        full_name: string;
        default_branch: string;
        owner: { login: string };
      };
      commits: Array<{
        id: string;
        message: string;
        added: string[];
        modified: string[];
        removed: string[];
      }>;
    };

    const branchName = payload.ref.replace("refs/heads/", "");
    const defaultBranch = payload.repository.default_branch;
    const repoFullName = payload.repository.full_name;

    ctx.log.info(`📥 [v2] Push received: ${repoFullName}@${branchName}`);

    // Only process default branch pushes
    if (branchName !== defaultBranch) {
      ctx.log.info(
        `⏭️ [v2] Skipping: not default branch (${branchName} != ${defaultBranch})`
      );
      return;
    }

    // Skip if all commits are GitLyte-generated (prevents infinite loop)
    if (isGitLyteGeneratedPush(payload.commits)) {
      ctx.log.info(
        "⏭️ [v2] Skipping: GitLyte-generated commit detected (infinite loop prevention)"
      );
      return;
    }

    // Load and validate configuration
    const config = await loadConfigV2(ctx);

    if (!config.enabled) {
      ctx.log.info("⏭️ [v2] Skipping: generation disabled in config");
      return;
    }

    ctx.log.info(
      `🚀 [v2] Starting site generation (provider: ${config.ai.provider}, quality: ${config.ai.quality})`
    );

    // Create AI provider
    const aiProvider = createAIProvider(config.ai.provider, config.ai.quality);

    // Wait for GitHub API to sync after push.
    // This delay ensures that the latest commit data is available when we fetch
    // repository content. Without this, we might get stale data due to GitHub's
    // eventual consistency model.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate and deploy site with deployment guard (prevents concurrent deployments)
    await safeGenerateWithDeploymentGuard(ctx, async () => {
      await generateAndDeploySiteV2(ctx, config, aiProvider);
    });

    const duration = Date.now() - startTime;
    ctx.log.info(`✅ [v2] Site generated successfully in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const payload = ctx.payload as { repository: { full_name: string } };
    ctx.log.error(
      `❌ [v2] Site generation failed for ${payload.repository.full_name} after ${duration}ms`,
      error as Error
    );
    throw error;
  }
}

/**
 * Load v2 configuration from repository
 */
async function loadConfigV2(
  ctx: Context
): Promise<ReturnType<typeof resolveConfigV2>> {
  const payload = ctx.payload as {
    repository: {
      owner: { login: string };
      name: string;
    };
  };

  try {
    const response = await ctx.octokit.repos.getContent({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      path: ".gitlyte.json",
    });

    if ("content" in response.data && response.data.type === "file") {
      const content = Buffer.from(response.data.content, "base64").toString(
        "utf-8"
      );
      const parsed = JSON.parse(content) as GitLyteConfigV2;

      // Validate configuration
      const validation = validateConfigV2(parsed);
      if (!validation.valid) {
        ctx.log.warn(
          `⚠️ [v2] Config validation errors: ${validation.errors.join(", ")}`
        );
      }
      if (validation.warnings.length > 0) {
        ctx.log.info(
          `ℹ️ [v2] Config warnings: ${validation.warnings.join(", ")}`
        );
      }

      return resolveConfigV2(parsed);
    }
  } catch (error) {
    // Config file not found - use defaults
    if ((error as { status?: number }).status === 404) {
      ctx.log.info("ℹ️ [v2] No .gitlyte.json found, using defaults");
    } else {
      ctx.log.warn(
        "⚠️ [v2] Error loading config, using defaults",
        error as Error
      );
    }
  }

  return resolveConfigV2({});
}

/**
 * Generate and deploy site using v2 architecture
 */
async function generateAndDeploySiteV2(
  ctx: Context,
  config: ReturnType<typeof resolveConfigV2>,
  aiProvider: ReturnType<typeof createAIProvider>
): Promise<void> {
  const payload = ctx.payload as {
    repository: {
      owner: { login: string };
      name: string;
      description: string | null;
      html_url: string;
      language: string | null;
      topics?: string[];
      default_branch: string;
    };
  };

  const repoInfo = {
    name: payload.repository.name,
    description: payload.repository.description || "",
    url: payload.repository.html_url,
    language: payload.repository.language || undefined,
    topics: payload.repository.topics,
  };

  ctx.log.info(
    `📊 [v2] Analyzing repository: ${payload.repository.owner.login}/${repoInfo.name}`
  );

  // Try to fetch README for better analysis
  let readme: string | undefined;
  try {
    const readmeResponse = await ctx.octokit.repos.getReadme({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
    });
    if ("content" in readmeResponse.data) {
      readme = Buffer.from(readmeResponse.data.content, "base64").toString(
        "utf-8"
      );
    }
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) {
      ctx.log.info("ℹ️ [v2] No README found");
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      ctx.log.warn(
        `⚠️ [v2] Failed to fetch README (proceeding without it): ${errorMessage}`
      );
    }
  }

  // Generate site
  ctx.log.info("🎨 [v2] Generating site...");
  const site = await generateSite({ ...repoInfo, readme }, config, aiProvider);

  ctx.log.info(`📝 [v2] Generated ${site.pages.length} page(s)`);

  // Deploy generated files via Pull Request
  ctx.log.info(`🚀 [v2] Creating PR for ${config.outputDirectory}/...`);

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const defaultBranch = payload.repository.default_branch;

  // Generate unique branch name with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const prBranch = `gitlyte/update-site-${timestamp}`;

  try {
    // Create tree entries for all pages
    const treeEntries = site.pages.map((page) => ({
      path: `${config.outputDirectory}/${page.path}`,
      mode: "100644" as const,
      type: "blob" as const,
      content: page.html,
    }));

    // Get the current commit SHA from default branch
    const { data: ref } = await ctx.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
    });
    const parentSha = ref.object.sha;

    // Create tree
    const { data: tree } = await ctx.octokit.git.createTree({
      owner,
      repo,
      base_tree: parentSha,
      tree: treeEntries,
    });

    // Create commit
    const { data: commit } = await ctx.octokit.git.createCommit({
      owner,
      repo,
      message: `chore: update GitLyte generated site ${GITLYTE_COMMIT_MARKER}\n\n🤖 Generated by GitLyte v2`,
      tree: tree.sha,
      parents: [parentSha],
    });

    // Create new branch for the PR (with 422 error handling for existing branch)
    try {
      await ctx.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${prBranch}`,
        sha: commit.sha,
      });
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 422) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Branch ${prBranch} already exists. Please delete the existing branch or wait before retrying. Details: ${errorMessage}`,
          { cause: error }
        );
      }
      throw error;
    }

    ctx.log.info(`📌 [v2] Created branch: ${prBranch}`);

    // Create Pull Request (with cleanup on failure)
    try {
      const { data: pr } = await ctx.octokit.pulls.create({
        owner,
        repo,
        title: "chore: update GitLyte generated site",
        body: `## 🤖 GitLyte v2 Site Update

This PR updates the generated site in \`${config.outputDirectory}/\`.

### Changes
- ${site.pages.length} page(s) generated/updated

---
*Automatically generated by [GitLyte](https://github.com/wadakatu/gitlyte) v2*`,
        head: prBranch,
        base: defaultBranch,
      });

      ctx.log.info(`✅ [v2] Created PR #${pr.number}: ${pr.html_url}`);
    } catch (prError) {
      // Attempt to clean up the orphaned branch
      ctx.log.error(
        `❌ [v2] PR creation failed, attempting to clean up branch ${prBranch}`
      );
      try {
        await ctx.octokit.git.deleteRef({
          owner,
          repo,
          ref: `heads/${prBranch}`,
        });
        ctx.log.info(`🧹 [v2] Cleaned up orphaned branch: ${prBranch}`);
      } catch (cleanupError) {
        ctx.log.warn(
          `⚠️ [v2] Failed to clean up orphaned branch ${prBranch}:`,
          cleanupError as Error
        );
      }
      throw prError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create PR for ${owner}/${repo}: ${errorMessage}`,
      { cause: error }
    );
  }
}
