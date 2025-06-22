/** GitLyte設定ファイルの型定義 */
export interface GitLyteConfig {
  /** ロゴ設定 */
  logo?: {
    /** ロゴ画像のパス（相対パスまたは絶対URL） */
    path: string;
    /** ロゴのalt属性 */
    alt?: string;
  };
  /** favicon設定 */
  favicon?: {
    /** faviconのパス（相対パスまたは絶対URL） */
    path: string;
  };
  /** サイト設定 */
  site?: {
    /** レイアウト設定 */
    layout?: "minimal" | "grid" | "sidebar" | "hero-focused" | "content-heavy";
    /** テーマ設定 */
    theme?: {
      /** プライマリカラー */
      primary?: string;
      /** セカンダリカラー */
      secondary?: string;
      /** アクセントカラー */
      accent?: string;
    };
  };
}

/** 設定ファイル読み込み結果 */
export interface ConfigLoadResult {
  /** 設定が見つかったかどうか */
  found: boolean;
  /** 設定内容（見つからない場合はデフォルト値） */
  config: GitLyteConfig;
  /** 設定ファイルのパス */
  source?: string;
}
