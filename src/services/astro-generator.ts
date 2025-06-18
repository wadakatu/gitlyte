import type { Context } from "probot";
import type { RepoData } from "../types.js";
import { batchCommitFiles, type FileChange } from "../utils/batch-commit.js";
import { analyzeRepository, generateDesignStrategy } from "./ai-analyzer.js";
import { generateAstroSite, type GeneratedAstroSite } from "./ai-code-generator.js";

/** AI駆動でAstroサイトを生成 */
export async function generateAIAstroSite(ctx: Context, data: RepoData) {
  try {
    ctx.log.info("🤖 Starting AI analysis...");

    // Step 1: リポジトリ分析
    const analysis = await analyzeRepository(data);
    ctx.log.info(
      `📊 Analysis complete: ${analysis.projectType} project for ${analysis.audience}`
    );

    // Step 2: デザイン戦略決定
    const design = await generateDesignStrategy(analysis);
    ctx.log.info(
      `🎨 Design strategy: ${design.style} with ${design.layout} layout`
    );

    // Step 3: Astroコード生成
    const generatedSite = await generateAstroSite(data, analysis, design);
    ctx.log.info("⚡ AI code generation complete");

    // Step 4: ファイル一括コミット（ワークフロー含む）
    await batchCommitAIGeneratedFiles(ctx, data, generatedSite);

    ctx.log.info("🚀 AI-generated Astro site deployed successfully");
  } catch (error) {
    ctx.log.error("Failed to generate AI Astro site:", error);
    throw error;
  }
}

/** AI生成されたファイルを一括コミット */
async function batchCommitAIGeneratedFiles(
  ctx: Context,
  data: RepoData,
  generatedSite: GeneratedAstroSite
) {
  const repoInfo = ctx.repo();

  // 変数置換
  const packageJson = generatedSite.packageJson
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  const astroConfig = generatedSite.astroConfig
    .replace(/{{REPO_NAME}}/g, repoInfo.repo)
    .replace(/{{OWNER}}/g, repoInfo.owner);

  // GitHub Actions ワークフローコンテンツ
  const workflowContent = generateWorkflowContent();

  // データを置換
  const indexPageWithData = generatedSite.indexPage.replace(
    "{{REPO_DATA}}",
    JSON.stringify(data, null, 2)
  );

  // ファイル配列（一括コミット用、ワークフロー含む）
  const files: FileChange[] = [
    { path: "docs/package.json", content: packageJson },
    { path: "docs/astro.config.mjs", content: astroConfig },
    { path: "docs/src/layouts/Layout.astro", content: generatedSite.layout },
    {
      path: "docs/src/components/Hero.astro",
      content: generatedSite.heroComponent,
    },
    {
      path: "docs/src/components/Features.astro",
      content: generatedSite.featuresComponent,
    },
    { path: "docs/src/pages/index.astro", content: indexPageWithData },
    { path: "docs/src/styles/global.css", content: generatedSite.globalStyles },
    { path: ".github/workflows/deploy-astro.yml", content: workflowContent },
  ];

  // 一括コミット実行
  await batchCommitFiles(
    ctx,
    files,
    `🚀 Generate AI-powered Astro site

- Add Astro project configuration
- Generate custom components based on repository analysis
- Apply AI-selected design strategy and color scheme
- Create responsive layouts optimized for project type

🤖 Generated with AI analysis and custom design`
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
