import { Context } from "probot";
import { PullRequest } from "../types.js";
import { collectRepoData, ensurePages } from "../utils/github.js";
import { generateAIAstroSite } from "../services/astro-generator.js";

/** Feature PR ハンドラ */
export async function handleFeaturePR(ctx: Context, pr: PullRequest) {
    const repoData = await collectRepoData(ctx);
    
    await ensurePages(ctx);
    await generateAIAstroSite(ctx, repoData);
    
    ctx.log.info(`✅ AI-generated Astro site created for PR: ${pr.title}`);
}