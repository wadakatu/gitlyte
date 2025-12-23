import type { Probot } from "probot";
import { handlePushV2 } from "./handlers/v2-push-handler.js";

export default function app(bot: Probot) {
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
}
