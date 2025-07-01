import type { GitLyteConfig } from "../types/config.js";
import type { DesignSystem, GeneratedSite } from "../types/generated-site.js";
import type { RepositoryAnalysis } from "../types/repository.js";
import {
  AnthropicClient,
  type GeneratedContent,
} from "../utils/anthropic-client.js";

export class SiteGenerator {
  public anthropicClient: AnthropicClient;

  constructor() {
    this.anthropicClient = new AnthropicClient();
  }

  async generateSite(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig
  ): Promise<GeneratedSite> {
    try {
      // Generate design system
      const designSystem = await this.generateDesignSystem(analysis, config);

      // Generate pages
      const pages = await this.generatePages(analysis, config, designSystem);

      // Generate assets
      const assets = {
        "style.css": this.generateCSS(designSystem, config),
        "navigation.js": this.generateJavaScript(config),
      };

      // Generate meta files
      const meta = {
        sitemap: this.generateSitemap(config),
        robotsTxt: this.generateRobotsTxt(),
      };

      return {
        pages: pages as Required<typeof pages> & { "index.html": string },
        assets,
        meta,
      };
    } catch (_error) {
      // Fallback to basic site generation
      return this.generateFallbackSite(analysis, config);
    }
  }

  async generatePage(
    pageType: string,
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    designSystem: DesignSystem
  ): Promise<string> {
    const content = await this.generatePageContent(pageType, analysis);

    switch (pageType) {
      case "index":
        return this.generateIndexPage(analysis, config, designSystem, content);
      case "docs":
        return this.generateDocsPage(analysis, config, designSystem, content);
      case "api":
        return this.generateApiPage(analysis, config, designSystem);
      case "examples":
        return this.generateExamplesPage(analysis, config, designSystem);
      case "changelog":
        return this.generateChangelogPage(analysis, config, designSystem);
      default:
        return this.generateIndexPage(analysis, config, designSystem, content);
    }
  }

  generateCSS(designSystem: DesignSystem, config: GitLyteConfig): string {
    const layout = config.site?.layout || "hero-focused";

    return `
:root {
  --primary-color: ${designSystem.colors.primary};
  --secondary-color: ${designSystem.colors.secondary};
  --accent-color: ${designSystem.colors.accent};
  --background-color: ${designSystem.colors.background};
  --text-color: ${designSystem.colors.text};
  --surface-color: ${designSystem.colors.surface};
  --border-color: ${designSystem.colors.border};
  
  --font-heading: ${designSystem.typography.headings};
  --font-body: ${designSystem.typography.body};
  --font-mono: ${designSystem.typography.mono};
  
  --border-radius: ${designSystem.effects.borderRadius};
  --shadow: ${designSystem.effects.shadow};
  --transition: ${designSystem.effects.transition};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  color: var(--text-color);
  background-color: var(--background-color);
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  line-height: 1.2;
}

.hero-section {
  padding: 4rem 0;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  color: white;
}

.hero-title {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border-radius: var(--border-radius);
  text-decoration: none;
  font-weight: 500;
  transition: var(--transition);
}

.btn-primary {
  background-color: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  padding: 4rem 0;
}

.feature-card {
  background: var(--surface-color);
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.nav-header {
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 2rem;
  list-style: none;
}

.nav-links a {
  text-decoration: none;
  color: var(--text-color);
  font-weight: 500;
  transition: var(--transition);
}

.nav-links a:hover {
  color: var(--primary-color);
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
  
  .hero-title {
    font-size: 2rem;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .nav-links {
    display: none;
  }
  
  .mobile-menu-btn {
    display: block;
  }
  
  .nav-links.mobile-open {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--surface-color);
    padding: 1rem;
    box-shadow: var(--shadow);
  }
}

${this.getLayoutSpecificCSS(layout)}
`;
  }

  generateJavaScript(_config: GitLyteConfig): string {
    return `
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function() {
      navLinks.classList.toggle('mobile-open');
    });
  }
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Header scroll effect
  const header = document.querySelector('.nav-header');
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
      } else {
        header.style.boxShadow = 'none';
      }
    });
  }
  
  // Intersection Observer for animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe feature cards
  document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
});
`;
  }

  private async generateDesignSystem(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig
  ): Promise<DesignSystem> {
    try {
      const preferences = {
        preferredColors: config.design?.colors,
        style: config.design?.theme,
      };

      return await this.anthropicClient.generateDesign(analysis, preferences);
    } catch (_error) {
      return this.getFallbackDesignSystem(config);
    }
  }

  private async generatePages(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    designSystem: DesignSystem
  ): Promise<Record<string, string>> {
    const pages: Record<string, string> = {};
    const pagesToGenerate = config.pages?.generate || ["index"];

    // Ensure index.html is always included
    const allPages = new Set(["index", ...pagesToGenerate]);

    for (const pageType of Array.from(allPages)) {
      pages[`${pageType}.html`] = await this.generatePage(
        pageType,
        analysis,
        config,
        designSystem
      );
    }

    return pages;
  }

  private async generatePageContent(
    pageType: string,
    analysis: RepositoryAnalysis
  ): Promise<GeneratedContent> {
    try {
      switch (pageType) {
        case "index":
          return await this.anthropicClient.generateContent(analysis, "hero");
        case "docs":
          return await this.anthropicClient.generateContent(
            analysis,
            "features"
          );
        default:
          return await this.anthropicClient.generateContent(analysis, "hero");
      }
    } catch (_error) {
      return this.getFallbackContent(pageType, analysis);
    }
  }

  private generateIndexPage(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    _designSystem: DesignSystem,
    _content: GeneratedContent
  ): string {
    const heroContent = _content.hero || this.getFallbackHeroContent(analysis);
    const title = config.site?.title || analysis.basicInfo.name;
    const description =
      config.site?.description || analysis.basicInfo.description;

    return this.generatePageTemplate({
      title,
      description,
      content: `
        <section class="hero-section" id="home">
          <div class="container">
            <h1 class="hero-title">${this.escapeHtml(heroContent.title)}</h1>
            <p class="hero-subtitle">${this.escapeHtml(heroContent.subtitle)}</p>
            <p class="hero-description">${this.escapeHtml(heroContent.description)}</p>
            <div class="hero-actions">
              <a href="#docs" class="btn btn-primary">Get Started</a>
              <a href="https://github.com/${analysis.basicInfo.name}" class="btn btn-secondary">View on GitHub</a>
            </div>
          </div>
        </section>

        <section class="features-section" id="features">
          <div class="container">
            <h2>Features</h2>
            <div class="features-grid">
              ${analysis.uniqueFeatures
                .map(
                  (feature) => `
                <div class="feature-card">
                  <h3>${this.escapeHtml(feature)}</h3>
                  <p>Experience the power of ${this.escapeHtml(feature.toLowerCase())} in your projects.</p>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </section>
      `,
      analysis,
      config,
    });
  }

  private generateDocsPage(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    _designSystem: DesignSystem,
    _content: GeneratedContent
  ): string {
    const title = config.site?.title || analysis.basicInfo.name;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation - ${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="nav-header">
    <nav class="nav-container container">
      <div class="nav-brand">
        <h2>${title}</h2>
      </div>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="docs.html">Documentation</a></li>
        <li><a href="api.html">API</a></li>
      </ul>
    </nav>
  </header>

  <main class="docs-main">
    <div class="container">
      <h1>Documentation</h1>
      
      <section class="docs-section">
        <h2>Installation</h2>
        <pre><code>npm install ${analysis.basicInfo.name}</code></pre>
      </section>
      
      <section class="docs-section">
        <h2>Usage</h2>
        <p>Get started with ${analysis.basicInfo.name} in your project:</p>
        <pre><code>import { ${analysis.basicInfo.name} } from '${analysis.basicInfo.name}';

// Example usage
const instance = new ${analysis.basicInfo.name}();
</code></pre>
      </section>
    </div>
  </main>

  <script src="navigation.js"></script>
</body>
</html>`;
  }

  private generateApiPage(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    _designSystem: DesignSystem
  ): string {
    const title = config.site?.title || analysis.basicInfo.name;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Reference - ${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="nav-header">
    <nav class="nav-container container">
      <div class="nav-brand">
        <h2>${title}</h2>
      </div>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="docs.html">Documentation</a></li>
        <li><a href="api.html">API</a></li>
      </ul>
    </nav>
  </header>

  <main class="api-main">
    <div class="container">
      <h1>API Reference</h1>
      
      <section class="api-section">
        <h2>Classes</h2>
        <p>Main classes available in ${analysis.basicInfo.name}:</p>
        
        <h3>${analysis.basicInfo.name}</h3>
        <p>The main class for ${analysis.basicInfo.description}</p>
        
        <h4>Methods</h4>
        <ul>
          <li><code>constructor()</code> - Creates a new instance</li>
          <li><code>method()</code> - Primary method for functionality</li>
        </ul>
      </section>
      
      <section class="api-section">
        <h2>Functions</h2>
        <p>Utility functions provided by ${analysis.basicInfo.name}:</p>
      </section>
      
      <section class="api-section">
        <h2>TypeScript</h2>
        <p>This package includes TypeScript definitions for better development experience.</p>
      </section>
    </div>
  </main>

  <script src="navigation.js"></script>
</body>
</html>`;
  }

  private generateExamplesPage(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    _designSystem: DesignSystem
  ): string {
    const title = config.site?.title || analysis.basicInfo.name;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Examples - ${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="examples-main">
    <div class="container">
      <h1>Examples</h1>
      <p>Code examples for ${analysis.basicInfo.name}</p>
    </div>
  </main>
  <script src="navigation.js"></script>
</body>
</html>`;
  }

  private generateChangelogPage(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig,
    _designSystem: DesignSystem
  ): string {
    const title = config.site?.title || analysis.basicInfo.name;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changelog - ${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="changelog-main">
    <div class="container">
      <h1>Changelog</h1>
      <p>Release history for ${analysis.basicInfo.name}</p>
    </div>
  </main>
  <script src="navigation.js"></script>
</body>
</html>`;
  }

  private generateSitemap(_config: GitLyteConfig): string {
    const pages = _config.pages?.generate || ["index"];
    const baseUrl = _config.site?.url || "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page: string) => `
  <url>
    <loc>${baseUrl}/${page === "index" ? "" : `${page}.html`}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === "index" ? "1.0" : "0.8"}</priority>
  </url>`
    )
    .join("")}
</urlset>`;
  }

  private generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

Sitemap: /sitemap.xml`;
  }

  private getLayoutSpecificCSS(layout: string): string {
    switch (layout) {
      case "minimal":
        return `
.hero-section {
  padding: 2rem 0;
  background: var(--background-color);
  color: var(--text-color);
}`;
      case "grid":
        return `
.features-grid {
  grid-template-columns: repeat(2, 1fr);
}`;
      default:
        return "";
    }
  }

  private getFallbackDesignSystem(config: GitLyteConfig): DesignSystem {
    return {
      colors: {
        primary: config.design?.colors?.primary || "#007acc",
        secondary: config.design?.colors?.secondary || "#005999",
        accent: config.design?.colors?.accent || "#ff6b35",
        background: "#ffffff",
        text: "#1f2937",
        surface: "#f9fafb",
        border: "#e5e7eb",
      },
      typography: {
        headings: "Inter, sans-serif",
        body: "System UI, sans-serif",
        mono: "JetBrains Mono, monospace",
      },
      effects: {
        borderRadius: "8px",
        shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        transition: "0.2s ease",
      },
      spacing: {
        unit: "rem",
        scale: {
          xs: "0.25rem",
          sm: "0.5rem",
          md: "1rem",
          lg: "1.5rem",
          xl: "2rem",
        },
      },
    };
  }

  private getFallbackContent(
    pageType: string,
    analysis: RepositoryAnalysis
  ): GeneratedContent {
    switch (pageType) {
      case "index":
        return {
          hero: this.getFallbackHeroContent(analysis),
        };
      default:
        return {
          hero: this.getFallbackHeroContent(analysis),
        };
    }
  }

  private getFallbackHeroContent(analysis: RepositoryAnalysis): {
    title: string;
    subtitle: string;
    description: string;
  } {
    return {
      title: analysis.basicInfo.name,
      subtitle: analysis.basicInfo.description || "A powerful development tool",
      description: `Built with ${analysis.basicInfo.language} for ${analysis.projectCharacteristics.audience}`,
    };
  }

  private generateFallbackSite(
    analysis: RepositoryAnalysis,
    config: GitLyteConfig
  ): GeneratedSite {
    const designSystem = this.getFallbackDesignSystem(config);
    const content = this.getFallbackContent("index", analysis);

    return {
      pages: {
        "index.html": this.generateIndexPage(
          analysis,
          config,
          designSystem,
          content
        ),
      },
      assets: {
        "style.css": this.generateCSS(designSystem, config),
        "navigation.js": this.generateJavaScript(config),
      },
      meta: {
        sitemap: this.generateSitemap(config),
        robotsTxt: this.generateRobotsTxt(),
      },
    };
  }

  private generatePageTemplate(options: {
    title: string;
    description: string;
    content: string;
    analysis: RepositoryAnalysis;
    config: GitLyteConfig;
  }): string {
    const { title, description, content, analysis, config: _config } = options;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <meta name="description" content="${this.escapeHtml(description)}">
  <meta property="og:title" content="${this.escapeHtml(title)}">
  <meta property="og:description" content="${this.escapeHtml(description)}">
  <meta property="og:type" content="website">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  ${this.generateNavigation(title, analysis)}
  
  <main>
    ${content}
  </main>

  ${this.generateFooter(title, analysis)}

  <script src="navigation.js"></script>
</body>
</html>`;
  }

  private generateNavigation(
    title: string,
    analysis: RepositoryAnalysis
  ): string {
    return `
  <header class="nav-header">
    <nav class="nav-container container">
      <div class="nav-brand">
        <h2>${this.escapeHtml(title)}</h2>
      </div>
      <ul class="nav-links">
        <li><a href="#home">Home</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="#docs">Documentation</a></li>
        <li><a href="https://github.com/${analysis.basicInfo.name}">GitHub</a></li>
      </ul>
      <button class="mobile-menu-btn">☰</button>
    </nav>
  </header>`;
  }

  private generateFooter(title: string, analysis: RepositoryAnalysis): string {
    return `
  <footer class="footer">
    <div class="container">
      <p>&copy; 2024 ${this.escapeHtml(title)}. Licensed under ${analysis.basicInfo.license}.</p>
    </div>
  </footer>`;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
