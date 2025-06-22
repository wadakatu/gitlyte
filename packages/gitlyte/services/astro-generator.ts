import type { Context } from "probot";
import type { RepoData } from "../types.js";
import { batchCommitFiles, type FileChange } from "../utils/batch-commit.js";
import {
  analyzeRepository,
  type DesignStrategy,
  generateDesignStrategy,
} from "./ai-analyzer.js";
import {
  type GeneratedAstroSite,
  generateAstroSite,
} from "./ai-code-generator.js";
import {
  generateConfigTemplate,
  generateConfigFileContent,
} from "../utils/config-template.js";
import {
  loadGitLyteConfig,
  mergeConfigWithDefaults,
  hasConfigChanged,
} from "../utils/config-loader.js";

/** AI駆動でAstroサイトを生成 */
export async function generateAIAstroSite(ctx: Context, data: RepoData) {
  try {
    ctx.log.info("🤖 Starting enhanced AI-powered site generation...");

    // Step 0: 設定ファイル読み込み
    const configResult = await loadGitLyteConfig(data);
    if (configResult.found) {
      ctx.log.info(`⚙️ Configuration loaded from ${configResult.source}`);
      ctx.log.info(
        `📋 Full config: ${JSON.stringify(configResult.config, null, 2)}`
      );
      if (configResult.config.site?.layout) {
        ctx.log.info(`🎯 Layout override: ${configResult.config.site.layout}`);
      }
    } else {
      ctx.log.info(
        "📋 No configuration file found, using AI-generated settings"
      );
      ctx.log.info(
        `🔍 Checked files: .gitlyte.json (${data.configFile ? "found" : "not found"}), package.json (${data.packageJson ? "found" : "not found"})`
      );
    }

    // Step 1: リポジトリ分析（設定値を考慮）
    const analysis = await analyzeRepository(data, configResult.config);
    ctx.log.info(
      `📊 Analysis complete: ${analysis.projectType} project for ${analysis.audience}`
    );
    if (analysis.layout) {
      ctx.log.info(`📐 Layout determined: ${analysis.layout}`);
    }

    // Step 2: AIデザイン戦略生成（設定値を考慮）
    const designStrategy = await generateDesignStrategy(
      analysis,
      configResult.config
    );
    ctx.log.info(
      `🎨 Design strategy generated: ${designStrategy.style} style with ${designStrategy.colorScheme.primary} primary color`
    );
    ctx.log.info(`📐 Final layout: ${designStrategy.layout}`);

    // Step 3: 高品質AI生成Astroサイト作成
    ctx.log.info(
      `🎯 Passing design strategy to generateAstroSite with layout: ${designStrategy.layout}`
    );
    const generatedSite = await generateAstroSite(
      data,
      analysis,
      designStrategy
    );
    ctx.log.info("✨ Enhanced AI site generation complete");
    ctx.log.info(
      "🎯 Generated components: Layout, Hero, Features, Index, Global Styles"
    );

    // Step 4: ファイル一括コミット（ワークフロー含む）
    await batchCommitGeneratedFiles(
      ctx,
      data,
      generatedSite,
      designStrategy,
      analysis
    );

    ctx.log.info("🚀 Enhanced AI-generated Astro site deployed successfully");
  } catch (error) {
    ctx.log.error("Failed to generate AI Astro site:", error);
    throw error;
  }
}

/** AI生成されたファイルを一括コミット */
async function batchCommitGeneratedFiles(
  ctx: Context,
  data: RepoData,
  generatedSite: GeneratedAstroSite,
  designStrategy: DesignStrategy,
  analysis: import("./ai-analyzer.js").RepoAnalysis
) {
  const repoInfo = ctx.repo();

  // 変数置換
  const packageJson = generatedSite.packageJson
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  const astroConfig = generatedSite.astroConfig
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  // リポジトリデータを実際の値に置換
  const layoutContent = generatedSite.layout;
  const heroComponent = generatedSite.heroComponent;
  const featuresComponent = generatedSite.featuresComponent;
  const globalStyles = generatedSite.globalStyles;

  // インデックスページにリポジトリデータとコンテンツ分析を埋め込み
  // まずコンテンツ分析を実行（設定を考慮した分析を再利用）
  const { analyzeRepositoryContent } = await import("./content-analyzer.js");
  const contentAnalysis = await analyzeRepositoryContent(data, analysis);

  // JSON データを安全にエスケープして文字列リテラルに埋め込み
  function safeJSONStringify(obj: unknown): string {
    const jsonString = JSON.stringify(obj);
    return (
      jsonString
        // バックスラッシュを最初にエスケープ（他のエスケープ処理の前に行う）
        .replace(/\\/g, "\\\\")
        // 改行文字をエスケープ
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")
        // 引用符をエスケープ
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        // その他の制御文字をエスケープ
        // biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字のエスケープに必要
        .replace(/[\x00-\x1F\x7F]/g, (match) => {
          return `\\u${(`0000${match.charCodeAt(0).toString(16)}`).slice(-4)}`;
        })
    );
  }

  const safeRepoData = safeJSONStringify(data);
  const safeContentAnalysis = safeJSONStringify(contentAnalysis);

  const indexPage = generatedSite.indexPage
    .replace(/{{REPO_DATA}}/g, safeRepoData)
    .replace(/{{CONTENT_ANALYSIS}}/g, safeContentAnalysis);

  // GitHub Actions ワークフローコンテンツ
  const workflowContent = generateWorkflowContent();

  // .gitlyte.json 雛形生成（存在しない場合のみ）
  const files: FileChange[] = [
    { path: "docs/package.json", content: packageJson },
    { path: "docs/astro.config.mjs", content: astroConfig },
    { path: "docs/src/layouts/Layout.astro", content: layoutContent },
    { path: "docs/src/components/Hero.astro", content: heroComponent },
    { path: "docs/src/components/Features.astro", content: featuresComponent },
    { path: "docs/src/pages/index.astro", content: indexPage },
    { path: "docs/public/styles/global.css", content: globalStyles },
    { path: ".github/workflows/deploy-astro.yml", content: workflowContent },
  ];

  // .gitlyte.json の処理（新規生成 or 既存更新）
  const configResult = await loadGitLyteConfig(data);
  ctx.log.info(
    `🔍 Config load result: found=${configResult.found}, source=${configResult.source}`
  );
  if (configResult.found) {
    ctx.log.info(
      `📄 Existing config: ${JSON.stringify(configResult.config, null, 2)}`
    );
  }

  if (!configResult.found) {
    // 新規生成
    ctx.log.info("📝 Generating .gitlyte.json template...");
    const configTemplate = generateConfigTemplate(
      data,
      analysis,
      designStrategy
    );
    const configContent = generateConfigFileContent(configTemplate);
    files.push({
      path: ".gitlyte.json",
      content: configContent,
    });
    ctx.log.info(
      "✨ .gitlyte.json template generated with project-specific settings"
    );
  } else {
    // 既存設定の更新チェック
    ctx.log.info("📋 .gitlyte.json exists, checking for updates...");
    const defaultTemplate = generateConfigTemplate(
      data,
      analysis,
      designStrategy
    );
    const mergedConfig = mergeConfigWithDefaults(
      configResult.config,
      defaultTemplate
    );

    ctx.log.info(
      `🎯 Default template: ${JSON.stringify(defaultTemplate, null, 2)}`
    );
    ctx.log.info(`🔄 Merged config: ${JSON.stringify(mergedConfig, null, 2)}`);
    ctx.log.info(
      `🔍 Config changed: ${hasConfigChanged(configResult.config, mergedConfig)}`
    );

    if (hasConfigChanged(configResult.config, mergedConfig)) {
      ctx.log.info(
        "🔄 Updating .gitlyte.json with new configuration options..."
      );
      const updatedContent = generateConfigFileContent(mergedConfig);
      files.push({
        path: ".gitlyte.json",
        content: updatedContent,
      });
      ctx.log.info(
        "✨ .gitlyte.json updated with new settings (layout, missing theme colors, etc.)"
      );
    } else {
      ctx.log.info("✅ .gitlyte.json is up to date");
    }
  }

  // Docsページがある場合は追加
  if (generatedSite.docsPage) {
    ctx.log.info("📖 Adding docs page to generated files");
    files.push({
      path: "docs/src/pages/docs.astro",
      content: generatedSite.docsPage,
    });
  } else {
    ctx.log.info("📖 No docs page generated - README might be missing");
  }

  // コミットメッセージを動的に生成
  const hasConfigTemplate = !configResult.found;
  let hasConfigUpdate = false;
  let mergedConfig = configResult.config;

  if (configResult.found) {
    const defaultTemplate = generateConfigTemplate(
      data,
      analysis,
      designStrategy
    );
    mergedConfig = mergeConfigWithDefaults(
      configResult.config,
      defaultTemplate
    );
    hasConfigUpdate = hasConfigChanged(configResult.config, mergedConfig);
  }

  let configMessage = "";
  if (hasConfigTemplate) {
    configMessage =
      "\n- Generated .gitlyte.json template with project-specific settings";
  } else if (hasConfigUpdate) {
    configMessage =
      "\n- Updated .gitlyte.json with new configuration options (layout, theme)";
  }

  const commitMessage = `✨ Generate enhanced AI-powered Astro site${hasConfigTemplate ? " with configuration template" : hasConfigUpdate ? " and updated configuration" : ""}

🎨 Design Features:
- Advanced Hero with gradient text, CTA buttons & animated stats
- Modern Features showcasing project value & benefits
- Professional typography system with ${designStrategy.typography.heading}
- ${designStrategy.style} style with ${designStrategy.colorScheme.primary} primary color
- Responsive design with glassmorphism & hover effects${configMessage}

📊 Project: ${data.repo.name} (⭐${data.repo.stargazers_count} stars, 🍴${data.repo.forks_count} forks)
🤖 Powered by next-generation AI creativity!`;

  // 一括コミット実行
  await batchCommitFiles(ctx, files, commitMessage);
}

/** ワークフローコンテンツを生成 */
function generateWorkflowContent(): string {
  return `name: Deploy Astro to GitHub Pages

on:
  push:
    branches: [ main ]
    paths: ['docs/**']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd docs
          npm install
          
      - name: Build Astro
        run: |
          cd docs
          npm run build
          
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './docs/dist'

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Wait for any previous deployments
        run: |
          echo "Waiting 30 seconds to avoid deployment conflicts..."
          sleep 30
          
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
        with:
          timeout: 300000
        continue-on-error: false`;
}
