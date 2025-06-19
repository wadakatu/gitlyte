import type { RepoData } from "../types.js";
import type { DesignStrategy, RepoAnalysis } from "./ai-analyzer.js";
import {
  analyzeRepositoryContent,
  type ContentAnalysis,
} from "./content-analyzer.js";

// 型拡張: 新しいデザインプロパティを含む
interface EnhancedDesignStrategy extends Omit<DesignStrategy, "effects"> {
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
    globalStyles,
  ] = await Promise.all([
    generatePackageJson(repoData),
    generateAstroConfig(repoData),
    generateLayout(baseContext, enhancedDesign),
    generateHeroComponent(baseContext, repoData, enhancedDesign),
    generateFeaturesComponent(baseContext, repoData, enhancedDesign),
    generateIndexPage(baseContext, repoData, enhancedDesign, contentAnalysis),
    generateGlobalStyles(baseContext, enhancedDesign),
  ]);

  return {
    packageJson,
    astroConfig,
    layout,
    heroComponent,
    featuresComponent,
    indexPage,
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
  design: EnhancedDesignStrategy
): Promise<string> {
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

<style>
  :root {
    --primary: ${design.colorScheme.primary};
    --secondary: ${design.colorScheme.secondary};
    --accent: ${design.colorScheme.accent};
    --background: ${design.colorScheme.background};
    --text-primary: #2d3748;
    --text-secondary: #718096;
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
    min-height: 100vh;
  }
</style>`;
}

async function generateHeroComponent(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy
): Promise<string> {
  const borderRadius =
    design.effects.borders === "pill"
      ? "50px"
      : design.effects.borders === "sharp"
        ? "0px"
        : "12px";
  const shadowLevel =
    design.effects.shadows === "prominent"
      ? "0 25px 50px rgba(0, 0, 0, 0.25)"
      : design.effects.shadows === "subtle"
        ? "0 4px 6px rgba(0, 0, 0, 0.07)"
        : "none";
  const spacing =
    design.effects.spacing === "tight"
      ? "3rem 0"
      : design.effects.spacing === "spacious"
        ? "6rem 0"
        : "4rem 0";

  return `---
export interface Props {
  title: string;
  description?: string;
  stats: {
    stars: number;
    forks: number;
    issues: number;
  };
}

const { title, description, stats } = Astro.props;
---

<section class="hero">
  <div class="hero-background"></div>
  <div class="container">
    <div class="hero-content">
      <div class="badge">🚀 Latest Release</div>
      <h1 class="hero-title">{title}</h1>
      <p class="subtitle">{description || 'An innovative solution for modern development'}</p>
      
      <div class="cta-section">
        <a href="#getting-started" class="cta-primary">Get Started</a>
        <a href="#docs" class="cta-secondary">View Docs</a>
      </div>
      
      <div class="stats">
        <div class="stat">
          <span class="stat-number">{stats.stars.toLocaleString()}</span>
          <span class="stat-label">⭐ Stars</span>
        </div>
        <div class="stat">
          <span class="stat-number">{stats.forks.toLocaleString()}</span>
          <span class="stat-label">🍴 Forks</span>
        </div>
        <div class="stat">
          <span class="stat-number">{stats.issues}</span>
          <span class="stat-label">📊 Issues</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  .hero {
    position: relative;
    background: ${
      design.style === "gradient"
        ? "linear-gradient(135deg, var(--primary), var(--secondary))"
        : design.style === "glassmorphism"
          ? "linear-gradient(135deg, var(--primary)20, var(--secondary)20)"
          : "var(--primary)"
    };
    color: white;
    padding: ${spacing};
    text-align: center;
    overflow: hidden;
    ${design.effects.blur ? "backdrop-filter: blur(10px);" : ""}
  }

  .hero-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.1;
    background: radial-gradient(circle at 30% 20%, var(--accent) 20%, transparent 50%),
                radial-gradient(circle at 70% 80%, var(--secondary) 20%, transparent 50%);
    ${design.animations ? "animation: float 20s ease-in-out infinite;" : ""}
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 1;
  }

  .hero-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .badge {
    display: inline-block;
    background: rgba(255, 255, 255, 0.15);
    padding: 0.5rem 1rem;
    border-radius: ${borderRadius};
    font-size: 0.9rem;
    margin-bottom: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    ${design.effects.blur ? "backdrop-filter: blur(10px);" : ""}
  }

  .hero-title {
    font-size: clamp(2.5rem, 5vw, 4rem);
    margin-bottom: 1.5rem;
    font-weight: 700;
    font-family: ${design.typography.heading};
    background: linear-gradient(45deg, white, rgba(255, 255, 255, 0.8));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }

  .subtitle {
    font-size: 1.25rem;
    margin-bottom: 3rem;
    opacity: 0.9;
    line-height: 1.6;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-section {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 3rem;
    flex-wrap: wrap;
  }

  .cta-primary {
    background: var(--accent);
    color: white;
    padding: 1rem 2rem;
    border-radius: ${borderRadius};
    text-decoration: none;
    font-weight: 600;
    box-shadow: ${shadowLevel};
    transition: all 0.3s ease;
    border: 2px solid var(--accent);
  }

  .cta-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .cta-secondary {
    background: transparent;
    color: white;
    padding: 1rem 2rem;
    border-radius: ${borderRadius};
    text-decoration: none;
    font-weight: 600;
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;
  }

  .cta-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 2rem;
    max-width: 500px;
    margin: 0 auto;
  }

  .stat {
    background: rgba(255, 255, 255, 0.1);
    padding: 1.5rem 1rem;
    border-radius: ${borderRadius};
    border: 1px solid rgba(255, 255, 255, 0.2);
    ${design.effects.blur ? "backdrop-filter: blur(10px);" : ""}
    transition: all 0.3s ease;
  }

  .stat:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.15);
  }

  .stat-number {
    display: block;
    font-size: 1.8rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    display: block;
    font-size: 0.9rem;
    opacity: 0.8;
  }

  @keyframes float {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(30px, -30px) rotate(1deg); }
    66% { transform: translate(-20px, 20px) rotate(-1deg); }
  }

  @media (max-width: 768px) {
    .hero {
      padding: 3rem 0;
    }
    
    .cta-section {
      flex-direction: column;
      align-items: center;
    }
    
    .stats {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
    }
  }
</style>`;
}

async function generateFeaturesComponent(
  _context: string,
  _repoData: RepoData,
  design: EnhancedDesignStrategy
): Promise<string> {
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

  return `---
export interface Props {
  prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
}

const { prs } = Astro.props;

// Sample features for demonstration
const projectFeatures = [
  {
    icon: "⚡",
    title: "High Performance",
    description: "Optimized for speed and efficiency with modern technology stack",
    highlight: "99.9% uptime"
  },
  {
    icon: "🔧",
    title: "Easy Integration",
    description: "Simple setup with comprehensive documentation and examples",
    highlight: "5-minute setup"
  },
  {
    icon: "🛡️",
    title: "Secure & Reliable",
    description: "Built with security best practices and enterprise-grade reliability",
    highlight: "SOC 2 compliant"
  },
  {
    icon: "🌟",
    title: "Community Driven",
    description: "Backed by an active community and regular updates",
    highlight: "1000+ contributors"
  }
];
---

<section class="features">
  <div class="container">
    <div class="section-header">
      <h2>Why Choose This Project?</h2>
      <p class="section-subtitle">Discover the powerful features that make this project stand out</p>
    </div>
    
    <div class="features-grid">
      {projectFeatures.map((feature, index) => (
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
    margin-bottom: 5rem;
  }

  .feature-card {
    background: white;
    padding: 2rem;
    border-radius: ${borderRadius};
    box-shadow: ${shadowLevel};
    text-align: center;
    transition: all 0.3s ease;
    border: 1px solid rgba(0, 0, 0, 0.05);
    position: relative;
    overflow: hidden;
    ${design.animations ? "animation: slideInUp 0.6s ease forwards; opacity: 0;" : ""}
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
      grid-template-columns: 1fr;
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

async function generateIndexPage(
  _context: string,
  _repoData: RepoData,
  _design: EnhancedDesignStrategy,
  _contentAnalysis: ContentAnalysis
): Promise<string> {
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
const keyBenefits = contentAnalysis?.appeal?.keyBenefits || [
  'Easy to use and integrate with comprehensive documentation',
  'High performance with modern technology stack optimization',
  'Enterprise-grade security and reliability standards',
  'Active community support with regular updates and improvements'
];
---

<Layout title={repo.name + ' - Project Dashboard'} description={repo.description}>
  <Hero 
    title={repo.name}
    description={repo.description}
    stats={stats}
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
          <div class="feature-highlight">
            <h4>🚀 Quick Start</h4>
            <p>{keyBenefits[0]}</p>
          </div>
          <div class="feature-highlight">
            <h4>⚡ High Performance</h4>
            <p>{keyBenefits[1]}</p>
          </div>
          <div class="feature-highlight">
            <h4>🛡️ Enterprise Ready</h4>
            <p>{keyBenefits[2]}</p>
          </div>
          <div class="feature-highlight">
            <h4>🌟 Community Driven</h4>
            <p>{keyBenefits[3]}</p>
          </div>
        </div>

        {readme && (
          <details class="readme-details">
            <summary>📖 View Full README</summary>
            <div class="readme-content">
              <pre>{readme.slice(0, 1500)}{readme.length > 1500 ? '...\\n\\n[View complete README on GitHub]' : ''}</pre>
            </div>
          </details>
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
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .feature-highlight {
    background: white;
    padding: 1.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border-left: 3px solid var(--accent);
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

  .readme-details {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  .readme-details summary {
    padding: 1.5rem;
    background: var(--primary);
    color: white;
    cursor: pointer;
    font-weight: 600;
    transition: background 0.3s ease;
  }

  .readme-details summary:hover {
    background: var(--secondary);
  }

  .readme-content {
    padding: 2rem;
    max-height: 400px;
    overflow-y: auto;
  }

  .readme-content pre {
    font-family: var(--font-code, monospace);
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }

  @media (max-width: 768px) {
    .features-grid {
      grid-template-columns: 1fr;
    }
    
    .main-description {
      padding: 1.5rem;
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
