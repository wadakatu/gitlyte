import type { Probot } from "probot";
import { handleFeaturePR } from "./handlers/pr-handler.js";

export default function app(bot: Probot) {
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

    const hasTargetLabel = pr.labels.some((l: { name: string }) =>
      /(enhancement|feat)/i.test(l.name)
    );

    if (!hasTargetLabel) {
      ctx.log.info("⏭️ Skipping: No enhancement/feat label found");
      return;
    }

    ctx.log.info("✅ PR meets criteria, proceeding with site generation");
    await handleFeaturePR(ctx, pr);
  });
}
