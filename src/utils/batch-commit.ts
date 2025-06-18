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
    // 1. 現在のHEADコミットを取得
    const { data: ref } = await ctx.octokit.git.getRef({
      ...ctx.repo(),
      ref: "heads/main",
    });

    const currentCommitSha = ref.object.sha;

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
  } catch (error) {
    ctx.log.error("Batch commit failed:", error);
    throw error;
  }
}
