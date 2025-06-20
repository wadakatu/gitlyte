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
/**
 * プロジェクトタイプに基づいたコンテンツ生成
 */
function getProjectTypeContent(projectType: string, projectName: string) {
  const contentMap = {
    library: {
      uniqueValue: `${projectName} is a powerful and flexible library that simplifies development workflows`,
      keyBenefits: [
        "Easy integration with existing projects",
        "Comprehensive documentation and examples",
        "Lightweight and performant",
        "Well-tested and reliable",
      ],
      problemSolving:
        "Streamlines common development tasks and reduces boilerplate code",
    },
    application: {
      uniqueValue: `${projectName} delivers a complete solution for modern application development`,
      keyBenefits: [
        "Full-featured application framework",
        "Scalable architecture",
        "Rich user interface",
        "Production-ready deployment",
      ],
      problemSolving:
        "Provides end-to-end application development capabilities",
    },
    tool: {
      uniqueValue: `${projectName} is an essential developer tool that enhances productivity`,
      keyBenefits: [
        "Command-line interface for efficiency",
        "Automation capabilities",
        "Cross-platform compatibility",
        "Integration with popular workflows",
      ],
      problemSolving:
        "Automates repetitive tasks and improves development efficiency",
    },
    website: {
      uniqueValue: `${projectName} creates stunning and responsive web experiences`,
      keyBenefits: [
        "Modern web technologies",
        "Responsive design",
        "SEO optimized",
        "Fast loading performance",
      ],
      problemSolving:
        "Delivers engaging web experiences with optimal performance",
    },
    documentation: {
      uniqueValue: `${projectName} provides comprehensive and accessible documentation`,
      keyBenefits: [
        "Clear and detailed explanations",
        "Interactive examples",
        "Searchable content",
        "Regular updates",
      ],
      problemSolving: "Makes complex concepts easy to understand and implement",
    },
    game: {
      uniqueValue: `${projectName} offers an immersive and entertaining gaming experience`,
      keyBenefits: [
        "Engaging gameplay mechanics",
        "High-quality graphics",
        "Smooth performance",
        "Regular content updates",
      ],
      problemSolving: "Provides entertainment and challenge for players",
    },
  };

  return (
    contentMap[projectType as keyof typeof contentMap] || contentMap.library
  );
}

/**
 * リトライ機能付きのOpenAI API呼び出し
 */
async function callOpenAIWithRetry(
  client: any,
  params: any,
  options: any = {},
  maxRetries = 3,
  delay = 2000
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(params, options);
    } catch (error: any) {
      console.log(`Attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // 指数バックオフで待機
      const waitTime = delay * 2 ** (attempt - 1);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

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
        "codeSnippet": "関連するコード例（1行で記述、改行や特殊文字は避ける）"
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
    const response = await callOpenAIWithRetry(
      client,
      {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 3000,
      },
      {
        timeout: 60000, // 60秒タイムアウト
      }
    );

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

    // JSON修正: 段階的な文字列処理
    try {
      // 1. 基本的なクリーニング
      cleanContent = cleanContent
        // プロパティ名をクォート
        .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
        // シングルクォートをダブルクォートに変換（文字列値のみ）
        .replace(/:\s*'([^']*)'/g, ': "$1"');

      // 2. 改行文字を含む文字列値を安全に処理
      cleanContent = cleanContent.replace(/:\s*"([^"]*?)"/g, (_, content) => {
        // 文字列内の改行をエスケープ
        const escapedContent = content
          .replace(/\\/g, "\\\\") // バックスラッシュをエスケープ
          .replace(/"/g, '\\"') // ダブルクォートをエスケープ
          .replace(/\n/g, "\\n") // 改行をエスケープ
          .replace(/\r/g, "\\r") // キャリッジリターンをエスケープ
          .replace(/\t/g, "\\t"); // タブをエスケープ
        return `: "${escapedContent}"`;
      });

      // 3. 末尾のカンマを除去
      cleanContent = cleanContent
        .replace(/,(\s*[}\]])/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

      // 4. JSONの妥当性チェック
      if (!cleanContent.startsWith("{") || !cleanContent.endsWith("}")) {
        throw new Error("Invalid JSON structure");
      }
    } catch (cleaningError) {
      console.error("JSON cleaning failed:", cleaningError);
      throw new Error("Failed to clean JSON response");
    }

    return JSON.parse(cleanContent) as ContentAnalysis;
  } catch (error) {
    console.error("Content analysis generation failed:", error);
    if (cleanContent) {
      console.error("Problematic content:", cleanContent);
    }

    // エラーの種類によって詳細ログを出力
    if (error && typeof error === "object") {
      const apiError = error as any;
      if (apiError.code === "UND_ERR_SOCKET") {
        console.error(
          "Network connection error detected. Using fallback content."
        );
      } else if (apiError.message?.includes("terminated")) {
        console.error(
          "Request terminated error detected. Using fallback content."
        );
      } else if (apiError.message?.includes("timeout")) {
        console.error("Timeout error detected. Using fallback content.");
      }
    }

    // フォールバック: プロジェクト特性に基づいた詳細なコンテンツ分析
    const projectTypeContent = getProjectTypeContent(
      analysis.projectType,
      repoData.repo.name
    );
    return {
      appeal: {
        uniqueValue: projectTypeContent.uniqueValue,
        keyBenefits: projectTypeContent.keyBenefits,
        targetUsers: [analysis.audience, "developers", "engineers"],
        problemSolving: projectTypeContent.problemSolving,
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
