import type { RepoData } from "../types.js";
import type { GitLyteConfig, ConfigLoadResult } from "../types/config.js";

/**
 * GitLyte設定ファイルを読み込み
 * 優先順位: .gitlyte.json > package.json内gitlyteセクション
 */
export async function loadGitLyteConfig(
  repoData: RepoData
): Promise<ConfigLoadResult> {
  // .gitlyte.json の読み込みを試行
  const gitlyteJsonResult = await loadConfigFromGitlyteJson(repoData);
  if (gitlyteJsonResult.found) {
    return gitlyteJsonResult;
  }

  // package.json内の設定を試行
  const packageJsonResult = await loadConfigFromPackageJson(repoData);
  if (packageJsonResult.found) {
    return packageJsonResult;
  }

  // デフォルト設定を返す
  return {
    found: false,
    config: {},
  };
}

/**
 * .gitlyte.json から設定を読み込み
 */
async function loadConfigFromGitlyteJson(
  repoData: RepoData
): Promise<ConfigLoadResult> {
  try {
    // GitHubのcontents APIを使って.gitlyte.jsonを取得することを想定
    // 実際の実装では、repoData内に設定ファイルの内容が含まれていることを期待
    const configContent = repoData.configFile;

    if (!configContent) {
      return { found: false, config: {} };
    }

    const config = JSON.parse(configContent) as GitLyteConfig;

    // 設定の妥当性をチェック
    const validatedConfig = validateConfig(config);

    return {
      found: true,
      config: validatedConfig,
      source: ".gitlyte.json",
    };
  } catch (error) {
    console.warn("Failed to load .gitlyte.json:", error);
    return { found: false, config: {} };
  }
}

/**
 * package.json内のgitlyteセクションから設定を読み込み
 */
async function loadConfigFromPackageJson(
  repoData: RepoData
): Promise<ConfigLoadResult> {
  try {
    const packageJsonContent = repoData.packageJson;

    if (!packageJsonContent) {
      return { found: false, config: {} };
    }

    const packageJson = JSON.parse(packageJsonContent);
    const gitlyteConfig = packageJson.gitlyte as GitLyteConfig | undefined;

    if (!gitlyteConfig) {
      return { found: false, config: {} };
    }

    const validatedConfig = validateConfig(gitlyteConfig);

    return {
      found: true,
      config: validatedConfig,
      source: "package.json",
    };
  } catch (error) {
    console.warn("Failed to load config from package.json:", error);
    return { found: false, config: {} };
  }
}

/**
 * 設定の妥当性をチェックし、安全な設定を返す
 */
function validateConfig(config: GitLyteConfig): GitLyteConfig {
  const validatedConfig: GitLyteConfig = {};

  // ロゴ設定の検証
  if (config.logo?.path && typeof config.logo.path === "string") {
    validatedConfig.logo = {
      path: config.logo.path,
      alt: typeof config.logo.alt === "string" ? config.logo.alt : undefined,
    };
  }

  // favicon設定の検証
  if (config.favicon?.path && typeof config.favicon.path === "string") {
    validatedConfig.favicon = {
      path: config.favicon.path,
    };
  }

  // サイト設定の検証
  if (config.site) {
    validatedConfig.site = {};

    if (config.site.theme) {
      validatedConfig.site.theme = {};

      // カラー設定の検証（基本的な16進数カラーコードチェック）
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;

      if (
        config.site.theme.primary &&
        colorRegex.test(config.site.theme.primary)
      ) {
        validatedConfig.site.theme.primary = config.site.theme.primary;
      }

      if (
        config.site.theme.secondary &&
        colorRegex.test(config.site.theme.secondary)
      ) {
        validatedConfig.site.theme.secondary = config.site.theme.secondary;
      }

      if (
        config.site.theme.accent &&
        colorRegex.test(config.site.theme.accent)
      ) {
        validatedConfig.site.theme.accent = config.site.theme.accent;
      }
    }
  }

  return validatedConfig;
}

/**
 * 設定からロゴURLを解決
 */
export function resolveLogoUrl(
  config: GitLyteConfig,
  repoData: RepoData
): string | undefined {
  if (!config.logo?.path) {
    return undefined;
  }

  const logoPath = config.logo.path;

  // 絶対URLの場合はそのまま返す
  if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
    return logoPath;
  }

  // 相対パスの場合はGitHubの絶対パスに変換
  const cleanPath = logoPath.startsWith("./") ? logoPath.slice(2) : logoPath;
  return `${repoData.repo.html_url}/raw/main/${cleanPath}`;
}

/**
 * 設定からfaviconURLを解決
 */
export function resolveFaviconUrl(
  config: GitLyteConfig,
  repoData: RepoData
): string | undefined {
  if (!config.favicon?.path) {
    return undefined;
  }

  const faviconPath = config.favicon.path;

  // 絶対URLの場合はそのまま返す
  if (faviconPath.startsWith("http://") || faviconPath.startsWith("https://")) {
    return faviconPath;
  }

  // 相対パスの場合はGitHubの絶対パスに変換
  const cleanPath = faviconPath.startsWith("./")
    ? faviconPath.slice(2)
    : faviconPath;
  return `${repoData.repo.html_url}/raw/main/${cleanPath}`;
}
