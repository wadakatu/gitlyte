import type { Context } from "probot";
import { ConfigurationLoader } from "../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../services/repository-analyzer.js";
import { SiteGenerator } from "../services/site-generator.js";
import { StaticFileDeployer } from "../services/static-file-deployer.js";
import { TriggerController } from "../services/trigger-controller.js";
import type { PullRequest } from "../types/repository.js";
import { safeGenerateWithDeploymentGuard } from "../utils/deployment-guard.js";
import { collectRepoData, ensurePages } from "../utils/github.js";

/** Feature PR ハンドラ */
export async function handleFeaturePR(ctx: Context, pr: PullRequest) {
  try {
    ctx.log.info(`🚀 Starting site generation evaluation for PR: ${pr.title}`);
    ctx.log.info(`📋 PR Labels: ${pr.labels.map((l) => l.name).join(", ")}`);

    // 設定をロード
    const configLoader = new ConfigurationLoader();
    const configResult = await configLoader.loadConfiguration();
    const config = configResult.config;

    // トリガー判定
    const triggerController = new TriggerController();
    const triggerResult = await triggerController.shouldGenerateOnPRMerge(
      pr,
      config
    );

    ctx.log.info(`🎯 Trigger evaluation: ${triggerResult.reason}`);

    if (!triggerResult.shouldGenerate) {
      ctx.log.info(`⏭️ Skipping site generation: ${triggerResult.reason}`);
      return;
    }

    ctx.log.info(
      `🚀 Starting ${triggerResult.generationType} site generation for PR: ${pr.title}`
    );

    // PRマージ直後のGitHub API同期待ち（特に設定ファイル読み込みのため）
    ctx.log.info("⏳ Waiting for GitHub API sync after PR merge...");
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5秒待機

    const repoData = await collectRepoData(ctx);
    ctx.log.info(`📊 Repository data collected: ${repoData.basicInfo.name}`);

    // デフォルトのoutputPathを先に決定
    const defaultOutputPath = config.generation?.outputDirectory || "docs";
    await ensurePages(ctx, defaultOutputPath);
    ctx.log.info("📄 GitHub Pages setup completed");

    // デプロイメント競合を防ぐためのガード付きサイト生成
    await safeGenerateWithDeploymentGuard(ctx, async () => {
      // 新しいアーキテクチャでのサイト生成
      const repositoryAnalyzer = new RepositoryAnalyzer();
      const siteGenerator = new SiteGenerator();
      const deployer = new StaticFileDeployer();

      // リポジトリを分析
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(repoData);

      // サイトを生成
      const generatedSite = await siteGenerator.generateSite(analysis, config);

      // ファイルをデプロイ（プレビューまたはフル生成に応じてパスを変更）
      const outputPath =
        triggerResult.generationType === "preview"
          ? `${defaultOutputPath}/preview`
          : defaultOutputPath;
      const optimize = triggerResult.generationType !== "preview";

      const deploymentResult = await deployer.deployToDirectory(
        generatedSite,
        outputPath,
        config,
        { clean: true, optimize }
      );

      if (!deploymentResult.success) {
        throw new Error(
          `Deployment failed: ${deploymentResult.errors.join(", ")}`
        );
      }

      return deploymentResult;
    });

    ctx.log.info(
      `✅ ${triggerResult.generationType} site generated for PR: ${pr.title} (${triggerResult.triggerType} trigger)`
    );
  } catch (error) {
    ctx.log.error(`❌ Failed to handle feature PR: ${pr.title}`, error);
    throw error;
  }
}
