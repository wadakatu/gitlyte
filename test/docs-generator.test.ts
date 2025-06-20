import { describe, it, expect } from "vitest";
import { analyzeDocumentStructure, generateDocsPage } from "../src/services/docs-generator.js";
import type { RepoData } from "../src/types.js";
import type { DesignStrategy } from "../src/services/ai-analyzer.js";

describe("Docs Generator", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "user/test-repo",
      description: "A test repository",
      html_url: "https://github.com/user/test-repo",
      stargazers_count: 100,
      forks_count: 20,
      language: "TypeScript",
      topics: ["test", "docs"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      pushed_at: "2023-12-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: { key: "mit", name: "MIT License" }
    },
    prs: [],
    issues: [],
    readme: `# Test Project

This is a test project for documentation generation.

## Getting Started

To get started with this project:

1. Clone the repository
2. Install dependencies
3. Run the project

### Prerequisites

- Node.js 18+
- npm or yarn

## API Reference

### Configuration

\`\`\`typescript
interface Config {
  port: number;
  debug: boolean;
}
\`\`\`

### Methods

#### \`initialize(config: Config)\`

Initializes the application with the given configuration.

## Contributing

We welcome contributions! Please see our contributing guidelines.

## License

This project is licensed under the MIT License.`
  };

  const mockDesignStrategy: DesignStrategy = {
    colorScheme: {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      accent: "#06b6d4",
      background: "#ffffff"
    },
    typography: {
      heading: "Inter, sans-serif",
      body: "system-ui, sans-serif",
      code: "JetBrains Mono, monospace"
    },
    layout: "clean",
    style: "modern",
    animations: true
  };

  describe("analyzeDocumentStructure", () => {
    it("should parse README structure correctly", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);
      
      expect(structure.title).toBe("Test Project");
      expect(structure.sections.length).toBeGreaterThan(0);
      expect(structure.tableOfContents.length).toBeGreaterThan(5);
      
      // Check main sections
      const sectionTitles = structure.sections.map(s => s.title);
      expect(sectionTitles).toContain("Test Project");
      expect(sectionTitles).toContain("Getting Started");
      expect(sectionTitles).toContain("API Reference");
      expect(sectionTitles).toContain("Contributing");
      expect(sectionTitles).toContain("License");
    });

    it("should generate proper anchor IDs", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);
      
      const tocAnchors = structure.tableOfContents.map(item => item.anchor);
      expect(tocAnchors).toContain("#test-project");
      expect(tocAnchors).toContain("#getting-started");
      expect(tocAnchors).toContain("#api-reference");
      expect(tocAnchors).toContain("#prerequisites");
    });

    it("should detect code blocks correctly", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);
      
      expect(structure.metadata.codeBlocks).toBe(1); // One TypeScript code block
      
      // コードブロックが検出されることを確認
      const allSections = [...structure.sections];
      structure.sections.forEach(s => allSections.push(...s.subsections));
      
      const hasCodeBlocks = allSections.some(s => s.hasCodeBlocks);
      expect(hasCodeBlocks).toBe(true);
    });

    it("should calculate reading time and word count", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);
      
      expect(structure.metadata.wordCount).toBeGreaterThan(0);
      expect(structure.metadata.estimatedReadTime).toBeGreaterThan(0);
    });

    it("should handle nested sections", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);
      
      // ネスト構造があることを確認
      const hasSubsections = structure.sections.some(s => s.subsections.length > 0);
      expect(hasSubsections).toBe(true);
      
      // 特定のサブセクションが存在するかチェック
      const allSections = structure.sections.flatMap(s => [s, ...s.subsections]);
      const sectionTitles = allSections.map(s => s.title);
      expect(sectionTitles).toContain("Prerequisites");
    });
  });

  describe("generateDocsPage", () => {
    it("should generate valid Astro page", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);
      
      expect(result.docsPage).toContain("import Layout from '../layouts/Layout.astro'");
      expect(result.docsPage).toContain("Test Project");
      expect(result.docsPage).toContain("Documentation");
      expect(result.docsPage).toContain("#3b82f6"); // Primary color
    });

    it("should include search functionality", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);
      
      expect(result.docsPage).toContain("docs-search");
      expect(result.docsPage).toContain("search-results");
      expect(result.docsPage).toContain("addEventListener('input'");
    });

    it("should generate navigation with TOC", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);
      
      expect(result.navigation).toContain("Table of Contents");
      expect(result.navigation).toContain("getting-started");
      expect(result.navigation).toContain("api-reference");
      expect(result.navigation).toContain("min read");
    });

    it("should generate search data", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);
      
      const searchData = JSON.parse(result.searchData);
      expect(searchData.title).toBe("Test Project");
      expect(searchData.items).toBeInstanceOf(Array);
      expect(searchData.metadata.wordCount).toBeGreaterThan(0);
    });

    it("should handle repo links correctly", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);
      
      expect(result.docsPage).toContain("https://github.com/user/test-repo");
      expect(result.docsPage).toContain("View on GitHub");
      expect(result.docsPage).toContain("Edit this page on GitHub");
    });

    it("should include responsive design", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);
      
      expect(result.docsPage).toContain("@media (max-width: 1024px)");
      expect(result.docsPage).toContain("grid-template-columns: 1fr");
    });
  });

  describe("edge cases", () => {
    it("should handle empty README", () => {
      const structure = analyzeDocumentStructure("");
      
      expect(structure.title).toBe("Documentation");
      expect(structure.sections).toHaveLength(0);
      expect(structure.tableOfContents).toHaveLength(0);
      expect(structure.metadata.wordCount).toBe(0);
    });

    it("should handle README without headers", () => {
      const plainText = "This is just plain text without any headers.";
      const structure = analyzeDocumentStructure(plainText);
      
      expect(structure.title).toBe("Documentation");
      expect(structure.sections).toHaveLength(0);
      expect(structure.metadata.wordCount).toBeGreaterThan(0);
    });

    it("should handle special characters in headers", () => {
      const readmeWithSpecialChars = `# Test & Project (v2.0)

## Getting Started: Quick Setup!

### Step #1: Install & Configure`;
      
      const structure = analyzeDocumentStructure(readmeWithSpecialChars);
      
      expect(structure.title).toBe("Test & Project (v2.0)");
      const anchors = structure.tableOfContents.map(item => item.anchor);
      expect(anchors).toContain("#test-project-v20");
      expect(anchors).toContain("#getting-started-quick-setup");
      expect(anchors).toContain("#step-1-install-configure");
    });

    it("should handle markdown images and convert them to HTML", async () => {
      const readmeWithImages = `# Project

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Local Image](./assets/screenshot.png)

Description here.`;
      
      const mockRepoDataWithImages = {
        ...mockRepoData,
        readme: readmeWithImages
      };
      
      const result = await generateDocsPage(mockRepoDataWithImages, mockDesignStrategy);
      
      // HTTP画像はそのまま
      expect(result.docsPage).toContain('src="https://img.shields.io/badge/license-MIT-blue.svg"');
      // 相対パス画像はGitHubのrawURLに変換される
      expect(result.docsPage).toContain('src="https://github.com/user/test-repo/raw/main/./assets/screenshot.png"');
      // 画像にはCSSクラスが追加される
      expect(result.docsPage).toContain('class="markdown-image"');
      expect(result.docsPage).toContain('loading="lazy"');
    });

    it("should process markdown lists correctly", async () => {
      const readmeWithLists = `# Project

## Features

- Feature 1
- Feature 2
* Feature 3
+ Feature 4

End of list.`;
      
      const mockRepoDataWithLists = {
        ...mockRepoData,
        readme: readmeWithLists
      };
      
      const result = await generateDocsPage(mockRepoDataWithLists, mockDesignStrategy);
      
      expect(result.docsPage).toContain('<ul>');
      expect(result.docsPage).toContain('<li>Feature 1</li>');
      expect(result.docsPage).toContain('<li>Feature 2</li>');
      expect(result.docsPage).toContain('<li>Feature 3</li>');
      expect(result.docsPage).toContain('<li>Feature 4</li>');
      expect(result.docsPage).toContain('</ul>');
    });

    it("should add copy buttons to code blocks", async () => {
      const readmeWithCode = `# Project

Example usage:

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

\`\`\`python
def hello():
    print("Hello, World!")
\`\`\``;
      
      const mockRepoDataWithCode = {
        ...mockRepoData,
        readme: readmeWithCode
      };
      
      const result = await generateDocsPage(mockRepoDataWithCode, mockDesignStrategy);
      
      // コードブロックコンテナが存在
      expect(result.docsPage).toContain('code-block-container');
      expect(result.docsPage).toContain('code-block-header');
      
      // コピーボタンが存在
      expect(result.docsPage).toContain('copy-button');
      expect(result.docsPage).toContain('copyCodeToClipboard');
      
      // 言語表示が存在
      expect(result.docsPage).toContain('code-language');
      expect(result.docsPage).toContain('javascript');
      expect(result.docsPage).toContain('python');
      
      // コピー機能のJavaScriptが含まれている
      expect(result.docsPage).toContain('window.copyCodeToClipboard');
      expect(result.docsPage).toContain('navigator.clipboard.writeText');
      expect(result.docsPage).toContain('alert');
    });

    it("should handle logo detection from configuration file", async () => {
      const readmeWithLogo = `# Project

![Logo](./assets/logo.png)

## Features

Description here.`;
      
      const mockRepoDataWithLogo = {
        ...mockRepoData,
        readme: readmeWithLogo,
        configFile: JSON.stringify({
          logo: { path: "./assets/logo.png", alt: "Project Logo" }
        })
      };
      
      const result = await generateDocsPage(mockRepoDataWithLogo, mockDesignStrategy);
      
      // ロゴが設定ファイルから検出された場合のHTML要素が含まれる
      expect(result.docsPage).toContain('<div class="brand-with-logo">');
      expect(result.docsPage).toContain('class="brand-logo"');
      expect(result.docsPage).toContain('https://github.com/user/test-repo/raw/main/assets/logo.png');
    });

    it("should fallback to text header when no logo found", async () => {
      const readmeWithoutLogo = `# Project

![Screenshot](./screenshot.png)

## Features

Description here.`;
      
      const mockRepoDataWithoutLogo = {
        ...mockRepoData,
        readme: readmeWithoutLogo
      };
      
      const result = await generateDocsPage(mockRepoDataWithoutLogo, mockDesignStrategy);
      
      // ロゴが見つからない場合はテキストヘッダーのみ
      expect(result.docsPage).not.toContain('<div class="brand-with-logo">');
      expect(result.docsPage).toContain('<h1>{repoData.repo.name}</h1>');
    });
  });
});