import type {
  CTAButton,
  Feature,
  FeaturesContent,
  HeroContent,
  SiteMetadata,
  StatItem,
  StatsContent,
} from "../../types/generated-site.js";

/**
 * Generate the complete home page content
 */
export const generateHomePage = (
  heroContent: HeroContent,
  featuresContent: FeaturesContent,
  statsContent: StatsContent,
  _metadata: SiteMetadata
): string => {
  return `
    ${generateHeroSection(heroContent, _metadata)}
    ${generateStatsSection(statsContent)}
    ${generateFeaturesSection(featuresContent)}
    ${generateInstallationSection(_metadata)}
    ${generateQuickStartSection(_metadata)}
  `;
};

/**
 * Generate the hero section with title, subtitle, description and CTA buttons
 */
export const generateHeroSection = (
  content: HeroContent,
  _metadata: SiteMetadata
): string => {
  const badgeHtml = content.badge
    ? `<div class="hero-badge">
        <span class="badge-emoji">${content.badge.emoji || ""}</span>
        <span class="badge-text">${escapeHtml(content.badge.text)}</span>
      </div>`
    : "";

  const ctaButtonsHtml = content.ctaButtons
    .map((button) => generateCTAButton(button))
    .join("\n      ");

  return `<section class="hero">
    <div class="hero-container">
      <div class="hero-content">
        ${badgeHtml}
        <h1 class="hero-title">${escapeHtml(content.title)}</h1>
        <h2 class="hero-subtitle">${escapeHtml(content.subtitle)}</h2>
        <p class="hero-description">${escapeHtml(content.description)}</p>
        <div class="hero-cta">
          ${ctaButtonsHtml}
        </div>
      </div>
    </div>
  </section>`;
};

/**
 * Generate the features section with feature cards
 */
export const generateFeaturesSection = (content: FeaturesContent): string => {
  const featureCards = content.features
    .map((feature) => generateFeatureCard(feature))
    .join("\n      ");

  return `<section class="features">
    <div class="features-container">
      <div class="features-header">
        <h2 class="features-title">${escapeHtml(content.sectionTitle)}</h2>
        <p class="features-subtitle">${escapeHtml(content.sectionSubtitle)}</p>
      </div>
      <div class="features-grid">
        ${featureCards}
      </div>
    </div>
  </section>`;
};

/**
 * Generate the stats section with key metrics
 */
export const generateStatsSection = (content: StatsContent): string => {
  const statCards = content.stats
    .map((stat) => generateStatCard(stat))
    .join("\n      ");

  return `<section class="stats">
    <div class="stats-container">
      <div class="stats-grid">
        ${statCards}
      </div>
    </div>
  </section>`;
};

/**
 * Generate the installation section with package manager commands
 */
export const generateInstallationSection = (
  _metadata: SiteMetadata
): string => {
  const packageName =
    extractPackageName(_metadata.githubUrl) ||
    _metadata.title.toLowerCase().replace(/\s+/g, "-");

  return `<section class="installation">
    <div class="installation-container">
      <h2 class="installation-title">Installation</h2>
      <p class="installation-description">Choose your preferred package manager:</p>
      
      <div class="installation-commands">
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">npm</span>
            <button class="copy-btn" aria-label="Copy to clipboard" data-clipboard-text="npm install ${packageName}">
              📋 Copy
            </button>
          </div>
          <code class="code-content">npm install ${packageName}</code>
        </div>
        
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">yarn</span>
            <button class="copy-btn" aria-label="Copy to clipboard" data-clipboard-text="yarn add ${packageName}">
              📋 Copy
            </button>
          </div>
          <code class="code-content">yarn add ${packageName}</code>
        </div>
        
        <div class="code-block">
          <div class="code-header">
            <span class="code-label">pnpm</span>
            <button class="copy-btn" aria-label="Copy to clipboard" data-clipboard-text="pnpm add ${packageName}">
              📋 Copy
            </button>
          </div>
          <code class="code-content">pnpm add ${packageName}</code>
        </div>
      </div>
    </div>
  </section>`;
};

/**
 * Generate the quick start section with code examples
 */
export const generateQuickStartSection = (_metadata: SiteMetadata): string => {
  const packageName =
    extractPackageName(_metadata.githubUrl) ||
    _metadata.title.toLowerCase().replace(/\s+/g, "-");

  return `<section class="quick-start">
    <div class="quick-start-container">
      <h2 class="quick-start-title">Quick Start</h2>
      <p class="quick-start-description">Get up and running in seconds:</p>
      
      <div class="code-example">
        <div class="tab-navigation">
          <button class="tab-btn active" data-tab="javascript">JavaScript</button>
          <button class="tab-btn" data-tab="typescript">TypeScript</button>
        </div>
        
        <div class="tab-content active" data-tab="javascript">
          <div class="code-block">
            <code class="code-content">
// Import the library
import { test, expect } from '${packageName}';

// Write your first test
test('should work correctly', () => {
  expect(true).toBe(true);
});

// Run your tests
// npm test
            </code>
          </div>
        </div>
        
        <div class="tab-content" data-tab="typescript">
          <div class="code-block">
            <code class="code-content">
// Import with full TypeScript support
import { test, expect } from '${packageName}';

// Write type-safe tests
test('should have excellent TypeScript support', () => {
  const result: string = 'Hello, TypeScript!';
  expect(result).toBe('Hello, TypeScript!');
});

// Enjoy full IDE intellisense
// npm test
            </code>
          </div>
        </div>
      </div>
    </div>
  </section>`;
};

// Helper functions

/**
 * Generate a CTA button
 */
function generateCTAButton(button: CTAButton): string {
  const emojiHtml = button.emoji
    ? `<span class="btn-emoji">${button.emoji}</span>`
    : "";

  return `<a href="${escapeHtml(button.url)}" class="btn btn-${button.type}">
          ${emojiHtml}
          <span class="btn-text">${escapeHtml(button.text)}</span>
        </a>`;
}

/**
 * Generate a feature card
 */
function generateFeatureCard(feature: Feature): string {
  const highlightHtml = feature.highlight
    ? `<div class="feature-highlight">${escapeHtml(feature.highlight)}</div>`
    : "";

  return `<div class="feature-card">
        <div class="feature-icon">${feature.icon}</div>
        <h3 class="feature-title">${escapeHtml(feature.title)}</h3>
        <p class="feature-description">${escapeHtml(feature.description)}</p>
        ${highlightHtml}
      </div>`;
}

/**
 * Generate a stat card
 */
function generateStatCard(stat: StatItem): string {
  const emojiHtml = stat.emoji
    ? `<span class="stat-emoji">${stat.emoji}</span>`
    : "";

  return `<div class="stat-card">
        ${emojiHtml}
        <span class="stat-value">${escapeHtml(stat.value.toString())}</span>
        <span class="stat-label">${escapeHtml(stat.label)}</span>
      </div>`;
}

/**
 * Extract package name from GitHub URL
 */
function extractPackageName(githubUrl?: string): string | null {
  if (!githubUrl) return null;

  const match = githubUrl.match(/github\.com\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
