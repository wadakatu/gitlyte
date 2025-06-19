import type { Context } from "probot";
import type { RepoData } from "../types.js";
import { batchCommitFiles, type FileChange } from "../utils/batch-commit.js";
import { analyzeRepository } from "./ai-analyzer.js";
import { designSiteArchitecture } from "./ai-site-architect.js";
import { 
  generateSiteStructure,
  type DynamicAstroSite 
} from "./ai-dynamic-generator.js";

/** AI駆動でAstroサイトを生成 */
export async function generateAIAstroSite(ctx: Context, data: RepoData) {
  try {
    ctx.log.info("🤖 Starting AI-powered site architecture...");

    // Step 1: リポジトリ分析
    const analysis = await analyzeRepository(data);
    ctx.log.info(
      `📊 Analysis complete: ${analysis.projectType} project for ${analysis.audience}`
    );

    // Step 2: サイト全体のアーキテクチャ設計
    const architecture = await designSiteArchitecture(data, analysis);
    ctx.log.info(
      `🏗️ Site architecture: ${architecture.concept.theme} with ${architecture.layout.sections.length} sections`
    );

    // Step 3: 完全カスタムサイト生成
    const dynamicSite = await generateSiteStructure(architecture, data);
    ctx.log.info("⚡ Dynamic AI site generation complete");

    // Step 4: ファイル一括コミット（ワークフロー含む）
    await batchCommitDynamicFiles(ctx, data, dynamicSite);

    ctx.log.info("🚀 AI-architected Astro site deployed successfully");
  } catch (error) {
    ctx.log.error("Failed to generate AI Astro site:", error);
    throw error;
  }
}

/** 動的AI生成されたファイルを一括コミット */
async function batchCommitDynamicFiles(
  ctx: Context,
  data: RepoData,
  dynamicSite: DynamicAstroSite
) {
  const repoInfo = ctx.repo();

  // 変数置換
  const packageJson = dynamicSite.packageJson
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  const astroConfig = dynamicSite.astroConfig
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  // GitHub Actions ワークフローコンテンツ
  const workflowContent = generateWorkflowContent();

  // データを置換
  const indexPageWithData = dynamicSite.indexPage.replace(
    "{{REPO_DATA}}",
    JSON.stringify(data, null, 2)
  );

  // 基本ファイル配列
  const files: FileChange[] = [
    { path: "docs/package.json", content: packageJson },
    { path: "docs/astro.config.mjs", content: astroConfig },
    { path: "docs/src/layouts/Layout.astro", content: dynamicSite.layout },
    { path: "docs/src/pages/index.astro", content: indexPageWithData },
    { path: "docs/src/styles/global.css", content: dynamicSite.globalStyles },
    { path: ".github/workflows/deploy-astro.yml", content: workflowContent },
  ];

  // 動的生成されたコンポーネントを追加
  for (const [filename, content] of Object.entries(dynamicSite.components)) {
    files.push({
      path: `docs/src/components/${filename}`,
      content: content
    });
  }

  // 追加ファイルがあれば追加
  if (dynamicSite.additionalFiles) {
    for (const [filename, content] of Object.entries(dynamicSite.additionalFiles)) {
      files.push({
        path: `docs/${filename}`,
        content: content
      });
    }
  }

  // 一括コミット実行
  await batchCommitFiles(
    ctx,
    files,
    `🎨 Generate fully AI-architected Astro site

- Create unique site architecture with AI-designed layout
- Generate ${Object.keys(dynamicSite.components).length} custom components
- Apply revolutionary design patterns and visual systems
- Build responsive experiences optimized for project characteristics

🚀 Powered by complete AI creativity - no templates used!`
  );
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
  cancel-in-progress: false

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
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;
}
