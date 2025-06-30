/**
 * Documentation Page Template
 * Generates comprehensive documentation pages with TOC, search, and navigation
 */

export interface DocumentationSection {
  id: string;
  title: string;
  level: number;
}

export interface BreadcrumbItem {
  text: string;
  url: string;
  active?: boolean;
}

export interface NavigationItem {
  text: string;
  url: string;
  active?: boolean;
}

export interface DocumentationData {
  title: string;
  content: string;
  sections: DocumentationSection[];
  breadcrumbs: BreadcrumbItem[];
  navigation: NavigationItem[];
  lastUpdated?: string;
  readingTime?: number;
}

/**
 * Generate the complete documentation page
 */
export const generateDocsPage = (data: DocumentationData): string => {
  return `<div class="docs-container">
    <a href="#main-content" class="skip-to-content">Skip to content</a>
    
    <aside class="docs-sidebar" aria-label="Documentation navigation">
      ${generateSearchBox()}
      ${generateDocNavigation(data.navigation)}
    </aside>
    
    <main class="docs-content" id="main-content">
      ${generateBreadcrumbs(data.breadcrumbs)}
      
      <div class="docs-header">
        <h1 class="docs-title">${escapeHtml(data.title)}</h1>
        ${generateDocsMeta(data)}
      </div>
      
      <div class="docs-body">
        ${generateDocumentationContent(data.content)}
      </div>
    </main>
    
    <nav class="docs-toc" aria-label="Table of contents">
      ${generateTableOfContents(data.sections)}
    </nav>
  </div>`;
};

/**
 * Generate table of contents from document sections
 */
export const generateTableOfContents = (
  sections: DocumentationSection[]
): string => {
  const tocItems = sections
    .map((section) => {
      return `<li class="toc-item">
        <a href="#${section.id}" class="toc-link toc-level-${section.level}">${escapeHtml(section.title)}</a>
      </li>`;
    })
    .join("\n      ");

  return `<div class="toc-content">
    <h3 class="toc-title">Table of Contents</h3>
    <ul class="toc-list">
      ${tocItems}
    </ul>
  </div>`;
};

/**
 * Generate documentation content from markdown
 */
export const generateDocumentationContent = (markdown: string): string => {
  // Simple markdown to HTML conversion with security
  let html = escapeHtml(markdown);

  // Convert code blocks with syntax highlighting preparation first
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language, code) => {
    const lang = language || "text";
    return `<div class="code-block-container">
      <div class="code-header">
        <span class="code-language">${lang}</span>
        <button class="copy-code-btn" aria-label="Copy code" data-clipboard-text="${escapeHtml(code.trim())}">
          📋 Copy
        </button>
      </div>
      <pre><code class="language-${lang}">${code.trim()}</code></pre>
    </div>`;
  });

  // Convert headings with IDs
  html = html.replace(/^# (.+)$/gm, (_, title) => {
    const id = generateSlug(title);
    return `<h1 id="${id}">${title}</h1>`;
  });

  html = html.replace(/^## (.+)$/gm, (_, title) => {
    const id = generateSlug(title);
    return `<h2 id="${id}">${title}</h2>`;
  });

  html = html.replace(/^### (.+)$/gm, (_, title) => {
    const id = generateSlug(title);
    return `<h3 id="${id}">${title}</h3>`;
  });

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Split into paragraphs by double line breaks
  const paragraphs = html.split(/\n\s*\n/);

  // Process each paragraph
  html = paragraphs
    .map((paragraph) => {
      const trimmedParagraph = paragraph.trim();
      if (!trimmedParagraph) return "";

      // Don't wrap block elements in paragraphs
      if (trimmedParagraph.match(/^<(h[1-6]|div|pre|ul|ol|blockquote)/)) {
        return trimmedParagraph;
      }

      // Wrap regular text in paragraphs
      return `<p>${trimmedParagraph.replace(/\n/g, " ")}</p>`;
    })
    .filter((p) => p)
    .join("\n\n");

  return html;
};

/**
 * Generate breadcrumb navigation
 */
export const generateBreadcrumbs = (breadcrumbs: BreadcrumbItem[]): string => {
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
};

/**
 * Generate documentation navigation menu
 */
export const generateDocNavigation = (navigation: NavigationItem[]): string => {
  const navItems = navigation
    .map((item) => {
      const activeClass = item.active ? " active" : "";
      return `<li class="docs-nav-item">
        <a href="${escapeHtml(item.url)}" class="nav-item${activeClass}">${escapeHtml(item.text)}</a>
      </li>`;
    })
    .join("\n      ");

  return `<nav class="docs-nav">
    <h2 class="docs-nav-title">Documentation</h2>
    <ul class="docs-nav-list">
      ${navItems}
    </ul>
  </nav>`;
};

/**
 * Generate search box with keyboard shortcut
 */
export const generateSearchBox = (): string => {
  return `<div class="docs-search">
    <div class="search-container">
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        class="search-input" 
        placeholder="Search documentation..."
        aria-label="Search documentation"
      />
      <span class="search-shortcut">Ctrl+K</span>
    </div>
    <div class="search-results" role="listbox" aria-label="Search results"></div>
  </div>`;
};

/**
 * Generate documentation metadata
 */
function generateDocsMeta(data: DocumentationData): string {
  const metaItems: string[] = [];

  if (data.lastUpdated) {
    metaItems.push(
      `<span class="docs-meta-item">Last updated: ${escapeHtml(data.lastUpdated)}</span>`
    );
  }

  if (data.readingTime) {
    metaItems.push(
      `<span class="docs-meta-item">Reading time: ${data.readingTime} min</span>`
    );
  }

  if (metaItems.length === 0) return "";

  return `<div class="docs-meta">
    ${metaItems.join("\n    ")}
  </div>`;
}

/**
 * Generate URL-friendly slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
