import { describe, expect, it } from "vitest";
import {
  generateApiContent,
  generateApiPage,
  generateApiSidebar,
  generateCodeExample,
  generateMethodSignature,
  generateParameterTable,
} from "../../templates/html/api-page.js";

describe("API Reference Page Template", () => {
  const mockApiData = {
    title: "API Reference",
    categories: [
      {
        id: "core",
        title: "Core API",
        description: "Essential functions and classes for testing",
        methods: [
          {
            id: "test",
            name: "test",
            signature: "test(name: string, fn: () => void): void",
            description:
              "Define a test case with a descriptive name and test function",
            parameters: [
              {
                name: "name",
                type: "string",
                description: "A descriptive name for the test",
                required: true,
              },
              {
                name: "fn",
                type: "() => void",
                description: "The test function to execute",
                required: true,
              },
            ],
            returns: {
              type: "void",
              description: "Does not return a value",
            },
            examples: [
              {
                title: "Basic Usage",
                code: `import { test } from 'gitlyte';

test('should add two numbers', () => {
  const result = 2 + 2;
  expect(result).toBe(4);
});`,
              },
            ],
          },
          {
            id: "expect",
            name: "expect",
            signature: "expect<T>(actual: T): Matcher<T>",
            description: "Create an expectation for a test assertion",
            parameters: [
              {
                name: "actual",
                type: "T",
                description: "The actual value to test",
                required: true,
              },
            ],
            returns: {
              type: "Matcher<T>",
              description: "A matcher object with assertion methods",
            },
            examples: [
              {
                title: "Basic Assertions",
                code: `expect(42).toBe(42);
expect('hello').toContain('ell');
expect([1, 2, 3]).toHaveLength(3);`,
              },
            ],
          },
        ],
      },
      {
        id: "matchers",
        title: "Matchers",
        description: "Assertion methods for testing values",
        methods: [
          {
            id: "toBe",
            name: "toBe",
            signature: "toBe(expected: T): void",
            description:
              "Assert that a value is strictly equal (===) to the expected value",
            parameters: [
              {
                name: "expected",
                type: "T",
                description: "The expected value",
                required: true,
              },
            ],
            returns: {
              type: "void",
              description: "Throws if assertion fails",
            },
            examples: [
              {
                title: "Primitive Values",
                code: `expect(42).toBe(42);
expect('hello').toBe('hello');
expect(true).toBe(true);`,
              },
            ],
          },
        ],
      },
    ],
    breadcrumbs: [
      { text: "Home", url: "index.html" },
      { text: "Documentation", url: "docs.html" },
      { text: "API Reference", url: "", active: true },
    ],
    lastUpdated: "2024-12-29",
  };

  describe("generateApiPage", () => {
    it("should generate complete API reference page", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('<div class="api-container">');
      expect(page).toContain('class="api-sidebar"');
      expect(page).toContain('class="api-content"');
    });

    it("should include page title and metadata", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('<h1 class="api-title">API Reference</h1>');
      expect(page).toContain("Last updated: 2024-12-29");
    });

    it("should include breadcrumb navigation", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('class="breadcrumbs"');
      expect(page).toContain('href="index.html"');
      expect(page).toContain('breadcrumb-current">API Reference');
    });

    it("should include search functionality", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('<div class="api-search">');
      expect(page).toContain('placeholder="Search API..."');
    });

    it("should include skip to content link", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain(
        '<a href="#main-content" class="skip-to-content">Skip to content</a>'
      );
    });
  });

  describe("generateApiSidebar", () => {
    it("should generate sidebar with categories", () => {
      const sidebar = generateApiSidebar(mockApiData.categories);

      expect(sidebar).toContain('<nav class="api-nav">');
      expect(sidebar).toContain('<div class="api-category">');
      expect(sidebar).toContain('<h3 class="category-title">Core API</h3>');
      expect(sidebar).toContain('<h3 class="category-title">Matchers</h3>');
    });

    it("should create method navigation links", () => {
      const sidebar = generateApiSidebar(mockApiData.categories);

      expect(sidebar).toContain('<a href="#test" class="method-link">test</a>');
      expect(sidebar).toContain(
        '<a href="#expect" class="method-link">expect</a>'
      );
      expect(sidebar).toContain('<a href="#toBe" class="method-link">toBe</a>');
    });

    it("should include category descriptions", () => {
      const sidebar = generateApiSidebar(mockApiData.categories);

      expect(sidebar).toContain("Essential functions and classes for testing");
      expect(sidebar).toContain("Assertion methods for testing values");
    });

    it("should handle empty categories", () => {
      const sidebar = generateApiSidebar([]);

      expect(sidebar).toContain('<nav class="api-nav">');
      expect(sidebar).not.toContain('<div class="api-category">');
    });
  });

  describe("generateApiContent", () => {
    it("should generate content for all categories", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain(
        '<section class="api-category-section" id="core">'
      );
      expect(content).toContain(
        '<section class="api-category-section" id="matchers">'
      );
    });

    it("should include category headers", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain('<h2 class="category-header">Core API</h2>');
      expect(content).toContain('<h2 class="category-header">Matchers</h2>');
    });

    it("should generate method documentation", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain('<article class="method-doc" id="test">');
      expect(content).toContain('<h3 class="method-name">test</h3>');
      expect(content).toContain("Define a test case with a descriptive name");
    });

    it("should include method signatures", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain(
        'class="method-signature">test(name: string, fn: () =&gt; void): void</code>'
      );
      expect(content).toContain(
        'class="method-signature">expect&lt;T&gt;(actual: T): Matcher&lt;T&gt;</code>'
      );
    });

    it("should include parameter tables", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain('<table class="parameters-table">');
      expect(content).toContain("<th>Parameter</th>");
      expect(content).toContain("<th>Type</th>");
      expect(content).toContain("<th>Description</th>");
    });

    it("should include code examples", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain('<div class="code-example">');
      expect(content).toContain('<h4 class="example-title">Basic Usage</h4>');
      expect(content).toContain("import { test } from &#039;gitlyte&#039;");
    });
  });

  describe("generateMethodSignature", () => {
    it("should generate method signature with proper escaping", () => {
      const method = mockApiData.categories[0].methods[1]; // expect method
      const signature = generateMethodSignature(method);

      expect(signature).toContain('<div class="method-signature-section">');
      expect(signature).toContain(
        '<code class="method-signature">expect&lt;T&gt;(actual: T): Matcher&lt;T&gt;</code>'
      );
    });

    it("should include return type information", () => {
      const method = mockApiData.categories[0].methods[0]; // test method
      const signature = generateMethodSignature(method);

      expect(signature).toContain('<div class="return-type">');
      expect(signature).toContain('<span class="return-label">Returns:</span>');
      expect(signature).toContain("<code>void</code>");
      expect(signature).toContain("Does not return a value");
    });
  });

  describe("generateParameterTable", () => {
    it("should generate parameter table with all columns", () => {
      const parameters = mockApiData.categories[0].methods[0].parameters;
      const table = generateParameterTable(parameters);

      expect(table).toContain('<table class="parameters-table">');
      expect(table).toContain("<th>Parameter</th>");
      expect(table).toContain("<th>Type</th>");
      expect(table).toContain("<th>Required</th>");
      expect(table).toContain("<th>Description</th>");
    });

    it("should include parameter information", () => {
      const parameters = mockApiData.categories[0].methods[0].parameters;
      const table = generateParameterTable(parameters);

      expect(table).toContain('<td class="param-name"><code>name</code></td>');
      expect(table).toContain(
        '<td class="param-type"><code>string</code></td>'
      );
      expect(table).toContain('<td class="param-required">Yes</td>');
      expect(table).toContain("A descriptive name for the test");
    });

    it("should handle optional parameters", () => {
      const optionalParam = [
        {
          name: "options",
          type: "TestOptions",
          description: "Optional configuration",
          required: false,
        },
      ];
      const table = generateParameterTable(optionalParam);

      expect(table).toContain('<td class="param-required">No</td>');
    });

    it("should handle empty parameters", () => {
      const table = generateParameterTable([]);

      expect(table).toContain('<table class="parameters-table">');
      expect(table).toContain("<tbody>");
      expect(table).not.toContain('<td class="param-name">');
    });
  });

  describe("generateCodeExample", () => {
    it("should generate code example with title", () => {
      const example = mockApiData.categories[0].methods[0].examples[0];
      const codeExample = generateCodeExample(example);

      expect(codeExample).toContain('<div class="code-example">');
      expect(codeExample).toContain(
        '<h4 class="example-title">Basic Usage</h4>'
      );
    });

    it("should include syntax-highlighted code block", () => {
      const example = mockApiData.categories[0].methods[0].examples[0];
      const codeExample = generateCodeExample(example);

      expect(codeExample).toContain('<pre><code class="language-javascript">');
      expect(codeExample).toContain("import { test } from &#039;gitlyte&#039;");
    });

    it("should include copy button", () => {
      const example = mockApiData.categories[0].methods[0].examples[0];
      const codeExample = generateCodeExample(example);

      expect(codeExample).toContain('<button class="copy-code-btn"');
      expect(codeExample).toContain('aria-label="Copy code"');
    });

    it("should escape HTML in code", () => {
      const maliciousExample = {
        title: "XSS Test",
        code: "const script = \"<script>alert('xss')</script>\";",
      };
      const codeExample = generateCodeExample(maliciousExample);

      expect(codeExample).not.toContain("<script>alert('xss')</script>");
      expect(codeExample).toContain("&lt;script&gt;");
    });
  });

  describe("Accessibility and SEO", () => {
    it("should include proper ARIA labels", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('aria-label="API navigation"');
      expect(page).toContain('aria-label="API documentation"');
    });

    it("should include proper heading hierarchy", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain('<h2 class="category-header">');
      expect(content).toContain('<h3 class="method-name">');
      expect(content).toContain('<h4 class="example-title">');
    });

    it("should include navigation landmarks", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('<aside class="api-sidebar"');
      expect(page).toContain('<main class="api-content"');
      expect(page).toContain('<nav class="breadcrumbs"');
    });

    it("should include method anchors for deep linking", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain('id="test"');
      expect(content).toContain('id="expect"');
      expect(content).toContain('id="toBe"');
    });
  });

  describe("Search Functionality", () => {
    it("should include search input with proper attributes", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('type="text"');
      expect(page).toContain('class="api-search-input"');
      expect(page).toContain('placeholder="Search API..."');
      expect(page).toContain('aria-label="Search API methods"');
    });

    it("should include search results container", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('<div class="search-results"');
      expect(page).toContain('role="listbox"');
    });

    it("should include keyboard shortcut hint", () => {
      const page = generateApiPage(mockApiData);

      expect(page).toContain('<span class="search-shortcut">Ctrl+K</span>');
    });
  });

  describe("Type Handling", () => {
    it("should properly escape generic types", () => {
      const content = generateApiContent(mockApiData.categories);

      expect(content).toContain("expect&lt;T&gt;");
      expect(content).toContain("Matcher&lt;T&gt;");
    });

    it("should handle complex function types", () => {
      const complexMethod = {
        id: "complex",
        name: "complexFunction",
        signature: "complexFunction<T, U>(mapper: (item: T) => U): Array<U>",
        description: "A complex generic function",
        parameters: [
          {
            name: "mapper",
            type: "(item: T) => U",
            description: "Transformation function",
            required: true,
          },
        ],
        returns: {
          type: "Array<U>",
          description: "Array of transformed items",
        },
        examples: [],
      };

      const signature = generateMethodSignature(complexMethod);

      expect(signature).toContain("complexFunction&lt;T, U&gt;");
      expect(signature).toContain("Array&lt;U&gt;");
    });
  });
});
