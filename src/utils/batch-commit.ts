import type { Context } from "probot";

export interface FileChange {
  path: string;
  content: string;
}

/** 複数ファイルを一括で1つのコミットとして作成 */
export async function batchCommitFiles(
  ctx: Context,
  files: FileChange[],
  message: string
) {
  try {
    ctx.log.info(`📦 Starting batch commit with ${files.length} files`);
    ctx.log.info(`📝 Commit message: ${message.substring(0, 100)}...`);

    // 1. 現在のHEADコミットを取得
    const { data: ref } = await ctx.octokit.git.getRef({
      ...ctx.repo(),
      ref: "heads/main",
    });

    const currentCommitSha = ref.object.sha;
    ctx.log.info(`📌 Current commit SHA: ${currentCommitSha}`);

    // 2. 現在のコミットの詳細を取得
    const { data: currentCommit } = await ctx.octokit.git.getCommit({
      ...ctx.repo(),
      commit_sha: currentCommitSha,
    });

    // 3. 新しいTreeを作成（全ファイルを含む）
    const tree = files.map((file) => ({
      path: file.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: file.content,
    }));

    const { data: newTree } = await ctx.octokit.git.createTree({
      ...ctx.repo(),
      tree,
      base_tree: currentCommit.tree.sha,
    });

    // 4. 新しいコミットを作成
    const { data: newCommit } = await ctx.octokit.git.createCommit({
      ...ctx.repo(),
      message,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    // 5. mainブランチを新しいコミットに更新
    await ctx.octokit.git.updateRef({
      ...ctx.repo(),
      ref: "heads/main",
      sha: newCommit.sha,
    });

    ctx.log.info(
      `📦 Batch commit successful: ${files.length} files in one commit`
    );
    ctx.log.info("✅ Batch commit completed successfully");
  } catch (error) {
    ctx.log.error("❌ Batch commit failed:", error);
    // GitHub API エラーの詳細を出力
    if (error && typeof error === "object" && "status" in error) {
      const apiError = error as { status?: number; message?: string };
      ctx.log.error(`🔍 GitHub API Error Status: ${apiError.status}`);
      ctx.log.error(`🔍 GitHub API Error Message: ${apiError.message}`);
    }
    throw error;
  }
}
