import type { Context } from "probot";
import { ConfigurationLoader } from "../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../services/repository-analyzer.js";
import { SiteGenerator } from "../services/site-generator.js";
import { StaticFileDeployer } from "../services/static-file-deployer.js";
import type { PullRequest } from "../types/repository.js";
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
    ctx.log.info(`📊 Repository data collected: ${repoData.basicInfo.name}`);

    await ensurePages(ctx);
    ctx.log.info("📄 GitHub Pages setup completed");

    // デプロイメント競合を防ぐためのガード付きサイト生成
    await safeGenerateWithDeploymentGuard(ctx, async () => {
      // 新しいアーキテクチャでのサイト生成
      const configLoader = new ConfigurationLoader();
      const repositoryAnalyzer = new RepositoryAnalyzer();
      const siteGenerator = new SiteGenerator();
      const deployer = new StaticFileDeployer();

      // 設定をロード
      const configResult = await configLoader.loadConfiguration();
      const config = configResult.config;

      // リポジトリを分析
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(repoData);

      // サイトを生成
      const generatedSite = await siteGenerator.generateSite(analysis, config);

      // ファイルをデプロイ（docsディレクトリへ）
      const outputPath = "docs";
      const deploymentResult = await deployer.deployToDirectory(
        generatedSite,
        outputPath,
        config,
        { clean: true, optimize: true }
      );

      if (!deploymentResult.success) {
        throw new Error(
          `Deployment failed: ${deploymentResult.errors.join(", ")}`
        );
      }

      return deploymentResult;
    });

    ctx.log.info(`✅ AI-generated Astro site created for PR: ${pr.title}`);
  } catch (error) {
    ctx.log.error(`❌ Failed to handle feature PR: ${pr.title}`, error);
    throw error;
  }
}
