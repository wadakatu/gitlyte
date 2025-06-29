# GitLyte - Design Specification

## 🎯 Project Overview

GitLyteは、GitHubリポジトリの内容をAIで解析し、そのリポジトリに最適化されたWebサイトを自動生成してGitHub Pagesで公開するGitHub Appです。

### Core Mission
- **AI解析**: リポジトリのコード、README、技術スタックを深く分析
- **完全オリジナル生成**: 各リポジトリ専用のユニークなWebサイトを生成
- **ユーザーフレンドリー**: 最小限の設定でプロフェッショナルなサイトを提供
- **カスタマイズ対応**: gitlyte.jsonによる柔軟なカスタマイズ機能

---

## 🏗️ Architecture Design

### 完全静的ファイル生成アプローチ

**選択理由**: ユーザビリティ最優先
- ビルドプロセス不要
- GitHub Actionsの設定不要
- エラー発生率最小化
- 即座のデプロイ

### File Structure
```
packages/gitlyte/
├── handlers/
│   └── pr-handler.ts          # PRハンドラー（エントリーポイント）
├── services/
│   ├── analyzer.ts            # リポジトリAI解析
│   ├── generator.ts           # HTML/CSS完全生成
│   └── deployer.ts            # 静的ファイル出力
├── templates/
│   ├── html-template.ts       # HTMLテンプレート
│   ├── css-template.ts        # CSSテンプレート
│   └── assets/                # 基本アセット
└── utils/
    ├── github.ts              # GitHub API
    └── openai.ts              # OpenAI API
```

### Processing Flow
```
PR merge → AI Analysis → Generate Complete Files → Commit to docs/
```

---

## 🧠 AI Analysis Strategy

### Repository Data Collection
```typescript
interface RepositoryData {
  // Basic Info
  name: string;
  description: string;
  topics: string[];
  
  // Content Analysis  
  readme: string;
  codeStructure: CodeAnalysis;
  languages: Record<string, number>;
  
  // Project Characteristics
  projectType: 'library' | 'app' | 'tool' | 'framework' | 'game' | 'website';
  industry: 'web' | 'mobile' | 'ai' | 'data' | 'devtools' | 'gaming' | 'fintech';
  audience: 'developers' | 'endusers' | 'enterprise' | 'researchers';
  
  // Tech Stack
  frontend: string[];
  backend: string[];
  database: string[];
  deployment: string[];
  
  // Unique Features
  uniqueFeatures: string[];
  competitiveAdvantages: string[];
  useCases: string[];
}
```

### AI Generation Process
1. **Repository Analysis**: プロジェクトの特性と技術スタックを分析
2. **Content Generation**: プロジェクト固有のコンテンツを生成
3. **Design Strategy**: 業界・用途に最適化されたデザインを生成
4. **Code Generation**: 完全なHTML/CSSファイルを生成

---

## 🌐 Multi-Page Site Generation

### Generated Site Structure
```
docs/
├── index.html              # ホームページ
├── docs.html               # ドキュメント（READMEベース）
├── api.html                # API仕様（条件付き生成）
├── examples.html           # 使用例・デモ（条件付き生成）
├── changelog.html          # 変更履歴（条件付き生成）
├── style.css               # 共通CSS
├── assets/
│   ├── favicon.ico
│   ├── logo.png
│   └── screenshots/
└── js/
    └── navigation.js       # ナビゲーション
```

### Page Generation Logic
- **index.html**: 必ず生成（Hero, Features, Stats, CTA）
- **docs.html**: README.mdが存在する場合に生成
- **api.html**: TypeScript/JavaScriptプロジェクトでJSDocがある場合
- **examples.html**: examples/, demos/, samples/フォルダがある場合
- **changelog.html**: CHANGELOG.md, HISTORY.mdがある場合

### Navigation System
- 共通ナビゲーションバー
- アクティブページハイライト
- レスポンシブデザイン
- モバイル対応メニュー

---

## 🎨 Complete Originality System

### Project-Specific Customization

#### 1. Dynamic Color Palette Generation
```typescript
// AIが各プロジェクトに最適な色を生成
const generateProjectColors = async (analysis: RepoAnalysis): Promise<ColorScheme> => {
  // プロジェクトタイプ、業界、ユーザー層に基づいて色を生成
  // 例: FinTech → 信頼性の青緑、Gaming → 活気のある原色
};
```

#### 2. Industry-Specific Design Patterns
```typescript
const industryDesignPatterns = {
  'fintech': {
    style: 'professional-secure',
    colors: 'blue-green-trust',
    elements: ['security-badges', 'testimonials']
  },
  'gaming': {
    style: 'dynamic-energetic', 
    colors: 'vibrant-neon',
    elements: ['animations', 'screenshots']
  },
  'ai': {
    style: 'futuristic-minimal',
    colors: 'purple-blue-gradient',
    elements: ['data-visualizations']
  }
};
```

#### 3. Code-Based Feature Extraction
```typescript
// 実際のコードから機能を抽出してコンテンツに反映
const analyzeCodeFeatures = async (codeStructure: CodeAnalysis): Promise<Feature[]> => {
  // TypeScript → Type-Safe Development
  // Test Coverage → Battle-Tested Quality  
  // Documentation → Comprehensive Guides
};
```

---

## ⚙️ User Customization System

### gitlyte.json Configuration

#### Basic Structure
```json
{
  "version": "1.0",
  "site": {
    "title": "Custom Site Title",
    "description": "Custom description",
    "logo": "./assets/logo.png",
    "url": "https://custom-domain.com"
  },
  "design": {
    "theme": "professional" | "creative" | "minimal" | "custom",
    "colors": {
      "primary": "#3B82F6",
      "secondary": "#8B5CF6",
      "accent": "#06B6D4"
    },
    "typography": {
      "headings": "Inter, sans-serif",
      "body": "System UI, sans-serif"
    },
    "layout": "hero-focused" | "documentation" | "product-showcase"
  },
  "content": {
    "hero": {
      "title": "Custom Hero Title",
      "subtitle": "Custom subtitle",
      "cta": {
        "primary": { "text": "Get Started", "url": "#docs" }
      }
    },
    "features": [
      {
        "title": "Custom Feature",
        "description": "Feature description",
        "icon": "⚡"
      }
    ]
  },
  "pages": {
    "generate": ["index", "docs", "api", "examples"]
  },
  "integrations": {
    "analytics": { "google": "GA_TRACKING_ID" },
    "demo": "https://live-demo.example.com"
  }
}
```

### Customization Levels
1. **Basic**: テーマ、色、タイトルの簡単設定
2. **Advanced**: 詳細なデザイン・コンテンツ設定
3. **Expert**: カスタムCSS/HTML/JS

### Smart Integration Strategy
```typescript
const generateSiteWithUserConfig = async (repoData: RepoData, userConfig?: GitLyteConfig) => {
  // 1. AI分析（常に実行）
  const aiAnalysis = await analyzeRepository(repoData);
  
  // 2. ユーザー設定とAI生成の智的統合
  const mergedConfig = await smartMerge(aiAnalysis, userConfig);
  
  // 3. バリデーション＆提案
  const suggestions = await validateAndSuggest(mergedConfig);
  
  // 4. サイト生成
  return await generateSite(mergedConfig);
};
```

---

## 🚀 Deployment Strategy

### User Experience Flow
1. **PR作成**: `enhancement`または`feat`ラベル付きでPRをマージ
2. **自動生成**: GitLyteが自動で`docs/`フォルダにサイトを生成
3. **Pages設定**: GitHub Pages設定を**Deploy from branch → docs**に変更
4. **公開完了**: `https://username.github.io/repository-name/`で即座に公開

### Generated Output
```
docs/
├── index.html              # 完成されたHTMLファイル
├── style.css               # 完成されたCSSファイル  
├── assets/                 # 必要なアセット
└── README.md               # Pages用の説明
```

### Automation Features
- GitHub Pages設定の自動有効化（API経由）
- 設定手順の自動ドキュメント生成
- 初回生成時の完了通知

---

## 🛡️ Fallback Strategy

### Configuration Loading Priority
1. `./gitlyte.json` (最優先)
2. `./package.json` (gitlyteセクション)
3. `./.github/gitlyte.json`
4. AI-generated defaults

### Error Handling
```typescript
const generateWithFallback = async (config: GitLyteConfig, repoData: RepoData) => {
  try {
    return await generateSite(config, repoData);        // AI生成
  } catch (aiError) {
    return await generateFromTemplate(config, repoData); // テンプレート
  } catch (templateError) {
    return generateMinimalSite(repoData);               // 最小限サイト
  }
};
```

---

## 📊 Success Metrics

### Technical Goals
- ✅ 100%静的ファイル生成
- ✅ ビルドプロセス不要
- ✅ 複数ページ対応
- ✅ レスポンシブデザイン
- ✅ 完全オリジナルコンテンツ

### User Experience Goals  
- ✅ 3ステップ以内での公開
- ✅ 設定ファイルなしでも高品質
- ✅ 段階的カスタマイズ対応
- ✅ エラー時の安全なフォールバック

---

## 🎯 Implementation Priority

### Phase 1: 基盤実装
1. 新しいフォルダ構造作成
2. 基本的なPRハンドラー実装
3. GitHub APIユーティリティ実装

### Phase 2: AI解析実装
1. リポジトリデータ収集
2. OpenAI解析サービス実装
3. コンテンツ生成サービス実装

### Phase 3: サイト生成実装
1. HTMLテンプレート作成
2. CSSテーマ実装
3. ファイル生成ロジック実装

### Phase 4: カスタマイズ実装
1. gitlyte.json読み込み機能
2. 設定統合ロジック
3. バリデーション＆提案機能

### Phase 5: デプロイ最適化
1. GitHub Pages設定自動化
2. エラーハンドリング強化
3. パフォーマンス最適化

---

*Generated: 2024-12-29*
*Last Updated: 2024-12-29*