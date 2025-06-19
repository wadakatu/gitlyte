import OpenAI from "openai";
import type { RepoData } from "../types.js";
import type { RepoAnalysis } from "./ai-analyzer.js";

/** セクションコンテンツの型定義 */
export interface SectionContent {
  title?: string;
  subtitle?: string;
  highlights?: string[];
  cta?: string;
  items?: Array<{
    title: string;
    description: string;
    benefit?: string;
    code?: string;
  }>;
  installation?: {
    method: string;
    command: string;
    requirements: string[];
  };
  quickStart?: {
    steps: string[];
    codeExample: string;
  };
  examples?: Array<{
    title: string;
    code: string;
    description: string;
  }>;
  metrics?: {
    stars: number;
    forks: number;
    contributors: number;
    releases: number;
  };
  recognition?: string[];
}

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

/** リッチなコンテンツ分析結果 */
export interface ContentAnalysis {
  // プロジェクトの魅力
  appeal: {
    uniqueValue: string; // 独自の価値提案
    keyBenefits: string[]; // 主要なメリット3-5個
    targetUsers: string[]; // 想定ユーザー層
    problemSolving: string; // 解決する問題
  };

  // 使用方法
  usage: {
    installation: {
      method: string; // npm, pip, git clone, etc.
      command: string; // 実際のコマンド
      requirements: string[]; // 前提条件
    };
    quickStart: {
      steps: string[]; // 基本的な使用手順
      codeExample: string; // 簡単なコード例
    };
    advanced: {
      features: string[]; // 高度な機能
      useCases: string[]; // 実用的なユースケース
    };
  };

  // 主要機能
  features: {
    core: Array<{
      name: string;
      description: string;
      benefit: string;
      codeSnippet?: string;
    }>;
    highlights: Array<{
      title: string;
      description: string;
      impact: string;
    }>;
  };

  // プロジェクト実績
  achievements: {
    metrics: {
      stars: number;
      forks: number;
      contributors: number;
      releases: number;
    };
    recognition: string[]; // 表彰、言及、採用事例など
    community: {
      activity: string; // コミュニティの活発さ
      support: string; // サポート体制
    };
  };

  // コンテンツセクション構成
  sections: Array<{
    id: string;
    title: string;
    type:
      | "hero"
      | "features"
      | "installation"
      | "examples"
      | "testimonials"
      | "stats";
    content: SectionContent;
    priority: number;
  }>;
}

/** Step 1: READMEとリポジトリデータから詳細分析 */
export async function analyzeRepositoryContent(
  repoData: RepoData,
  analysis: RepoAnalysis
): Promise<ContentAnalysis> {
  const prompt = `
あなたはテクニカルライティングとマーケティングの専門家です。以下のリポジトリ情報を詳細に分析し、このプロジェクトの魅力を最大限に伝えるコンテンツ戦略を立案してください。

## リポジトリ情報
- 名前: ${repoData.repo.name}
- 説明: ${repoData.repo.description || "説明なし"}
- Stars: ${repoData.repo.stargazers_count}
- Forks: ${repoData.repo.forks_count}
- Issues: ${repoData.issues.length}
- PRs: ${repoData.prs.length}

## README内容
${repoData.readme.slice(0, 3000)}

## プロジェクト分析
- タイプ: ${analysis.projectType}
- 技術スタック: ${analysis.techStack.join(", ")}
- 対象ユーザー: ${analysis.audience}
- 複雑度: ${analysis.complexity}

## 最近のPR（参考）
${repoData.prs
  .slice(0, 5)
  .map((pr) => `- ${pr.title}`)
  .join("\n")}

このプロジェクトの価値と魅力を最大限に伝える包括的なコンテンツ分析を以下のJSON形式で作成してください：

{
  "appeal": {
    "uniqueValue": "このプロジェクトの独自価値（1-2文）",
    "keyBenefits": ["メリット1", "メリット2", "メリット3"],
    "targetUsers": ["ユーザー層1", "ユーザー層2"],
    "problemSolving": "解決する具体的な問題"
  },
  "usage": {
    "installation": {
      "method": "インストール方法",
      "command": "実際のコマンド",
      "requirements": ["前提条件1", "前提条件2"]
    },
    "quickStart": {
      "steps": ["手順1", "手順2", "手順3"],
      "codeExample": "基本的なコード例（マークダウン形式）"
    },
    "advanced": {
      "features": ["高度な機能1", "機能2"],
      "useCases": ["ユースケース1", "ユースケース2"]
    }
  },
  "features": {
    "core": [
      {
        "name": "主要機能名",
        "description": "機能の説明",
        "benefit": "ユーザーへのメリット",
        "codeSnippet": "関連するコード例（任意）"
      }
    ],
    "highlights": [
      {
        "title": "ハイライト1",
        "description": "詳細説明",
        "impact": "与える影響"
      }
    ]
  },
  "achievements": {
    "metrics": {
      "stars": ${repoData.repo.stargazers_count},
      "forks": ${repoData.repo.forks_count},
      "contributors": 10,
      "releases": 5
    },
    "recognition": ["認知・採用事例があれば"],
    "community": {
      "activity": "コミュニティの活発さ",
      "support": "サポート体制の説明"
    }
  },
  "sections": [
    {
      "id": "hero",
      "title": "Hero Section",
      "type": "hero",
      "content": {
        "title": "魅力的なタイトル",
        "subtitle": "説得力のあるサブタイトル",
        "cta": "行動喚起文"
      },
      "priority": 1
    },
    {
      "id": "features",
      "title": "Key Features",
      "type": "features",
      "content": {
        "items": ["機能リスト"]
      },
      "priority": 2
    }
  ]
}`;

  let cleanContent = "";

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 3000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No response from OpenAI");

    // JSONクリーニング
    cleanContent = content
      .replace(/```json\n?|\n?```/g, "")
      .replace(/```\n?|\n?```/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .trim();

    const jsonStart = cleanContent.indexOf("{");
    const jsonEnd = cleanContent.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }

    // JSON修正: 制御文字とエスケープの処理
    cleanContent = cleanContent
      // 制御文字を除去（改行、タブ、制御文字）
      .replace(/[\x00-\x1F\x7F]/g, "")
      // 改行文字を\\nに変換
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      // 未エスケープの引用符を修正
      .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      // 末尾のカンマを除去
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // バックスラッシュの重複エスケープを修正
      .replace(/\\\\/g, "\\");

    return JSON.parse(cleanContent) as ContentAnalysis;
  } catch (error) {
    console.error("Content analysis generation failed:", error);
    if (cleanContent) {
      console.error("Problematic content:", cleanContent);
    }

    // フォールバック: 基本的なコンテンツ分析
    return {
      appeal: {
        uniqueValue: `${repoData.repo.name} provides powerful functionality for ${analysis.audience} developers`,
        keyBenefits: [
          "Easy to use and integrate",
          "Well-documented and maintained",
          "Active community support",
        ],
        targetUsers: [analysis.audience, "developers"],
        problemSolving: "Simplifies common development tasks",
      },
      usage: {
        installation: {
          method: "npm",
          command: `npm install ${repoData.repo.name}`,
          requirements: ["Node.js", "npm"],
        },
        quickStart: {
          steps: [
            "Install the package",
            "Import in your project",
            "Follow the basic usage examples",
          ],
          codeExample: `\`\`\`javascript\nimport ${repoData.repo.name} from '${repoData.repo.name}';\n\n// Basic usage\nconst result = ${repoData.repo.name}.run();\nconsole.log(result);\n\`\`\``,
        },
        advanced: {
          features: [
            "Advanced configuration",
            "Plugin system",
            "Custom integrations",
          ],
          useCases: [
            "Production environments",
            "Large-scale projects",
            "Enterprise solutions",
          ],
        },
      },
      features: {
        core: [
          {
            name: "Core Functionality",
            description: "Provides essential features for your project",
            benefit: "Saves development time and effort",
          },
        ],
        highlights: [
          {
            title: "High Performance",
            description: "Optimized for speed and efficiency",
            impact: "Faster development cycles",
          },
        ],
      },
      achievements: {
        metrics: {
          stars: repoData.repo.stargazers_count,
          forks: repoData.repo.forks_count,
          contributors: 10,
          releases: 5,
        },
        recognition: ["Community favorite", "Trusted by developers"],
        community: {
          activity: "Active development and community",
          support: "Community-driven support and documentation",
        },
      },
      sections: [
        {
          id: "hero",
          title: "Hero Section",
          type: "hero",
          content: {
            title: repoData.repo.name,
            subtitle: repoData.repo.description || "An amazing project",
            cta: "Get Started",
          },
          priority: 1,
        },
        {
          id: "features",
          title: "Features",
          type: "features",
          content: {
            items: [
              {
                title: "Feature 1",
                description: "First key feature of the project",
              },
              {
                title: "Feature 2",
                description: "Second key feature of the project",
              },
              {
                title: "Feature 3",
                description: "Third key feature of the project",
              },
            ],
          },
          priority: 2,
        },
      ],
    };
  }
}

/** Step 2: コンテンツ分析からセクション別コンテンツを生成 */
export function generateSectionContent(
  contentAnalysis: ContentAnalysis,
  sectionType: string
): SectionContent {
  switch (sectionType) {
    case "hero":
      return {
        title: contentAnalysis.appeal.uniqueValue.split(".")[0],
        subtitle: contentAnalysis.appeal.problemSolving,
        highlights: contentAnalysis.appeal.keyBenefits.slice(0, 3),
        cta: "Get Started",
      };

    case "features":
      return {
        title: "Key Features",
        subtitle: "Discover what makes this project special",
        items: contentAnalysis.features.core.map((feature) => ({
          title: feature.name,
          description: feature.description,
          benefit: feature.benefit,
          code: feature.codeSnippet,
        })),
      };

    case "installation":
      return {
        title: "Quick Start",
        subtitle: "Get up and running in minutes",
        installation: contentAnalysis.usage.installation,
        quickStart: contentAnalysis.usage.quickStart,
      };

    case "examples":
      return {
        title: "Usage Examples",
        subtitle: "See how to use this project in real scenarios",
        examples: contentAnalysis.usage.advanced.useCases.map(
          (useCase, index) => ({
            title: useCase,
            code: contentAnalysis.usage.quickStart.codeExample,
            description: `Example ${index + 1}: ${useCase}`,
          })
        ),
      };

    case "stats":
      return {
        title: "Project Stats",
        subtitle: "Trusted by the community",
        metrics: contentAnalysis.achievements.metrics,
        recognition: contentAnalysis.achievements.recognition,
      };

    default:
      return {
        title: "Section",
        subtitle: "Content",
        items: [],
      };
  }
}
