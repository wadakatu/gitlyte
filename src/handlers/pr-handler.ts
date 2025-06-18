import type { Context } from "probot";
import { generateAIAstroSite } from "../services/astro-generator.js";
import type { PullRequest } from "../types.js";
import { collectRepoData, ensurePages } from "../utils/github.js";

/** Feature PR ハンドラ */
export async function handleFeaturePR(ctx: Context, pr: PullRequest) {
  const repoData = await collectRepoData(ctx);

  await ensurePages(ctx);
  await generateAIAstroSite(ctx, repoData);

  ctx.log.info(`✅ AI-generated Astro site created for PR: ${pr.title}`);
}
