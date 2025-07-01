import type { Context } from "probot";
import { ConfigurationLoader } from "../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../services/repository-analyzer.js";
import { SiteGenerator } from "../services/site-generator.js";
import { StaticFileDeployer } from "../services/static-file-deployer.js";
import { TriggerController } from "../services/trigger-controller.js";
import { safeGenerateWithDeploymentGuard } from "../utils/deployment-guard.js";
import { collectRepoData, ensurePages } from "../utils/github.js";

/** Push イベントハンドラー */
export async function handlePush(ctx: Context) {
  try {
    const { ref, commits, repository } = ctx.payload as {
      ref: string;
      commits: Array<{
        added: string[];
        modified: string[];
        removed: string[];
      }>;
      repository: { default_branch: string };
    };

    // ブランチ名を取得（refs/heads/main → main）
    const branchName = ref.replace("refs/heads/", "");

    ctx.log.info(
      `📥 Push event received: branch=${branchName}, commits=${commits.length}`
    );

    // 設定をロード
    const configLoader = new ConfigurationLoader();
    const configResult = await configLoader.loadConfiguration();
    const config = configResult.config;

    // トリガー判定
    const triggerController = new TriggerController();
    const triggerResult = await triggerController.shouldGenerateOnPush(
      branchName,
      repository.default_branch,
      commits,
      config
    );

    ctx.log.info(`🎯 Push trigger evaluation: ${triggerResult.reason}`);

    if (!triggerResult.shouldGenerate) {
      ctx.log.info(`⏭️ Skipping site generation: ${triggerResult.reason}`);
      return;
    }

    ctx.log.info(
      `🚀 Starting ${triggerResult.generationType} site generation for push to ${branchName}`
    );

    // Push直後のGitHub API同期待ち
    ctx.log.info("⏳ Waiting for GitHub API sync after push...");
    await new Promise((resolve) => setTimeout(resolve, 3000)); // 3秒待機

    const repoData = await collectRepoData(ctx);
    ctx.log.info(`📊 Repository data collected: ${repoData.basicInfo.name}`);

    // 出力ディレクトリを設定から取得
    const outputPath = config.generation?.outputDirectory || "docs";
    await ensurePages(ctx, outputPath);
    ctx.log.info("📄 GitHub Pages setup completed");

    // デプロイメント競合を防ぐためのガード付きサイト生成
    await safeGenerateWithDeploymentGuard(ctx, async () => {
      const repositoryAnalyzer = new RepositoryAnalyzer();
      const siteGenerator = new SiteGenerator();
      const deployer = new StaticFileDeployer();

      // リポジトリを分析
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(repoData);

      // サイトを生成
      const generatedSite = await siteGenerator.generateSite(analysis, config);

      // ファイルをデプロイ (outputPathは上で定義済み)
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

    ctx.log.info(
      `✅ Site generated for push to ${branchName} (${triggerResult.triggerType} trigger)`
    );
  } catch (error) {
    ctx.log.error("❌ Failed to handle push event", error);
    throw error;
  }
}
