import type { Context } from "probot";
import { ConfigurationLoader } from "../services/configuration-loader.js";
import { RepositoryAnalyzer } from "../services/repository-analyzer.js";
import { SiteGenerator } from "../services/site-generator.js";
import { StaticFileDeployer } from "../services/static-file-deployer.js";
import {
  TriggerController,
  type CommentCommand,
} from "../services/trigger-controller.js";
import type { GitLyteConfig } from "../types/config.js";
import { collectRepoData, ensurePages } from "../utils/github.js";
import { safeGenerateWithDeploymentGuard } from "../utils/deployment-guard.js";

/**
 * イシューコメントハンドラー
 */
export async function handleIssueComment(ctx: Context) {
  try {
    const { comment, issue } = ctx.payload as {
      comment: { body: string };
      issue: { pull_request?: unknown };
    };

    // PRでない場合は処理しない
    if (!issue.pull_request) {
      return;
    }

    ctx.log.info(`💬 Processing comment: ${comment.body}`);

    const triggerController = new TriggerController();
    const configLoader = new ConfigurationLoader();

    // 設定をロード
    const configResult = await configLoader.loadConfiguration();
    const config = configResult.config;

    // コメントコマンドの解析
    const command = triggerController.parseCommentCommand(comment.body);

    if (!command) {
      ctx.log.info("No valid command found in comment");
      return;
    }

    ctx.log.info(`🎯 Command detected: ${command.action}`);

    // ヘルプコマンドの処理
    if (command.action === "help") {
      await handleHelpCommand(ctx, triggerController);
      return;
    }

    // 設定表示コマンドの処理
    if (command.action === "config") {
      await handleConfigCommand(ctx, triggerController, config);
      return;
    }

    // 生成コマンドの処理
    if (command.action === "generate" || command.action === "preview") {
      await handleGenerationCommand(ctx, triggerController, config, command);
      return;
    }
  } catch (error) {
    ctx.log.error("❌ Failed to handle comment:", error);

    // エラーをコメントで通知
    await ctx.octokit.issues.createComment({
      ...ctx.issue(),
      body: `❌ **GitLyte エラー**\n\nコマンド実行中にエラーが発生しました:\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``,
    });
  }
}

/**
 * ヘルプコマンドの処理
 */
async function handleHelpCommand(
  ctx: Context,
  triggerController: TriggerController
) {
  const helpMessage = triggerController.generateHelpMessage();

  await ctx.octokit.issues.createComment({
    ...ctx.issue(),
    body: helpMessage,
  });

  ctx.log.info("Help message posted");
}

/**
 * 設定表示コマンドの処理
 */
async function handleConfigCommand(
  ctx: Context,
  triggerController: TriggerController,
  config: GitLyteConfig
) {
  const configMessage = triggerController.generateConfigMessage(config);

  await ctx.octokit.issues.createComment({
    ...ctx.issue(),
    body: configMessage,
  });

  ctx.log.info("Config message posted");
}

/**
 * 生成コマンドの処理
 */
async function handleGenerationCommand(
  ctx: Context,
  triggerController: TriggerController,
  config: GitLyteConfig,
  command: CommentCommand
) {
  // トリガー判定
  const triggerResult = await triggerController.shouldGenerateOnComment(
    (ctx.payload as { comment: { body: string } }).comment.body,
    config
  );

  if (!triggerResult.shouldGenerate) {
    await ctx.octokit.issues.createComment({
      ...ctx.issue(),
      body: `ℹ️ **GitLyte 情報**\n\n生成がスキップされました: ${triggerResult.reason}`,
    });
    return;
  }

  // 生成開始の通知
  const startComment = await ctx.octokit.issues.createComment({
    ...ctx.issue(),
    body: `🚀 **GitLyte 生成開始**\n\n${command.action === "preview" ? "プレビュー" : "フル"}サイト生成を開始します...\n\n⏳ 処理中...`,
  });

  try {
    // リポジトリデータの収集
    const repoData = await collectRepoData(ctx);
    ctx.log.info(`📊 Repository data collected: ${repoData.basicInfo.name}`);

    await ensurePages(ctx);
    ctx.log.info("📄 GitHub Pages setup completed");

    // サイト生成
    await safeGenerateWithDeploymentGuard(ctx, async () => {
      const repositoryAnalyzer = new RepositoryAnalyzer();
      const siteGenerator = new SiteGenerator();
      const deployer = new StaticFileDeployer();

      // リポジトリを分析
      const analysis = await repositoryAnalyzer.analyzeRepositoryData(repoData);

      // サイトを生成
      const generatedSite = await siteGenerator.generateSite(analysis, config);

      // ファイルをデプロイ
      const outputPath = command.action === "preview" ? "preview" : "docs";
      const deploymentResult = await deployer.deployToDirectory(
        generatedSite,
        outputPath,
        config,
        {
          clean: true,
          optimize: command.action !== "preview",
        }
      );

      if (!deploymentResult.success) {
        throw new Error(
          `Deployment failed: ${deploymentResult.errors.join(", ")}`
        );
      }

      return deploymentResult;
    });

    // 成功の通知
    await ctx.octokit.issues.updateComment({
      ...ctx.issue(),
      comment_id: startComment.data.id,
      body: `✅ **GitLyte 生成完了**\n\n${command.action === "preview" ? "プレビュー" : "フル"}サイト生成が完了しました！\n\n📁 出力先: \`${command.action === "preview" ? "preview" : "docs"}\` ディレクトリ\n🔗 GitHub Pages で確認できます`,
    });

    ctx.log.info(
      `✅ Site generation completed via comment command: ${command.action}`
    );
  } catch (error) {
    ctx.log.error("❌ Site generation failed:", error);

    // エラーの通知
    await ctx.octokit.issues.updateComment({
      ...ctx.issue(),
      comment_id: startComment.data.id,
      body: `❌ **GitLyte 生成失敗**\n\nサイト生成中にエラーが発生しました:\n\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\``,
    });

    throw error;
  }
}
