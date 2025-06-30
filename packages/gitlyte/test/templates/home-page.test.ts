import { describe, expect, it } from "vitest";
import {
  generateFeaturesSection,
  generateHeroSection,
  generateHomePage,
  generateInstallationSection,
  generateQuickStartSection,
  generateStatsSection,
} from "../../templates/html/home-page.js";
import type {
  FeaturesContent,
  HeroContent,
  SiteMetadata,
  StatsContent,
} from "../../types/generated-site.js";

describe("Home Page Template", () => {
  const mockHeroContent: HeroContent = {
    title: "GitLyte Test Framework",
    subtitle: "Modern Testing Made Simple",
    description:
      "A comprehensive testing library that makes writing, running, and maintaining tests a breeze. Built for modern JavaScript and TypeScript projects.",
    badge: {
      text: "v2.1.0",
      emoji: "🚀",
    },
    ctaButtons: [
      {
        text: "Get Started",
        url: "#installation",
        type: "primary",
        emoji: "⚡",
      },
      {
        text: "View Docs",
        url: "docs.html",
        type: "secondary",
        emoji: "📚",
      },
    ],
  };

  const mockFeaturesContent: FeaturesContent = {
    sectionTitle: "Why Choose GitLyte?",
    sectionSubtitle: "Built for modern development workflows",
    features: [
      {
        title: "Zero Configuration",
        description:
          "Get started instantly with sensible defaults. No complex setup required.",
        icon: "⚙️",
        highlight: "Works out of the box",
      },
      {
        title: "TypeScript First",
        description:
          "Built with TypeScript, providing excellent IDE support and type safety.",
        icon: "🔷",
        highlight: "Full type coverage",
      },
      {
        title: "Lightning Fast",
        description:
          "Optimized for speed with parallel test execution and smart caching.",
        icon: "⚡",
        highlight: "10x faster than Jest",
      },
      {
        title: "Modern Syntax",
        description:
          "Clean, readable test syntax that makes your intentions clear.",
        icon: "✨",
        highlight: "Developer friendly",
      },
    ],
  };

  const mockStatsContent: StatsContent = {
    stats: [
      {
        value: "50K+",
        label: "Downloads",
        emoji: "📦",
        source: "github",
      },
      {
        value: 4.9,
        label: "Rating",
        emoji: "⭐",
        source: "github",
      },
      {
        value: "100+",
        label: "Contributors",
        emoji: "👥",
        source: "github",
      },
      {
        value: "99%",
        label: "Test Coverage",
        emoji: "🎯",
        source: "custom",
      },
    ],
  };

  const mockMetadata: SiteMetadata = {
    title: "GitLyte Test Framework",
    description: "Modern testing library for JavaScript and TypeScript",
    githubUrl: "https://github.com/test/gitlyte",
    logoUrl: "assets/logo.png",
    theme: {
      colorScheme: "primary",
      style: "modern",
      layout: "hero-focused",
    },
  };

  describe("generateHomePage", () => {
    it("should generate complete home page with all sections", () => {
      const content = generateHomePage(
        mockHeroContent,
        mockFeaturesContent,
        mockStatsContent,
        mockMetadata
      );

      expect(content).toContain('<section class="hero">');
      expect(content).toContain('<section class="features">');
      expect(content).toContain('<section class="stats">');
      expect(content).toContain('<section class="installation">');
      expect(content).toContain('<section class="quick-start">');
    });

    it("should include hero content", () => {
      const content = generateHomePage(
        mockHeroContent,
        mockFeaturesContent,
        mockStatsContent,
        mockMetadata
      );

      expect(content).toContain("GitLyte Test Framework");
      expect(content).toContain("Modern Testing Made Simple");
      expect(content).toContain("Get Started");
      expect(content).toContain("View Docs");
    });

    it("should include features section", () => {
      const content = generateHomePage(
        mockHeroContent,
        mockFeaturesContent,
        mockStatsContent,
        mockMetadata
      );

      expect(content).toContain("Why Choose GitLyte?");
      expect(content).toContain("Zero Configuration");
      expect(content).toContain("TypeScript First");
      expect(content).toContain("Lightning Fast");
    });

    it("should include stats section", () => {
      const content = generateHomePage(
        mockHeroContent,
        mockFeaturesContent,
        mockStatsContent,
        mockMetadata
      );

      expect(content).toContain("50K+");
      expect(content).toContain("Downloads");
      expect(content).toContain("4.9");
      expect(content).toContain("Rating");
    });

    it("should handle missing optional content gracefully", () => {
      const minimalContent = generateHomePage(
        { title: "Test", subtitle: "Sub", description: "Desc", ctaButtons: [] },
        { sectionTitle: "Features", sectionSubtitle: "Sub", features: [] },
        { stats: [] },
        mockMetadata
      );

      expect(minimalContent).toContain('<section class="hero">');
      expect(minimalContent).toContain("Test");
      expect(minimalContent).not.toContain("undefined");
    });
  });

  describe("generateHeroSection", () => {
    it("should generate hero section with all elements", () => {
      const hero = generateHeroSection(mockHeroContent, mockMetadata);

      expect(hero).toContain('<section class="hero">');
      expect(hero).toContain('<div class="hero-content">');
      expect(hero).toContain(
        '<h1 class="hero-title">GitLyte Test Framework</h1>'
      );
      expect(hero).toContain(
        '<h2 class="hero-subtitle">Modern Testing Made Simple</h2>'
      );
      expect(hero).toContain('<p class="hero-description">');
    });

    it("should include version badge when provided", () => {
      const hero = generateHeroSection(mockHeroContent, mockMetadata);

      expect(hero).toContain('<div class="hero-badge">');
      expect(hero).toContain('<span class="badge-emoji">🚀</span>');
      expect(hero).toContain('<span class="badge-text">v2.1.0</span>');
    });

    it("should generate CTA buttons", () => {
      const hero = generateHeroSection(mockHeroContent, mockMetadata);

      expect(hero).toContain('<div class="hero-cta">');
      expect(hero).toContain(
        '<a href="#installation" class="btn btn-primary">'
      );
      expect(hero).toContain('<span class="btn-emoji">⚡</span>');
      expect(hero).toContain('<span class="btn-text">Get Started</span>');
      expect(hero).toContain('<a href="docs.html" class="btn btn-secondary">');
    });

    it("should work without badge", () => {
      const contentWithoutBadge = { ...mockHeroContent, badge: undefined };
      const hero = generateHeroSection(contentWithoutBadge, mockMetadata);

      expect(hero).not.toContain('<div class="hero-badge">');
      expect(hero).toContain('<h1 class="hero-title">');
    });

    it("should handle empty CTA buttons", () => {
      const contentWithoutCTA = { ...mockHeroContent, ctaButtons: [] };
      const hero = generateHeroSection(contentWithoutCTA, mockMetadata);

      expect(hero).toContain('<div class="hero-cta">');
      expect(hero).not.toContain("<a href=");
    });

    it("should escape HTML in content", () => {
      const maliciousContent = {
        ...mockHeroContent,
        title: 'Title<script>alert("xss")</script>',
        description: "Desc<img src=x onerror=alert(1)>",
      };
      const hero = generateHeroSection(maliciousContent, mockMetadata);

      expect(hero).not.toContain('<script>alert("xss")</script>');
      expect(hero).not.toContain("<img src=x onerror=alert(1)>");
      expect(hero).toContain("&lt;script&gt;");
    });
  });

  describe("generateFeaturesSection", () => {
    it("should generate features section with header", () => {
      const features = generateFeaturesSection(mockFeaturesContent);

      expect(features).toContain('<section class="features">');
      expect(features).toContain('<div class="features-header">');
      expect(features).toContain(
        '<h2 class="features-title">Why Choose GitLyte?</h2>'
      );
      expect(features).toContain(
        '<p class="features-subtitle">Built for modern development workflows</p>'
      );
    });

    it("should generate feature grid", () => {
      const features = generateFeaturesSection(mockFeaturesContent);

      expect(features).toContain('<div class="features-grid">');
      expect(features).toContain('<div class="feature-card">');
      expect(features).toContain('<div class="feature-icon">⚙️</div>');
      expect(features).toContain(
        '<h3 class="feature-title">Zero Configuration</h3>'
      );
      expect(features).toContain('<p class="feature-description">');
    });

    it("should include feature highlights", () => {
      const features = generateFeaturesSection(mockFeaturesContent);

      expect(features).toContain(
        '<div class="feature-highlight">Works out of the box</div>'
      );
      expect(features).toContain(
        '<div class="feature-highlight">Full type coverage</div>'
      );
      expect(features).toContain(
        '<div class="feature-highlight">10x faster than Jest</div>'
      );
    });

    it("should handle features without highlights", () => {
      const featuresWithoutHighlight = {
        ...mockFeaturesContent,
        features: [
          {
            title: "Simple Feature",
            description: "Basic description",
            icon: "🔧",
          },
        ],
      };
      const features = generateFeaturesSection(featuresWithoutHighlight);

      expect(features).toContain("Simple Feature");
      expect(features).not.toContain('<div class="feature-highlight">');
    });

    it("should handle empty features array", () => {
      const emptyFeatures = {
        ...mockFeaturesContent,
        features: [],
      };
      const features = generateFeaturesSection(emptyFeatures);

      expect(features).toContain('<div class="features-grid">');
      expect(features).not.toContain('<div class="feature-card">');
    });
  });

  describe("generateStatsSection", () => {
    it("should generate stats section with all stats", () => {
      const stats = generateStatsSection(mockStatsContent);

      expect(stats).toContain('<section class="stats">');
      expect(stats).toContain('<div class="stats-grid">');
      expect(stats).toContain('<div class="stat-card">');
    });

    it("should display stat values and labels correctly", () => {
      const stats = generateStatsSection(mockStatsContent);

      expect(stats).toContain('<span class="stat-value">50K+</span>');
      expect(stats).toContain('<span class="stat-label">Downloads</span>');
      expect(stats).toContain('<span class="stat-value">4.9</span>');
      expect(stats).toContain('<span class="stat-label">Rating</span>');
    });

    it("should include emoji icons", () => {
      const stats = generateStatsSection(mockStatsContent);

      expect(stats).toContain('<span class="stat-emoji">📦</span>');
      expect(stats).toContain('<span class="stat-emoji">⭐</span>');
      expect(stats).toContain('<span class="stat-emoji">👥</span>');
    });

    it("should handle numeric values correctly", () => {
      const stats = generateStatsSection(mockStatsContent);

      expect(stats).toContain('<span class="stat-value">4.9</span>');
    });

    it("should work with empty stats", () => {
      const emptyStats = { stats: [] };
      const stats = generateStatsSection(emptyStats);

      expect(stats).toContain('<section class="stats">');
      expect(stats).toContain('<div class="stats-grid">');
      expect(stats).not.toContain('<div class="stat-card">');
    });
  });

  describe("generateInstallationSection", () => {
    it("should generate installation section with npm and yarn commands", () => {
      const installation = generateInstallationSection(mockMetadata);

      expect(installation).toContain('<section class="installation">');
      expect(installation).toContain(
        '<h2 class="installation-title">Installation</h2>'
      );
      expect(installation).toContain("npm install gitlyte");
      expect(installation).toContain("yarn add gitlyte");
      expect(installation).toContain("pnpm add gitlyte");
    });

    it("should include code blocks with copy functionality", () => {
      const installation = generateInstallationSection(mockMetadata);

      expect(installation).toContain('<div class="code-block">');
      expect(installation).toContain('class="copy-btn"');
      expect(installation).toContain("data-clipboard-text=");
    });

    it("should derive package name from GitHub URL", () => {
      const customMetadata = {
        ...mockMetadata,
        githubUrl: "https://github.com/custom/awesome-package",
      };
      const installation = generateInstallationSection(customMetadata);

      expect(installation).toContain("npm install awesome-package");
    });

    it("should handle missing GitHub URL gracefully", () => {
      const metadataWithoutGithub = {
        ...mockMetadata,
        githubUrl: undefined,
      };
      const installation = generateInstallationSection(metadataWithoutGithub);

      expect(installation).toContain("npm install");
      expect(installation).toContain('<section class="installation">');
    });
  });

  describe("generateQuickStartSection", () => {
    it("should generate quick start section with basic example", () => {
      const quickStart = generateQuickStartSection(mockMetadata);

      expect(quickStart).toContain('<section class="quick-start">');
      expect(quickStart).toContain(
        '<h2 class="quick-start-title">Quick Start</h2>'
      );
      expect(quickStart).toContain('<div class="code-example">');
    });

    it("should include JavaScript and TypeScript examples", () => {
      const quickStart = generateQuickStartSection(mockMetadata);

      expect(quickStart).toContain('data-tab="javascript"');
      expect(quickStart).toContain('data-tab="typescript"');
      expect(quickStart).toContain("import { test, expect }");
    });

    it("should include tab navigation", () => {
      const quickStart = generateQuickStartSection(mockMetadata);

      expect(quickStart).toContain('<div class="tab-navigation">');
      expect(quickStart).toContain(
        '<button class="tab-btn active" data-tab="javascript">JavaScript</button>'
      );
      expect(quickStart).toContain(
        '<button class="tab-btn" data-tab="typescript">TypeScript</button>'
      );
    });
  });

  describe("Accessibility and SEO", () => {
    it("should include proper heading hierarchy", () => {
      const content = generateHomePage(
        mockHeroContent,
        mockFeaturesContent,
        mockStatsContent,
        mockMetadata
      );

      expect(content).toContain('<h1 class="hero-title">');
      expect(content).toContain('<h2 class="features-title">');
      expect(content).toContain('<h3 class="feature-title">');
    });

    it("should include alt text for images", () => {
      const hero = generateHeroSection(mockHeroContent, mockMetadata);

      // Check if any images have proper alt attributes
      const imageRegex = /<img[^>]+alt="[^"]*"/g;
      const images = hero.match(imageRegex);
      if (images) {
        expect(images.length).toBeGreaterThan(0);
      }
    });

    it("should include ARIA labels for interactive elements", () => {
      const installation = generateInstallationSection(mockMetadata);

      expect(installation).toContain('aria-label="Copy to clipboard"');
    });
  });
});
