import type { Context } from "probot";

/**
 * GitHub Pages デプロイメントの状態をチェック
 */
export async function checkDeploymentStatus(ctx: Context): Promise<boolean> {
  try {
    const { data: deployments } = await ctx.octokit.repos.listDeployments({
      ...ctx.repo(),
      environment: "github-pages",
      per_page: 1,
    });

    if (deployments.length === 0) {
      return false; // デプロイメントなし
    }

    const latestDeployment = deployments[0];
    const { data: statuses } = await ctx.octokit.repos.listDeploymentStatuses({
      ...ctx.repo(),
      deployment_id: latestDeployment.id,
      per_page: 1,
    });

    if (statuses.length === 0) {
      return true; // ステータス不明なので進行中と判定
    }

    const latestStatus = statuses[0];
    const isInProgress = ["pending", "in_progress", "queued"].includes(
      latestStatus.state
    );

    ctx.log.info(`📊 Latest deployment status: ${latestStatus.state}`);

    return isInProgress;
  } catch (error) {
    ctx.log.warn(
      "Failed to check deployment status, proceeding anyway:",
      error
    );
    return false; // エラーの場合は進行
  }
}

/**
 * デプロイメントが完了するまで待機
 */
export async function waitForDeploymentCompletion(
  ctx: Context,
  maxWaitTime = 300000 // 5分
): Promise<void> {
  const startTime = Date.now();
  const checkInterval = Math.min(10000, maxWaitTime / 10); // 10秒間隔、ただしテスト時は短縮

  ctx.log.info("⏳ Waiting for previous deployment to complete...");

  while (Date.now() - startTime < maxWaitTime) {
    const isInProgress = await checkDeploymentStatus(ctx);

    if (!isInProgress) {
      ctx.log.info("✅ Previous deployment completed, proceeding");
      return;
    }

    ctx.log.info(
      `⏳ Deployment still in progress, waiting ${checkInterval / 1000}s...`
    );
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  ctx.log.warn(
    "⚠️ Timeout waiting for deployment completion, proceeding anyway"
  );
}

/**
 * 安全なサイト生成（デプロイメント競合を防ぐ）
 */
export async function safeGenerateWithDeploymentGuard<T>(
  ctx: Context,
  generateFn: () => Promise<T>
): Promise<T> {
  // 1. 現在のデプロイメント状態をチェック
  const isDeploymentInProgress = await checkDeploymentStatus(ctx);

  if (isDeploymentInProgress) {
    // 2. 進行中の場合は完了まで待機
    await waitForDeploymentCompletion(ctx);
  }

  // 3. サイト生成を実行
  ctx.log.info("🚀 Starting site generation after deployment check");
  return await generateFn();
}
