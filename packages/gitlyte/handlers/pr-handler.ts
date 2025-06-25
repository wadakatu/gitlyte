import type { Context } from "probot";
import { generateAIAstroSite } from "../services/astro-generator.js";
import type { PullRequest } from "../types.js";
import { safeGenerateWithDeploymentGuard } from "../utils/deployment-guard.js";
import { collectRepoData, ensurePages } from "../utils/github.js";

/** Feature PR ハンドラ */
export async function handleFeaturePR(ctx: Context, pr: PullRequest) {
  try {
    ctx.log.info(`🚀 Starting site generation for PR: ${pr.title}`);
    ctx.log.info(`📋 PR Labels: ${pr.labels.map((l) => l.name).join(", ")}`);

    // PRマージ直後のGitHub API同期待ち（特に設定ファイル読み込みのため）
    ctx.log.info("⏳ Waiting for GitHub API sync after PR merge...");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒待機

    const repoData = await collectRepoData(ctx);
    ctx.log.info(`📊 Repository data collected: ${repoData.repo.name}`);

    await ensurePages(ctx);
    ctx.log.info("📄 GitHub Pages setup completed");

    // デプロイメント競合を防ぐためのガード付きサイト生成
    await safeGenerateWithDeploymentGuard(ctx, async () => {
      return await generateAIAstroSite(ctx, repoData);
    });

    ctx.log.info(`✅ AI-generated Astro site created for PR: ${pr.title}`);
  } catch (error) {
    ctx.log.error(`❌ Failed to handle feature PR: ${pr.title}`, error);
    throw error;
  }
}
