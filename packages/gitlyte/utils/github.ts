import type { Context } from "probot";
import type { RepoData } from "../types/repository.js";

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

/** GitHub Pages を指定ディレクトリで有効化（未設定なら） */
export async function ensurePages(ctx: Context, outputDirectory = "docs") {
  try {
    await ctx.octokit.request("GET /repos/{owner}/{repo}/pages", ctx.repo());
  } catch (e: unknown) {
    if ((e as { status?: number }).status !== 404) throw e;
    await ctx.octokit.request("POST /repos/{owner}/{repo}/pages", {
      ...ctx.repo(),
      build_type: "legacy",
      source: { branch: "main", path: `/${outputDirectory}` as "/docs" },
    });
    ctx.log.info(`🚀 Pages enabled (${outputDirectory}/ legacy)`);
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

  // デフォルトブランチを取得
  const defaultBranch = repoInfo.data.default_branch;
  ctx.log.info(`📌 Using default branch: ${defaultBranch}`);

  // 設定ファイルの取得を試行
  const configFile = await getFileContent(
    ctx.octokit,
    ctx.repo().owner,
    ctx.repo().repo,
    ".gitlyte.json",
    defaultBranch
  );

  if (configFile) {
    ctx.log.info(
      `📋 Found .gitlyte.json file: ${configFile.substring(0, 100)}...`
    );
  } else {
    ctx.log.info("📋 No .gitlyte.json file found");
  }
  const packageJson = await getFileContent(
    ctx.octokit,
    ctx.repo().owner,
    ctx.repo().repo,
    "package.json",
    defaultBranch
  );

  return {
    basicInfo: {
      name: repoInfo.data.name,
      description: repoInfo.data.description || "",
      html_url: repoInfo.data.html_url,
      stargazers_count: repoInfo.data.stargazers_count,
      forks_count: repoInfo.data.forks_count,
      topics: repoInfo.data.topics || [],
      language: repoInfo.data.language || "Unknown",
      license: repoInfo.data.license,
      created_at: repoInfo.data.created_at,
      updated_at: repoInfo.data.updated_at,
      default_branch: repoInfo.data.default_branch,
    },
    readme,
    packageJson: packageJson ? JSON.parse(packageJson) : null,
    languages: {}, // TODO: Fetch languages from GitHub API
    issues: issues,
    pullRequests: prs,
    prs: prs,
    configFile: configFile ? JSON.parse(configFile) : null,
    codeStructure: {
      files: [],
      directories: [],
      hasTests: false,
      testFiles: [],
    },
    fileStructure: [],
  };
}

/**
 * ファイルの内容を取得するヘルパー関数
 */
async function getFileContent(
  octokit: Context["octokit"],
  owner: string,
  repo: string,
  path: string,
  ref = "main"
): Promise<string | undefined> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref, // 明示的にブランチを指定
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
