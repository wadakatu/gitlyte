import type { Probot } from "probot";
import { handleFeaturePR } from "./handlers/pr-handler.js";

export default function app(bot: Probot) {
  bot.on("pull_request.closed", async (ctx) => {
    const pr = ctx.payload.pull_request;
    if (!pr.merged || !pr.merged_at) return;
    if (!pr.labels.some((l: { name: string }) => /(enhancement|feat)/i.test(l.name))) return;

    await handleFeaturePR(ctx, pr);
  });
}
