import type { RepoData } from "../types.js";
import type { DesignStrategy, RepoAnalysis } from "./ai-analyzer.js";
import {
  analyzeRepositoryContent,
  type ContentAnalysis,
} from "./content-analyzer.js";
import { generateDocsPage } from "./docs-generator.js";
import { detectRepoLogo } from "../utils/logo-detector.js";
// Note: Shared design system is now used in generated components

// 型拡張: 新しいデザインプロパティを含む
export interface EnhancedDesignStrategy
  extends Omit<DesignStrategy, "effects"> {
  effects: {
    blur: boolean;
    shadows: "subtle" | "prominent" | "none";
    borders: "rounded" | "sharp" | "pill";
    spacing: "tight" | "normal" | "spacious";
  };
}

export interface GeneratedAstroSite {
  packageJson: string;
  astroConfig: string;
  layout: string;
  heroComponent: string;
  featuresComponent: string;
  indexPage: string;
  docsPage?: string; // 新しく追加
  globalStyles: string;
}

/** Step 3: 分析とデザイン戦略からAstroコードを生成 */
export async function generateAstroSite(
  repoData: RepoData,
  analysis: RepoAnalysis,
  design: DesignStrategy
): Promise<GeneratedAstroSite> {
  // デザイン戦略を拡張形式に変換
  const enhancedDesign: EnhancedDesignStrategy = {
    ...design,
    effects: design.effects || {
      blur: true,
      shadows: "subtle",
      borders: "rounded",
      spacing: "normal",
    },
  };

  // コンテンツ分析を実行
  const contentAnalysis = await analyzeRepositoryContent(repoData, analysis);

  // ロゴ検出を実行（設定ファイルのみ）
  const logoResult = await detectRepoLogo(repoData);

  const baseContext = `
リポジトリ情報:
- 名前: ${repoData.repo.name}
- 説明: ${repoData.repo.description}
- Stars: ${repoData.repo.stargazers_count}
- Forks: ${repoData.repo.forks_count}

分析結果:
- プロジェクトタイプ: ${analysis.projectType}
- 対象ユーザー: ${analysis.audience}
- トーン: ${analysis.tone}

デザイン戦略:
- カラースキーム: ${JSON.stringify(design.colorScheme)}
- レイアウト: ${design.layout}
- スタイル: ${design.style}
- アニメーション: ${design.animations}
`;

  // 各コンポーネントを並行生成
  const [
    packageJson,
    astroConfig,
    layout,
    heroComponent,
    featuresComponent,
    indexPage,
    docsPageResult,
    globalStyles,
  ] = await Promise.all([
    generatePackageJson(repoData),
    generateAstroConfig(repoData),
    generateLayout(baseContext, enhancedDesign, logoResult),
    generateHeroComponent(baseContext, repoData, enhancedDesign, logoResult),
    generateFeaturesComponent(
      baseContext,
      repoData,
      enhancedDesign,
      contentAnalysis
    ),
    generateIndexPage(
      baseContext,
      repoData,
      enhancedDesign,
      contentAnalysis,
      logoResult
    ),
    repoData.readme
      ? generateDocsPage(repoData, enhancedDesign)
      : Promise.resolve(null),
    generateGlobalStyles(baseContext, enhancedDesign),
  ]);

  return {
    packageJson,
    astroConfig,
    layout,
    heroComponent,
    featuresComponent,
    indexPage,
    docsPage: docsPageResult?.docsPage,
    globalStyles,
  };
}

async function generatePackageJson(repoData: RepoData): Promise<string> {
  return JSON.stringify(
    {
      name: `${repoData.repo.name}-site`,
      type: "module",
      version: "0.0.1",
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
}

async function generateAstroConfig(_repoData: RepoData): Promise<string> {
  return `import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://{{OWNER}}.github.io',
  base: '/{{REPO_NAME}}',
  output: 'static',
  build: {
    assets: 'assets'
  }
});`;
}

async function generateLayout(
  _context: string,
  design: EnhancedDesignStrategy,
  _logoResult?: { hasLogo: boolean; faviconUrl?: string }
): Promise<string> {
  return `---
import BaseLayout from '@gitlyte/shared/components/Layout/BaseLayout.astro';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props as Props;

// Custom design tokens for this generated site
const customTokens = {
  colors: {
    primary: "${design.colorScheme.primary}",
    secondary: "${design.colorScheme.secondary}",
    accent: "${design.colorScheme.accent}",
    background: "${design.colorScheme.background}",
    surface: "${design.colorScheme.background}",
    textPrimary: "#2d3748",
    textSecondary: "#718096",
    textMuted: "#a0aec0",
    border: "#e2e8f0",
    success: "#48bb78",
    warning: "#ed8936",
    error: "#f56565"
  }
};
---

<BaseLayout 
  title={title} 
  description={description} 
  customTokens={customTokens}
  layoutType="generated"
>
  <slot />
</BaseLayout>`;
}

async function generateHeroComponent(
  context: string,
  repoData: RepoData,
  design: EnhancedDesignStrategy,
  logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  // デバッグ: 実際に使用されるレイアウトをログ出力
  console.log(`🎯 generateHeroComponent: Using layout "${design.layout}"`);

  // レイアウト固有のHeroコンポーネントを生成
  return generateLayoutSpecificHero(
    design.layout,
    context,
    repoData,
    design,
    logoResult
  );
}

async function generateLayoutSpecificHero(
  layout: string,
  context: string,
  repoData: RepoData,
  design: EnhancedDesignStrategy,
  logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  console.log(`🎯 generateLayoutSpecificHero: Switching on layout "${layout}"`);

  switch (layout) {
    case "minimal":
      console.log("🎯 Generating MINIMAL hero component");
      return generateMinimalHero(context, repoData, design, logoResult);
    case "grid":
      console.log("🎯 Generating GRID hero component");
      return generateGridHero(context, repoData, design, logoResult);
    case "sidebar":
      console.log("🎯 Generating SIDEBAR hero component");
      return generateSidebarHero(context, repoData, design, logoResult);
    case "content-heavy":
      console.log("🎯 Generating CONTENT-HEAVY hero component");
      return generateContentHeavyHero(context, repoData, design, logoResult);
    default:
      console.log(
        `🎯 Falling back to HERO-FOCUSED layout (input was "${layout}")`
      );
      return generateHeroFocusedHero(context, repoData, design, logoResult);
  }
}

async function generateMinimalHero(
  _context: string,
  _repoData: RepoData,
  _design: EnhancedDesignStrategy,
  _logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  return `---
import MinimalLayout from '@gitlyte/shared/components/Layout/MinimalLayout.astro';

interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
  hasReadme?: boolean;
  repoUrl?: string;
  hasLogo?: boolean;
  logoUrl?: string;
}

const { title, description, stats, hasReadme, repoUrl, hasLogo, logoUrl } = Astro.props as Props;

// Create repo data for the shared layout
const repoData = {
  title,
  description,
  stats,
  hasReadme,
  repoUrl,
  hasLogo,
  logoUrl
};
---

<MinimalLayout 
  title={title} 
  description={description || "AI-generated project site"} 
  stats={stats}
  repoData={repoData}
/>
  </section>
</div>

<style>
  /* Base Layout Styles */
  .minimal-layout {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #1a1a1a;
    background-color: #ffffff;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  /* Navigation Header */
  .minimal-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #e5e5e5;
  }

  .minimal-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
  }

  .nav-brand {
    display: flex;
    align-items: center;
  }

  .brand-link {
    text-decoration: none;
    color: inherit;
  }

  .brand-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
    color: #1a1a1a;
  }

  .brand-logo {
    height: 32px;
    width: auto;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    text-decoration: none;
    color: #666666;
    font-weight: 500;
    font-size: 0.9rem;
    padding: 0.5rem 0;
    transition: color 0.2s ease;
  }

  .nav-link:hover {
    color: #1a1a1a;
  }

  .nav-link.nav-active {
    color: #1a1a1a;
    font-weight: 600;
  }

  /* Hero Section */
  .hero-minimal {
    min-height: 50vh;
    display: flex;
    align-items: center;
    padding: 3rem 0;
  }

  .hero-header {
    text-align: left;
    margin-bottom: 2rem;
  }

  .hero-title {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 1rem;
    letter-spacing: -0.02em;
    color: #1a1a1a;
  }

  .description {
    font-size: 1.125rem;
    margin-bottom: 2rem;
    max-width: 600px;
    line-height: 1.6;
    color: #666666;
  }

  .actions {
    margin-bottom: 2rem;
  }

  .button {
    display: inline-block;
    padding: 0.5rem 1.5rem;
    background-color: #000000;
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }

  .button:hover {
    opacity: 0.8;
  }

  .stats {
    display: flex;
    gap: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e5e5;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a1a1a;
    font-variant-numeric: tabular-nums;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #999999;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .container {
      padding: 0 1rem;
    }
    
    .minimal-nav {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
      padding: 0.75rem 0;
    }
    
    .nav-links {
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .brand-title {
      font-size: 1.25rem;
    }
    
    .nav-link {
      font-size: 0.85rem;
    }
    
    .hero-minimal {
      min-height: auto;
      padding: 2rem 0;
    }
    
    .hero-title {
      font-size: 1.75rem;
    }
    
    .description {
      font-size: 1rem;
    }
    
    .stats {
      gap: 1.5rem;
    }
    
    .stat-value {
      font-size: 1.25rem;
    }
    
    .stat-label {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .stats {
      flex-direction: column;
      gap: 1rem;
    }
    
    .stat {
      flex-direction: row;
      align-items: baseline;
      gap: 0.5rem;
    }
    
    .stat-value {
      font-size: 1rem;
    }
  }
</style>`;
}

async function generateGridHero(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy,
  _logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  return `---
interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
  hasReadme?: boolean;
  repoUrl?: string;
  hasLogo?: boolean;
  logoUrl?: string;
}

const { title, description, stats, hasReadme, repoUrl, hasLogo, logoUrl } = Astro.props as Props;
---

<!-- Grid Layout - Card-based Design -->
<header class="grid-header">
  <div class="container">
    <nav class="grid-nav">
      {hasLogo && logoUrl ? (
        <a href="./" class="brand-link">
          <img src={logoUrl} alt={title + " logo"} class="brand-logo" />
        </a>
      ) : (
        <a href="./" class="brand-link">
          <h1>{title}</h1>
        </a>
      )}
      <div class="nav-links">
        <a href="./" class="nav-link">🏠 Home</a>
        {hasReadme && <a href="docs/" class="nav-link">📖 Docs</a>}
        <a href={repoUrl} class="nav-link" target="_blank" rel="noopener">🔗 GitHub</a>
      </div>
    </nav>
  </div>
</header>

<section class="grid-hero">
  <div class="container">
    <div class="hero-grid">
      <div class="hero-main">
        <h1 class="hero-title">{title}</h1>
        <p class="hero-description">{description || 'A powerful solution built for modern development'}</p>
        <div class="hero-actions">
          {hasReadme && <a href="docs/" class="btn-primary">📚 Get Started</a>}
          <a href={repoUrl} class="btn-secondary" target="_blank" rel="noopener">⭐ Star on GitHub</a>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-content">
            <div class="stat-number">{stats.stars}</div>
            <div class="stat-label">Stars</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🍴</div>
          <div class="stat-content">
            <div class="stat-number">{stats.forks}</div>
            <div class="stat-label">Forks</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-number">{stats.issues}</div>
            <div class="stat-label">Issues</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .grid-header {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    padding: 1rem 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .grid-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-link {
    text-decoration: none;
    color: white;
  }

  .brand-link h1 {
    margin: 0;
    font-size: 1.5rem;
    font-family: ${design.typography.heading};
    font-weight: 600;
  }

  .brand-logo {
    height: 2rem;
    width: auto;
    filter: brightness(0) invert(1);
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    text-decoration: none;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .grid-hero {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    padding: 4rem 0;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 3rem;
    align-items: center;
  }

  .hero-main {
    max-width: 600px;
  }

  .hero-title {
    font-size: 3rem;
    font-family: ${design.typography.heading};
    font-weight: 700;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .hero-description {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    line-height: 1.6;
    opacity: 0.9;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn-primary {
    background: white;
    color: var(--primary);
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    background: rgba(255, 255, 255, 0.9);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    background: transparent;
    color: white;
    padding: 0.75rem 1.5rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }

  .stats-grid {
    display: grid;
    gap: 1rem;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-4px);
  }

  .stat-icon {
    font-size: 2rem;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  @media (max-width: 1024px) {
    .hero-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
      text-align: center;
    }
    
    .stats-grid {
      grid-template-columns: repeat(3, 1fr);
      max-width: 600px;
      margin: 0 auto;
    }
  }

  @media (max-width: 768px) {
    .grid-nav {
      flex-direction: column;
      gap: 1rem;
    }

    .nav-links {
      gap: 1rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-description {
      font-size: 1.1rem;
    }

    .hero-actions {
      flex-direction: column;
      align-items: center;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>`;
}

async function generateSidebarHero(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy,
  _logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  return `---
interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
  hasReadme?: boolean;
  repoUrl?: string;
  hasLogo?: boolean;
  logoUrl?: string;
}

const { title, description, stats, hasReadme, repoUrl, hasLogo, logoUrl } = Astro.props as Props;
---

<!-- Sidebar Layout -->
<div class="layout-container">
  <aside class="sidebar">
    <div class="sidebar-header">
      {hasLogo && logoUrl ? (
        <img src={logoUrl} alt={title + " logo"} class="sidebar-logo" />
      ) : (
        <h1 class="sidebar-title">{title}</h1>
      )}
    </div>
    
    <nav class="sidebar-nav">
      <a href="./" class="nav-item active">🏠 Home</a>
      {hasReadme && <a href="docs/" class="nav-item">📖 Documentation</a>}
      <a href={repoUrl} class="nav-item" target="_blank" rel="noopener">🔗 GitHub</a>
    </nav>
    
    <div class="sidebar-stats">
      <h3>Project Stats</h3>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <div>
          <div class="stat-value">{stats.stars}</div>
          <div class="stat-label">Stars</div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🍴</span>
        <div>
          <div class="stat-value">{stats.forks}</div>
          <div class="stat-label">Forks</div>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">📊</span>
        <div>
          <div class="stat-value">{stats.issues}</div>
          <div class="stat-label">Issues</div>
        </div>
      </div>
    </div>
  </aside>
  
  <main class="main-content">
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-badge">✨ Featured Project</div>
        <h1 class="hero-title">{title}</h1>
        <p class="hero-description">{description || 'An innovative solution for modern development challenges'}</p>
        
        <div class="action-buttons">
          {hasReadme && <a href="docs/" class="btn-primary">📚 Get Started</a>}
          <a href={repoUrl} class="btn-secondary" target="_blank" rel="noopener">⭐ Star Project</a>
        </div>
        
        <div class="feature-highlights">
          <div class="highlight">🚀 Easy to Use</div>
          <div class="highlight">⚡ High Performance</div>
          <div class="highlight">🛡️ Secure</div>
        </div>
      </div>
    </section>
  </main>
</div>

<style>
  .layout-container {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: 280px;
    background: linear-gradient(180deg, var(--primary), var(--secondary));
    color: white;
    padding: 2rem 1.5rem;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .sidebar-header {
    margin-bottom: 2rem;
    text-align: center;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .sidebar-logo {
    height: 3rem;
    width: auto;
    filter: brightness(0) invert(1);
  }

  .sidebar-title {
    margin: 0;
    font-size: 1.5rem;
    font-family: ${design.typography.heading};
    font-weight: 700;
  }

  .sidebar-nav {
    margin-bottom: 2rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    border-radius: 8px;
    margin-bottom: 0.5rem;
    transition: all 0.2s ease;
    font-weight: 500;
  }

  .nav-item:hover,
  .nav-item.active {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .sidebar-stats {
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
  }

  .sidebar-stats h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
  }

  .stat-icon {
    font-size: 1.25rem;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .main-content {
    flex: 1;
    background: linear-gradient(135deg, #f8fafc, #ffffff);
  }

  .hero-section {
    padding: 4rem 3rem;
    max-width: 800px;
  }

  .hero-content {
    max-width: 600px;
  }

  .hero-badge {
    display: inline-block;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
  }

  .hero-title {
    font-size: 3rem;
    font-family: ${design.typography.heading};
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .hero-description {
    font-size: 1.25rem;
    color: #4a5568;
    margin-bottom: 2.5rem;
    line-height: 1.6;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 2.5rem;
    flex-wrap: wrap;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    padding: 0.875rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary:hover {
    background: var(--secondary);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .btn-secondary {
    background: transparent;
    color: var(--primary);
    padding: 0.875rem 2rem;
    border: 2px solid var(--primary);
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-secondary:hover {
    background: var(--primary);
    color: white;
    transform: translateY(-2px);
  }

  .feature-highlights {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .highlight {
    background: rgba(var(--primary), 0.1);
    color: var(--primary);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    border: 1px solid rgba(var(--primary), 0.2);
  }

  @media (max-width: 1024px) {
    .layout-container {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      height: auto;
      position: static;
      padding: 1.5rem;
    }

    .sidebar-nav {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
    }

    .nav-item {
      white-space: nowrap;
      margin-bottom: 0;
    }

    .sidebar-stats {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .sidebar-stats h3 {
      display: none;
    }

    .hero-section {
      padding: 2rem 1.5rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }
  }

  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }

    .hero-description {
      font-size: 1.1rem;
    }

    .action-buttons {
      flex-direction: column;
      align-items: flex-start;
    }

    .feature-highlights {
      flex-direction: column;
    }

    .sidebar-stats {
      flex-direction: column;
      gap: 0.5rem;
    }
  }
</style>`;
}

async function generateContentHeavyHero(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy,
  _logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  return `---
interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
  hasReadme?: boolean;
  repoUrl?: string;
  hasLogo?: boolean;
  logoUrl?: string;
}

const { title, description, stats, hasReadme, repoUrl, hasLogo, logoUrl } = Astro.props as Props;
---

<!-- Content Heavy Layout -->
<header class="content-header">
  <div class="container">
    <nav class="content-nav">
      {hasLogo && logoUrl ? (
        <a href="./" class="brand-link">
          <img src={logoUrl} alt={title + " logo"} class="brand-logo" />
        </a>
      ) : (
        <a href="./" class="brand-link">
          <h1>{title}</h1>
        </a>
      )}
      <div class="nav-links">
        <a href="./" class="nav-link">🏠 Home</a>
        {hasReadme && <a href="docs/" class="nav-link">📖 Docs</a>}
        <a href={repoUrl} class="nav-link" target="_blank" rel="noopener">🔗 GitHub</a>
      </div>
    </nav>
  </div>
</header>

<section class="content-hero">
  <div class="container">
    <div class="hero-layout">
      <div class="hero-main">
        <div class="breadcrumb">
          <span class="breadcrumb-item">📦 Project</span>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-item current">{title}</span>
        </div>
        
        <h1 class="hero-title">{title}</h1>
        <p class="hero-description">{description || 'A comprehensive solution designed for complex development workflows'}</p>
        
        <div class="content-grid">
          <div class="info-card">
            <h3>📊 Project Overview</h3>
            <p>This project provides a robust foundation for building scalable applications with modern development practices.</p>
            <div class="quick-stats">
              <span class="quick-stat">⭐ {stats.stars} stars</span>
              <span class="quick-stat">🍴 {stats.forks} forks</span>
            </div>
          </div>
          
          <div class="info-card">
            <h3>🚀 Getting Started</h3>
            <p>Follow our comprehensive guide to get up and running quickly with best practices and examples.</p>
            <div class="action-links">
              {hasReadme && <a href="docs/" class="link-primary">📖 Documentation</a>}
              <a href={repoUrl} class="link-secondary" target="_blank" rel="noopener">🔗 Repository</a>
            </div>
          </div>
          
          <div class="info-card">
            <h3>🛠️ Development</h3>
            <p>Active development with {stats.issues} open issues and regular updates from the community.</p>
            <div class="dev-info">
              <span class="dev-stat">📊 {stats.issues} issues</span>
              <span class="dev-stat">🔄 Active development</span>
            </div>
          </div>
        </div>
        
        <div class="main-actions">
          {hasReadme && <a href="docs/" class="btn-primary">📚 Read Documentation</a>}
          <a href={repoUrl} class="btn-secondary" target="_blank" rel="noopener">👥 Contribute</a>
        </div>
      </div>
      
      <aside class="hero-sidebar">
        <div class="sidebar-card">
          <h4>📈 Project Stats</h4>
          <div class="stats-list">
            <div class="stat-row">
              <span class="stat-icon">⭐</span>
              <div class="stat-content">
                <div class="stat-value">{stats.stars}</div>
                <div class="stat-label">GitHub Stars</div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-icon">🍴</span>
              <div class="stat-content">
                <div class="stat-value">{stats.forks}</div>
                <div class="stat-label">Forks</div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-icon">📊</span>
              <div class="stat-content">
                <div class="stat-value">{stats.issues}</div>
                <div class="stat-label">Open Issues</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="sidebar-card">
          <h4>🔗 Quick Links</h4>
          <div class="links-list">
            <a href={repoUrl} class="sidebar-link" target="_blank" rel="noopener">
              <span class="link-icon">📁</span>
              <span>Source Code</span>
            </a>
            {hasReadme && (
              <a href="docs/" class="sidebar-link">
                <span class="link-icon">📖</span>
                <span>Documentation</span>
              </a>
            )}
            <a href={repoUrl + '/issues'} class="sidebar-link" target="_blank" rel="noopener">
              <span class="link-icon">📝</span>
              <span>Issues</span>
            </a>
            <a href={repoUrl + '/pulls'} class="sidebar-link" target="_blank" rel="noopener">
              <span class="link-icon">🔄</span>
              <span>Pull Requests</span>
            </a>
          </div>
        </div>
      </aside>
    </div>
  </div>
</section>

<style>
  .content-header {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 1rem 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.5rem;
  }

  .content-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-link {
    text-decoration: none;
    color: var(--primary);
  }

  .brand-link h1 {
    margin: 0;
    font-size: 1.5rem;
    font-family: ${design.typography.heading};
    font-weight: 700;
  }

  .brand-logo {
    height: 2rem;
    width: auto;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-link {
    text-decoration: none;
    color: #6b7280;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .nav-link:hover {
    background: var(--primary)15;
    color: var(--primary);
  }

  .content-hero {
    background: #f9fafb;
    padding: 3rem 0;
  }

  .hero-layout {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 3rem;
    align-items: start;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    color: #6b7280;
  }

  .breadcrumb-item.current {
    color: var(--primary);
    font-weight: 600;
  }

  .breadcrumb-separator {
    color: #d1d5db;
  }

  .hero-title {
    font-size: 3rem;
    font-family: ${design.typography.heading};
    font-weight: 700;
    color: #111827;
    margin-bottom: 1.5rem;
    line-height: 1.2;
  }

  .hero-description {
    font-size: 1.25rem;
    color: #4b5563;
    margin-bottom: 2.5rem;
    line-height: 1.6;
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
  }

  .info-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .info-card h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: #111827;
    font-weight: 600;
  }

  .info-card p {
    margin: 0 0 1rem 0;
    color: #6b7280;
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .quick-stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .quick-stat {
    font-size: 0.8rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .action-links {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .link-primary,
  .link-secondary {
    font-size: 0.8rem;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .link-primary {
    background: var(--primary);
    color: white;
  }

  .link-secondary {
    background: #f3f4f6;
    color: #6b7280;
  }

  .dev-info {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .dev-stat {
    font-size: 0.8rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .main-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-primary:hover {
    background: var(--secondary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .btn-secondary {
    background: transparent;
    color: var(--primary);
    padding: 0.75rem 1.5rem;
    border: 2px solid var(--primary);
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover {
    background: var(--primary);
    color: white;
    transform: translateY(-2px);
  }

  .hero-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .sidebar-card {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .sidebar-card h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: #111827;
    font-weight: 600;
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stat-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .stat-icon {
    font-size: 1.25rem;
  }

  .stat-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #111827;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .links-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    color: #6b7280;
    text-decoration: none;
    border-radius: 6px;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .sidebar-link:hover {
    background: #f3f4f6;
    color: var(--primary);
  }

  .link-icon {
    font-size: 1rem;
  }

  @media (max-width: 1024px) {
    .hero-layout {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .hero-sidebar {
      order: -1;
    }
  }

  @media (max-width: 768px) {
    .content-nav {
      flex-direction: column;
      gap: 1rem;
    }

    .nav-links {
      gap: 1rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-description {
      font-size: 1.1rem;
    }

    .content-grid {
      grid-template-columns: 1fr;
    }

    .main-actions {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>`;
}

async function generateHeroFocusedHero(
  _context: string,
  _repoData: RepoData,
  _design: EnhancedDesignStrategy,
  _logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  return `---
import HeroFocusedLayout from '@gitlyte/shared/components/Layout/HeroFocusedLayout.astro';

interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
  hasReadme?: boolean;
  repoUrl?: string;
  hasLogo?: boolean;
  logoUrl?: string;
}

const { title, description, stats, hasReadme, repoUrl, hasLogo, logoUrl } = Astro.props as Props;

// Create repo data for the shared layout
const repoData = {
  title,
  description,
  stats,
  hasReadme,
  repoUrl,
  hasLogo,
  logoUrl
};
---

<HeroFocusedLayout 
  title={title} 
  description={description || "AI-generated project site"} 
  stats={stats}
  repoData={repoData}
/>`;
}

async function generateMinimalFeaturesComponent(
  _design: EnhancedDesignStrategy,
  contentAnalysis: ContentAnalysis
): Promise<string> {
  // whyChooseCardsを取得（フォールバックも含む）
  const whyChooseCards = contentAnalysis.features.whyChoose || [];

  return `---
interface Props {
  prs: any;
}

const { prs } = Astro.props as Props;

// 動的Why Choose Cardsの取得
const whyChooseCards = JSON.parse('${JSON.stringify(whyChooseCards).replace(/'/g, "\\'")}');

// 優先度でソートし、最大6枚まで表示
const sortedWhyChooseCards = whyChooseCards.sort((a, b) => b.priority - a.priority).slice(0, 6);
---

<!-- Features Section -->
<section class="features-minimal">
  <div class="container">
    <div class="section">
      <h2>Key Features</h2>
      
      <div class="features-grid">
        {sortedWhyChooseCards.map((feature, index) => (
          <div class="feature-card" style={\`animation-delay: \${index * 0.1}s\`}>
            <div class="feature-icon">{feature.icon}</div>
            <h3 class="feature-title">{feature.title}</h3>
            <p class="feature-description">{feature.description}</p>
            <div class="feature-highlight">{feature.highlight}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>

<style>
  /* Base Layout Styles */
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  /* Features Section */
  .features-minimal {
    padding: 4rem 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1a1a1a;
    background-color: #ffffff;
  }

  .section {
    margin-bottom: 4rem;
  }

  .section h2 {
    margin-bottom: 3rem;
    font-weight: 500;
    color: #1a1a1a;
    font-size: 1.5rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }

  .feature-card {
    padding: 1.5rem;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    background-color: #fafafa;
    transition: all 0.2s ease;
  }

  .feature-card:hover {
    border-color: #999999;
  }

  .feature-icon {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #1a1a1a;
  }

  .feature-title {
    font-size: 1.125rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .feature-description {
    font-size: 0.875rem;
    line-height: 1.6;
    color: #666666;
    margin-bottom: 1rem;
  }

  .feature-highlight {
    background: #1a1a1a;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
    display: inline-block;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .container {
      padding: 0 1rem;
    }
    
    .features-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    
    .feature-card {
      padding: 1rem;
    }
    
    .section h2 {
      font-size: 1.25rem;
      margin-bottom: 2rem;
    }
    
    .features-minimal {
      padding: 2rem 0;
    }
  }
</style>`;
}

async function generateFeaturesComponent(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy,
  contentAnalysis: ContentAnalysis
): Promise<string> {
  // For minimal layout, use demo-style minimal features
  if (design.layout === "minimal") {
    return generateMinimalFeaturesComponent(design, contentAnalysis);
  }
  const borderRadius =
    design.effects.borders === "pill"
      ? "50px"
      : design.effects.borders === "sharp"
        ? "0px"
        : "12px";
  const shadowLevel =
    design.effects.shadows === "prominent"
      ? "0 12px 25px rgba(0, 0, 0, 0.15)"
      : design.effects.shadows === "subtle"
        ? "0 4px 6px rgba(0, 0, 0, 0.07)"
        : "none";

  // whyChooseCardsを取得（フォールバックも含む）
  const whyChooseCards = contentAnalysis.features.whyChoose || [];

  return `---
interface Props {
  prs: any;
}

const { prs } = Astro.props as Props;

// 動的Why Choose Cardsの取得
const whyChooseCards = JSON.parse('${JSON.stringify(whyChooseCards).replace(/'/g, "\\'")}');

// 優先度でソートし、最大6枚まで表示
const sortedWhyChooseCards = whyChooseCards.sort((a, b) => b.priority - a.priority).slice(0, 6);

// カード枚数に応じたCSSクラス生成
const getGridClass = (cardCount) => {
  if (cardCount <= 1) return 'grid-single';
  if (cardCount === 2) return 'grid-double';
  if (cardCount === 3) return 'grid-triple';
  if (cardCount === 4) return 'grid-quad';
  return 'grid-multi';
};

const gridClass = getGridClass(sortedWhyChooseCards.length);
---

<section class="features">
  <div class="container">
    <div class="section-header">
      <h2>Why Choose This Project?</h2>
      <p class="section-subtitle">Discover the powerful features that make this project stand out</p>
    </div>
    
    <div class={\`features-grid \${gridClass}\`}>
      {sortedWhyChooseCards.map((feature, index) => (
        <div class="feature-card" style={\`animation-delay: \${index * 0.1}s\`}>
          <div class="feature-icon">{feature.icon}</div>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
          <div class="feature-highlight">{feature.highlight}</div>
        </div>
      ))}
    </div>

    {prs.length > 0 && (
      <div class="recent-activity">
        <h3>Recent Development Activity</h3>
        <div class="activity-grid">
          {prs.slice(0, 4).map((pr) => (
            <div class="activity-card">
              <div class="activity-header">
                <span class="activity-type">🔀</span>
                <span class="activity-date">
                  {pr.merged_at ? new Date(pr.merged_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }) : 'Recent'}
                </span>
              </div>
              <h4>{pr.title}</h4>
              <p>by {pr.user?.login || 'Community'}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
</section>

<style>
  .features {
    padding: 5rem 0;
    background: ${
      design.style === "glassmorphism"
        ? "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))"
        : "linear-gradient(135deg, #f8fafc, #ffffff)"
    };
    position: relative;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-header h2 {
    font-size: clamp(2rem, 4vw, 3rem);
    margin-bottom: 1rem;
    color: var(--text-primary);
    font-family: ${design.typography.heading};
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .section-subtitle {
    font-size: 1.1rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.6;
  }

  .features-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    margin-bottom: 5rem;
    margin-left: auto;
    margin-right: auto;
    justify-content: center;
    align-items: stretch;
  }
  
  /* カード枚数別のレイアウト */
  .features-grid.grid-single {
    max-width: 400px;
  }
  
  .features-grid.grid-double {
    max-width: 900px;
  }
  
  .features-grid.grid-triple {
    max-width: 1200px;
  }
  
  .features-grid.grid-quad {
    max-width: 1200px;
  }
  
  .features-grid.grid-multi {
    max-width: 1200px;
  }
  
  /* 大画面での最適化 */
  @media (min-width: 1200px) {
    .features-grid.grid-double {
      max-width: 1000px;
    }
    
    .features-grid.grid-triple {
      max-width: 1400px;
    }
    
    .features-grid.grid-quad {
      max-width: 1600px;
    }
    
    .features-grid.grid-multi {
      max-width: 1400px;
    }
  }
  
  /* タブレット対応 */
  @media (max-width: 1024px) and (min-width: 769px) {
    .features-grid.grid-triple,
    .features-grid.grid-quad,
    .features-grid.grid-multi {
      max-width: 700px;
    }
  }
  
  /* モバイル対応 */
  @media (max-width: 768px) {
    .features-grid {
      max-width: 400px;
      gap: 1.5rem;
    }
  }

  .feature-card {
    background: white;
    padding: 2rem;
    flex: 1 1 200px;
    min-width: 200px;
    max-width: 400px;
    min-height: 280px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    border-radius: ${borderRadius};
    box-shadow: ${shadowLevel};
    text-align: center;
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 0, 0, 0.05);
    position: relative;
    overflow: hidden;
    margin-bottom: 1rem;
    ${design.animations ? "animation: slideInUp 0.6s ease forwards; opacity: 0;" : ""}
  }
  
  /* カード枚数に応じた幅調整 */
  .features-grid.grid-single .feature-card {
    flex: 0 0 auto;
    max-width: 400px;
    min-width: 300px;
  }
  
  .features-grid.grid-double .feature-card {
    flex: 1 1 350px;
    max-width: 400px;
    min-width: 280px;
  }
  
  .features-grid.grid-triple .feature-card {
    flex: 1 1 300px;
    max-width: 350px;
    min-width: 250px;
  }
  
  .features-grid.grid-quad .feature-card {
    flex: 1 1 300px;
    max-width: 350px;
    min-width: 250px;
  }
  
  .features-grid.grid-multi .feature-card {
    flex: 1 1 280px;
    max-width: 320px;
    min-width: 220px;
  }
  
  /* 大画面でのカード幅調整 */
  @media (min-width: 1200px) {
    .features-grid.grid-double .feature-card {
      flex: 1 1 400px;
      max-width: 450px;
      min-width: 350px;
    }
    
    .features-grid.grid-triple .feature-card {
      flex: 1 1 350px;
      max-width: 400px;
      min-width: 300px;
    }
    
    .features-grid.grid-quad .feature-card {
      flex: 1 1 300px;
      max-width: 350px;
      min-width: 280px;
    }
    
    .features-grid.grid-multi .feature-card {
      flex: 1 1 320px;
      max-width: 380px;
      min-width: 280px;
    }
  }
  
  /* タブレットでのカード幅調整 */
  @media (max-width: 1024px) and (min-width: 769px) {
    .features-grid.grid-triple .feature-card,
    .features-grid.grid-quad .feature-card,
    .features-grid.grid-multi .feature-card {
      flex: 1 1 calc(50% - 1rem);
      max-width: 320px;
      min-width: 200px;
    }
  }
  
  /* モバイルでのカード幅調整 */
  @media (max-width: 768px) {
    .feature-card,
    .features-grid.grid-single .feature-card,
    .features-grid.grid-double .feature-card,
    .features-grid.grid-triple .feature-card,
    .features-grid.grid-quad .feature-card,
    .features-grid.grid-multi .feature-card {
      flex: 1 1 100%;
      max-width: 400px;
    }
  }

  .feature-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }

  .feature-card:hover {
    transform: translateY(-8px);
    box-shadow: ${shadowLevel.replace("0.07", "0.2")};
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }

  .feature-card h3 {
    font-size: 1.3rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
    font-family: ${design.typography.heading};
  }

  .feature-card p {
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .feature-highlight {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
    display: inline-block;
  }

  .recent-activity {
    background: white;
    padding: 3rem;
    border-radius: ${borderRadius};
    box-shadow: ${shadowLevel};
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .recent-activity h3 {
    text-align: center;
    margin-bottom: 2rem;
    color: var(--text-primary);
    font-size: 1.5rem;
  }

  .activity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .activity-card {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: ${borderRadius};
    border-left: 4px solid var(--accent);
    transition: all 0.3s ease;
  }

  .activity-card:hover {
    background: #f1f5f9;
    transform: translateX(4px);
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .activity-type {
    font-size: 1.2rem;
  }

  .activity-date {
    font-size: 0.8rem;
    color: var(--text-secondary);
    background: white;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
  }

  .activity-card h4 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .activity-card p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin: 0;
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .features {
      padding: 3rem 0;
    }
    
    .features-grid {
      gap: 1.5rem;
    }
    
    .recent-activity {
      padding: 2rem;
    }
    
    .activity-grid {
      grid-template-columns: 1fr;
    }
  }
</style>`;
}

async function generateMinimalIndexPage(logoResult?: {
  hasLogo: boolean;
  logoUrl?: string;
}): Promise<string> {
  return `---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import Features from '../components/Features.astro';

// Repository data will be replaced during generation
const repoDataJson = '{{REPO_DATA}}';
const repoData = JSON.parse(repoDataJson);
const repo = repoData.repo || {};
const prs = repoData.prs || [];
const readme = repoData.readme || '';
const issues = repoData.issues || [];

const stats = {
  stars: repo.stargazers_count || 0,
  forks: repo.forks_count || 0,
  issues: issues.length || 0
};

// Content analysis data
const contentAnalysisJson = '{{CONTENT_ANALYSIS}}';
const contentAnalysis = JSON.parse(contentAnalysisJson);
const uniqueValue = contentAnalysis?.appeal?.uniqueValue || 'Delivers exceptional value through innovative features and robust architecture.';
const dynamicCards = contentAnalysis?.appeal?.dynamicCards || [
  { title: "Quick Start", icon: "🚀", description: "Easy to use and integrate with comprehensive documentation", priority: 10 },
  { title: "High Performance", icon: "⚡", description: "Optimized for speed and efficiency", priority: 9 },
  { title: "Enterprise Ready", icon: "🛡️", description: "Enterprise-grade security and reliability", priority: 8 },
  { title: "Community Driven", icon: "🌟", description: "Active community support with regular updates", priority: 7 }
];

// 優先度でソートし、最大6枚まで表示
const sortedCards = dynamicCards.sort((a, b) => b.priority - a.priority).slice(0, 6);
---

<Layout title={repo.name + ' - Project Dashboard'} description={repo.description}>
  <Hero 
    title={repo.name}
    description={repo.description}
    stats={stats}
    hasReadme={!!readme}
    repoUrl={repo.html_url}
    hasLogo={${logoResult?.hasLogo || false}}
    logoUrl={"${logoResult?.logoUrl || ""}"}
  />
  
  <Features prs={prs || []} />
  
  <!-- About Section -->
  <section class="section">
    <div class="container">
      <div class="content-section">
        <h2>About This Project</h2>
        <p>
          {repo.description || 'This project provides a robust foundation for building scalable applications with modern development practices.'}
        </p>
        
        <div class="unique-value">
          <strong>💡 Unique Value:</strong> {uniqueValue}
        </div>
        
        <div class="features-grid">
          {sortedCards.map((card) => (
            <div class="feature-highlight">
              <h4>{card.icon} {card.title}</h4>
              <p>{card.description}</p>
            </div>
          ))}
        </div>

        {readme && (
          <div class="code-example">
            <h3>Documentation Available</h3>
            <p>Comprehensive documentation is available to help you get started with this project.</p>
            <div class="docs-actions">
              <a href="docs/" class="docs-link">📖 View Documentation</a>
              <a href={repo.html_url} class="docs-link-secondary" target="_blank" rel="noopener">🔗 View on GitHub</a>
            </div>
          </div>
        )}
      </div>
    </div>
  </section>
</Layout>

<style>
  /* Base Layout Styles matching demo */
  .section {
    margin-bottom: 4rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1a1a1a;
    background-color: #ffffff;
    padding: 4rem 0;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 2rem;
    width: 100%;
    box-sizing: border-box;
  }

  /* Content Section */
  .content-section {
    max-width: 700px;
  }

  .content-section h2 {
    margin-bottom: 1.5rem;
    font-weight: 500;
    font-size: 1.5rem;
    color: #1a1a1a;
  }

  .content-section p {
    margin-bottom: 2rem;
    font-size: 1rem;
    line-height: 1.7;
    color: #666666;
  }

  .unique-value {
    margin-bottom: 3rem;
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    border-left: 3px solid #1a1a1a;
    font-size: 1rem;
    line-height: 1.5;
  }

  .features-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 3rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    justify-content: center;
  }

  .feature-highlight {
    background: white;
    padding: 1.5rem;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
    transition: all 0.3s ease;
    flex: 1 1 calc(50% - 0.75rem);
    min-width: 280px;
    max-width: 350px;
  }

  .feature-highlight:hover {
    border-color: #999999;
  }

  .feature-highlight h4 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: #1a1a1a;
  }

  .feature-highlight p {
    font-size: 0.9rem;
    line-height: 1.5;
    color: #666666;
    margin: 0;
  }

  .code-example {
    padding: 1.5rem;
    background-color: #f5f5f5;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
  }

  .code-example h3 {
    margin-bottom: 1rem;
    font-size: 1rem;
    font-weight: 500;
    color: #1a1a1a;
  }

  .code-example p {
    font-size: 0.875rem;
    margin-bottom: 1rem;
    color: #666666;
  }

  .docs-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .docs-link {
    display: inline-block;
    padding: 0.5rem 1.5rem;
    background-color: #000000;
    color: white;
    border: none;
    border-radius: 2px;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }

  .docs-link:hover {
    opacity: 0.8;
  }

  .docs-link-secondary {
    display: inline-block;
    padding: 0.5rem 1.5rem;
    background-color: transparent;
    color: #1a1a1a;
    border: 1px solid #e5e5e5;
    border-radius: 2px;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .docs-link-secondary:hover {
    border-color: #999999;
    background-color: #f5f5f5;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .container {
      padding: 0 1rem;
    }
    
    .section {
      padding: 2rem 0;
    }
    
    .content-section h2 {
      font-size: 1.25rem;
    }
    
    .layout-characteristics li {
      font-size: 0.8rem;
    }
    
    .code-example {
      padding: 1rem;
    }
    
    .docs-actions {
      flex-direction: column;
    }
  }
</style>`;
}

async function generateIndexPage(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy,
  _contentAnalysis: ContentAnalysis,
  logoResult?: { hasLogo: boolean; logoUrl?: string }
): Promise<string> {
  // For minimal layout, use demo-style minimal index page
  if (design.layout === "minimal") {
    return generateMinimalIndexPage(logoResult);
  }
  return `---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import Features from '../components/Features.astro';

// Repository data will be replaced during generation
const repoDataJson = '{{REPO_DATA}}';
const repoData = JSON.parse(repoDataJson);
const repo = repoData.repo || {};
const prs = repoData.prs || [];
const readme = repoData.readme || '';
const issues = repoData.issues || [];

const stats = {
  stars: repo.stargazers_count || 0,
  forks: repo.forks_count || 0,
  issues: issues.length || 0
};

// Content analysis data
const contentAnalysisJson = '{{CONTENT_ANALYSIS}}';
const contentAnalysis = JSON.parse(contentAnalysisJson);
const uniqueValue = contentAnalysis?.appeal?.uniqueValue || 'Delivers exceptional value through innovative features and robust architecture.';
const dynamicCards = contentAnalysis?.appeal?.dynamicCards || [
  { title: "Quick Start", icon: "🚀", description: "Easy to use and integrate with comprehensive documentation", priority: 10 },
  { title: "High Performance", icon: "⚡", description: "Optimized for speed and efficiency", priority: 9 },
  { title: "Enterprise Ready", icon: "🛡️", description: "Enterprise-grade security and reliability", priority: 8 },
  { title: "Community Driven", icon: "🌟", description: "Active community support with regular updates", priority: 7 }
];

// 優先度でソートし、最大6枚まで表示
const sortedCards = dynamicCards.sort((a, b) => b.priority - a.priority).slice(0, 6);
---

<Layout title={repo.name + ' - Project Dashboard'} description={repo.description}>
  <Hero 
    title={repo.name}
    description={repo.description}
    stats={stats}
    hasReadme={!!readme}
    repoUrl={repo.html_url}
    hasLogo={${logoResult?.hasLogo || false}}
    logoUrl={"${logoResult?.logoUrl || ""}"}
  />
  
  <Features prs={prs || []} />
  
  <section class="about">
    <div class="container">
      <h2>About This Project</h2>
      <div class="project-overview">
        <div class="main-description">
          <h3>🎯 What makes this project special?</h3>
          <p>{repo.description || 'An innovative solution for modern development challenges.'}</p>
          <div class="unique-value">
            <strong>💡 Unique Value:</strong> {uniqueValue}
          </div>
        </div>
        
        <div class="features-grid">
          {sortedCards.map((card) => (
            <div class="feature-highlight">
              <h4>{card.icon} {card.title}</h4>
              <p>{card.description}</p>
            </div>
          ))}
        </div>

        {readme && (
          <div class="readme-preview">
            <div class="readme-header">
              <h3>📖 Documentation</h3>
              <p>Get comprehensive documentation and usage examples.</p>
            </div>
            <div class="readme-actions">
              <a href="docs/" class="docs-link-primary">
                📚 View Full Documentation
              </a>
              <a href={repo.html_url + '/blob/main/README.md'} class="docs-link-secondary" target="_blank" rel="noopener">
                🔗 View on GitHub
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  </section>
  
  <footer>
    <div class="container">
      <p>🤖 Generated with AI-powered GitLyte ✨</p>
    </div>
  </footer>
</Layout>

<style>
  .about {
    padding: 4rem 0;
    background: linear-gradient(135deg, #f8fafc, #ffffff);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h2 {
    font-size: 2.5rem;
    margin-bottom: 3rem;
    text-align: center;
    color: var(--text-primary);
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .project-overview {
    max-width: 1000px;
    margin: 0 auto;
  }

  .main-description {
    text-align: center;
    margin-bottom: 3rem;
    background: white;
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-top: 4px solid var(--primary);
  }

  .main-description h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: var(--text-primary);
  }

  .main-description p {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .unique-value {
    margin-top: 1.5rem;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary)10, var(--accent)10);
    border-radius: 8px;
    border-left: 3px solid var(--primary);
    font-size: 1rem;
    line-height: 1.5;
  }

  .features-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 3rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    justify-content: center;
  }
  
  
  /* 大画面では3列以上も対応 */
  @media (min-width: 1200px) {
    .feature-highlight {
      flex: 1 1 calc(33.333% - 1rem);
      min-width: 300px;
    }
  }
  
  /* 超大画面では4列 */
  @media (min-width: 1600px) {
    .feature-highlight {
      flex: 1 1 calc(25% - 1.125rem);
      min-width: 280px;
    }
  }
  
  /* モバイルでは1列表示 */
  @media (max-width: 768px) {
    .feature-highlight {
      flex: 1 1 100%;
      min-width: auto;
    }
  }

  .feature-highlight {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border-left: 3px solid var(--accent);
    flex: 1 1 calc(50% - 0.75rem);
    min-width: 280px;
    max-width: 350px;
  }

  .feature-highlight:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .feature-highlight h4 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .feature-highlight p {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;
  }

  .readme-preview {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    padding: 2rem;
    text-align: center;
  }

  .readme-header h3 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-size: 1.3rem;
  }

  .readme-header p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    font-size: 1rem;
  }

  .readme-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .docs-link-primary {
    background: var(--primary);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .docs-link-primary:hover {
    background: var(--secondary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .docs-link-secondary {
    background: transparent;
    color: var(--primary);
    padding: 0.75rem 1.5rem;
    border: 2px solid var(--primary);
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .docs-link-secondary:hover {
    background: var(--primary);
    color: white;
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .main-description {
      padding: 1.5rem;
    }
    
    .readme-actions {
      flex-direction: column;
      align-items: center;
    }
    
    .docs-link-primary,
    .docs-link-secondary {
      width: 100%;
      max-width: 280px;
      justify-content: center;
    }
  }

  footer {
    background: var(--primary);
    color: white;
    text-align: center;
    padding: 2rem 0;
  }

  footer p {
    margin: 0;
    opacity: 0.9;
  }
</style>`;
}

async function generateGlobalStyles(
  _context: string,
  design: EnhancedDesignStrategy
): Promise<string> {
  return `/* Global Styles for AI-Generated Site */

:root {
  --primary: ${design.colorScheme.primary};
  --secondary: ${design.colorScheme.secondary};
  --accent: ${design.colorScheme.accent};
  --background: ${design.colorScheme.background};
  --text-primary: #2d3748;
  --text-secondary: #718096;
  --border: #e2e8f0;
  --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: ${design.typography.body};
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--background);
}

h1, h2, h3, h4, h5, h6 {
  font-family: ${design.typography.heading};
  line-height: 1.2;
}

code, pre {
  font-family: ${design.typography.code};
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Utility Classes */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.mb-4 { margin-bottom: 1.5rem; }

.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 1rem; }
.p-4 { padding: 1.5rem; }

/* Responsive */
@media (max-width: 768px) {
  .container {
    padding: 0 15px;
  }
  
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
}`;
}
