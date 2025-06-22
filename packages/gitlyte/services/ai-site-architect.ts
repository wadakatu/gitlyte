import OpenAI from "openai";
import type { RepoData } from "../types.js";
import type { RepoAnalysis } from "./ai-analyzer.js";

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

/** サイト全体の構成設計 */
export interface SiteArchitecture {
  // サイト全体のコンセプト
  concept: {
    theme: string; // "Innovative Tech Hub", "Developer Showcase", etc.
    mood: string; // "energetic", "professional", "creative", "minimalist"
    target_impression: string; // "cutting-edge", "trustworthy", "approachable"
  };

  // レイアウト構成
  layout: {
    structure: "single-page" | "multi-section" | "dashboard" | "portfolio";
    navigation: "none" | "sticky-header" | "sidebar" | "floating" | "bottom";
    sections: SiteSection[];
  };

  // デザインシステム
  design: {
    color_palette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: {
        primary: string;
        secondary: string;
        accent: string;
      };
    };
    typography: {
      heading: {
        font: string;
        weight: string;
        scale: string; // "conservative", "moderate", "dramatic"
      };
      body: {
        font: string;
        size: string;
        line_height: string;
      };
      code: {
        font: string;
        style: string; // "minimal", "highlighted", "terminal"
      };
    };
    spacing: {
      scale: "tight" | "normal" | "spacious";
      rhythm: "geometric" | "organic" | "modular";
    };
    visual_style: {
      approach:
        | "gradient"
        | "solid"
        | "glassmorphism"
        | "neumorphism"
        | "brutalist"
        | "minimal";
      borders: "none" | "subtle" | "prominent" | "decorative";
      shadows: "none" | "soft" | "dramatic" | "colorful";
      animations: "none" | "subtle" | "engaging" | "playful";
    };
  };
}

/** 個別セクションの設計 */
export interface SiteSection {
  id: string;
  type:
    | "hero"
    | "stats"
    | "features"
    | "about"
    | "gallery"
    | "timeline"
    | "contact"
    | "custom";
  position: number;
  content_strategy: {
    focus: string; // "repository-stats", "recent-activity", "project-showcase"
    tone: string; // "technical", "marketing", "storytelling"
    data_source: string[]; // ["repo", "prs", "issues", "readme", "contributors"]
  };
  design_spec: {
    layout_pattern: string; // "grid", "carousel", "timeline", "masonry", "split"
    visual_hierarchy: "flat" | "layered" | "prominent";
    interaction: "static" | "hover-effects" | "animated" | "interactive";
    responsive_behavior: string;
  };
}

/** 完全カスタムコンポーネント仕様 */
export interface ComponentSpec {
  name: string;
  purpose: string;
  props_interface: string;
  html_structure: string;
  css_styles: string;
  responsive_rules: string;
}

/** Step 1: リポジトリ分析からサイト全体の設計を生成 */
export async function designSiteArchitecture(
  repoData: RepoData,
  analysis: RepoAnalysis
): Promise<SiteArchitecture> {
  const prompt = `
あなたは世界最高レベルのWebデザインアーキテクトです。GitHubリポジトリの特性を分析し、そのプロジェクトに最適化された完全オリジナルのWebサイト設計を作成してください。

## リポジトリ情報
- 名前: ${repoData.repo.name}
- 説明: ${repoData.repo.description || "説明なし"}
- Stars: ${repoData.repo.stargazers_count}
- Forks: ${repoData.repo.forks_count}
- Issues: ${repoData.issues.length}
- PRs: ${repoData.prs.length}

## プロジェクト分析結果
- タイプ: ${analysis.projectType}
- 技術スタック: ${analysis.techStack.join(", ")}
- 対象ユーザー: ${analysis.audience}
- トーン: ${analysis.tone}
- 複雑度: ${analysis.complexity}
- 目的: ${analysis.purpose}

## 設計要求
1. このプロジェクトの特性に完璧にマッチするユニークなコンセプトを考案
2. ターゲットユーザーの心に響く印象的なデザインアプローチを提案
3. プロジェクトのストーリーを効果的に伝える革新的なセクション構成を設計
4. 技術的な内容を魅力的に見せる創造的な視覚表現を考案

既存のテンプレートやパターンにとらわれず、このプロジェクト専用の画期的なデザインを創造してください。

以下のJSON形式で詳細な設計を回答してください:

{
  "concept": {
    "theme": "サイト全体を貫くテーマ（例：'次世代開発ツールのショーケース'）",
    "mood": "伝えたい雰囲気",
    "target_impression": "ユーザーに与えたい印象"
  },
  "layout": {
    "structure": "single-page|multi-section|dashboard|portfolio",
    "navigation": "none|sticky-header|sidebar|floating|bottom",
    "sections": [
      {
        "id": "セクションID",
        "type": "hero|stats|features|about|gallery|timeline|contact|custom",
        "position": 1,
        "content_strategy": {
          "focus": "このセクションの焦点",
          "tone": "セクション内のトーン",
          "data_source": ["使用するデータソース"]
        },
        "design_spec": {
          "layout_pattern": "レイアウトパターン",
          "visual_hierarchy": "flat|layered|prominent",
          "interaction": "static|hover-effects|animated|interactive",
          "responsive_behavior": "レスポンシブ動作の説明"
        }
      }
    ]
  },
  "design": {
    "color_palette": {
      "primary": "#hex色",
      "secondary": "#hex色",
      "accent": "#hex色",
      "background": "#hex色",
      "surface": "#hex色",
      "text": {
        "primary": "#hex色",
        "secondary": "#hex色",
        "accent": "#hex色"
      }
    },
    "typography": {
      "heading": {
        "font": "フォント名",
        "weight": "フォントウェイト",
        "scale": "conservative|moderate|dramatic"
      },
      "body": {
        "font": "フォント名",
        "size": "基本サイズ",
        "line_height": "行間"
      },
      "code": {
        "font": "コードフォント",
        "style": "minimal|highlighted|terminal"
      }
    },
    "spacing": {
      "scale": "tight|normal|spacious",
      "rhythm": "geometric|organic|modular"
    },
    "visual_style": {
      "approach": "gradient|solid|glassmorphism|neumorphism|brutalist|minimal",
      "borders": "none|subtle|prominent|decorative",
      "shadows": "none|soft|dramatic|colorful",
      "animations": "none|subtle|engaging|playful"
    }
  }
}`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8, // 創造性を重視
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // より強力なJSONクリーニング
    let cleanContent = content
      .replace(/```json\n?|\n?```/g, "") // コードブロック除去
      .replace(/```\n?|\n?```/g, "") // 一般的なコードブロック除去
      .trim();

    // JSONの開始と終了を探す
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(cleanContent) as SiteArchitecture;
  } catch (error) {
    console.error("Site architecture design failed:", error);
    // フォールバック: 基本的なアーキテクチャ
    return {
      concept: {
        theme: "Modern Project Showcase",
        mood: "professional",
        target_impression: "trustworthy",
      },
      layout: {
        structure: "single-page",
        navigation: "sticky-header",
        sections: [
          {
            id: "hero",
            type: "hero",
            position: 1,
            content_strategy: {
              focus: "repository-overview",
              tone: "welcoming",
              data_source: ["repo"],
            },
            design_spec: {
              layout_pattern: "centered",
              visual_hierarchy: "prominent",
              interaction: "static",
              responsive_behavior: "stack vertically on mobile",
            },
          },
        ],
      },
      design: {
        color_palette: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#f093fb",
          background: "#ffffff",
          surface: "#f8fafc",
          text: {
            primary: "#2d3748",
            secondary: "#718096",
            accent: "#667eea",
          },
        },
        typography: {
          heading: {
            font: "Inter, sans-serif",
            weight: "700",
            scale: "moderate",
          },
          body: {
            font: "system-ui, sans-serif",
            size: "16px",
            line_height: "1.6",
          },
          code: {
            font: "JetBrains Mono, monospace",
            style: "minimal",
          },
        },
        spacing: {
          scale: "normal",
          rhythm: "geometric",
        },
        visual_style: {
          approach: "gradient",
          borders: "subtle",
          shadows: "soft",
          animations: "subtle",
        },
      },
    };
  }
}

/** Step 2: セクション設計から具体的なコンポーネント仕様を生成 */
export async function generateComponentSpecs(
  section: SiteSection,
  architecture: SiteArchitecture,
  repoData: RepoData
): Promise<ComponentSpec[]> {
  const prompt = `
あなたは革新的なWebコンポーネント設計の専門家です。以下の詳細なセクション設計から、完全オリジナルのAstroコンポーネントを作成してください。

## サイト全体のコンセプト
- テーマ: ${architecture.concept.theme}
- 雰囲気: ${architecture.concept.mood}
- 目標印象: ${architecture.concept.target_impression}

## このセクションの設計仕様
- タイプ: ${section.type}
- 焦点: ${section.content_strategy.focus}
- レイアウトパターン: ${section.design_spec.layout_pattern}
- 視覚階層: ${section.design_spec.visual_hierarchy}
- インタラクション: ${section.design_spec.interaction}

## デザインシステム
- カラーパレット: ${JSON.stringify(architecture.design.color_palette)}
- タイポグラフィ: ${JSON.stringify(architecture.design.typography)}
- ビジュアルスタイル: ${JSON.stringify(architecture.design.visual_style)}

## 利用可能なデータ
- リポジトリ名: ${repoData.repo.name}
- 説明: ${repoData.repo.description}
- Stars: ${repoData.repo.stargazers_count}
- PRs数: ${repoData.prs.length}

このセクションのコンセプトを実現する革新的でユニークなコンポーネントを設計してください。既存のパターンにとらわれず、プロジェクトの特性を最大限に活かした創造的なデザインを提案してください。

以下のJSON配列形式で1-3個のコンポーネント仕様を回答してください:

[
  {
    "name": "コンポーネント名",
    "purpose": "コンポーネントの目的と役割",
    "props_interface": "export interface Props { ... }の完全な型定義",
    "html_structure": "Astroコンポーネントの完全なHTML構造（propsを使用）",
    "css_styles": "コンポーネント専用の完全なCSS（CSS変数を活用）",
    "responsive_rules": "レスポンシブデザインの詳細なルール"
  }
]`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9, // 最大限の創造性
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // より強力なJSONクリーニング
    let cleanContent = content
      .replace(/```json\n?|\n?```/g, "") // コードブロック除去
      .replace(/```\n?|\n?```/g, "") // 一般的なコードブロック除去
      .trim();

    // JSONの開始と終了を探す
    const jsonStart = cleanContent.indexOf("[");
    const jsonEnd = cleanContent.lastIndexOf("]");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }

    return JSON.parse(cleanContent) as ComponentSpec[];
  } catch (error) {
    console.error("Component spec generation failed:", error);
    // フォールバック: 基本的なコンポーネント
    return [
      {
        name: `${section.type.charAt(0).toUpperCase() + section.type.slice(1)}Section`,
        purpose: `Display ${section.type} information`,
        props_interface: "export interface Props { title: string; }",
        html_structure: "<section><h2>{title}</h2></section>",
        css_styles: "section { padding: 2rem; }",
        responsive_rules:
          "@media (max-width: 768px) { section { padding: 1rem; } }",
      },
    ];
  }
}
