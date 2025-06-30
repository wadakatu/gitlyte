# GitLyte - Implementation Guide

## 🚀 Implementation Roadmap

この実装ガイドは、DESIGN_SPECIFICATION.mdで策定した設計を実際にコードに落とし込むための具体的な手順書です。

---

## 📁 New File Structure

### 実装すべきファイル構造
```
packages/gitlyte/
├── handlers/
│   └── pr-handler.ts              # ✅ 既存を大幅改修
├── services/
│   ├── repository-analyzer.ts     # 🆕 NEW: AI解析サービス
│   ├── site-generator.ts          # 🆕 NEW: サイト生成サービス  
│   ├── config-loader.ts           # ✅ 既存を改修
│   └── static-deployer.ts         # 🆕 NEW: 静的ファイル出力
├── templates/
│   ├── html/                      # 🆕 NEW: HTMLテンプレート
│   │   ├── base-layout.ts
│   │   ├── home-page.ts
│   │   ├── docs-page.ts
│   │   └── api-page.ts
│   ├── css/                       # 🆕 NEW: CSSテンプレート
│   │   ├── base-styles.ts
│   │   ├── themes.ts
│   │   └── components.ts
│   └── assets/                    # 🆕 NEW: 基本アセット
│       ├── favicon.ico
│       └── default-og.png
├── utils/
│   ├── openai-client.ts           # 🆕 NEW: OpenAI API wrapper
│   ├── github-api.ts              # ✅ 既存のgithub.tsを改修
│   └── content-processor.ts       # 🆕 NEW: Markdown処理など
└── types/
    ├── repository.ts              # 🆕 NEW: Repository型定義
    ├── config.ts                  # 🆕 NEW: Configuration型定義
    └── generated-site.ts          # 🆕 NEW: Generated Site型定義
```

---

## 🔄 Migration Strategy

### 既存コードの取り扱い

#### 削除対象
```
services/
├── ai-content-generator.ts       # ❌ DELETE: 新アーキテクチャで置換
├── ai-code-generator.ts          # ❌ DELETE: 新アーキテクチャで置換
├── astro-generator.ts            # ❌ DELETE: 静的生成に変更
├── ai-analyzer.ts                # ❌ DELETE: repository-analyzer.tsで置換
├── docs-generator.ts             # ❌ DELETE: site-generator.tsに統合
└── hybrid-generator.ts           # ❌ DELETE: 不要
```

#### 保持・改修対象
```
handlers/pr-handler.ts            # ✅ MODIFY: 新フローに対応
utils/github.ts                   # ✅ MODIFY: github-api.tsにリネーム・改修
utils/config-loader.ts            # ✅ MODIFY: gitlyte.json対応
types.ts                          # ✅ MODIFY: 型定義を新構造に合わせて分割
```

---

## 🧠 Core Services Implementation

### 1. Repository Analyzer Service

**ファイル**: `services/repository-analyzer.ts`

```typescript
export interface RepositoryAnalysis {
  basicInfo: {
    name: string;
    description: string;
    topics: string[];
    language: string;
    license: string;
  };
  
  codeAnalysis: {
    languages: Record<string, number>;
    hasTests: boolean;
    testCoverage?: number;
    hasDocumentation: boolean;
    codeComplexity: 'simple' | 'moderate' | 'complex';
  };
  
  contentAnalysis: {
    readme: {
      exists: boolean;
      content: string;
      sections: string[];
      hasInstallation: boolean;
      hasUsage: boolean;
      hasExamples: boolean;
    };
    
    hasChangelog: boolean;
    hasContributing: boolean;
    hasLicense: boolean;
    hasExamples: boolean;
  };
  
  projectCharacteristics: {
    type: 'library' | 'application' | 'tool' | 'framework' | 'game' | 'website';
    industry: 'web' | 'mobile' | 'ai' | 'data' | 'devtools' | 'gaming' | 'fintech' | 'other';
    audience: 'developers' | 'endusers' | 'enterprise' | 'researchers';
    maturity: 'experimental' | 'alpha' | 'beta' | 'stable' | 'mature';
  };
  
  technicalStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    deployment: string[];
    testing: string[];
  };
  
  uniqueFeatures: string[];
  competitiveAdvantages: string[];
  suggestedUseCases: string[];
}

export class RepositoryAnalyzer {
  async analyze(repoData: RepoData): Promise<RepositoryAnalysis> {
    // Implementation here
  }
  
  private async analyzeWithAI(repoData: RepoData): Promise<AIAnalysisResult> {
    // OpenAI API call for intelligent analysis
  }
  
  private async extractCodeFeatures(repoData: RepoData): Promise<CodeFeatures> {
    // Static code analysis
  }
}
```

### 2. Site Generator Service

**ファイル**: `services/site-generator.ts`

```typescript
export interface GeneratedSite {
  pages: {
    'index.html': string;
    'docs.html'?: string;
    'api.html'?: string;
    'examples.html'?: string;
    'changelog.html'?: string;
  };
  assets: {
    'style.css': string;
    'navigation.js': string;
  };
  meta: {
    sitemap: string;
    robotsTxt: string;
  };
}

export class SiteGenerator {
  async generate(
    analysis: RepositoryAnalysis, 
    config: GitLyteConfig
  ): Promise<GeneratedSite> {
    // Main generation logic
  }
  
  private async generateContent(analysis: RepositoryAnalysis): Promise<SiteContent> {
    // AI-powered content generation
  }
  
  private async generateDesign(analysis: RepositoryAnalysis, config: GitLyteConfig): Promise<DesignSystem> {
    // AI-powered design generation
  }
  
  private async buildPages(content: SiteContent, design: DesignSystem): Promise<GeneratedPages> {
    // HTML generation from templates
  }
}
```

### 3. Configuration Loader

**ファイル**: `services/config-loader.ts`

```typescript
export interface GitLyteConfig {
  version: string;
  site?: SiteConfig;
  design?: DesignConfig;
  content?: ContentConfig;
  pages?: PagesConfig;
  integrations?: IntegrationsConfig;
  seo?: SEOConfig;
}

export class ConfigLoader {
  async loadConfiguration(repoData: RepoData): Promise<GitLyteConfig> {
    // Priority-based config loading
  }
  
  private async loadFromGitLyteJson(repoData: RepoData): Promise<GitLyteConfig | null> {
    // Load from gitlyte.json
  }
  
  private async loadFromPackageJson(repoData: RepoData): Promise<Partial<GitLyteConfig> | null> {
    // Load from package.json gitlyte section
  }
  
  async validateConfig(config: GitLyteConfig): Promise<ValidationResult> {
    // Config validation and suggestions
  }
  
  async mergeWithAIDefaults(config: Partial<GitLyteConfig>, analysis: RepositoryAnalysis): Promise<GitLyteConfig> {
    // Smart merging of user config with AI-generated defaults
  }
}
```

---

## 🎨 Template System Implementation

### HTML Templates

**ファイル**: `templates/html/base-layout.ts`

```typescript
export const generateBaseLayout = (config: LayoutConfig): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title}</title>
  <meta name="description" content="${config.description}">
  <link rel="stylesheet" href="style.css">
  <link rel="icon" href="assets/favicon.ico">
  ${config.customHead || ''}
</head>
<body class="${config.theme}">
  <nav class="main-nav">
    ${generateNavigation(config.navigation)}
  </nav>
  
  <main>
    {{CONTENT}}
  </main>
  
  <footer class="main-footer">
    ${generateFooter(config.footer)}
  </footer>
  
  <script src="navigation.js"></script>
  ${config.customScripts || ''}
</body>
</html>
  `;
};
```

### CSS Generation

**ファイル**: `templates/css/base-styles.ts`

```typescript
export const generateBaseStyles = (design: DesignSystem): string => {
  return `
/* CSS Custom Properties */
:root {
  --color-primary: ${design.colors.primary};
  --color-secondary: ${design.colors.secondary};
  --color-accent: ${design.colors.accent};
  --color-background: ${design.colors.background};
  --color-text: ${design.colors.text};
  
  --font-heading: ${design.typography.headings};
  --font-body: ${design.typography.body};
  
  --border-radius: ${design.effects.borderRadius};
  --shadow: ${design.effects.shadow};
  --transition: ${design.effects.transition};
}

/* Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-background);
}

/* Component Styles */
${generateNavigationStyles(design)}
${generateHeroStyles(design)}
${generateFeatureStyles(design)}
${generateFooterStyles(design)}

/* Responsive Styles */
${generateResponsiveStyles(design)}
  `;
};
```

---

## 🔌 Integration Points

### OpenAI Client

**ファイル**: `utils/openai-client.ts`

```typescript
export class OpenAIClient {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  
  async analyzeRepository(repoData: RepoData): Promise<AIAnalysisResult> {
    // Repository analysis prompt
  }
  
  async generateContent(analysis: RepositoryAnalysis, contentType: ContentType): Promise<GeneratedContent> {
    // Content generation prompts
  }
  
  async generateDesign(analysis: RepositoryAnalysis, preferences?: DesignPreferences): Promise<DesignSystem> {
    // Design generation prompts
  }
  
  async suggestImprovements(config: GitLyteConfig, analysis: RepositoryAnalysis): Promise<Suggestion[]> {
    // Improvement suggestions
  }
}
```

### GitHub API Wrapper

**ファイル**: `utils/github-api.ts`

```typescript
export class GitHubAPI {
  async collectRepositoryData(context: Context): Promise<RepoData> {
    // Enhanced data collection
  }
  
  async enableGitHubPages(context: Context): Promise<void> {
    // Automatic Pages setup
  }
  
  async commitGeneratedSite(context: Context, site: GeneratedSite): Promise<void> {
    // Batch commit to docs/ folder
  }
  
  async postImprovementSuggestions(context: Context, suggestions: Suggestion[]): Promise<void> {
    // Comment with suggestions
  }
}
```

---

## 🔄 New PR Handler Flow

**ファイル**: `handlers/pr-handler.ts`

```typescript
export async function handleFeaturePR(ctx: Context, pr: PullRequest) {
  try {
    // 1. Repository Data Collection
    const repoData = await githubAPI.collectRepositoryData(ctx);
    
    // 2. Configuration Loading
    const config = await configLoader.loadConfiguration(repoData);
    
    // 3. Repository Analysis
    const analysis = await repositoryAnalyzer.analyze(repoData);
    
    // 4. Site Generation
    const site = await siteGenerator.generate(analysis, config);
    
    // 5. Validation & Suggestions
    const suggestions = await configLoader.validateConfig(config);
    
    // 6. Deploy Static Files
    await staticDeployer.deploy(ctx, site);
    
    // 7. Enable GitHub Pages
    await githubAPI.enableGitHubPages(ctx);
    
    // 8. Post Improvements (if any)
    if (suggestions.length > 0) {
      await githubAPI.postImprovementSuggestions(ctx, suggestions);
    }
    
    ctx.log.info('✅ GitLyte site generated successfully');
    
  } catch (error) {
    ctx.log.error('❌ Site generation failed:', error);
    // Fallback generation
    await generateFallbackSite(ctx, repoData);
  }
}
```

---

## 📝 Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Create new file structure
- [ ] Implement basic TypeScript types
- [ ] Set up OpenAI client wrapper
- [ ] Create GitHub API wrapper
- [ ] Implement config loader base

### Phase 2: Core Services (Week 2)
- [ ] Implement Repository Analyzer
- [ ] Create AI analysis prompts
- [ ] Build Site Generator foundation
- [ ] Implement HTML template system
- [ ] Create CSS generation system

### Phase 3: Content Generation (Week 3)  
- [ ] Implement AI content generation
- [ ] Create page generation logic
- [ ] Build navigation system
- [ ] Implement responsive design
- [ ] Add asset management

### Phase 4: Configuration System (Week 4)
- [ ] Implement gitlyte.json loading
- [ ] Create config validation
- [ ] Build smart merge logic
- [ ] Add improvement suggestions
- [ ] Implement fallback strategies

### Phase 5: Integration & Testing (Week 5)
- [ ] Update PR handler
- [ ] Implement static file deployment
- [ ] Add GitHub Pages automation
- [ ] Create comprehensive tests
- [ ] Performance optimization

---

## 🧪 Testing Strategy

### Unit Tests
- Repository analyzer logic
- Configuration merging
- Template generation
- CSS generation

### Integration Tests
- End-to-end site generation
- GitHub API interactions
- OpenAI API calls
- Error handling flows

### Manual Testing
- Various repository types
- Different configuration scenarios
- GitHub Pages deployment
- Mobile responsiveness

---

*Generated: 2024-12-29*
*Implementation Target: January 2025*