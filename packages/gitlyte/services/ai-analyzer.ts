import OpenAI from "openai";
import type { GitLyteConfig } from "../types/config.js";
import type { RepoData } from "../types.js";

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

export interface RepoAnalysis {
  projectType:
    | "library"
    | "application"
    | "tool"
    | "documentation"
    | "game"
    | "website";
  techStack: string[];
  primaryLanguage: string;
  activity: "high" | "medium" | "low";
  audience: "developer" | "business" | "general" | "academic";
  purpose: string;
  tone: "professional" | "friendly" | "creative" | "technical" | "playful";
  complexity: "simple" | "moderate" | "complex";
  layout?: "minimal" | "grid" | "sidebar" | "hero-focused" | "content-heavy";
}

export interface DesignStrategy {
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    heading: string;
    body: string;
    code: string;
  };
  layout: "minimal" | "grid" | "sidebar" | "hero-focused" | "content-heavy";
  style:
    | "modern"
    | "minimalist"
    | "gradient"
    | "glassmorphism"
    | "tech-forward"
    | "vibrant"
    | "professional"
    | "creative";
  animations: boolean;
  darkMode: boolean;
  effects: {
    blur: boolean;
    shadows: "subtle" | "prominent" | "none";
    borders: "rounded" | "sharp" | "pill";
    spacing: "tight" | "normal" | "spacious";
  };
}

/** Step 1: リポジトリを分析してプロジェクト特性を判定 */
export async function analyzeRepository(
  repoData: RepoData,
  config?: GitLyteConfig
): Promise<RepoAnalysis> {
  const prompt = `
あなたはGitHubリポジトリの専門分析者です。以下のリポジトリ情報を分析して、プロジェクトの特性を判定してください。

リポジトリ情報:
- 名前: ${repoData.repo.name}
- 説明: ${repoData.repo.description || "説明なし"}
- Stars: ${repoData.repo.stargazers_count}
- Forks: ${repoData.repo.forks_count}
- Issues数: ${repoData.issues.length}
- 最近のPR数: ${repoData.prs.length}
- README: ${repoData.readme.slice(0, 1000)}...

以下のJSON形式で回答してください:
{
  "projectType": "library|application|tool|documentation|game|website",
  "techStack": ["技術1", "技術2"],
  "primaryLanguage": "主要言語",
  "activity": "high|medium|low",
  "audience": "developer|business|general|academic",
  "purpose": "プロジェクトの目的を1文で",
  "tone": "professional|friendly|creative|technical|playful",
  "complexity": "simple|moderate|complex"
}`;

  let cleanContent = "";

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      },
      {
        timeout: 60000, // 60秒タイムアウト
      }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // より強力なJSONクリーニング
    cleanContent = content
      .replace(/```json\n?|\n?```/g, "") // JSONコードブロック除去
      .replace(/```\n?|\n?```/g, "") // 一般的なコードブロック除去
      .replace(/\/\*[\s\S]*?\*\//g, "") // コメント除去
      .replace(/\/\/.*$/gm, "") // 単行コメント除去
      .replace(/:\s*""([^"]*)""/g, ': "$1"') // 二重引用符修正: ""value"" -> "value"
      .replace(/:\s*"([^"]*)""/g, ': "$1"') // 末尾の二重引用符修正: "value"" -> "value"
      .replace(/:\s*""([^"]*)"/g, ': "$1"') // 先頭の二重引用符修正: ""value" -> "value"
      .trim();

    const result = JSON.parse(cleanContent) as RepoAnalysis;

    // gitlyte.jsonでレイアウトが指定されている場合は、それを優先
    if (config?.site?.layout) {
      console.log(`Using configured layout: ${config.site.layout}`);
      result.layout = config.site.layout;
    }

    return result;
  } catch (error) {
    console.error("Repository analysis failed:", error);
    console.log("Cleaned JSON content:", cleanContent);
    // フォールバック: 基本的な分析
    const fallbackResult: RepoAnalysis = {
      projectType: "application",
      techStack: ["JavaScript"],
      primaryLanguage: "JavaScript",
      activity: "medium",
      audience: "developer",
      purpose: "A software project",
      tone: "professional",
      complexity: "moderate",
    };

    // フォールバック時も設定値を優先
    if (config?.site?.layout) {
      console.log(`Using configured layout (fallback): ${config.site.layout}`);
      fallbackResult.layout = config.site.layout;
    }

    return fallbackResult;
  }
}

/** Step 2: 分析結果からデザイン戦略を決定 */
export async function generateDesignStrategy(
  analysis: RepoAnalysis,
  config?: GitLyteConfig
): Promise<DesignStrategy> {
  const prompt = `
あなたは世界最高峰のWebデザイナー兼UXスペシャリストです。2025年のデザイントレンドを踏まえ、このプロジェクトに最適で視覚的に魅力的なデザイン戦略を提案してください。

## プロジェクト分析
- **プロジェクトタイプ**: ${analysis.projectType}
- **技術スタック**: ${analysis.techStack.join(", ")}
- **対象ユーザー**: ${analysis.audience}
- **トーン**: ${analysis.tone}
- **複雑度**: ${analysis.complexity}
- **目的**: ${analysis.purpose}

## デザイン要件
1. **視覚的インパクト**: 第一印象で強い印象を与える
2. **ユーザビリティ**: 情報の階層が明確で使いやすい
3. **モダン性**: 2025年のトレンドを反映
4. **差別化**: 他のプロジェクトサイトとの明確な差別化
5. **アクセシビリティ**: WCAG 2.1 AA準拠のカラーコントラスト

## 推奨デザインパターン
- **Library/Tool**: クリーンで信頼性重視、コード例が映える配色
- **Application**: 動的で魅力的、機能美を表現する配色
- **Game**: 創造性とエネルギーを表現する大胆な配色
- **Documentation**: 読みやすさと理解しやすさを重視した配色

**重要**: 回答は必ず有効なJSON形式で、余計な説明は一切含めないでください。

{
  "colorScheme": {
    "primary": "#667eea",
    "secondary": "#764ba2", 
    "accent": "#f093fb",
    "background": "#ffffff"
  },
  "typography": {
    "heading": "Inter, sans-serif",
    "body": "system-ui, sans-serif",
    "code": "JetBrains Mono, monospace"
  },
  "layout": "hero-focused",
  "style": "modern",
  "animations": true,
  "darkMode": false,
  "effects": {
    "blur": true,
    "shadows": "subtle",
    "borders": "rounded",
    "spacing": "normal"
  }
}`;

  let cleanContent = "";

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create(
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      },
      {
        timeout: 60000, // 60秒タイムアウト
      }
    );

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // より強力なJSONクリーニングと解析
    cleanContent = content
      .replace(/```json\n?|\n?```/g, "") // JSONコードブロック除去
      .replace(/```\n?|\n?```/g, "") // 一般的なコードブロック除去
      .replace(/\/\*[\s\S]*?\*\//g, "") // コメント除去
      .replace(/\/\/.*$/gm, "") // 単行コメント除去
      .replace(/:\s*""([^"]*)""/g, ': "$1"') // 二重引用符修正: ""value"" -> "value"
      .replace(/:\s*"([^"]*)""/g, ': "$1"') // 末尾の二重引用符修正: "value"" -> "value"
      .replace(/:\s*""([^"]*)"/g, ': "$1"') // 先頭の二重引用符修正: ""value" -> "value"
      .trim();

    // JSONの開始と終了を探す
    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }

    // 追加のクリーニング: 一般的なJSON問題を修正
    cleanContent = cleanContent
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // プロパティ名をクォート
      .replace(/:\s*'([^']*)'/g, ': "$1"') // シングルクォートをダブルクォートに
      .replace(/,\s*}/g, "}") // 末尾カンマ除去
      .replace(/,\s*]/g, "]") // 配列末尾カンマ除去
      .replace(/:\s*#([a-fA-F0-9]{3,8})\s*/g, ': "#$1"') // 色コードをクォート
      .replace(/(\d+)px/g, '"$1px"') // CSSユニットをクォート
      // boolean、null、numberを保護してからクォート（booleanとnullと数値以外をクォート）
      .replace(
        /:\s*(?!(true|false|null|\d+(\.\d+)?)\s*[,}])([a-zA-Z][a-zA-Z0-9\-_]*)\s*([,}])/g,
        ': "$3"$4'
      )
      .replace(/\s+/g, " ") // 余分な空白を整理
      .trim();

    console.log("Cleaned JSON content:", cleanContent);

    const result = JSON.parse(cleanContent) as DesignStrategy;

    // gitlyte.jsonでレイアウトが指定されている場合は、それを優先
    if (config?.site?.layout) {
      console.log(
        `Overriding design strategy layout with configured: ${config.site.layout}`
      );
      result.layout = config.site.layout;
    }

    return result;
  } catch (error) {
    console.error("Design strategy generation failed:", error);
    if (cleanContent) {
      console.error("Problematic content:", cleanContent);
    }
    // フォールバック: プロジェクトタイプ別の最適化されたデザイン
    const fallbackDesigns = {
      library: {
        colorScheme: {
          primary: "#2563eb",
          secondary: "#1e40af",
          accent: "#3b82f6",
          background: "#ffffff",
        },
        style: "professional" as const,
      },
      application: {
        colorScheme: {
          primary: "#7c3aed",
          secondary: "#5b21b6",
          accent: "#a855f7",
          background: "#fafafa",
        },
        style: "modern" as const,
      },
      tool: {
        colorScheme: {
          primary: "#059669",
          secondary: "#047857",
          accent: "#10b981",
          background: "#ffffff",
        },
        style: "tech-forward" as const,
      },
      game: {
        colorScheme: {
          primary: "#dc2626",
          secondary: "#b91c1c",
          accent: "#ef4444",
          background: "#111827",
        },
        style: "vibrant" as const,
      },
      default: {
        colorScheme: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#f093fb",
          background: "#ffffff",
        },
        style: "modern" as const,
      },
    };

    const selectedDesign =
      fallbackDesigns[analysis.projectType as keyof typeof fallbackDesigns] ||
      fallbackDesigns.default;

    // フォールバック時のレイアウト決定：設定値 > RepoAnalysisのlayout > デフォルト
    const fallbackLayout =
      config?.site?.layout || analysis.layout || "hero-focused";

    if (config?.site?.layout) {
      console.log(`Using configured layout (fallback): ${config.site.layout}`);
    } else if (analysis.layout) {
      console.log(`Using analysis layout (fallback): ${analysis.layout}`);
    }

    return {
      colorScheme: selectedDesign.colorScheme,
      typography: {
        heading: "Inter, system-ui, sans-serif",
        body: "system-ui, -apple-system, sans-serif",
        code: "JetBrains Mono, Fira Code, monospace",
      },
      layout: fallbackLayout,
      style: selectedDesign.style,
      animations: true,
      darkMode: false,
      effects: {
        blur: true,
        shadows: "subtle",
        borders: "rounded",
        spacing: "normal",
      },
    };
  }
}
