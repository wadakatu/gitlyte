import type { Probot } from "probot";
import { handleCommentV2 } from "./handlers/v2-comment-handler.js";
import { handlePushV2 } from "./handlers/v2-push-handler.js";

export default function app(bot: Probot) {
  // Debug: すべてのイベントをログ出力
  bot.onAny(async (ctx) => {
    bot.log.info(`🔍 Event received: ${ctx.name}`);
  });

  // v2: デフォルトブランチへのpushのみを処理
  bot.on("push", async (ctx) => {
    const { ref, commits } = ctx.payload as {
      ref: string;
      commits: Array<{ id: string; message: string }>;
    };
    const branchName = ref.replace("refs/heads/", "");

    ctx.log.info(
      `📤 Push event received: branch=${branchName}, commits=${commits.length}`
    );
    await handlePushV2(ctx);
  });

  // v2: Issue/PRコメントで @gitlyte コマンドを処理
  bot.on("issue_comment.created", async (ctx) => {
    await handleCommentV2(ctx);
  });
}
