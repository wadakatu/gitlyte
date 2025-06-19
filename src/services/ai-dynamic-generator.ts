import OpenAI from "openai";
import type { RepoData } from "../types.js";
import type { SiteArchitecture, ComponentSpec } from "./ai-site-architect.js";

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

/** 完全動的生成されるAstroサイト */
export interface DynamicAstroSite {
  packageJson: string;
  astroConfig: string;
  layout: string;
  components: { [key: string]: string }; // ファイル名 -> コンテンツ
  indexPage: string;
  globalStyles: string;
  additionalFiles?: { [key: string]: string }; // 追加のファイル（utils、types等）
}

/** Step 1: サイト全体のファイル構成を決定 */
export async function generateSiteStructure(
  architecture: SiteArchitecture,
  repoData: RepoData
): Promise<DynamicAstroSite> {
  // 各セクションのコンポーネント仕様を並行生成
  console.log("🏗️ Generating component specifications...");

  const componentSpecsPromises = architecture.layout.sections.map((section) =>
    generateComponentSpecs(section, architecture, repoData)
  );

  const allComponentSpecs = await Promise.all(componentSpecsPromises);
  const flatComponentSpecs = allComponentSpecs.flat();

  // 基本ファイルを並行生成
  console.log("📦 Generating core files...");

  const [packageJson, astroConfig, layout, indexPage, globalStyles] =
    await Promise.all([
      generateDynamicPackageJson(repoData),
      generateDynamicAstroConfig(repoData),
      generateDynamicLayout(architecture, repoData),
      generateDynamicIndexPage(architecture, flatComponentSpecs, repoData),
      generateDynamicGlobalStyles(architecture),
    ]);

  // コンポーネントファイルを生成
  console.log("🎨 Generating custom components...");

  const components: { [key: string]: string } = {};
  for (const spec of flatComponentSpecs) {
    components[`${spec.name}.astro`] = await generateAstroComponent(
      spec,
      architecture
    );
  }

  return {
    packageJson,
    astroConfig,
    layout,
    components,
    indexPage,
    globalStyles,
  };
}

/** コンポーネント仕様からAstroファイルを生成 */
async function generateAstroComponent(
  spec: ComponentSpec,
  architecture: SiteArchitecture
): Promise<string> {
  const prompt = `
あなたは熟練のAstro開発者です。以下のコンポーネント仕様から、完璧に動作するAstroコンポーネントファイルを作成してください。

## コンポーネント仕様
- 名前: ${spec.name}
- 目的: ${spec.purpose}
- Props型定義: ${spec.props_interface}
- HTML構造: ${spec.html_structure}
- CSS仕様: ${spec.css_styles}
- レスポンシブルール: ${spec.responsive_rules}

## サイトのデザインシステム
- カラーパレット: ${JSON.stringify(architecture.design.color_palette)}
- タイポグラフィ: ${JSON.stringify(architecture.design.typography)}
- ビジュアルスタイル: ${JSON.stringify(architecture.design.visual_style)}

## 要求事項
1. Astroコンポーネントの正しい構文を使用
2. TypeScriptの型安全性を確保
3. CSS変数を活用したテーマ対応
4. モダンなCSS技術（Grid、Flexbox、カスタムプロパティ）を使用
5. アクセシビリティを考慮
6. パフォーマンスを最適化

完全なAstroコンポーネントファイルを生成してください（---から始まるfrontmatter、HTML、<style>を含む）:`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    return content;
  } catch (error) {
    console.error(`Component generation failed for ${spec.name}:`, error);
    // フォールバック: 基本的なコンポーネント
    return `---
${spec.props_interface}

const props = Astro.props;
---

${spec.html_structure}

<style>
${spec.css_styles}

${spec.responsive_rules}
</style>`;
  }
}

/** 動的package.json生成 */
async function generateDynamicPackageJson(
  _repoData: RepoData
): Promise<string> {
  return JSON.stringify(
    {
      name: `${_repoData.repo.name}-site`,
      type: "module",
      version: "0.0.1",
      description: `AI-generated showcase site for ${_repoData.repo.name}`,
      scripts: {
        dev: "astro dev",
        start: "astro dev",
        build: "astro build",
        preview: "astro preview",
      },
      dependencies: {
        astro: "^4.0.0",
        "@astrojs/tailwind": "^5.0.0",
        tailwindcss: "^3.0.0",
      },
    },
    null,
    2
  );
}

/** 動的astro.config生成 */
async function generateDynamicAstroConfig(
  _repoData: RepoData
): Promise<string> {
  return `import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://{{OWNER}}.github.io',
  base: '/{{REPO_NAME}}',
  output: 'static',
  build: {
    assets: 'assets'
  }
});`;
}

/** 動的レイアウト生成 */
async function generateDynamicLayout(
  architecture: SiteArchitecture,
  _repoData: RepoData
): Promise<string> {
  const prompt = `
サイトアーキテクチャに基づいて、Astroレイアウトファイルを生成してください。

## サイトコンセプト
- テーマ: ${architecture.concept.theme}
- 雰囲気: ${architecture.concept.mood}

## デザインシステム
- カラーパレット: ${JSON.stringify(architecture.design.color_palette)}
- タイポグラフィ: ${JSON.stringify(architecture.design.typography)}

## ナビゲーション仕様
- タイプ: ${architecture.layout.navigation}
- 構造: ${architecture.layout.structure}

プロジェクト「${_repoData.repo.name}」に最適化された、革新的なAstroレイアウトコンポーネントを作成してください。`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    return content;
  } catch (error) {
    console.error("Layout generation failed:", error);
    // フォールバック: 基本レイアウト
    return `---
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
    <meta name="description" content={description || "AI-generated project site"} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="stylesheet" href="/styles/global.css" />
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  :root {
    --primary: ${architecture.design.color_palette.primary};
    --secondary: ${architecture.design.color_palette.secondary};
    --accent: ${architecture.design.color_palette.accent};
    --background: ${architecture.design.color_palette.background};
    --surface: ${architecture.design.color_palette.surface};
    --text-primary: ${architecture.design.color_palette.text.primary};
    --text-secondary: ${architecture.design.color_palette.text.secondary};
    --text-accent: ${architecture.design.color_palette.text.accent};
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: ${architecture.design.typography.body.font};
    font-size: ${architecture.design.typography.body.size};
    line-height: ${architecture.design.typography.body.line_height};
    color: var(--text-primary);
    background: var(--background);
    min-height: 100vh;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${architecture.design.typography.heading.font};
    font-weight: ${architecture.design.typography.heading.weight};
  }

  code, pre {
    font-family: ${architecture.design.typography.code.font};
  }
</style>`;
  }
}

/** 動的インデックスページ生成 */
async function generateDynamicIndexPage(
  architecture: SiteArchitecture,
  componentSpecs: ComponentSpec[],
  _repoData: RepoData
): Promise<string> {
  const componentNames = componentSpecs.map((spec) => spec.name);
  const imports = componentNames
    .map((name) => `import ${name} from '../components/${name}.astro';`)
    .join("\n");

  return `---
import Layout from '../layouts/Layout.astro';
${imports}

// Repository data will be replaced during generation
const repoData = {{REPO_DATA}};
const repo = repoData.repo || {};
const prs = repoData.prs || [];
const readme = repoData.readme || '';
const issues = repoData.issues || [];
---

<Layout title={repo.name + ' - ${architecture.concept.theme}'} description={repo.description}>
  ${architecture.layout.sections
    .map((_section, index) => {
      const componentName = componentSpecs[index]?.name || "div";
      return `<${componentName} />`;
    })
    .join("\n  ")}
</Layout>`;
}

/** 動的グローバルスタイル生成 */
async function generateDynamicGlobalStyles(
  architecture: SiteArchitecture
): Promise<string> {
  const prompt = `
以下のデザインシステムに基づいて、包括的なグローバルCSSを生成してください。

## デザイン仕様
- カラーパレット: ${JSON.stringify(architecture.design.color_palette)}
- タイポグラフィ: ${JSON.stringify(architecture.design.typography)}
- スペーシング: ${JSON.stringify(architecture.design.spacing)}
- ビジュアルスタイル: ${JSON.stringify(architecture.design.visual_style)}

## 要求事項
1. CSS変数を使用したテーマシステム
2. レスポンシブタイポグラフィ
3. 一貫したスペーシングシステム
4. モダンなCSS技術（Grid、Flexbox、カスタムプロパティ）
5. アクセシビリティサポート
6. パフォーマンス最適化

革新的でユニークなグローバルCSSファイルを作成してください:`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    return content;
  } catch (error) {
    console.error("Global styles generation failed:", error);
    // フォールバック: 基本スタイル
    return `/* AI-Generated Global Styles */

:root {
  --primary: ${architecture.design.color_palette.primary};
  --secondary: ${architecture.design.color_palette.secondary};
  --accent: ${architecture.design.color_palette.accent};
  --background: ${architecture.design.color_palette.background};
  --surface: ${architecture.design.color_palette.surface};
  --text-primary: ${architecture.design.color_palette.text.primary};
  --text-secondary: ${architecture.design.color_palette.text.secondary};
  --text-accent: ${architecture.design.color_palette.text.accent};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ${architecture.design.typography.body.font};
  line-height: ${architecture.design.typography.body.line_height};
  color: var(--text-primary);
  background: var(--background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${architecture.design.typography.heading.font};
  font-weight: ${architecture.design.typography.heading.weight};
}`;
  }
}

/** Step 2: セクション設計から具体的なコンポーネント仕様を生成 */
async function generateComponentSpecs(
  section: SiteSection,
  _architecture: SiteArchitecture,
  _repoData: RepoData
): Promise<ComponentSpec[]> {
  const prompt = `
セクション「${section.type}」のコンポーネント仕様を生成してください。

## セクション詳細
- 焦点: ${section.content_strategy.focus}
- レイアウト: ${section.design_spec.layout_pattern}
- インタラクション: ${section.design_spec.interaction}

## データソース
${section.content_strategy.data_source.map((source: string) => `- ${source}`).join("\n")}

このセクションに最適な1-2個のコンポーネント仕様を JSON配列形式で回答してください:

[
  {
    "name": "コンポーネント名",
    "purpose": "目的",
    "props_interface": "Props型定義",
    "html_structure": "HTML構造",
    "css_styles": "CSS",
    "responsive_rules": "レスポンシブルール"
  }
]`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanContent) as ComponentSpec[];
  } catch (error) {
    console.error("Component specs generation failed:", error);
    return [
      {
        name: `${section.type.charAt(0).toUpperCase() + section.type.slice(1)}Section`,
        purpose: `Display ${section.type} content`,
        props_interface: "export interface Props { data: any; }",
        html_structure: `<section class="${section.type}"><h2>Section</h2></section>`,
        css_styles: `.${section.type} { padding: 2rem; }`,
        responsive_rules: `@media (max-width: 768px) { .${section.type} { padding: 1rem; } }`,
      },
    ];
  }
}
