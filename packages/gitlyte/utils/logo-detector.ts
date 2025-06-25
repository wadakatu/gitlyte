import type { RepoData } from "../types.js";
import {
  loadGitLyteConfig,
  resolveFaviconUrl,
  resolveLogoUrl,
} from "./config-loader.js";

/** ロゴ画像検出結果 */
export interface LogoDetectionResult {
  hasLogo: boolean;
  logoUrl?: string;
  logoPath?: string;
  faviconUrl?: string;
  source: "config" | "none";
}

/**
 * リポジトリのロゴを検出
 * 設定ファイル（.gitlyte.json または package.json）からのみ読み込み
 */
export async function detectRepoLogo(
  repoData: RepoData
): Promise<LogoDetectionResult> {
  // 設定ファイルから読み込み
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

  // 設定ファイルがない場合はロゴなし
  return { hasLogo: false, source: "none" };
}
