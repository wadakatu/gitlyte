import type { RepoData } from "../types.js";
import type { RepoAnalysis } from "./ai-analyzer.js";
import OpenAI from "openai";
import {
  analyzeRepositoryContent,
  generateSectionContent,
  type ContentAnalysis,
} from "./content-analyzer.js";

// OpenAI クライアント初期化
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// テスト用：OpenAIクライアントをモック可能にする
export function setOpenAIClient(client: OpenAI | null) {
  openai = client;
}

/** テンプレート定義 */
export interface Template {
  id: string;
  name: string;
  description: string;
  suitableFor: {
    projectTypes: string[];
    audiences: string[];
    complexity: string[];
  };
  files: TemplateFile[];
  customizationPoints: CustomizationPoint[];
}

/** テンプレートファイル */
export interface TemplateFile {
  path: string;
  content: string;
  isCustomizable: boolean;
}

/** カスタマイズポイント */
export interface CustomizationPoint {
  id: string;
  type: "color" | "typography" | "layout" | "content" | "style";
  target: string; // CSS セレクターやプレースホルダー
  description: string;
}

/** AI生成カスタマイズ指示 */
export interface CustomizationRules {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    codeFont: string;
  };
  styling: {
    borderRadius: string;
    shadows: string;
    spacing: string;
    animations: boolean;
  };
  content: {
    heroTitle: string;
    heroSubtitle: string;
    sectionTitles: Record<string, string>;
  };
  layout: {
    structure: "minimal" | "detailed" | "showcase";
    navigation: boolean;
    sidebar: boolean;
  };
}

/** ハイブリッド生成されるサイト */
export interface HybridAstroSite {
  templateId: string;
  customizedFiles: { [path: string]: string };
  packageJson: string;
  astroConfig: string;
}

/** 利用可能なテンプレート */
const AVAILABLE_TEMPLATES: Template[] = [
  {
    id: "modern-showcase",
    name: "Modern Showcase",
    description: "Clean, modern design perfect for libraries and tools",
    suitableFor: {
      projectTypes: ["library", "tool", "application"],
      audiences: ["developer", "business"],
      complexity: ["simple", "moderate"],
    },
    files: [
      {
        path: "src/layouts/Layout.astro",
        content: `---
export interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description || "Project showcase"} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  :root {
    --primary: {{PRIMARY_COLOR}};
    --secondary: {{SECONDARY_COLOR}};
    --accent: {{ACCENT_COLOR}};
    --background: {{BACKGROUND_COLOR}};
    --text: {{TEXT_COLOR}};
    --font-heading: {{HEADING_FONT}};
    --font-body: {{BODY_FONT}};
    --border-radius: {{BORDER_RADIUS}};
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: var(--font-body);
    line-height: 1.6;
    color: var(--text);
    background: var(--background);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-heading);
    line-height: 1.2;
  }
</style>`,
        isCustomizable: true,
      },
      {
        path: "src/components/Hero.astro",
        content: `---
export interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
}

const { title, description, stats } = Astro.props;
---

<section class="hero">
  <div class="container">
    <h1>{{HERO_TITLE}}</h1>
    <p class="subtitle">{{HERO_SUBTITLE}}</p>
    <div class="stats">
      <span class="stat">⭐ {stats.stars}</span>
      <span class="stat">🍴 {stats.forks}</span>
      <span class="stat">📊 {stats.issues} issues</span>
    </div>
  </div>
</section>

<style>
  .hero {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    padding: 4rem 0;
    text-align: center;
    {{HERO_STYLES}}
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 700;
  }

  .subtitle {
    font-size: 1.2rem;
    margin-bottom: 1rem;
    opacity: 0.9;
  }
  
  .unique-value {
    font-size: 1.1rem;
    margin-bottom: 1rem;
    opacity: 0.95;
    font-weight: 500;
  }
  
  .benefits {
    margin-bottom: 2rem;
  }
  
  .benefits-text {
    font-size: 1rem;
    opacity: 0.9;
    margin-bottom: 1rem;
  }
  
  .cta-section {
    margin-bottom: 2rem;
  }
  
  .install-command {
    background: rgba(255, 255, 255, 0.15);
    padding: 0.75rem 1.5rem;
    border-radius: var(--border-radius);
    font-family: var(--font-code, monospace);
    font-size: 0.9rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: inline-block;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stat {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    font-weight: 500;
    backdrop-filter: blur(10px);
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }
    
    .stats {
      gap: 1rem;
    }
  }
</style>`,
        isCustomizable: true,
      },
      {
        path: "src/components/Features.astro",
        content: `---
export interface Props {
  prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
}

const { prs } = Astro.props;
---

<section class="features">
  <div class="container">
    <h2>{{FEATURES_TITLE}}</h2>
    <div class="pr-grid">
      {prs.slice(0, 6).map((pr) => (
        <div class="pr-card">
          <h3>{pr.title}</h3>
          <p>by {pr.user?.login || 'Unknown'}</p>
          <span class="date">{pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'Unknown date'}</span>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  .features {
    padding: 3rem 0;
    background: white;
    {{FEATURES_STYLES}}
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
    color: var(--text);
  }

  .pr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .pr-card {
    border: 1px solid #e2e8f0;
    border-radius: var(--border-radius);
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
    background: white;
    {{CARD_STYLES}}
  }

  .pr-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
  }

  .pr-card h3 {
    margin-bottom: 0.5rem;
    color: var(--text);
    font-size: 1.1rem;
  }

  .pr-card p {
    color: var(--secondary);
    margin-bottom: 0.5rem;
  }

  .date {
    font-size: 0.9rem;
    color: #a0aec0;
  }
</style>`,
        isCustomizable: true,
      },
      {
        path: "src/pages/index.astro",
        content: `---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import Features from '../components/Features.astro';

// Repository data will be replaced during generation
const repoData = {{REPO_DATA}};
const repo = repoData.repo || {};
const prs = repoData.prs || [];
const issues = repoData.issues || [];

const stats = {
  stars: repo.stargazers_count || 0,
  forks: repo.forks_count || 0,
  issues: issues.length || 0
};
---

<Layout title={repo.name + ' - {{TITLE_SUFFIX}}'} description={repo.description}>
  <Hero 
    title={repo.name}
    description={repo.description}
    stats={stats}
  />
  
  <Features prs={prs || []} />
  
  <footer>
    <div class="container">
      <p>🤖 Generated with AI-powered GitLyte ✨</p>
    </div>
  </footer>
</Layout>

<style>
  footer {
    background: var(--primary);
    color: white;
    text-align: center;
    padding: 2rem 0;
  }

  footer .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  footer p {
    margin: 0;
    opacity: 0.9;
  }
</style>`,
        isCustomizable: true,
      },
    ],
    customizationPoints: [
      {
        id: "primary-color",
        type: "color",
        target: "{{PRIMARY_COLOR}}",
        description: "Primary brand color",
      },
      {
        id: "secondary-color",
        type: "color",
        target: "{{SECONDARY_COLOR}}",
        description: "Secondary color",
      },
      {
        id: "accent-color",
        type: "color",
        target: "{{ACCENT_COLOR}}",
        description: "Accent color",
      },
      {
        id: "background-color",
        type: "color",
        target: "{{BACKGROUND_COLOR}}",
        description: "Background color",
      },
      {
        id: "text-color",
        type: "color",
        target: "{{TEXT_COLOR}}",
        description: "Text color",
      },
      {
        id: "heading-font",
        type: "typography",
        target: "{{HEADING_FONT}}",
        description: "Heading font family",
      },
      {
        id: "body-font",
        type: "typography",
        target: "{{BODY_FONT}}",
        description: "Body font family",
      },
      {
        id: "border-radius",
        type: "style",
        target: "{{BORDER_RADIUS}}",
        description: "Border radius value",
      },
      {
        id: "hero-title",
        type: "content",
        target: "{{HERO_TITLE}}",
        description: "Hero section title",
      },
      {
        id: "hero-subtitle",
        type: "content",
        target: "{{HERO_SUBTITLE}}",
        description: "Hero section subtitle",
      },
      {
        id: "features-title",
        type: "content",
        target: "{{FEATURES_TITLE}}",
        description: "Features section title",
      },
      {
        id: "title-suffix",
        type: "content",
        target: "{{TITLE_SUFFIX}}",
        description: "Page title suffix",
      },
      {
        id: "hero-styles",
        type: "style",
        target: "{{HERO_STYLES}}",
        description: "Additional hero styles",
      },
      {
        id: "features-styles",
        type: "style",
        target: "{{FEATURES_STYLES}}",
        description: "Additional features styles",
      },
      {
        id: "card-styles",
        type: "style",
        target: "{{CARD_STYLES}}",
        description: "Additional card styles",
      },
    ],
  },
  // 他のテンプレートもここに追加予定
];

/** Step 1: プロジェクト分析から最適なテンプレートを選択 */
export function selectOptimalTemplate(analysis: RepoAnalysis): Template {
  // スコアリングシステムでベストマッチを選択
  let bestTemplate = AVAILABLE_TEMPLATES[0];
  let bestScore = 0;

  for (const template of AVAILABLE_TEMPLATES) {
    let score = 0;

    // プロジェクトタイプマッチ
    if (template.suitableFor.projectTypes.includes(analysis.projectType)) {
      score += 3;
    }

    // オーディエンスマッチ
    if (template.suitableFor.audiences.includes(analysis.audience)) {
      score += 2;
    }

    // 複雑度マッチ
    if (template.suitableFor.complexity.includes(analysis.complexity)) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return bestTemplate;
}

/** Step 2: AI でカスタマイズ指示を生成 */
export async function generateCustomizationRules(
  analysis: RepoAnalysis,
  template: Template,
  repoData: RepoData
): Promise<CustomizationRules> {
  const prompt = `
あなたはWebデザインの専門家です。以下のプロジェクト情報とテンプレートに基づいて、最適なカスタマイズ指示を生成してください。

## プロジェクト情報
- 名前: ${repoData.repo.name}
- 説明: ${repoData.repo.description}
- タイプ: ${analysis.projectType}
- 対象ユーザー: ${analysis.audience}
- トーン: ${analysis.tone}
- 技術スタック: ${analysis.techStack.join(", ")}

## 選択されたテンプレート
- 名前: ${template.name}
- 説明: ${template.description}

このプロジェクトに最適化されたデザインカスタマイズを提案してください。

**重要**: 回答は必ず有効なJSON形式で、余計な説明は一切含めないでください。

{
  "colors": {
    "primary": "#667eea",
    "secondary": "#764ba2", 
    "accent": "#f093fb",
    "background": "#ffffff",
    "text": "#2d3748"
  },
  "typography": {
    "headingFont": "Inter, sans-serif",
    "bodyFont": "system-ui, sans-serif", 
    "codeFont": "JetBrains Mono, monospace"
  },
  "styling": {
    "borderRadius": "8px",
    "shadows": "0 4px 6px rgba(0, 0, 0, 0.1)",
    "spacing": "1rem",
    "animations": true
  },
  "content": {
    "heroTitle": "${repoData.repo.name}",
    "heroSubtitle": "${repoData.repo.description || "An innovative project"}",
    "sectionTitles": {
      "features": "Recent Pull Requests"
    }
  },
  "layout": {
    "structure": "detailed",
    "navigation": false,
    "sidebar": false
  }
}`;

  let cleanContent = "";

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // より強力なJSONクリーニング
    cleanContent = content
      .replace(/```json\n?|\n?```/g, "") // JSONコードブロック除去
      .replace(/```\n?|\n?```/g, "") // 一般的なコードブロック除去
      .replace(/\/\*[\s\S]*?\*\//g, "") // コメント除去
      .replace(/\/\/.*$/gm, "") // 単行コメント除去
      .trim();

    // JSONの開始と終了を探す
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }

    // 追加のクリーニング: 不正な文字を修正
    cleanContent = cleanContent
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // プロパティ名をクォート
      .replace(/:\s*'([^']*)'/g, ': "$1"') // シングルクォートをダブルクォートに
      .replace(/,\s*}/g, "}") // 末尾カンマ除去
      .replace(/,\s*]/g, "]"); // 配列末尾カンマ除去

    return JSON.parse(cleanContent) as CustomizationRules;
  } catch (error) {
    console.error("Customization rules generation failed:", error);
    if (cleanContent) {
      console.error("Problematic content:", cleanContent);
    }

    // 最終フォールバック: JSON解析に失敗した場合でも動作するデフォルト
    return {
      colors: {
        primary: "#667eea",
        secondary: "#764ba2",
        accent: "#f093fb",
        background: "#ffffff",
        text: "#2d3748",
      },
      typography: {
        headingFont: "Inter, sans-serif",
        bodyFont: "system-ui, sans-serif",
        codeFont: "JetBrains Mono, monospace",
      },
      styling: {
        borderRadius: "8px",
        shadows: "0 4px 6px rgba(0, 0, 0, 0.1)",
        spacing: "1rem",
        animations: true,
      },
      content: {
        heroTitle: repoData.repo.name,
        heroSubtitle: repoData.repo.description || "An amazing project",
        sectionTitles: {
          features: "Recent Pull Requests",
        },
      },
      layout: {
        structure: "detailed",
        navigation: false,
        sidebar: false,
      },
    };
  }
}

/** Step 3: テンプレートにカスタマイズとリッチコンテンツを適用 */
export function applyCustomizationWithContent(
  template: Template,
  customization: CustomizationRules,
  repoData: RepoData,
  contentAnalysis: ContentAnalysis
): HybridAstroSite {
  const customizedFiles: { [path: string]: string } = {};

  // 各テンプレートファイルにカスタマイズを適用
  for (const file of template.files) {
    let content = file.content;

    if (file.isCustomizable) {
      // カラーカスタマイズ
      content = content.replace(
        /{{PRIMARY_COLOR}}/g,
        customization.colors.primary
      );
      content = content.replace(
        /{{SECONDARY_COLOR}}/g,
        customization.colors.secondary
      );
      content = content.replace(
        /{{ACCENT_COLOR}}/g,
        customization.colors.accent
      );
      content = content.replace(
        /{{BACKGROUND_COLOR}}/g,
        customization.colors.background
      );
      content = content.replace(/{{TEXT_COLOR}}/g, customization.colors.text);

      // タイポグラフィカスタマイズ
      content = content.replace(
        /{{HEADING_FONT}}/g,
        customization.typography.headingFont
      );
      content = content.replace(
        /{{BODY_FONT}}/g,
        customization.typography.bodyFont
      );

      // スタイルカスタマイズ
      content = content.replace(
        /{{BORDER_RADIUS}}/g,
        customization.styling.borderRadius
      );

      // リッチコンテンツカスタマイズ
      const heroContent = generateSectionContent(contentAnalysis, "hero");
      const featuresContent = generateSectionContent(
        contentAnalysis,
        "features"
      );

      content = content.replace(
        /{{HERO_TITLE}}/g,
        heroContent.title || customization.content.heroTitle
      );
      content = content.replace(
        /{{HERO_SUBTITLE}}/g,
        heroContent.subtitle || customization.content.heroSubtitle
      );
      content = content.replace(
        /{{FEATURES_TITLE}}/g,
        featuresContent.title || "Key Features"
      );
      content = content.replace(/{{TITLE_SUFFIX}}/g, "Project Showcase");

      // 追加のリッチコンテンツ
      content = content.replace(
        /{{UNIQUE_VALUE}}/g,
        contentAnalysis.appeal.uniqueValue
      );
      content = content.replace(
        /{{KEY_BENEFITS}}/g,
        contentAnalysis.appeal.keyBenefits.join(", ")
      );
      content = content.replace(
        /{{INSTALLATION_COMMAND}}/g,
        contentAnalysis.usage.installation.command
      );

      // 追加スタイル（空の場合はデフォルト）
      content = content.replace(/{{HERO_STYLES}}/g, "");
      content = content.replace(/{{FEATURES_STYLES}}/g, "");
      content = content.replace(/{{CARD_STYLES}}/g, "");

      // リポジトリデータ置換
      content = content.replace(
        /{{REPO_DATA}}/g,
        JSON.stringify(repoData, null, 2)
      );
    }

    customizedFiles[file.path] = content;
  }

  // package.json生成
  const packageJson = JSON.stringify(
    {
      name: `${repoData.repo.name}-site`,
      type: "module",
      version: "0.0.1",
      description: `Showcase site for ${repoData.repo.name}`,
      scripts: {
        dev: "astro dev",
        start: "astro dev",
        build: "astro build",
        preview: "astro preview",
      },
      dependencies: {
        astro: "^4.0.0",
      },
    },
    null,
    2
  );

  // astro.config.mjs生成
  const astroConfig = `import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://{{OWNER}}.github.io',
  base: '/{{REPO_NAME}}',
  output: 'static',
  build: {
    assets: 'assets'
  }
});`;

  return {
    templateId: template.id,
    customizedFiles,
    packageJson,
    astroConfig,
  };
}

/** メイン: ハイブリッド生成プロセス */
export async function generateHybridAstroSite(
  repoData: RepoData,
  analysis: RepoAnalysis
): Promise<HybridAstroSite> {
  console.log("🎯 Selecting optimal template...");
  const template = selectOptimalTemplate(analysis);

  console.log("📚 Analyzing repository content...");
  const contentAnalysis = await analyzeRepositoryContent(repoData, analysis);

  console.log(`📐 Selected template: ${template.name}`);
  const customization = await generateCustomizationRules(
    analysis,
    template,
    repoData
  );

  console.log("🎨 Applying customization...");
  const hybridSite = applyCustomizationWithContent(
    template,
    customization,
    repoData,
    contentAnalysis
  );

  console.log(`✅ Hybrid site generated with template: ${template.id}`);
  return hybridSite;
}
