/**
 * GitLyte v2 Comment Handler
 *
 * Handles @gitlyte commands in Issue/PR comments:
 * - @gitlyte generate - Trigger site generation
 * - @gitlyte help - Show help message
 */

import type { Context } from "probot";

import { generateSite } from "../services/v2-site-generator.js";
import type { resolveConfigV2 } from "../types/v2-config.js";
import { createAIProvider } from "../utils/ai-provider.js";
import { GITLYTE_COMMIT_MARKER } from "../utils/constants.js";
import { safeGenerateWithDeploymentGuard } from "../utils/deployment-guard.js";
import { loadConfigV2 } from "./v2-push-handler.js";

/**
 * GitLyte command types
 */
type GitLyteCommand = "generate" | "help" | null;

/**
 * Parse @gitlyte command from comment body
 */
function parseCommand(commentBody: string): GitLyteCommand {
  const trimmed = commentBody.trim().toLowerCase();

  if (trimmed.startsWith("@gitlyte generate")) {
    return "generate";
  }
  if (trimmed.startsWith("@gitlyte help")) {
    return "help";
  }

  return null;
}

/**
 * Generate help message
 */
function generateHelpMessage(): string {
  return `## 🤖 GitLyte Commands

| Command | Description |
|---------|-------------|
| \`@gitlyte generate\` | Generate/update the site |
| \`@gitlyte help\` | Show this help message |

### Configuration

Add a \`.gitlyte.json\` file to your repository root:

\`\`\`json
{
  "generation": {
    "trigger": "manual"
  },
  "ai": {
    "provider": "anthropic",
    "quality": "standard"
  },
  "outputDirectory": "docs"
}
\`\`\`

**Trigger modes:**
- \`manual\` (default): Generate only via \`@gitlyte generate\` command
- \`auto\`: Generate on every push to default branch

[📖 Documentation](https://github.com/wadakatu/gitlyte)
`;
}

/**
 * Handle issue_comment.created events
 */
export async function handleCommentV2(ctx: Context): Promise<void> {
  const payload = ctx.payload as {
    action: string;
    comment: {
      id: number;
      body: string;
      user: { login: string };
    };
    issue: {
      number: number;
      pull_request?: unknown;
    };
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

  // Only handle newly created comments
  if (payload.action !== "created") {
    return;
  }

  const command = parseCommand(payload.comment.body);

  if (!command) {
    return;
  }

  ctx.log.info(
    `💬 [v2] Command detected: @gitlyte ${command} (from ${payload.comment.user.login})`
  );

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;

  // Handle help command
  if (command === "help") {
    try {
      await ctx.octokit.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body: generateHelpMessage(),
      });
      ctx.log.info("📖 [v2] Help message posted");
    } catch (error) {
      ctx.log.error("❌ [v2] Failed to post help message", error as Error);
      throw new Error(
        `Failed to post help message: ${(error as Error).message}`,
        { cause: error }
      );
    }
    return;
  }

  // Handle generate command
  if (command === "generate") {
    const startTime = Date.now();

    // Post initial status comment
    const statusComment = await ctx.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: "🚀 **GitLyte** Site generation starting...\n\n⏳ Please wait, this may take a minute.",
    });

    try {
      // Load configuration
      const config = await loadConfigV2(ctx);

      if (!config.enabled) {
        await ctx.octokit.issues.updateComment({
          owner,
          repo,
          comment_id: statusComment.data.id,
          body: "⏭️ **GitLyte** Generation skipped: disabled in config (`enabled: false`)",
        });
        return;
      }

      // Create AI provider
      const aiProvider = createAIProvider(
        config.ai.provider,
        config.ai.quality
      );

      // Generate and deploy site
      await safeGenerateWithDeploymentGuard(ctx, async () => {
        const prUrl = await generateAndDeploySiteFromComment(
          ctx,
          config,
          aiProvider
        );

        const duration = Date.now() - startTime;

        // Update status comment with success
        await ctx.octokit.issues.updateComment({
          owner,
          repo,
          comment_id: statusComment.data.id,
          body: `✅ **GitLyte** Site generated successfully!\n\n🔗 Pull Request: ${prUrl}\n⏱️ Duration: ${Math.round(duration / 1000)}s`,
        });

        ctx.log.info(`✅ [v2] Site generated via comment in ${duration}ms`);
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update status comment with error (don't let this failure mask the original error)
      try {
        await ctx.octokit.issues.updateComment({
          owner,
          repo,
          comment_id: statusComment.data.id,
          body: `❌ **GitLyte** Site generation failed\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n⏱️ Duration: ${Math.round(duration / 1000)}s`,
        });
      } catch (updateError) {
        ctx.log.warn(
          "⚠️ [v2] Failed to update status comment with error",
          updateError as Error
        );
      }

      ctx.log.error(
        "❌ [v2] Site generation via comment failed",
        error as Error
      );
      throw error;
    }
  }
}

/**
 * Generate and deploy site from comment context
 */
async function generateAndDeploySiteFromComment(
  ctx: Context,
  config: ReturnType<typeof resolveConfigV2>,
  aiProvider: ReturnType<typeof createAIProvider>
): Promise<string> {
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

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const defaultBranch = payload.repository.default_branch;

  const repoInfo = {
    name: repo,
    description: payload.repository.description || "",
    url: payload.repository.html_url,
    language: payload.repository.language || undefined,
    topics: payload.repository.topics,
  };

  ctx.log.info(`📊 [v2] Analyzing repository: ${owner}/${repo}`);

  // Try to fetch README
  let readme: string | undefined;
  try {
    const readmeResponse = await ctx.octokit.repos.getReadme({
      owner,
      repo,
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
      ctx.log.warn(
        "⚠️ [v2] Failed to fetch README (proceeding without it)",
        error as Error
      );
    }
  }

  // Generate site
  ctx.log.info("🎨 [v2] Generating site...");
  const site = await generateSite({ ...repoInfo, readme }, config, aiProvider);

  ctx.log.info(`📝 [v2] Generated ${site.pages.length} page(s)`);

  // Deploy via Pull Request
  ctx.log.info(`🚀 [v2] Creating PR for ${config.outputDirectory}/...`);

  // Generate unique branch name
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const prBranch = `gitlyte/update-site-${timestamp}`;

  // Create tree entries
  const treeEntries = site.pages.map((page) => ({
    path: `${config.outputDirectory}/${page.path}`,
    mode: "100644" as const,
    type: "blob" as const,
    content: page.html,
  }));

  // Get current commit SHA
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

  // Create branch (with 422 error handling for existing branch)
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

  // Create PR (with cleanup on failure)
  try {
    const { data: pr } = await ctx.octokit.pulls.create({
      owner,
      repo,
      title: "chore: update GitLyte generated site",
      head: prBranch,
      base: defaultBranch,
      body: `## 🤖 GitLyte Site Update

This PR was generated by GitLyte via \`@gitlyte generate\` command.

### Changes
- Updated site in \`${config.outputDirectory}/\`

### Configuration
- Provider: ${config.ai.provider}
- Quality: ${config.ai.quality}

---
*Generated by [GitLyte](https://github.com/wadakatu/gitlyte)*`,
    });

    ctx.log.info(`✅ [v2] Created PR #${pr.number}: ${pr.html_url}`);

    return pr.html_url;
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
}
