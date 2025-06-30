import OpenAI from "openai";
import type { RepoData } from "../types/repository.js";
import type { RepositoryAnalysis } from "../types/repository.js";

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
    dynamicCards: Array<{
      title: string;
      icon: string;
      description: string;
      priority: number; // 表示優先度 1-10
    }>; // 動的生成カード
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
    whyChoose: Array<{
      icon: string;
      title: string;
      description: string;
      highlight: string;
      priority: number;
    }>; // Why Choose This Project用動的カード
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
/**
 * Why Choose This Project用フォールバックカード生成
 */
function generateWhyChooseCards(projectType: string, techStack: string[]) {
  const whyChooseTemplates = {
    library: [
      {
        icon: "⚡",
        title: "High Performance",
        description:
          "Optimized algorithms and minimal overhead for maximum speed",
        highlight: "10x faster",
        priority: 10,
      },
      {
        icon: "🔧",
        title: "Easy Integration",
        description: "Simple installation and intuitive API design",
        highlight: "5-minute setup",
        priority: 9,
      },
      {
        icon: "📚",
        title: "Rich Documentation",
        description: "Comprehensive guides, examples, and API references",
        highlight: "100% coverage",
        priority: 8,
      },
      {
        icon: "🌟",
        title: "Active Community",
        description:
          "Vibrant ecosystem with regular updates and community support",
        highlight: "1000+ contributors",
        priority: 7,
      },
    ],
    application: [
      {
        icon: "🎯",
        title: "User-Focused Design",
        description: "Intuitive interface designed for optimal user experience",
        highlight: "95% satisfaction",
        priority: 10,
      },
      {
        icon: "🚀",
        title: "Scalable Architecture",
        description: "Built to handle growth from startup to enterprise scale",
        highlight: "Million+ users",
        priority: 9,
      },
      {
        icon: "🛡️",
        title: "Enterprise Security",
        description: "Industry-standard security practices and compliance",
        highlight: "SOC 2 certified",
        priority: 8,
      },
      {
        icon: "🔄",
        title: "Continuous Updates",
        description: "Regular feature releases and security patches",
        highlight: "Weekly releases",
        priority: 7,
      },
    ],
    tool: [
      {
        icon: "⚡",
        title: "Productivity Boost",
        description: "Automate repetitive tasks and streamline workflows",
        highlight: "80% time saved",
        priority: 10,
      },
      {
        icon: "🔧",
        title: "Highly Customizable",
        description: "Flexible configuration options for any workflow",
        highlight: "500+ options",
        priority: 9,
      },
      {
        icon: "🌐",
        title: "Cross-Platform",
        description: "Works seamlessly across all major operating systems",
        highlight: "All platforms",
        priority: 8,
      },
      {
        icon: "💡",
        title: "Smart Automation",
        description: "Intelligent features that learn from your usage patterns",
        highlight: "AI-powered",
        priority: 7,
      },
    ],
    website: [
      {
        icon: "📱",
        title: "Responsive Design",
        description: "Perfect display on all devices and screen sizes",
        highlight: "100% mobile",
        priority: 10,
      },
      {
        icon: "⚡",
        title: "Lightning Fast",
        description: "Optimized loading times for better user experience",
        highlight: "<1s load time",
        priority: 9,
      },
      {
        icon: "🎯",
        title: "SEO Optimized",
        description: "Built-in SEO best practices for maximum visibility",
        highlight: "Top rankings",
        priority: 8,
      },
      {
        icon: "♿",
        title: "Accessible",
        description: "WCAG compliant design for inclusive user experience",
        highlight: "AA compliant",
        priority: 7,
      },
    ],
    documentation: [
      {
        icon: "📖",
        title: "Clear & Comprehensive",
        description: "Well-structured documentation that's easy to follow",
        highlight: "99% helpful",
        priority: 10,
      },
      {
        icon: "🔍",
        title: "Searchable Content",
        description:
          "Find information quickly with powerful search capabilities",
        highlight: "Instant results",
        priority: 9,
      },
      {
        icon: "💡",
        title: "Rich Examples",
        description: "Practical code examples and real-world use cases",
        highlight: "500+ examples",
        priority: 8,
      },
      {
        icon: "🔄",
        title: "Always Updated",
        description: "Documentation stays current with every code change",
        highlight: "Real-time sync",
        priority: 7,
      },
    ],
    game: [
      {
        icon: "🎮",
        title: "Immersive Experience",
        description: "Engaging gameplay with stunning visuals and sound",
        highlight: "4.9/5 rating",
        priority: 10,
      },
      {
        icon: "🏆",
        title: "Competitive Features",
        description: "Leaderboards, achievements, and multiplayer modes",
        highlight: "Global rankings",
        priority: 9,
      },
      {
        icon: "🎨",
        title: "Beautiful Graphics",
        description: "High-quality visuals optimized for all devices",
        highlight: "4K support",
        priority: 8,
      },
      {
        icon: "🔄",
        title: "Regular Content",
        description: "New levels, characters, and features added regularly",
        highlight: "Monthly updates",
        priority: 7,
      },
    ],
  };

  const baseCards =
    whyChooseTemplates[projectType as keyof typeof whyChooseTemplates] ||
    whyChooseTemplates.library;

  // 技術スタックに応じて追加カードを生成
  const techCards = techStack.slice(0, 2).map((tech, index) => ({
    icon: getTechIcon(tech),
    title: `${tech} Powered`,
    description: `Leveraging the full potential of ${tech} for optimal performance`,
    highlight: `${tech} optimized`,
    priority: 6 - index,
  }));

  return [...baseCards.slice(0, 4), ...techCards].slice(0, 6);
}

/**
 * プロジェクトタイプに基づいたフォールバックカード生成
 */
function generateFallbackCards(projectType: string, techStack: string[]) {
  const cardTemplates = {
    library: [
      {
        title: "簡単導入",
        icon: "🚀",
        description: "プロジェクトへの統合が簡単で、最小限の設定で利用開始可能",
        priority: 10,
      },
      {
        title: "高性能",
        icon: "⚡",
        description: "最適化されたコードで高速処理を実現",
        priority: 9,
      },
      {
        title: "豊富なAPI",
        icon: "🔧",
        description: "充実したAPIで柔軟な開発が可能",
        priority: 8,
      },
      {
        title: "活発コミュニティ",
        icon: "🌟",
        description: "アクティブなコミュニティサポート",
        priority: 7,
      },
    ],
    application: [
      {
        title: "優れたUX",
        icon: "🎯",
        description: "ユーザビリティを重視した直感的なインターフェース",
        priority: 10,
      },
      {
        title: "スケーラブル",
        icon: "📊",
        description: "成長に対応できる拡張性の高いアーキテクチャ",
        priority: 9,
      },
      {
        title: "セキュア",
        icon: "🛡️",
        description: "エンタープライズ級のセキュリティ対策",
        priority: 8,
      },
      {
        title: "機能豊富",
        icon: "💡",
        description: "包括的な機能セットで様々なニーズに対応",
        priority: 7,
      },
    ],
    tool: [
      {
        title: "効率向上",
        icon: "⚡",
        description: "作業効率を大幅に向上させる自動化機能",
        priority: 10,
      },
      {
        title: "カスタマイズ",
        icon: "🔧",
        description: "ニーズに合わせて柔軟にカスタマイズ可能",
        priority: 9,
      },
      {
        title: "互換性",
        icon: "🌐",
        description: "既存のワークフローと簡単に統合",
        priority: 8,
      },
      {
        title: "省時間",
        icon: "⏱️",
        description: "手動作業を削減し、貴重な時間を節約",
        priority: 7,
      },
    ],
    website: [
      {
        title: "レスポンシブ",
        icon: "📱",
        description: "あらゆるデバイスで最適な表示を実現",
        priority: 10,
      },
      {
        title: "高速表示",
        icon: "⚡",
        description: "最適化により高速なページ読み込み",
        priority: 9,
      },
      {
        title: "SEO最適化",
        icon: "🎯",
        description: "検索エンジンに最適化された構造",
        priority: 8,
      },
      {
        title: "アクセシブル",
        icon: "♿",
        description: "誰でも利用しやすいアクセシビリティ対応",
        priority: 7,
      },
    ],
    documentation: [
      {
        title: "分かりやすい",
        icon: "📖",
        description: "初心者にも理解しやすい丁寧な説明",
        priority: 10,
      },
      {
        title: "包括的",
        icon: "📋",
        description: "必要な情報を網羅した完全なドキュメント",
        priority: 9,
      },
      {
        title: "実例豊富",
        icon: "💡",
        description: "実用的なコード例とサンプル",
        priority: 8,
      },
      {
        title: "検索可能",
        icon: "🔍",
        description: "必要な情報を素早く見つけられる検索機能",
        priority: 7,
      },
    ],
    game: [
      {
        title: "エンゲージング",
        icon: "🎮",
        description: "没入感のあるゲームプレイ体験",
        priority: 10,
      },
      {
        title: "高品質",
        icon: "🏆",
        description: "美しいグラフィックとサウンド",
        priority: 9,
      },
      {
        title: "マルチプレイ",
        icon: "👥",
        description: "友達と一緒に楽しめる機能",
        priority: 8,
      },
      {
        title: "定期更新",
        icon: "🔄",
        description: "継続的なコンテンツ追加",
        priority: 7,
      },
    ],
  };

  const baseCards =
    cardTemplates[projectType as keyof typeof cardTemplates] ||
    cardTemplates.library;

  // 技術スタックに応じて追加カードを生成
  const techCards = techStack.slice(0, 2).map((tech, index) => ({
    title: `${tech}活用`,
    icon: getTechIcon(tech),
    description: `${tech}の力を最大限に活用した実装`,
    priority: 6 - index,
  }));

  return [...baseCards.slice(0, 4), ...techCards].slice(0, 6);
}

/**
 * 技術スタックに応じたアイコン取得
 */
function getTechIcon(tech: string): string {
  const techIcons: Record<string, string> = {
    JavaScript: "🟨",
    TypeScript: "🔷",
    Python: "🐍",
    React: "⚛️",
    Vue: "💚",
    Angular: "🅰️",
    "Node.js": "🟢",
    Java: "☕",
    "C++": "⚙️",
    Go: "🐹",
    Rust: "🦀",
    PHP: "🐘",
    Ruby: "💎",
    Swift: "🍎",
    Kotlin: "🎯",
    Docker: "🐳",
    AWS: "☁️",
    Firebase: "🔥",
  };

  return techIcons[tech] || "💻";
}

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
  client: OpenAI,
  params: OpenAI.Chat.ChatCompletionCreateParams,
  options: { timeout?: number } = {},
  maxRetries = 3,
  delay = 2000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(params, options);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(`Attempt ${attempt} failed:`, errorMessage);

      if (attempt === maxRetries) {
        throw error;
      }

      // 指数バックオフで待機
      const waitTime = delay * 2 ** (attempt - 1);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // この行は理論的に到達しないが、TypeScriptの型チェックを満たすため
  throw new Error("Unexpected end of retry loop");
}

export async function analyzeRepositoryContent(
  repoData: RepoData,
  analysis: RepositoryAnalysis
): Promise<ContentAnalysis> {
  const prompt = `
あなたはテクニカルライティングとマーケティングの専門家です。以下のリポジトリ情報を詳細に分析し、このプロジェクトの魅力を最大限に伝えるコンテンツ戦略を立案してください。

## リポジトリ情報
- 名前: ${repoData.basicInfo.name}
- 説明: ${repoData.basicInfo.description || "説明なし"}
- Stars: ${repoData.basicInfo.stargazers_count}
- Forks: ${repoData.basicInfo.forks_count}
- Issues: ${repoData.issues.length}
- PRs: ${repoData.prs.length}

## README内容
${repoData.readme.slice(0, 3000)}

## プロジェクト分析
- タイプ: ${analysis.projectCharacteristics.type}
- 技術スタック: ${analysis.technicalStack.frontend.join(", ")}
- 対象ユーザー: ${analysis.projectCharacteristics.audience}
- 複雑度: ${analysis.codeAnalysis.codeComplexity}

## 最近のPR（参考）
${repoData.prs
  .slice(0, 5)
  .map((pr) => `- ${pr.title}`)
  .join("\n")}

このプロジェクトの価値と魅力を最大限に伝える包括的なコンテンツ分析を以下のJSON形式で作成してください：

## 動的カード生成の指針
- **dynamicCards**: プロジェクトの特性に応じて3-6枚のカードを生成（About This Project用）
- **whyChoose**: プロジェクトを選ぶ理由を表す3-6枚のカードを生成（Why Choose This Project用）
- **title**: プロジェクトタイプと技術スタックに応じた具体的なタイトル
- **icon**: 内容に合った絵文字（🚀⚡🛡️🌟💡🔧📊🎯🏆⭐など）
- **description**: 各カードの具体的なメリットや特徴
- **highlight**: 数値や短いキャッチコピー（Why Choose用）
- **priority**: 表示優先度（1-10、高いほど重要）
- プロジェクトタイプ別推奨カード：
  - Library: "簡単導入", "高性能", "豊富なAPI", "活発コミュニティ"
  - Application: "ユーザビリティ", "スケーラビリティ", "セキュリティ", "機能豊富"
  - Tool: "効率向上", "自動化", "カスタマイズ性", "互換性"

{
  "appeal": {
    "uniqueValue": "このプロジェクトの独自価値（1-2文）",
    "keyBenefits": ["メリット1", "メリット2", "メリット3"],
    "targetUsers": ["ユーザー層1", "ユーザー層2"],
    "problemSolving": "解決する具体的な問題",
    "dynamicCards": [
      {
        "title": "プロジェクト特性に合った魅力的なタイトル",
        "icon": "🚀",
        "description": "このカードの説明文",
        "priority": 10
      },
      {
        "title": "技術スタックに応じたタイトル",
        "icon": "⚡",
        "description": "このカードの説明文",
        "priority": 9
      }
    ]
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
    ],
    "whyChoose": [
      {
        "icon": "⚡",
        "title": "プロジェクトを選ぶ理由のタイトル",
        "description": "なぜこのプロジェクトが優れているかの説明",
        "highlight": "99.9% uptime",
        "priority": 10
      },
      {
        "icon": "🔧",
        "title": "別の選択理由",
        "description": "このプロジェクトの魅力的な特徴",
        "highlight": "5-minute setup",
        "priority": 9
      }
    ]
  },
  "achievements": {
    "metrics": {
      "stars": ${repoData.basicInfo.stargazers_count},
      "forks": ${repoData.basicInfo.forks_count},
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
    const response = (await callOpenAIWithRetry(
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
    )) as OpenAI.Chat.ChatCompletion;

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
      const apiError = error as { code?: string; message?: string };
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
      analysis.projectCharacteristics.type,
      repoData.basicInfo.name
    );
    return {
      appeal: {
        uniqueValue: projectTypeContent.uniqueValue,
        keyBenefits: projectTypeContent.keyBenefits,
        targetUsers: [
          analysis.projectCharacteristics.audience,
          "developers",
          "engineers",
        ],
        problemSolving: projectTypeContent.problemSolving,
        dynamicCards: generateFallbackCards(
          analysis.projectCharacteristics.type,
          analysis.technicalStack.frontend
        ),
      },
      usage: {
        installation: {
          method: "npm",
          command: `npm install ${repoData.basicInfo.name}`,
          requirements: ["Node.js", "npm"],
        },
        quickStart: {
          steps: [
            "Install the package",
            "Import in your project",
            "Follow the basic usage examples",
          ],
          codeExample: `\`\`\`javascript\nimport ${repoData.basicInfo.name} from '${repoData.basicInfo.name}';\n\n// Basic usage\nconst result = ${repoData.basicInfo.name}.run();\nconsole.log(result);\n\`\`\``,
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
        whyChoose: generateWhyChooseCards(
          analysis.projectCharacteristics.type,
          analysis.technicalStack.frontend
        ),
      },
      achievements: {
        metrics: {
          stars: repoData.basicInfo.stargazers_count,
          forks: repoData.basicInfo.forks_count,
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
            title: repoData.basicInfo.name,
            subtitle: repoData.basicInfo.description || "An amazing project",
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
