/**
 * API Reference Page Template
 * Generates comprehensive API documentation with method details, parameters, and examples
 */

export interface ApiParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ApiExample {
  title: string;
  code: string;
}

export interface ApiMethod {
  id: string;
  name: string;
  signature: string;
  description: string;
  parameters: ApiParameter[];
  returns: {
    type: string;
    description: string;
  };
  examples: ApiExample[];
}

export interface ApiCategory {
  id: string;
  title: string;
  description: string;
  methods: ApiMethod[];
}

export interface BreadcrumbItem {
  text: string;
  url: string;
  active?: boolean;
}

export interface ApiData {
  title: string;
  categories: ApiCategory[];
  breadcrumbs: BreadcrumbItem[];
  lastUpdated?: string;
}

/**
 * Generate the complete API reference page
 */
export const generateApiPage = (data: ApiData): string => {
  return `<div class="api-container">
    <a href="#main-content" class="skip-to-content">Skip to content</a>
    
    <aside class="api-sidebar" aria-label="API navigation">
      ${generateApiSearch()}
      ${generateApiSidebar(data.categories)}
    </aside>
    
    <main class="api-content" id="main-content" aria-label="API documentation">
      ${generateBreadcrumbs(data.breadcrumbs)}
      
      <div class="api-header">
        <h1 class="api-title">${escapeHtml(data.title)}</h1>
        ${generateApiMeta(data)}
      </div>
      
      <div class="api-body">
        ${generateApiContent(data.categories)}
      </div>
    </main>
  </div>`;
};

/**
 * Generate API sidebar navigation
 */
export const generateApiSidebar = (categories: ApiCategory[]): string => {
  const categoryItems = categories
    .map((category) => {
      const methodLinks = category.methods
        .map((method) => {
          return `<li class="method-item">
        <a href="#${method.id}" class="method-link">${escapeHtml(method.name)}</a>
      </li>`;
        })
        .join("\n        ");

      return `<div class="api-category">
      <h3 class="category-title">${escapeHtml(category.title)}</h3>
      <p class="category-description">${escapeHtml(category.description)}</p>
      <ul class="method-list">
        ${methodLinks}
      </ul>
    </div>`;
    })
    .join("\n    ");

  return `<nav class="api-nav">
    ${categoryItems}
  </nav>`;
};

/**
 * Generate API content sections
 */
export const generateApiContent = (categories: ApiCategory[]): string => {
  const categorySections = categories
    .map((category) => {
      const methodDocs = category.methods
        .map((method) => {
          return `<article class="method-doc" id="${method.id}">
        <h3 class="method-name">${escapeHtml(method.name)}</h3>
        <p class="method-description">${escapeHtml(method.description)}</p>
        
        ${generateMethodSignature(method)}
        
        ${
          method.parameters.length > 0
            ? `
        <div class="parameters-section">
          <h4 class="section-title">Parameters</h4>
          ${generateParameterTable(method.parameters)}
        </div>`
            : ""
        }
        
        ${
          method.examples.length > 0
            ? `
        <div class="examples-section">
          <h4 class="section-title">Examples</h4>
          ${method.examples.map((example) => generateCodeExample(example)).join("\n          ")}
        </div>`
            : ""
        }
      </article>`;
        })
        .join("\n      ");

      return `<section class="api-category-section" id="${category.id}">
      <h2 class="category-header">${escapeHtml(category.title)}</h2>
      <p class="category-description">${escapeHtml(category.description)}</p>
      
      ${methodDocs}
    </section>`;
    })
    .join("\n    ");

  return categorySections;
};

/**
 * Generate method signature section
 */
export const generateMethodSignature = (method: ApiMethod): string => {
  return `<div class="method-signature-section">
    <h4 class="section-title">Signature</h4>
    <code class="method-signature">${escapeHtml(method.signature)}</code>
    
    <div class="return-type">
      <span class="return-label">Returns:</span>
      <code>${escapeHtml(method.returns.type)}</code>
      <span class="return-description">${escapeHtml(method.returns.description)}</span>
    </div>
  </div>`;
};

/**
 * Generate parameter table
 */
export const generateParameterTable = (parameters: ApiParameter[]): string => {
  const parameterRows = parameters
    .map((param) => {
      return `<tr class="param-row">
      <td class="param-name"><code>${escapeHtml(param.name)}</code></td>
      <td class="param-type"><code>${escapeHtml(param.type)}</code></td>
      <td class="param-required">${param.required ? "Yes" : "No"}</td>
      <td class="param-description">${escapeHtml(param.description)}</td>
    </tr>`;
    })
    .join("\n    ");

  return `<table class="parameters-table">
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Type</th>
        <th>Required</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${parameterRows}
    </tbody>
  </table>`;
};

/**
 * Generate code example
 */
export const generateCodeExample = (example: ApiExample): string => {
  return `<div class="code-example">
    <h4 class="example-title">${escapeHtml(example.title)}</h4>
    <div class="code-block-container">
      <div class="code-header">
        <button class="copy-code-btn" aria-label="Copy code" data-clipboard-text="${escapeHtml(example.code)}">
          📋 Copy
        </button>
      </div>
      <pre><code class="language-javascript">${escapeHtml(example.code)}</code></pre>
    </div>
  </div>`;
};

/**
 * Generate API search box
 */
function generateApiSearch(): string {
  return `<div class="api-search">
    <div class="search-container">
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        class="api-search-input" 
        placeholder="Search API..."
        aria-label="Search API methods"
      />
      <span class="search-shortcut">Ctrl+K</span>
    </div>
    <div class="search-results" role="listbox" aria-label="Search results"></div>
  </div>`;
}

/**
 * Generate breadcrumb navigation
 */
function generateBreadcrumbs(breadcrumbs: BreadcrumbItem[]): string {
  const breadcrumbItems = breadcrumbs
    .map((item, index) => {
      const isLast = index === breadcrumbs.length - 1;
      const separator =
        index > 0 ? '<span class="breadcrumb-separator">›</span>' : "";

      if (item.active || isLast) {
        return `${separator}<li class="breadcrumb-item">
        <span class="breadcrumb-current">${escapeHtml(item.text)}</span>
      </li>`;
      }
      return `${separator}<li class="breadcrumb-item">
        <a href="${escapeHtml(item.url)}" class="breadcrumb-link">${escapeHtml(item.text)}</a>
      </li>`;
    })
    .join("\n    ");

  return `<nav class="breadcrumbs" aria-label="Breadcrumb navigation">
    <ol class="breadcrumb-list">
      ${breadcrumbItems}
    </ol>
  </nav>`;
}

/**
 * Generate API metadata
 */
function generateApiMeta(data: ApiData): string {
  if (!data.lastUpdated) return "";

  return `<div class="api-meta">
    <span class="api-meta-item">Last updated: ${escapeHtml(data.lastUpdated)}</span>
  </div>`;
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
