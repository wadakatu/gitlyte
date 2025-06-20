import type { Context } from "probot";
import type { RepoData } from "../types.js";

/** 404 は null を返し、それ以外は例外を再スロー */
export async function safeGetContent(ctx: Context, path: string) {
  try {
    const res = await ctx.octokit.repos.getContent({ ...ctx.repo(), path });
    return Array.isArray(res.data) ? null : res.data; // フォルダなら無視
  } catch (e: unknown) {
    if ((e as { status?: number }).status === 404) return null;
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
    ...(existing ? { sha: existing.sha } : {}),
  });
}

/** GitHub Pages を docs/ で有効化（未設定なら） */
export async function ensurePages(ctx: Context) {
  try {
    await ctx.octokit.request("GET /repos/{owner}/{repo}/pages", ctx.repo());
  } catch (e: unknown) {
    if ((e as { status?: number }).status !== 404) throw e;
    await ctx.octokit.request("POST /repos/{owner}/{repo}/pages", {
      ...ctx.repo(),
      build_type: "legacy",
      source: { branch: "main", path: "/docs" },
    });
    ctx.log.info("🚀 Pages enabled (docs/ legacy)");
  }
}

/** リポジトリ情報を収集 */
export async function collectRepoData(ctx: Context): Promise<RepoData> {
  // 基本的なリポジトリ情報を取得
  const repoInfo = await ctx.octokit.repos.get(ctx.repo());

  // PRリストを安全に取得
  let prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }> = [];
  try {
    const prResponse = await ctx.octokit.pulls.list({
      ...ctx.repo(),
      state: "closed",
      per_page: 10,
    });
    prs = prResponse.data.filter((pr) => pr.merged_at);
    ctx.log.info(`📊 Found ${prs.length} merged PRs`);
  } catch (e: unknown) {
    ctx.log.warn(`Failed to fetch PRs: ${(e as Error).message}`);
  }

  // Issueリストを安全に取得
  let issues: Array<{
    title: string;
    number: number;
    state: string;
    user: { login: string } | null;
    created_at: string;
  }> = [];
  try {
    const issueResponse = await ctx.octokit.issues.listForRepo({
      ...ctx.repo(),
      state: "all",
      per_page: 10,
    });
    issues = issueResponse.data;
    ctx.log.info(`📊 Found ${issues.length} issues`);
  } catch (e: unknown) {
    ctx.log.warn(`Failed to fetch issues: ${(e as Error).message}`);
  }

  // READMEを安全に取得
  let readme = "";
  try {
    const { data } = await ctx.octokit.repos.getReadme(ctx.repo());
    readme = Buffer.from(data.content, "base64").toString("utf8");
    ctx.log.info("📖 README loaded successfully");
  } catch (e: unknown) {
    ctx.log.warn(`Failed to fetch README: ${(e as Error).message}`);
  }

  // 設定ファイルの取得を試行
  const configFile = await getFileContent(
    ctx.octokit,
    ctx.repo().owner,
    ctx.repo().repo,
    ".gitlyte.json"
  );
  const packageJson = await getFileContent(
    ctx.octokit,
    ctx.repo().owner,
    ctx.repo().repo,
    "package.json"
  );

  return {
    repo: repoInfo.data,
    readme,
    configFile,
    packageJson,
    prs: prs,
    issues: issues,
  };
}

/**
 * ファイルの内容を取得するヘルパー関数
 */
async function getFileContent(
  octokit: Context["octokit"],
  owner: string,
  repo: string,
  path: string
): Promise<string | undefined> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if ("content" in response.data && response.data.content) {
      return Buffer.from(response.data.content, "base64").toString("utf-8");
    }
  } catch (e: unknown) {
    // ファイルが存在しない場合は静かに失敗
    console.debug(`File ${path} not found: ${(e as Error).message}`);
  }

  return undefined;
}
