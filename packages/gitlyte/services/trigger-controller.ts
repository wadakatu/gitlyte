// import type { Context } from "probot"; // 未使用のため削除
import type { GitLyteConfig } from "../types/config.js";
import type { PullRequest } from "../types/repository.js";

/** トリガー制御のための定数 */

export const COMMENT_COMMANDS = {
  GENERATE: "@gitlyte generate",
  PREVIEW: "@gitlyte preview",
  CONFIG: "@gitlyte config",
  HELP: "@gitlyte help",
} as const;

/** トリガータイプ */
export type TriggerType = "auto" | "manual" | "label" | "comment" | "skip";

/** 生成タイプ */
export type GenerationType = "full" | "preview" | "force";

/** トリガー判定結果 */
export interface TriggerResult {
  shouldGenerate: boolean;
  triggerType: TriggerType;
  generationType: GenerationType;
  reason: string;
}

/** コメントコマンド解析結果 */
export interface CommentCommand {
  command: string;
  action: "generate" | "preview" | "config" | "help";
  options?: Record<string, string>;
}

/**
 * サイト生成のトリガー制御を管理するサービス
 */
export class TriggerController {
  /**
   * PRマージ時のトリガー判定
   */
  async shouldGenerateOnPRMerge(
    pr: PullRequest,
    config: GitLyteConfig
  ): Promise<TriggerResult> {
    // 設定ファイルベースの判定（ラベル制限など）
    const configTrigger = this.checkConfigTrigger(pr, config);
    if (configTrigger.shouldGenerate) {
      return configTrigger;
    }

    // PRベースの生成は基本的に無効（Push時生成がデフォルト）
    return {
      shouldGenerate: false,
      triggerType: "manual",
      generationType: "full",
      reason: "PR-based generation disabled (use push or comment triggers)",
    };
  }

  /**
   * コメントコマンドの解析
   */
  parseCommentCommand(commentBody: string): CommentCommand | null {
    const trimmed = commentBody.trim();

    // 各コマンドをチェック
    if (trimmed.startsWith(COMMENT_COMMANDS.GENERATE)) {
      return this.parseCommand(trimmed, COMMENT_COMMANDS.GENERATE, "generate");
    }
    if (trimmed.startsWith(COMMENT_COMMANDS.PREVIEW)) {
      return this.parseCommand(trimmed, COMMENT_COMMANDS.PREVIEW, "preview");
    }
    if (trimmed.startsWith(COMMENT_COMMANDS.CONFIG)) {
      return this.parseCommand(trimmed, COMMENT_COMMANDS.CONFIG, "config");
    }
    if (trimmed.startsWith(COMMENT_COMMANDS.HELP)) {
      return this.parseCommand(trimmed, COMMENT_COMMANDS.HELP, "help");
    }

    return null;
  }

  /**
   * 個別コマンドの解析
   */
  private parseCommand(
    input: string,
    command: string,
    action: "generate" | "preview" | "config" | "help"
  ): CommentCommand {
    const parts = input.split(" ");
    const options: Record<string, string> = {};

    // オプションの解析 (例: --force, --layout=minimal)
    for (let i = 2; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("--")) {
        const [key, value] = part.slice(2).split("=");
        options[key] = value || "true";
      }
    }

    return {
      command,
      action,
      options,
    };
  }

  /**
   * Pushトリガーの判定
   */
  async shouldGenerateOnPush(
    branchName: string,
    defaultBranch: string,
    commits: Array<{ added: string[]; modified: string[]; removed: string[] }>,
    config: GitLyteConfig
  ): Promise<TriggerResult> {
    const generationConfig = config.generation;
    const pushConfig = generationConfig?.push;

    // Push機能が明示的に無効化されている場合のみ無効
    if (pushConfig?.enabled === false) {
      return {
        shouldGenerate: false,
        triggerType: "auto",
        generationType: "full",
        reason: "Push trigger disabled",
      };
    }

    // ブランチチェック
    const targetBranches = pushConfig?.branches || [defaultBranch];
    if (!targetBranches.includes(branchName)) {
      return {
        shouldGenerate: false,
        triggerType: "auto",
        generationType: "full",
        reason: `Branch ${branchName} not in target branches: ${targetBranches.join(", ")}`,
      };
    }

    // 除外パスチェック
    if (pushConfig?.ignorePaths && pushConfig.ignorePaths.length > 0) {
      const changedFiles = commits.flatMap((commit) => [
        ...commit.added,
        ...commit.modified,
        ...commit.removed,
      ]);

      // ファイルが変更されていない場合は生成を続行
      if (changedFiles.length === 0) {
        return {
          shouldGenerate: true,
          triggerType: "auto",
          generationType: "full",
          reason: "Push trigger activated",
        };
      }

      const shouldIgnore = changedFiles.every((file) =>
        pushConfig.ignorePaths!.some((ignorePath) =>
          file.startsWith(ignorePath)
        )
      );

      if (shouldIgnore) {
        return {
          shouldGenerate: false,
          triggerType: "auto",
          generationType: "full",
          reason: `All changes in ignored paths: ${pushConfig.ignorePaths.join(", ")}`,
        };
      }
    }

    return {
      shouldGenerate: true,
      triggerType: "auto",
      generationType: "full",
      reason: "Push trigger activated",
    };
  }

  /**
   * コメントトリガーの判定
   */
  async shouldGenerateOnComment(
    commentBody: string,
    _config: GitLyteConfig
  ): Promise<TriggerResult> {
    const command = this.parseCommentCommand(commentBody);

    if (!command) {
      return {
        shouldGenerate: false,
        triggerType: "comment",
        generationType: "full",
        reason: "No valid command found",
      };
    }

    switch (command.action) {
      case "generate":
        return {
          shouldGenerate: true,
          triggerType: "comment",
          generationType: command.options?.force ? "force" : "full",
          reason: `Comment command: ${command.command}`,
        };

      case "preview":
        return {
          shouldGenerate: true,
          triggerType: "comment",
          generationType: "preview",
          reason: `Preview command: ${command.command}`,
        };

      default:
        return {
          shouldGenerate: false,
          triggerType: "comment",
          generationType: "full",
          reason: "Non-generation command",
        };
    }
  }

  /**
   * 設定ファイルベースの判定（ラベル制限のみ）
   */
  private checkConfigTrigger(
    pr: PullRequest,
    config: GitLyteConfig
  ): TriggerResult {
    const generationConfig = config.generation;
    if (!generationConfig) {
      return {
        shouldGenerate: false,
        triggerType: "auto",
        generationType: "full",
        reason: "No generation config",
      };
    }

    // ラベル制限チェック（明示的に設定されている場合のみ）
    if (generationConfig.labels && generationConfig.labels.length > 0) {
      const prLabels = pr.labels.map((l) => l.name);
      const hasRequiredLabel = generationConfig.labels.some((label) =>
        prLabels.includes(label)
      );

      if (hasRequiredLabel) {
        return {
          shouldGenerate: true,
          triggerType: "auto",
          generationType: "full",
          reason: "Config-based label generation",
        };
      }
    }

    return {
      shouldGenerate: false,
      triggerType: "auto",
      generationType: "full",
      reason: "No trigger conditions met",
    };
  }

  /**
   * ヘルプメッセージの生成
   */
  generateHelpMessage(): string {
    return `
## 🤖 GitLyte コマンド一覧

以下のコメントコマンドでサイト生成を制御できます：

### 📝 基本コマンド
- \`${COMMENT_COMMANDS.GENERATE}\` - サイト生成を実行
- \`${COMMENT_COMMANDS.PREVIEW}\` - プレビュー生成（軽量版）
- \`${COMMENT_COMMANDS.CONFIG}\` - 現在の設定を表示
- \`${COMMENT_COMMANDS.HELP}\` - このヘルプを表示


### ⚙️ オプション
コマンドには以下のオプションが使用できます：
- \`--force\` - 強制再生成
- \`--layout=minimal\` - レイアウト指定

### 例
\`\`\`
${COMMENT_COMMANDS.GENERATE} --force
${COMMENT_COMMANDS.PREVIEW} --layout=hero-focused
\`\`\`
    `.trim();
  }

  /**
   * 設定表示メッセージの生成
   */
  generateConfigMessage(config: GitLyteConfig): string {
    const generation = config.generation || {};

    return `
## ⚙️ 現在の GitLyte 設定

### Push生成設定
- **有効状態**: ${generation.push?.enabled !== false ? "有効" : "無効"}
- **対象ブランチ**: ${generation.push?.branches?.join(", ") || "デフォルトブランチ"}
- **除外パス**: ${generation.push?.ignorePaths?.join(", ") || "なし"}

### PR生成設定
- **必要ラベル**: ${generation.labels?.join(", ") || "なし"}

### サイト設定
- **レイアウト**: ${config.site?.layout || "hero-focused"}
- **テーマ**: ${config.design?.theme || "professional"}

設定を変更するには \`.gitlyte.json\` ファイルを編集してください。
    `.trim();
  }
}
