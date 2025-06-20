import type { RepoData } from "../types.js";
import {
  loadGitLyteConfig,
  resolveLogoUrl,
  resolveFaviconUrl,
} from "./config-loader.js";

/** ロゴ画像検出結果 */
export interface LogoDetectionResult {
  hasLogo: boolean;
  logoUrl?: string;
  logoPath?: string;
  faviconUrl?: string;
  source: "config" | "auto" | "none";
}

/**
 * リポジトリのロゴを検出
 * 優先順位: 設定ファイル > 自動検出 > README画像
 */
export async function detectRepoLogo(
  repoData: RepoData
): Promise<LogoDetectionResult> {
  // 1. 設定ファイルから読み込み（最優先）
  const configResult = await loadGitLyteConfig(repoData);
  if (configResult.found && configResult.config.logo) {
    const logoUrl = resolveLogoUrl(configResult.config, repoData);
    const faviconUrl =
      resolveFaviconUrl(configResult.config, repoData) || logoUrl;

    if (logoUrl) {
      return {
        hasLogo: true,
        logoUrl,
        logoPath: configResult.config.logo.path,
        faviconUrl,
        source: "config",
      };
    }
  }

  // 2. 自動検出を試行
  const autoDetectResult = await detectRepoLogoAuto(repoData);
  if (autoDetectResult.hasLogo) {
    return {
      ...autoDetectResult,
      source: "auto",
    };
  }

  // 3. README内の画像を試行
  const readmeResult = extractLogoFromReadme(repoData.readme || "", repoData);
  if (readmeResult.hasLogo) {
    return {
      ...readmeResult,
      source: "auto",
    };
  }

  // 4. ロゴが見つからない場合
  return { hasLogo: false, source: "none" };
}

/**
 * 自動検出によるロゴ検出（旧detectRepoLogo）
 * 一般的なロゴファイル名とパスをチェック
 */
async function detectRepoLogoAuto(
  repoData: RepoData
): Promise<LogoDetectionResult> {
  const { repo } = repoData;

  // 一般的なロゴファイル名のパターン
  const logoPatterns = [
    "logo.png",
    "logo.jpg",
    "logo.jpeg",
    "logo.svg",
    "logo.webp",
    "Logo.png",
    "Logo.jpg",
    "Logo.jpeg",
    "Logo.svg",
    "Logo.webp",
    "LOGO.png",
    "LOGO.jpg",
    "LOGO.jpeg",
    "LOGO.svg",
    "LOGO.webp",
    "icon.png",
    "icon.jpg",
    "icon.jpeg",
    "icon.svg",
    "icon.webp",
    "Icon.png",
    "Icon.jpg",
    "Icon.jpeg",
    "Icon.svg",
    "Icon.webp",
    "brand.png",
    "brand.jpg",
    "brand.jpeg",
    "brand.svg",
    "brand.webp",
    "favicon.png",
    "favicon.jpg",
    "favicon.jpeg",
    "favicon.svg",
    "favicon.ico",
  ];

  // 一般的なロゴディレクトリ
  const logoDirectories = [
    "", // ルートディレクトリ
    "assets/",
    "images/",
    "img/",
    "static/",
    "public/",
    "docs/",
    ".github/",
    "src/assets/",
    "src/images/",
    "src/img/",
  ];

  // 最も優先度の高いロゴを検索
  for (const dir of logoDirectories) {
    for (const pattern of logoPatterns) {
      const logoPath = `${dir}${pattern}`;
      const logoUrl = `${repo.html_url}/raw/main/${logoPath}`;

      // GitHub API経由でファイルの存在確認は実際にはHTTPリクエストが必要
      // ここでは一般的なパターンに基づいてURLを生成
      if (await checkLogoExists(logoUrl)) {
        return {
          hasLogo: true,
          logoUrl,
          logoPath,
          faviconUrl: logoUrl,
          source: "auto" as const,
        };
      }
    }
  }

  return { hasLogo: false, source: "none" as const };
}

/**
 * ロゴファイルの存在確認（簡易版）
 * 実際のHTTPリクエストの代わりに、一般的なパターンベースで判定
 */
async function checkLogoExists(_url: string): Promise<boolean> {
  // 実際の実装では fetch() を使ってHEADリクエストで確認するが、
  // 現在はダミー実装として false を返す
  // 将来的には GitHub API や実際のHTTPチェックを実装予定
  return false;
}

/**
 * ファイル名からロゴらしさを判定
 */
export function isLikelyLogo(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  const logoKeywords = ["logo", "icon", "brand", "favicon"];
  const imageExtensions = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"];

  const hasLogoKeyword = logoKeywords.some((keyword) =>
    lowerName.includes(keyword)
  );
  const hasImageExtension = imageExtensions.some((ext) =>
    lowerName.endsWith(ext)
  );

  return hasLogoKeyword && hasImageExtension;
}

/**
 * README.mdからロゴ画像を抽出
 * README内の画像記法からロゴっぽい画像を検出
 */
export function extractLogoFromReadme(
  readme: string,
  repoData: RepoData
): LogoDetectionResult {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null = imageRegex.exec(readme);

  while (match !== null) {
    const altText = match[1].toLowerCase();
    const imagePath = match[2];

    // ALTテキストからロゴっぽいものを判定
    if (
      altText.includes("logo") ||
      altText.includes("icon") ||
      altText.includes("brand")
    ) {
      let logoUrl = imagePath;

      // 相対パスの場合はGitHubの絶対パスに変換
      if (!imagePath.startsWith("http")) {
        logoUrl = `${repoData.repo.html_url}/raw/main/${imagePath}`;
      }

      return {
        hasLogo: true,
        logoUrl,
        logoPath: imagePath,
        faviconUrl: logoUrl,
        source: "auto" as const,
      };
    }

    match = imageRegex.exec(readme);
  }

  return { hasLogo: false, source: "none" as const };
}
