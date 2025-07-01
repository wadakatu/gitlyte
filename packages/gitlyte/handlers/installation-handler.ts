import type { Context } from "probot";

/** Installation event payload type */
type InstallationPayload = {
  installation: { id: number };
  repositories?: Array<{
    name: string;
    full_name: string;
    owner: { login: string };
  }>;
  repositories_added?: Array<{
    name: string;
    full_name: string;
    owner: { login: string };
  }>;
  repositories_removed?: Array<{
    name: string;
    full_name: string;
    owner: { login: string };
  }>;
};

/** GitLyteラベルの定義 */
const GITLYTE_LABELS = [
  {
    name: "gitlyte",
    color: "667eea", // Purple
    description: "Generate full GitLyte site on PR merge",
  },
  {
    name: "gitlyte:preview",
    color: "f093fb", // Pink
    description: "Generate preview GitLyte site on PR merge",
  },
];

/**
 * アプリインストール時のハンドラ
 * GitLyteラベルを自動作成する
 */
export async function handleInstallation(
  ctx: Context<"installation" | "installation_repositories">
) {
  try {
    const payload = ctx.payload as InstallationPayload;
    const installation = payload.installation;
    const repositories = payload.repositories || payload.repositories_added;
    ctx.log.info(
      `🎉 GitLyte installed for ${repositories?.length || 0} repositories`
    );

    // インストール対象のリポジトリリストを取得
    const targetRepos =
      repositories ||
      (
        await ctx.octokit.apps.listReposAccessibleToInstallation({
          installation_id: installation.id,
        })
      ).data.repositories;

    // 各リポジトリにラベルを作成
    for (const repo of targetRepos) {
      ctx.log.info(`📝 Creating labels for ${repo.full_name}`);

      for (const label of GITLYTE_LABELS) {
        try {
          // ラベルが既に存在するかチェック
          try {
            await ctx.octokit.issues.getLabel({
              owner: repo.owner.login,
              repo: repo.name,
              name: label.name,
            });
            ctx.log.info(`✅ Label "${label.name}" already exists`);
          } catch (_error) {
            // ラベルが存在しない場合は作成
            await ctx.octokit.issues.createLabel({
              owner: repo.owner.login,
              repo: repo.name,
              name: label.name,
              color: label.color,
              description: label.description,
            });
            ctx.log.info(`✨ Created label "${label.name}"`);
          }
        } catch (error) {
          ctx.log.error(
            `❌ Failed to create label "${label.name}" for ${repo.full_name}`,
            error
          );
        }
      }
    }

    ctx.log.info("✅ Installation completed successfully");
  } catch (error) {
    ctx.log.error("❌ Failed to handle installation", error);
  }
}

/**
 * アプリアンインストール時のハンドラ
 * GitLyteラベルを自動削除する
 */
export async function handleUninstallation(
  ctx: Context<"installation" | "installation_repositories">
) {
  try {
    const payload = ctx.payload as InstallationPayload;
    const repositories = payload.repositories || payload.repositories_removed;
    ctx.log.info(
      `👋 GitLyte uninstalled from ${repositories?.length || 0} repositories`
    );

    // アンインストール対象のリポジトリでラベルを削除
    if (repositories) {
      for (const repo of repositories) {
        ctx.log.info(`🗑️ Removing labels from ${repo.full_name}`);

        for (const label of GITLYTE_LABELS) {
          try {
            await ctx.octokit.issues.deleteLabel({
              owner: repo.owner.login,
              repo: repo.name,
              name: label.name,
            });
            ctx.log.info(`🗑️ Deleted label "${label.name}"`);
          } catch (error) {
            const err = error as { status?: number };
            if (err.status === 404) {
              ctx.log.info(`⏭️ Label "${label.name}" not found, skipping`);
            } else {
              ctx.log.error(
                `❌ Failed to delete label "${label.name}" from ${repo.full_name}`,
                error
              );
            }
          }
        }
      }
    }

    ctx.log.info("✅ Uninstallation cleanup completed");
  } catch (error) {
    ctx.log.error("❌ Failed to handle uninstallation", error);
  }
}
