/** GitLyte設定ファイルの型定義 */
export interface GitLyteConfig {
  version?: string;
  site?: SiteConfig;
  design?: DesignConfig;
  content?: ContentConfig;
  pages?: PagesConfig;
  integrations?: IntegrationsConfig;
  seo?: SEOConfig;
  generation?: GenerationConfig;

  // Legacy support for backward compatibility
  /** @deprecated Use site.logo instead */
  logo?: {
    path: string;
    alt?: string;
  };
  /** @deprecated Use site.favicon instead */
  favicon?: {
    path: string;
  };
}

export interface SiteConfig {
  title?: string;
  description?: string;
  logo?: string;
  favicon?: string;
  url?: string;
  /** レイアウト設定 */
  layout?: "minimal" | "grid" | "sidebar" | "hero-focused" | "content-heavy";
  /** @deprecated Use design.colors instead */
  theme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
}

export interface DesignConfig {
  theme?: "professional" | "creative" | "minimal" | "custom";
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  typography?: {
    headings?: string;
    body?: string;
  };
  layout?: "hero-focused" | "documentation" | "product-showcase" | "minimal";
}

export interface ContentConfig {
  hero?: {
    title?: string;
    subtitle?: string;
    description?: string;
    cta?: {
      primary?: { text: string; url: string };
      secondary?: { text: string; url: string };
    };
  };
  features?: Array<{
    title: string;
    description: string;
    icon?: string;
    highlight?: string;
  }>;
  sections?: string[];
  footer?: {
    links?: Array<{ text: string; url: string }>;
    copyright?: string;
  };
}

export interface PagesConfig {
  generate?: ("index" | "docs" | "api" | "examples" | "changelog")[];
  docs?: {
    source?: string;
    toc?: boolean;
    search?: boolean;
  };
  api?: {
    enabled?: boolean;
    source?: "auto" | "custom";
    customPath?: string;
  };
}

export interface IntegrationsConfig {
  analytics?: {
    google?: string;
    plausible?: string;
  };
  social?: {
    twitter?: string;
    linkedin?: string;
  };
  demo?: string;
}

export interface SEOConfig {
  keywords?: string[];
  author?: string;
  ogImage?: string;
}

export interface GenerationConfig {
  /** 生成対象ブランチ（空の場合は全ブランチ） */
  branches?: string[];
  /** 生成に必要なラベル（空の場合は制限なし） */
  labels?: string[];
  /** プレビュー生成の設定 */
  preview?: {
    enabled?: boolean;
    path?: string;
  };
  /** Push時の自動生成設定（デフォルト有効） */
  push?: {
    /** Push時の自動生成を有効にするか（デフォルト: true） */
    enabled?: boolean;
    /** 対象ブランチ（空の場合はdefaultブランチのみ） */
    branches?: string[];
    /** 除外するパス（これらが変更された場合は生成しない） */
    ignorePaths?: string[];
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: Suggestion[];
}

export interface Suggestion {
  type: "accessibility" | "content" | "design" | "seo";
  message: string;
  suggestion: string;
  priority: "low" | "medium" | "high";
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
