import type { Context } from "probot";
import type { RepoData } from "../types.js";
import { batchCommitFiles, type FileChange } from "../utils/batch-commit.js";
import { analyzeRepository } from "./ai-analyzer.js";
import {
  generateHybridAstroSite,
  type HybridAstroSite,
} from "./hybrid-generator.js";

/** AI駆動でAstroサイトを生成 */
export async function generateAIAstroSite(ctx: Context, data: RepoData) {
  try {
    ctx.log.info("🤖 Starting AI-powered site architecture...");

    // Step 1: リポジトリ分析
    const analysis = await analyzeRepository(data);
    ctx.log.info(
      `📊 Analysis complete: ${analysis.projectType} project for ${analysis.audience}`
    );

    // Step 2: ハイブリッドサイト生成（テンプレート + AI カスタマイズ）
    const hybridSite = await generateHybridAstroSite(data, analysis);
    ctx.log.info("🎨 Hybrid AI site generation complete");

    // Step 3: ファイル一括コミット（ワークフロー含む）
    await batchCommitHybridFiles(ctx, data, hybridSite);

    ctx.log.info("🚀 Hybrid AI-customized Astro site deployed successfully");
  } catch (error) {
    ctx.log.error("Failed to generate AI Astro site:", error);
    throw error;
  }
}

/** ハイブリッドAI生成されたファイルを一括コミット */
async function batchCommitHybridFiles(
  ctx: Context,
  _data: RepoData,
  hybridSite: HybridAstroSite
) {
  const repoInfo = ctx.repo();

  // 変数置換
  const packageJson = hybridSite.packageJson
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  const astroConfig = hybridSite.astroConfig
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  // GitHub Actions ワークフローコンテンツ
  const workflowContent = generateWorkflowContent();

  // 基本ファイル配列
  const files: FileChange[] = [
    { path: "docs/package.json", content: packageJson },
    { path: "docs/astro.config.mjs", content: astroConfig },
    { path: ".github/workflows/deploy-astro.yml", content: workflowContent },
  ];

  // ハイブリッド生成されたファイルを追加
  for (const [filePath, content] of Object.entries(
    hybridSite.customizedFiles
  )) {
    files.push({
      path: `docs/${filePath}`,
      content: content,
    });
  }

  // 一括コミット実行
  await batchCommitFiles(
    ctx,
    files,
    `🎨 Generate hybrid AI-customized Astro site

- Selected template: ${hybridSite.templateId}
- Applied AI-driven color schemes and typography
- Generated ${Object.keys(hybridSite.customizedFiles).length} customized files
- Optimized design for project characteristics

🚀 Powered by hybrid AI creativity with stable foundation!`
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
