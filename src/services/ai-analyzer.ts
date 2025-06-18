import OpenAI from "openai";
import type { RepoData } from "../types.js";

// OpenAI クライアント初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  style: "modern" | "classic" | "gradient" | "glassmorphism" | "brutalist";
  animations: boolean;
  darkMode: boolean;
}

/** Step 1: リポジトリを分析してプロジェクト特性を判定 */
export async function analyzeRepository(
  repoData: RepoData
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

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // JSONコードブロックを除去
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

    return JSON.parse(cleanContent) as RepoAnalysis;
  } catch (error) {
    console.error("Repository analysis failed:", error);
    // フォールバック: 基本的な分析
    return {
      projectType: "application",
      techStack: ["JavaScript"],
      primaryLanguage: "JavaScript",
      activity: "medium",
      audience: "developer",
      purpose: "A software project",
      tone: "professional",
      complexity: "moderate",
    };
  }
}

/** Step 2: 分析結果からデザイン戦略を決定 */
export async function generateDesignStrategy(
  analysis: RepoAnalysis
): Promise<DesignStrategy> {
  const prompt = `
あなたはWebデザインの専門家です。以下のプロジェクト分析結果から、最適なデザイン戦略を提案してください。

プロジェクト分析:
- プロジェクトタイプ: ${analysis.projectType}
- 技術スタック: ${analysis.techStack.join(", ")}
- 対象ユーザー: ${analysis.audience}
- トーン: ${analysis.tone}
- 複雑度: ${analysis.complexity}
- 目的: ${analysis.purpose}

以下のJSON形式で回答してください:
{
  "colorScheme": {
    "primary": "#hex色",
    "secondary": "#hex色", 
    "accent": "#hex色",
    "background": "#hex色"
  },
  "typography": {
    "heading": "フォント名",
    "body": "フォント名",
    "code": "フォント名"
  },
  "layout": "minimal|grid|sidebar|hero-focused|content-heavy",
  "style": "modern|classic|gradient|glassmorphism|brutalist",
  "animations": true/false,
  "darkMode": true/false
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // JSONコードブロックを除去
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

    return JSON.parse(cleanContent) as DesignStrategy;
  } catch (error) {
    console.error("Design strategy generation failed:", error);
    // フォールバック: デフォルトデザイン
    return {
      colorScheme: {
        primary: "#667eea",
        secondary: "#764ba2",
        accent: "#f093fb",
        background: "#ffffff",
      },
      typography: {
        heading: "Inter, sans-serif",
        body: "system-ui, sans-serif",
        code: "JetBrains Mono, monospace",
      },
      layout: "hero-focused",
      style: "modern",
      animations: true,
      darkMode: false,
    };
  }
}
