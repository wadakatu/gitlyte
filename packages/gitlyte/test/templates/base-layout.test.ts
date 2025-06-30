import { describe, expect, it } from "vitest";
import {
  generateBaseLayout,
  generateFooter,
  generateNavigation,
} from "../../templates/html/base-layout.js";
import type {
  FooterConfig,
  LayoutConfig,
  NavigationConfig,
} from "../../types/generated-site.js";

describe("Base Layout Template", () => {
  const mockLayoutConfig: LayoutConfig = {
    title: "Test Repository",
    description: "A comprehensive testing library for modern JavaScript",
    theme: "professional",
    navigation: {
      items: [
        { text: "Home", url: "index.html", active: true },
        { text: "Documentation", url: "docs.html" },
        { text: "API Reference", url: "api.html" },
        { text: "Examples", url: "examples.html" },
      ],
      logo: {
        src: "assets/logo.png",
        alt: "Test Repository Logo",
      },
    },
    footer: {
      copyright: "© 2024 Test Repository. All rights reserved.",
      links: [
        { text: "GitHub", url: "https://github.com/test/repo" },
        { text: "License", url: "LICENSE" },
        { text: "Contributing", url: "CONTRIBUTING.md" },
      ],
    },
    customHead: '<meta name="author" content="Test Author">',
    customScripts: '<script src="analytics.js"></script>',
  };

  describe("generateBaseLayout", () => {
    it("should generate valid HTML5 document structure", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("<head>");
      expect(html).toMatch(/<body[^>]*>/); // Match body tag with any attributes
      expect(html).toContain("</html>");
    });

    it("should include essential meta tags", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
      expect(html).toContain(
        '<meta name="description" content="A comprehensive testing library for modern JavaScript">'
      );
    });

    it("should set correct title", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain("<title>Test Repository</title>");
    });

    it("should include CSS and favicon links", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<link rel="stylesheet" href="style.css">');
      expect(html).toContain('<link rel="icon" href="assets/favicon.ico">');
    });

    it("should apply theme class to body", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<body class="professional">');
    });

    it("should include custom head content", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<meta name="author" content="Test Author">');
    });

    it("should include custom scripts", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<script src="analytics.js"></script>');
    });

    it("should include navigation and footer", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<nav class="main-nav">');
      expect(html).toContain('<footer class="main-footer">');
    });

    it("should include content placeholder", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain("{{CONTENT}}");
    });

    it("should include standard scripts", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<script src="navigation.js"></script>');
    });

    it("should handle missing optional configuration", () => {
      const minimalConfig: LayoutConfig = {
        title: "Minimal Site",
        description: "Minimal description",
        theme: "minimal",
        navigation: { items: [] },
        footer: { copyright: "© 2024", links: [] },
      };

      const html = generateBaseLayout(minimalConfig);

      expect(html).toContain("<title>Minimal Site</title>");
      expect(html).toContain('<body class="minimal">');
      expect(html).not.toContain('<meta name="author"');
      expect(html).not.toContain("analytics.js");
    });
  });

  describe("generateNavigation", () => {
    it("should generate navigation with logo", () => {
      const nav = generateNavigation(mockLayoutConfig.navigation);

      expect(nav).toContain('<div class="nav-logo">');
      expect(nav).toContain(
        '<img src="assets/logo.png" alt="Test Repository Logo">'
      );
    });

    it("should generate navigation items", () => {
      const nav = generateNavigation(mockLayoutConfig.navigation);

      expect(nav).toContain('<ul class="nav-items">');
      expect(nav).toContain('<li class="nav-item active">');
      expect(nav).toContain('<a href="index.html">Home</a>');
      expect(nav).toContain('<a href="docs.html">Documentation</a>');
      expect(nav).toContain('<a href="api.html">API Reference</a>');
    });

    it("should handle active navigation item", () => {
      const nav = generateNavigation(mockLayoutConfig.navigation);

      expect(nav).toContain('<li class="nav-item active">');
      expect(nav).toContain('<li class="nav-item">');
    });

    it("should work without logo", () => {
      const navConfig: NavigationConfig = {
        items: [{ text: "Home", url: "index.html" }],
      };

      const nav = generateNavigation(navConfig);

      expect(nav).not.toContain('<div class="nav-logo">');
      expect(nav).toContain('<a href="index.html">Home</a>');
    });

    it("should handle empty navigation items", () => {
      const navConfig: NavigationConfig = {
        items: [],
      };

      const nav = generateNavigation(navConfig);

      expect(nav).toContain('<ul class="nav-items">');
      expect(nav).toContain("</ul>");
    });
  });

  describe("generateFooter", () => {
    it("should generate footer with copyright", () => {
      const footer = generateFooter(mockLayoutConfig.footer);

      expect(footer).toContain('<div class="footer-content">');
      expect(footer).toContain('<p class="footer-copyright">');
      expect(footer).toContain("© 2024 Test Repository. All rights reserved.");
    });

    it("should generate footer links", () => {
      const footer = generateFooter(mockLayoutConfig.footer);

      expect(footer).toContain('<ul class="footer-links">');
      expect(footer).toContain(">GitHub</a>");
      expect(footer).toContain('<a href="LICENSE">License</a>');
      expect(footer).toContain('<a href="CONTRIBUTING.md">Contributing</a>');
    });

    it("should handle external links properly", () => {
      const footer = generateFooter(mockLayoutConfig.footer);

      // External links should have target="_blank" and rel="noopener noreferrer"
      expect(footer).toContain(
        '<a href="https://github.com/test/repo" target="_blank" rel="noopener noreferrer">GitHub</a>'
      );
    });

    it("should handle internal links properly", () => {
      const footer = generateFooter(mockLayoutConfig.footer);

      // Internal links should not have target="_blank"
      expect(footer).toContain('<a href="LICENSE">License</a>');
      expect(footer).toContain('<a href="CONTRIBUTING.md">Contributing</a>');
    });

    it("should work with minimal footer configuration", () => {
      const footerConfig: FooterConfig = {
        copyright: "© 2024 Minimal",
        links: [],
      };

      const footer = generateFooter(footerConfig);

      expect(footer).toContain("© 2024 Minimal");
      expect(footer).toContain('<ul class="footer-links">');
      expect(footer).toContain("</ul>");
    });
  });

  describe("SEO and Accessibility", () => {
    it("should include proper lang attribute", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<html lang="en">');
    });

    it("should include viewport meta tag for mobile responsiveness", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    });

    it("should generate semantic HTML structure", () => {
      const html = generateBaseLayout(mockLayoutConfig);

      expect(html).toContain('<nav class="main-nav">');
      expect(html).toContain("<main>");
      expect(html).toContain('<footer class="main-footer">');
    });

    it("should include alt text for logo image", () => {
      const nav = generateNavigation(mockLayoutConfig.navigation);

      expect(nav).toContain('alt="Test Repository Logo"');
    });
  });

  describe("Security", () => {
    it("should escape HTML in configuration values", () => {
      const maliciousConfig: LayoutConfig = {
        title: 'Test<script>alert("xss")</script>',
        description: "Description<img src=x onerror=alert(1)>",
        theme: "professional",
        navigation: { items: [] },
        footer: { copyright: "© 2024", links: [] },
      };

      const html = generateBaseLayout(maliciousConfig);

      expect(html).not.toContain('<script>alert("xss")</script>');
      expect(html).not.toContain("<img src=x onerror=alert(1)>");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    });

    it("should handle external links securely", () => {
      const footer = generateFooter(mockLayoutConfig.footer);

      // External links should include security attributes
      expect(footer).toContain('rel="noopener noreferrer"');
    });
  });
});
