import { describe, expect, it } from "vitest";
import type { DesignStrategy } from "../services/ai-analyzer.js";
import {
  analyzeDocumentStructure,
  generateDocsPage,
} from "../services/docs-generator.js";
import type { RepoData } from "../types.js";

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
      license: { key: "mit", name: "MIT License" },
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

This project is licensed under the MIT License.`,
  };

  const mockDesignStrategy: DesignStrategy = {
    colorScheme: {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      accent: "#06b6d4",
      background: "#ffffff",
    },
    typography: {
      heading: "Inter, sans-serif",
      body: "system-ui, sans-serif",
      code: "JetBrains Mono, monospace",
    },
    layout: "hero-focused",
    style: "modern",
    animations: true,
    darkMode: false,
    effects: {
      blur: true,
      shadows: "subtle",
      borders: "rounded",
      spacing: "normal",
    },
  };

  describe("analyzeDocumentStructure", () => {
    it("should parse README structure correctly", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);

      expect(structure.title).toBe("Test Project");
      expect(structure.sections.length).toBeGreaterThan(0);
      expect(structure.tableOfContents.length).toBeGreaterThan(5);

      // Check main sections
      const sectionTitles = structure.sections.map((s) => s.title);
      expect(sectionTitles).toContain("Test Project");
      expect(sectionTitles).toContain("Getting Started");
      expect(sectionTitles).toContain("API Reference");
      expect(sectionTitles).toContain("Contributing");
      expect(sectionTitles).toContain("License");
    });

    it("should generate proper anchor IDs", () => {
      const structure = analyzeDocumentStructure(mockRepoData.readme!);

      const tocAnchors = structure.tableOfContents.map((item) => item.anchor);
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
      structure.sections.forEach((s) => allSections.push(...s.subsections));

      const hasCodeBlocks = allSections.some((s) => s.hasCodeBlocks);
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
      const hasSubsections = structure.sections.some(
        (s) => s.subsections.length > 0
      );
      expect(hasSubsections).toBe(true);

      // 特定のサブセクションが存在するかチェック
      const allSections = structure.sections.flatMap((s) => [
        s,
        ...s.subsections,
      ]);
      const sectionTitles = allSections.map((s) => s.title);
      expect(sectionTitles).toContain("Prerequisites");
    });
  });

  describe("generateDocsPage", () => {
    it("should generate valid Astro page", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);

      // 新しいコンポーネント構造では異なるインポートとコンポーネントを使用
      expect(result.docsPage).toContain(
        "import BaseLayout from '../components/Layout/BaseLayout.astro'"
      );
      expect(result.docsPage).toContain("import HeroFocusedDocs");
      expect(result.docsPage).toContain("Test Project");
      expect(result.docsPage).toContain("Documentation");
    });

    it("should include search functionality", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);

      // 新しいコンポーネント構造ではコンポーネント内に検索機能が含まれる
      expect(result.docsPage).toContain("HeroFocusedDocs");
      expect(result.docsPage).toContain("tableOfContents");
      expect(result.searchData).toContain("Test Project");
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
      // 新しいコンポーネント構造ではgithubUrlが変数として定義される
      expect(result.docsPage).toContain('githubUrl = repoData.repo?.html_url');
    });

    it("should include responsive design", async () => {
      const result = await generateDocsPage(mockRepoData, mockDesignStrategy);

      // 新しいコンポーネント構造ではコンポーネントを使用
      expect(result.docsPage).toContain('HeroFocusedDocs');
      expect(result.docsPage).toContain('BaseLayout');
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
      const anchors = structure.tableOfContents.map((item) => item.anchor);
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
        readme: readmeWithImages,
      };

      const result = await generateDocsPage(
        mockRepoDataWithImages,
        mockDesignStrategy
      );

      // 新しいコンポーネント構造では、画像URLがコンテンツ内に含まれる
      expect(result.docsPage).toContain(
        'https://img.shields.io/badge/license-MIT-blue.svg'
      );
      expect(result.docsPage).toContain(
        'https://github.com/user/test-repo/raw/main/./assets/screenshot.png'
      );
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
        readme: readmeWithLists,
      };

      const result = await generateDocsPage(
        mockRepoDataWithLists,
        mockDesignStrategy
      );

      // 新しいコンポーネント構造では、コンテンツがテンプレートリテラル内に含まれる
      expect(result.docsPage).toContain("Feature 1");
      expect(result.docsPage).toContain("Feature 2");
      expect(result.docsPage).toContain("Feature 3");
      expect(result.docsPage).toContain("Feature 4");
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
        readme: readmeWithCode,
      };

      const result = await generateDocsPage(
        mockRepoDataWithCode,
        mockDesignStrategy
      );

      // 新しいコンポーネント構造では、コードブロックがコンポーネント内に含まれる
      expect(result.docsPage).toContain("javascript");
      expect(result.docsPage).toContain("function hello()");
      expect(result.docsPage).toContain("python");
      expect(result.docsPage).toContain("def hello()");

      // 言語表示が存在
      expect(result.docsPage).toContain("code-language");
      expect(result.docsPage).toContain("javascript");
      expect(result.docsPage).toContain("python");

      // 新しいコンポーネント構造ではコピーボタンがHTML内に含まれる
      expect(result.docsPage).toContain("copyCodeToClipboard");
      expect(result.docsPage).toContain("copy-button");
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
          logo: { path: "./assets/logo.png", alt: "Project Logo" },
        }),
      };

      const result = await generateDocsPage(
        mockRepoDataWithLogo,
        mockDesignStrategy
      );

      // 新しいコンポーネント構造ではhasLogoとlogoUrlがPropsとして渡される
      expect(result.docsPage).toContain('hasLogo={true}');
      expect(result.docsPage).toContain('logoUrl="https://github.com/user/test-repo/raw/main/assets/logo.png"');
    });

    it("should fallback to text header when no logo found", async () => {
      const readmeWithoutLogo = `# Project

![Screenshot](./screenshot.png)

## Features

Description here.`;

      const mockRepoDataWithoutLogo = {
        ...mockRepoData,
        readme: readmeWithoutLogo,
      };

      const result = await generateDocsPage(
        mockRepoDataWithoutLogo,
        mockDesignStrategy
      );

      // ロゴが見つからない場合はhasLogoがfalse
      expect(result.docsPage).toContain('hasLogo={false}');
      expect(result.docsPage).toContain('logoUrl=""');
    });
  });
});
