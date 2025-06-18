import { Context } from "probot";
import { RepoData } from "../types.js";

/** 404 は null を返し、それ以外は例外を再スロー */
export async function safeGetContent(ctx: Context, path: string) {
    try {
        const res = await ctx.octokit.repos.getContent({ ...ctx.repo(), path });
        return Array.isArray(res.data) ? null : res.data; // フォルダなら無視
    } catch (e: any) {
        if (e.status === 404) return null;
        throw e;
    }
}

/** base64 エンコード付きでファイルを作成／更新 */
export async function commitFile(
    ctx: Context,
    path: string,
    message: string,
    content: string
) {
    const existing = await safeGetContent(ctx, path);
    await ctx.octokit.repos.createOrUpdateFileContents({
        ...ctx.repo(),
        path,
        message,
        content: Buffer.from(content).toString("base64"),
        ...(existing ? { sha: existing.sha } : {})
    });
}

/** GitHub Pages を docs/ で有効化（未設定なら） */
export async function ensurePages(ctx: Context) {
    try {
        await ctx.octokit.request("GET /repos/{owner}/{repo}/pages", ctx.repo());
    } catch (e: any) {
        if (e.status !== 404) throw e;
        await ctx.octokit.request("POST /repos/{owner}/{repo}/pages", {
            ...ctx.repo(),
            build_type: "legacy",
            source: { branch: "main", path: "/docs" }
        });
        ctx.log.info("🚀 Pages enabled (docs/ legacy)");
    }
}

/** リポジトリ情報を収集 */
export async function collectRepoData(ctx: Context): Promise<RepoData> {
    // 基本的なリポジトリ情報を取得
    const repoInfo = await ctx.octokit.repos.get(ctx.repo());
    
    // PRリストを安全に取得
    let prs: any[] = [];
    try {
        const prResponse = await ctx.octokit.pulls.list({ 
            ...ctx.repo(), 
            state: 'closed', 
            per_page: 10 
        });
        prs = prResponse.data.filter(pr => pr.merged_at);
        ctx.log.info(`📊 Found ${prs.length} merged PRs`);
    } catch (e: any) {
        ctx.log.warn(`Failed to fetch PRs: ${e.message}`);
    }

    // Issueリストを安全に取得
    let issues: any[] = [];
    try {
        const issueResponse = await ctx.octokit.issues.listForRepo({ 
            ...ctx.repo(), 
            state: 'all', 
            per_page: 10 
        });
        issues = issueResponse.data;
        ctx.log.info(`📊 Found ${issues.length} issues`);
    } catch (e: any) {
        ctx.log.warn(`Failed to fetch issues: ${e.message}`);
    }

    // READMEを安全に取得
    let readme = "";
    try {
        const { data } = await ctx.octokit.repos.getReadme(ctx.repo());
        readme = Buffer.from(data.content, "base64").toString("utf8");
        ctx.log.info("📖 README loaded successfully");
    } catch (e: any) {
        ctx.log.warn(`Failed to fetch README: ${e.message}`);
    }

    return {
        repo: repoInfo.data,
        readme,
        prs: prs,
        issues: issues
    };
}