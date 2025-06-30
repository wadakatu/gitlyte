import type { RepositoryAnalysis } from "../types/repository.js";
import type { DesignSystem } from "../types/generated-site.js";
import type { GitLyteConfig } from "../types/config.js";
import type { RepoData } from "../types/repository.js";

/**
 * .gitlyte.json の雛形を生成
 * AI分析結果とデザイン戦略に基づいて動的に設定値を提案
 */
export function generateConfigTemplate(
  repoData: RepoData,
  analysis: RepositoryAnalysis,
  designStrategy: DesignSystem & { layout?: string }
): GitLyteConfig {
  const { basicInfo: repo } = repoData;

  // プロジェクトタイプに基づくロゴパスの推奨
  const recommendedLogoPaths = getRecommendedLogoPaths(
    analysis.projectCharacteristics.type
  );

  // 推奨ロゴ形式を取得
  const logoFormat = getRecommendedLogoFormat(analysis.technicalStack.frontend);

  // ロゴパスのファイル拡張子を調整
  const adjustedLogoPath = recommendedLogoPaths.logo.replace(
    /\.(svg|png|jpg)$/,
    `.${logoFormat}`
  );

  // 対象ユーザーとトーンに基づいて色を調整
  const adjustedColors = adjustColorsForAudience(
    {
      primary: designStrategy.colors.primary,
      secondary: designStrategy.colors.secondary,
      accent: designStrategy.colors.accent,
    },
    analysis.projectCharacteristics.audience,
    "professional" // default tone
  );

  // デザイン戦略からレイアウトを取得、なければデフォルト
  const layout =
    (designStrategy.layout as
      | "minimal"
      | "grid"
      | "sidebar"
      | "hero-focused"
      | "content-heavy") || "hero-focused";

  return {
    logo: {
      path: adjustedLogoPath,
      alt: `${repo.name} Logo`,
    },
    favicon: {
      path: recommendedLogoPaths.favicon,
    },
    site: {
      layout,
      theme: {
        primary: adjustedColors.primary,
        secondary: adjustedColors.secondary,
        accent: adjustedColors.accent,
      },
    },
  };
}

/**
 * プロジェクトタイプと技術スタックに基づく推奨ロゴパス
 */
function getRecommendedLogoPaths(projectType: string): {
  logo: string;
  favicon: string;
} {
  const pathConfig = {
    library: {
      logo: "./assets/logo.svg",
      favicon: "./assets/favicon.ico",
    },
    application: {
      logo: "./public/logo.svg",
      favicon: "./public/favicon.ico",
    },
    tool: {
      logo: "./docs/logo.svg",
      favicon: "./docs/favicon.ico",
    },
    website: {
      logo: "./static/logo.svg",
      favicon: "./static/favicon.ico",
    },
    documentation: {
      logo: "./docs/images/logo.svg",
      favicon: "./docs/images/favicon.ico",
    },
    game: {
      logo: "./assets/logo.png",
      favicon: "./assets/favicon.ico",
    },
    default: {
      logo: "./assets/logo.svg",
      favicon: "./assets/favicon.ico",
    },
  };

  return (
    pathConfig[projectType as keyof typeof pathConfig] || pathConfig.default
  );
}

/**
 * 技術スタックに基づくロゴファイル形式の推奨
 */
export function getRecommendedLogoFormat(techStack: string[]): string {
  // React/Vue/Angular などの場合は SVG を推奨
  if (
    techStack.some((tech) =>
      ["React", "Vue", "Angular", "Svelte"].includes(tech)
    )
  ) {
    return "svg";
  }

  // ゲーム関連の場合は PNG を推奨
  if (
    techStack.some((tech) =>
      ["Unity", "Unreal", "Godot", "Game"].includes(tech)
    )
  ) {
    return "png";
  }

  // デフォルトは SVG
  return "svg";
}

/**
 * 対象ユーザーとトーンに基づく色調整
 */
export function adjustColorsForAudience(
  colors: { primary: string; secondary: string; accent: string },
  audience: string,
  tone: string
): { primary: string; secondary: string; accent: string } {
  // エンタープライズ向けの場合はより保守的な色に調整
  if (audience === "enterprise" && tone === "professional") {
    return {
      primary: adjustBrightnessForProfessional(colors.primary),
      secondary: adjustBrightnessForProfessional(colors.secondary),
      accent: adjustBrightnessForProfessional(colors.accent),
    };
  }

  // 研究者向けの場合は信頼性を重視
  if (audience === "researchers") {
    return {
      primary: adjustForAcademic(colors.primary),
      secondary: adjustForAcademic(colors.secondary),
      accent: adjustForAcademic(colors.accent),
    };
  }

  // ビジネス向けの場合もプロフェッショナル調整を適用
  if (audience === "business") {
    return {
      primary: adjustBrightnessForProfessional(colors.primary),
      secondary: adjustBrightnessForProfessional(colors.secondary),
      accent: adjustBrightnessForProfessional(colors.accent),
    };
  }

  // アカデミック向けの場合も信頼性重視
  if (audience === "academic") {
    return {
      primary: adjustForAcademic(colors.primary),
      secondary: adjustForAcademic(colors.secondary),
      accent: adjustForAcademic(colors.accent),
    };
  }

  return colors;
}

/**
 * プロフェッショナル向けに色を調整（彩度を下げる）
 */
function adjustBrightnessForProfessional(color: string): string {
  // 簡易実装：より保守的な色に変換
  const professionalColors: Record<string, string> = {
    "#667eea": "#4f46e5", // より深い青
    "#764ba2": "#6366f1", // より深い紫
    "#f093fb": "#8b5cf6", // より落ち着いた紫
    "#dc2626": "#b91c1c", // より深い赤
    "#059669": "#047857", // より深い緑
  };

  return professionalColors[color] || color;
}

/**
 * アカデミック向けに色を調整（信頼性重視）
 */
function adjustForAcademic(color: string): string {
  // アカデミック環境でよく使われる色に調整
  const academicColors: Record<string, string> = {
    "#667eea": "#1e40af", // 深い青（信頼性）
    "#764ba2": "#3730a3", // 深い紫（知性）
    "#f093fb": "#7c3aed", // 落ち着いた紫
    "#dc2626": "#991b1b", // 深い赤
    "#059669": "#065f46", // 深い緑
  };

  return academicColors[color] || color;
}

/**
 * 設定ファイルをJSON文字列として生成（コメント付き）
 */
export function generateConfigFileContent(config: GitLyteConfig): string {
  // JSONコメントが使えないため、わかりやすい形式で生成
  const jsonContent = JSON.stringify(config, null, 2);

  // ヘッダーコメントを追加する場合は別ファイルとして作成
  return jsonContent;
}

/**
 * 設定ファイルの説明用READMEセクションを生成
 */
export function generateConfigDocumentation(
  config: GitLyteConfig,
  _repoName: string
): string {
  return `
## 🎨 GitLyte Configuration

このリポジトリには GitLyte の設定ファイル \`.gitlyte.json\` が自動生成されました。
サイトのロゴやテーマカラーをカスタマイズできます。

### 設定例

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

### 設定項目

- **logo.path**: ロゴ画像のパス（相対パスまたは絶対URL）
- **logo.alt**: ロゴの代替テキスト
- **favicon.path**: ファビコンのパス
- **site.layout**: サイトレイアウト（"minimal", "grid", "sidebar", "hero-focused", "content-heavy"）
- **site.theme**: サイトのテーマカラー
  - **primary**: プライマリカラー（メインの色）
  - **secondary**: セカンダリカラー（補助の色）
  - **accent**: アクセントカラー（強調の色）

### ロゴファイルの配置

推奨される場所に以下のファイルを配置してください：
- **ロゴ**: \`${config.logo?.path}\`
- **ファビコン**: \`${config.favicon?.path}\`

設定を変更後、新しいPRをマージすると更新されたデザインでサイトが再生成されます。
`;
}
