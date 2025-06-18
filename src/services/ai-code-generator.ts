import type { RepoData } from "../types.js";
import type { DesignStrategy, RepoAnalysis } from "./ai-analyzer.js";

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
    generateLayout(baseContext, design),
    generateHeroComponent(baseContext, repoData, design),
    generateFeaturesComponent(baseContext, repoData, design),
    generateIndexPage(baseContext, repoData, design),
    generateGlobalStyles(baseContext, design),
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
      packageManager: "pnpm@10.12.1",
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
  design: DesignStrategy
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
  design: DesignStrategy
): Promise<string> {
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
  <div class="container">
    <h1>{title}</h1>
    <p class="subtitle">{description || 'An amazing project'}</p>
    <div class="stats">
      <span class="stat">⭐ {stats.stars}</span>
      <span class="stat">🍴 {stats.forks}</span>
      <span class="stat">📊 {stats.issues} issues</span>
    </div>
  </div>
</section>

<style>
  .hero {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    color: white;
    padding: 4rem 0;
    text-align: center;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 700;
    font-family: ${design.typography.heading};
  }

  .subtitle {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
  }

  .stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .stat {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-weight: 500;
    backdrop-filter: blur(10px);
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }
    
    .stats {
      gap: 1rem;
    }
  }
</style>`;
}

async function generateFeaturesComponent(
  _context: string,
  _repoData: RepoData,
  _design: DesignStrategy
): Promise<string> {
  return `---
export interface Props {
  prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
}

const { prs } = Astro.props;
---

<section class="features">
  <div class="container">
    <h2>Recent Pull Requests</h2>
    <div class="pr-grid">
      {prs.slice(0, 6).map((pr) => (
        <div class="pr-card">
          <h3>{pr.title}</h3>
          <p>by {pr.user?.login || 'Unknown'}</p>
          <span class="date">{pr.merged_at ? new Date(pr.merged_at).toLocaleDateString() : 'Unknown date'}</span>
        </div>
      ))}
    </div>
  </div>
</section>

<style>
  .features {
    padding: 3rem 0;
    background: white;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
    color: var(--text-primary);
  }

  .pr-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .pr-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    transition: transform 0.2s, box-shadow 0.2s;
    background: white;
  }

  .pr-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
  }

  .pr-card h3 {
    margin-bottom: 0.5rem;
    color: var(--text-primary);
    font-size: 1.1rem;
  }

  .pr-card p {
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .date {
    font-size: 0.9rem;
    color: #a0aec0;
  }
</style>`;
}

async function generateIndexPage(
  _context: string,
  _repoData: RepoData,
  _design: DesignStrategy
): Promise<string> {
  return `---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import Features from '../components/Features.astro';

// Repository data will be replaced during generation
const repoData = {{REPO_DATA}};
const repo = repoData.repo || {};
const prs = repoData.prs || [];
const readme = repoData.readme || '';
const issues = repoData.issues || [];

const stats = {
  stars: repo.stargazers_count || 0,
  forks: repo.forks_count || 0,
  issues: issues.length || 0
};
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
      <div class="readme-content">
        <p>{readme ? readme.slice(0, 500) + '...' : 'No description available.'}</p>
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
    padding: 3rem 0;
    background: #f8fafc;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 2rem;
    text-align: center;
    color: var(--text-primary);
  }

  .readme-content {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    border-left: 4px solid var(--primary);
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.7;
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
  design: DesignStrategy
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
