import { describe, expect, it } from "vitest";
import {
  generateBreadcrumbs,
  generateDocNavigation,
  generateDocsPage,
  generateDocumentationContent,
  generateSearchBox,
  generateTableOfContents,
} from "../../templates/html/docs-page.js";

describe("Documentation Page Template", () => {
  const mockDocumentationData = {
    title: "Getting Started",
    content: `# Getting Started

Welcome to GitLyte! This guide will help you get up and running quickly.

## Installation

First, install GitLyte using your preferred package manager:

\`\`\`bash
npm install gitlyte
\`\`\`

## Basic Usage

Here's how to write your first test:

\`\`\`javascript
import { test, expect } from 'gitlyte';

test('should work correctly', () => {
  expect(true).toBe(true);
});
\`\`\`

## Configuration

GitLyte works out of the box, but you can customize it:

\`\`\`json
{
  "preset": "default",
  "coverage": true
}
\`\`\`

### Advanced Options

For more advanced configuration options, see the [API Reference](api.html).

## Next Steps

- Read the [API Documentation](api.html)
- Check out [Examples](examples.html)
- Join our [Community](https://github.com/test/gitlyte/discussions)`,
    sections: [
      { id: "installation", title: "Installation", level: 2 },
      { id: "basic-usage", title: "Basic Usage", level: 2 },
      { id: "configuration", title: "Configuration", level: 2 },
      { id: "advanced-options", title: "Advanced Options", level: 3 },
      { id: "next-steps", title: "Next Steps", level: 2 },
    ],
    breadcrumbs: [
      { text: "Home", url: "index.html" },
      { text: "Documentation", url: "docs.html" },
      { text: "Getting Started", url: "", active: true },
    ],
    navigation: [
      { text: "Getting Started", url: "docs.html", active: true },
      { text: "API Reference", url: "api.html" },
      { text: "Examples", url: "examples.html" },
      { text: "Contributing", url: "contributing.html" },
    ],
    lastUpdated: "2024-12-29",
    readingTime: 5,
  };

  describe("generateDocsPage", () => {
    it("should generate complete documentation page", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('<div class="docs-container">');
      expect(page).toContain('class="docs-sidebar"');
      expect(page).toContain('class="docs-content"');
      expect(page).toContain('class="docs-toc"');
    });

    it("should include search functionality", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('<div class="docs-search">');
      expect(page).toContain('type="text"');
      expect(page).toContain('placeholder="Search documentation..."');
    });

    it("should include table of contents", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('<div class="toc-content">');
      expect(page).toContain('href="#installation"');
      expect(page).toContain('href="#basic-usage"');
    });

    it("should include breadcrumbs", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('class="breadcrumbs"');
      expect(page).toContain('href="index.html"');
      expect(page).toContain('breadcrumb-current">Getting Started');
    });

    it("should include documentation navigation", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('<nav class="docs-nav">');
      expect(page).toContain(
        '<a href="docs.html" class="nav-item active">Getting Started</a>'
      );
      expect(page).toContain(
        '<a href="api.html" class="nav-item">API Reference</a>'
      );
    });

    it("should include metadata", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('<div class="docs-meta">');
      expect(page).toContain("Last updated: 2024-12-29");
      expect(page).toContain("Reading time: 5 min");
    });
  });

  describe("generateTableOfContents", () => {
    it("should generate TOC with proper hierarchy", () => {
      const toc = generateTableOfContents(mockDocumentationData.sections);

      expect(toc).toContain('<div class="toc-content">');
      expect(toc).toContain('<h3 class="toc-title">Table of Contents</h3>');
      expect(toc).toContain('<ul class="toc-list">');
    });

    it("should create proper anchor links", () => {
      const toc = generateTableOfContents(mockDocumentationData.sections);

      expect(toc).toContain(
        '<a href="#installation" class="toc-link toc-level-2">Installation</a>'
      );
      expect(toc).toContain(
        '<a href="#basic-usage" class="toc-link toc-level-2">Basic Usage</a>'
      );
      expect(toc).toContain(
        '<a href="#advanced-options" class="toc-link toc-level-3">Advanced Options</a>'
      );
    });

    it("should handle different heading levels", () => {
      const toc = generateTableOfContents(mockDocumentationData.sections);

      expect(toc).toContain("toc-level-2");
      expect(toc).toContain("toc-level-3");
    });

    it("should work with empty sections", () => {
      const toc = generateTableOfContents([]);

      expect(toc).toContain('<div class="toc-content">');
      expect(toc).toContain('<ul class="toc-list">');
      expect(toc).not.toContain("<a href=");
    });
  });

  describe("generateDocumentationContent", () => {
    it("should convert markdown to HTML", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain(
        '<h1 id="getting-started">Getting Started</h1>'
      );
      expect(content).toContain('<h2 id="installation">Installation</h2>');
      expect(content).toContain("<p>Welcome to GitLyte!");
    });

    it("should handle code blocks", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain('<pre><code class="language-bash">');
      expect(content).toContain('<pre><code class="language-javascript">');
      expect(content).toContain('<pre><code class="language-json">');
    });

    it("should generate anchor IDs for headings", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain('id="getting-started"');
      expect(content).toContain('id="installation"');
      expect(content).toContain('id="basic-usage"');
      expect(content).toContain('id="configuration"');
    });

    it("should handle inline code", () => {
      const simpleMarkdown = "Use `npm install` to install packages.";
      const content = generateDocumentationContent(simpleMarkdown);

      expect(content).toContain("<code>npm install</code>");
    });

    it("should handle links", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain('<a href="api.html">API Reference</a>');
      expect(content).toContain('<a href="examples.html">Examples</a>');
    });

    it("should escape HTML to prevent XSS", () => {
      const maliciousMarkdown =
        'This is <script>alert("xss")</script> content.';
      const content = generateDocumentationContent(maliciousMarkdown);

      expect(content).not.toContain('<script>alert("xss")</script>');
      expect(content).toContain("&lt;script&gt;");
    });
  });

  describe("generateBreadcrumbs", () => {
    it("should generate breadcrumb navigation", () => {
      const breadcrumbs = generateBreadcrumbs(
        mockDocumentationData.breadcrumbs
      );

      expect(breadcrumbs).toContain('class="breadcrumbs"');
      expect(breadcrumbs).toContain('<ol class="breadcrumb-list">');
    });

    it("should create proper breadcrumb links", () => {
      const breadcrumbs = generateBreadcrumbs(
        mockDocumentationData.breadcrumbs
      );

      expect(breadcrumbs).toContain(
        '<a href="index.html" class="breadcrumb-link">Home</a>'
      );
      expect(breadcrumbs).toContain(
        '<a href="docs.html" class="breadcrumb-link">Documentation</a>'
      );
    });

    it("should highlight current page", () => {
      const breadcrumbs = generateBreadcrumbs(
        mockDocumentationData.breadcrumbs
      );

      expect(breadcrumbs).toContain(
        '<span class="breadcrumb-current">Getting Started</span>'
      );
    });

    it("should include breadcrumb separators", () => {
      const breadcrumbs = generateBreadcrumbs(
        mockDocumentationData.breadcrumbs
      );

      expect(breadcrumbs).toContain('<span class="breadcrumb-separator">');
    });

    it("should handle single breadcrumb", () => {
      const singleBreadcrumb = [
        { text: "Home", url: "index.html", active: true },
      ];
      const breadcrumbs = generateBreadcrumbs(singleBreadcrumb);

      expect(breadcrumbs).toContain("Home");
      expect(breadcrumbs).not.toContain('<span class="breadcrumb-separator">');
    });
  });

  describe("generateDocNavigation", () => {
    it("should generate documentation navigation menu", () => {
      const nav = generateDocNavigation(mockDocumentationData.navigation);

      expect(nav).toContain('<nav class="docs-nav">');
      expect(nav).toContain('<ul class="docs-nav-list">');
    });

    it("should create navigation items", () => {
      const nav = generateDocNavigation(mockDocumentationData.navigation);

      expect(nav).toContain(
        '<a href="docs.html" class="nav-item active">Getting Started</a>'
      );
      expect(nav).toContain(
        '<a href="api.html" class="nav-item">API Reference</a>'
      );
      expect(nav).toContain(
        '<a href="examples.html" class="nav-item">Examples</a>'
      );
    });

    it("should highlight active item", () => {
      const nav = generateDocNavigation(mockDocumentationData.navigation);

      expect(nav).toContain('class="nav-item active"');
    });

    it("should handle empty navigation", () => {
      const nav = generateDocNavigation([]);

      expect(nav).toContain('<nav class="docs-nav">');
      expect(nav).toContain('<ul class="docs-nav-list">');
      expect(nav).not.toContain("<a href=");
    });
  });

  describe("generateSearchBox", () => {
    it("should generate search input", () => {
      const search = generateSearchBox();

      expect(search).toContain('<div class="docs-search">');
      expect(search).toContain('type="text"');
      expect(search).toContain('class="search-input"');
      expect(search).toContain('placeholder="Search documentation..."');
    });

    it("should include search icon", () => {
      const search = generateSearchBox();

      expect(search).toContain('<span class="search-icon">🔍</span>');
    });

    it("should include keyboard shortcut hint", () => {
      const search = generateSearchBox();

      expect(search).toContain('<span class="search-shortcut">Ctrl+K</span>');
    });

    it("should include search results container", () => {
      const search = generateSearchBox();

      expect(search).toContain('class="search-results"');
    });
  });

  describe("Accessibility and SEO", () => {
    it("should include proper ARIA labels", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('aria-label="Documentation navigation"');
      expect(page).toContain('aria-label="Table of contents"');
    });

    it("should include skip to content link", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain(
        '<a href="#main-content" class="skip-to-content">Skip to content</a>'
      );
    });

    it("should have proper heading hierarchy", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain('<h1 id="getting-started">');
      expect(content).toContain('<h2 id="installation">');
      expect(content).toContain('<h3 id="advanced-options">');
    });

    it("should include navigation landmarks", () => {
      const page = generateDocsPage(mockDocumentationData);

      expect(page).toContain('<nav class="breadcrumbs"');
      expect(page).toContain('<aside class="docs-sidebar"');
      expect(page).toContain('<main class="docs-content"');
    });
  });

  describe("Code Highlighting", () => {
    it("should prepare code blocks for syntax highlighting", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain('class="language-bash"');
      expect(content).toContain('class="language-javascript"');
      expect(content).toContain('class="language-json"');
    });

    it("should include copy buttons for code blocks", () => {
      const content = generateDocumentationContent(
        mockDocumentationData.content
      );

      expect(content).toContain('<button class="copy-code-btn"');
      expect(content).toContain('aria-label="Copy code"');
    });
  });
});
