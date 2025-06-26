import type { Context } from "probot";
import type { RepoData } from "../types.js";
import { batchCommitFiles, type FileChange } from "../utils/batch-commit.js";
import {
  hasConfigChanged,
  loadGitLyteConfig,
  mergeConfigWithDefaults,
} from "../utils/config-loader.js";
import {
  generateConfigFileContent,
  generateConfigTemplate,
} from "../utils/config-template.js";
import {
  analyzeRepository,
  type DesignStrategy,
  generateDesignStrategy,
} from "./ai-analyzer.js";
import {
  type GeneratedSiteContent,
  generateSiteContent,
} from "./ai-content-generator.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sharedPath = join(__dirname, "../../../shared/src");

/**
 * sharedコンポーネントを読み込む
 */
function readSharedComponent(componentPath: string): string {
  try {
    const fullPath = join(sharedPath, componentPath);
    return readFileSync(fullPath, "utf-8");
  } catch (error) {
    console.warn(`Failed to read shared component: ${componentPath}`, error);
    return "";
  }
}

/**
 * 必要なsharedコンポーネントをファイルリストに追加
 */
function addSharedComponents(layout: string): FileChange[] {
  const components: FileChange[] = [];

  // 共通コンポーネント
  const baseLayoutContent = readSharedComponent(
    "components/Layout/BaseLayout.astro"
  );
  if (baseLayoutContent) {
    components.push({
      path: "docs/src/components/Layout/BaseLayout.astro",
      content: baseLayoutContent,
    });
  }

  const designTokensContent = readSharedComponent("styles/design-tokens.ts");
  if (designTokensContent) {
    components.push({
      path: "docs/src/styles/design-tokens.ts",
      content: designTokensContent,
    });
  }

  const baseCssContent = readSharedComponent("styles/base.css");
  if (baseCssContent) {
    components.push({
      path: "docs/src/styles/base.css",
      content: baseCssContent,
    });
  }

  const typesContent = readSharedComponent("types/index.ts");
  if (typesContent) {
    components.push({
      path: "docs/src/types/index.ts",
      content: typesContent,
    });
  }

  // Template コンポーネント（新しいアプローチ）
  if (layout === "hero-focused") {
    const heroFocusedTemplateContent = readSharedComponent(
      "components/Templates/HeroFocusedTemplate.astro"
    );
    if (heroFocusedTemplateContent) {
      components.push({
        path: "docs/src/components/Templates/HeroFocusedTemplate.astro",
        content: heroFocusedTemplateContent,
      });
    }

    const heroFocusedHeaderContent = readSharedComponent(
      "components/Headers/HeroFocusedHeader.astro"
    );
    if (heroFocusedHeaderContent) {
      components.push({
        path: "docs/src/components/Headers/HeroFocusedHeader.astro",
        content: heroFocusedHeaderContent,
      });
    }

    const heroFocusedDocsContent = readSharedComponent(
      "components/Docs/HeroFocusedDocs.astro"
    );
    if (heroFocusedDocsContent) {
      components.push({
        path: "docs/src/components/Docs/HeroFocusedDocs.astro",
        content: heroFocusedDocsContent,
      });
    }
  } else if (layout === "minimal") {
    const minimalTemplateContent = readSharedComponent(
      "components/Templates/MinimalTemplate.astro"
    );
    if (minimalTemplateContent) {
      components.push({
        path: "docs/src/components/Templates/MinimalTemplate.astro",
        content: minimalTemplateContent,
      });
    }

    const minimalHeaderContent = readSharedComponent(
      "components/Headers/MinimalHeader.astro"
    );
    if (minimalHeaderContent) {
      components.push({
        path: "docs/src/components/Headers/MinimalHeader.astro",
        content: minimalHeaderContent,
      });
    }
  }

  return components;
}

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

    // Step 3: AI生成コンテンツ作成（sharedテンプレート使用）
    ctx.log.info(
      `🎯 Generating site content for layout: ${designStrategy.layout}`
    );
    const generatedSite = await generateSiteContent(
      data,
      analysis,
      designStrategy
    );
    ctx.log.info("✨ AI content generation complete");
    ctx.log.info(
      "🎯 Generated: Content data, Index page template, Global Styles"
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
  generatedSite: GeneratedSiteContent,
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

  // Template-based content (no longer need individual components)
  const globalStyles = generatedSite.globalStyles;

  // Template-based approach no longer needs content analysis embedding
  // Content analysis is handled during generation phase

  // Index page is now template-based, no variable replacement needed
  const indexPage = generatedSite.indexPage;

  // GitHub Actions ワークフローコンテンツ
  const workflowContent = generateWorkflowContent();

  // sharedコンポーネントを追加
  const sharedComponents = addSharedComponents(designStrategy.layout);

  // Template-based files generation
  const files: FileChange[] = [
    { path: "docs/package.json", content: packageJson },
    { path: "docs/astro.config.mjs", content: astroConfig },
    { path: "docs/src/pages/index.astro", content: indexPage },
    { path: "docs/src/styles/global.css", content: globalStyles },
    { path: ".github/workflows/deploy-astro.yml", content: workflowContent },
    ...sharedComponents,
  ];

  // Add docs page if generated
  if (generatedSite.docsPage) {
    files.push({
      path: "docs/src/pages/docs.astro",
      content: generatedSite.docsPage,
    });
  }

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
