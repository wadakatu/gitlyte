import type { Probot } from "probot";
import { handleFeaturePR } from "./handlers/pr-handler.js";
import { handleIssueComment } from "./handlers/comment-handler.js";

export default function app(bot: Probot) {
  // PRマージ時のハンドリング
  bot.on("pull_request.closed", async (ctx) => {
    const pr = ctx.payload.pull_request;

    ctx.log.info(`📥 PR closed event received: ${pr.title}`);
    ctx.log.info(`🔍 PR merged: ${pr.merged}, merged_at: ${pr.merged_at}`);
    ctx.log.info(
      `🏷️ PR labels: ${pr.labels.map((l: { name: string }) => l.name).join(", ")}`
    );

    if (!pr.merged || !pr.merged_at) {
      ctx.log.info("⏭️ Skipping: PR not merged");
      return;
    }

    ctx.log.info("🚀 PR merged, evaluating trigger conditions");
    await handleFeaturePR(ctx, pr);
  });

  // コメントコマンドのハンドリング
  bot.on("issue_comment.created", async (ctx) => {
    ctx.log.info(`💬 Comment created: ${ctx.payload.comment.body}`);
    await handleIssueComment(ctx);
  });
}
