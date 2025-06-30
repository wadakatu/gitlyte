import type {
  FooterConfig,
  LayoutConfig,
  NavigationConfig,
} from "../../types/generated-site.js";

/**
 * Generate the base HTML layout template
 */
export const generateBaseLayout = (config: LayoutConfig): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)}</title>
  <meta name="description" content="${escapeHtml(config.description)}">
  <link rel="stylesheet" href="style.css">
  <link rel="icon" href="assets/favicon.ico">
  ${config.customHead || ""}
</head>
<body class="${config.theme}">
  <nav class="main-nav">
    ${generateNavigation(config.navigation)}
  </nav>
  
  <main>
    {{CONTENT}}
  </main>
  
  <footer class="main-footer">
    ${generateFooter(config.footer)}
  </footer>
  
  <script src="navigation.js"></script>
  ${config.customScripts || ""}
</body>
</html>`;
};

/**
 * Generate navigation HTML
 */
export const generateNavigation = (navigation: NavigationConfig): string => {
  const logoHtml = navigation.logo
    ? `<div class="nav-logo">
        <img src="${escapeHtml(navigation.logo.src)}" alt="${escapeHtml(navigation.logo.alt)}">
      </div>`
    : "";

  const navItems = navigation.items
    .map((item) => {
      const activeClass = item.active ? " active" : "";
      return `<li class="nav-item${activeClass}">
        <a href="${escapeHtml(item.url)}">${escapeHtml(item.text)}</a>
      </li>`;
    })
    .join("\\n      ");

  return `<div class="nav-container">
    ${logoHtml}
    <ul class="nav-items">
      ${navItems}
    </ul>
  </div>`;
};

/**
 * Generate footer HTML
 */
export const generateFooter = (footer: FooterConfig): string => {
  const footerLinks = footer.links
    .map((link) => {
      const isExternal = link.url.startsWith("http");
      const externalAttrs = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";

      return `<li class="footer-link">
        <a href="${escapeHtml(link.url)}"${externalAttrs}>${escapeHtml(link.text)}</a>
      </li>`;
    })
    .join("\\n      ");

  return `<div class="footer-content">
    <p class="footer-copyright">${escapeHtml(footer.copyright)}</p>
    <ul class="footer-links">
      ${footerLinks}
    </ul>
  </div>`;
};

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
