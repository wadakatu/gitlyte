import type { ThemeConfig } from "../../types/generated-site.js";

/**
 * Generate complete CSS file with theme support
 */
export const generateCSS = (theme: ThemeConfig): string => {
  return `/* CSS Variables and Theme */
${generateThemeVariables(theme)}

/* Base Styles */
${generateBaseStyles(theme)}

/* Layout Styles */
${generateLayoutStyles(theme)}

/* Component Styles */
${generateComponentStyles(theme)}

/* Responsive Styles */
${generateResponsiveStyles(theme)}

/* Utility Classes */
${generateUtilityStyles(theme)}

/* Layout Variations */
${generateLayoutVariations(theme)}

/* Accessibility and Performance */
${generateAccessibilityStyles(theme)}`;
};

/**
 * Generate CSS custom properties (variables) from theme config
 */
export const generateThemeVariables = (theme: ThemeConfig): string => {
  return `:root {
  /* Colors */
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-text: ${theme.colors.text};
  --color-text-secondary: ${theme.colors.textSecondary};
  --color-border: ${theme.colors.border};
  --color-success: ${theme.colors.success};
  --color-warning: ${theme.colors.warning};
  --color-error: ${theme.colors.error};

  /* Typography */
  --font-family-sans: ${theme.typography.fontFamily.sans.join(", ")};
  --font-family-mono: ${theme.typography.fontFamily.mono.join(", ")};
  
  /* Font Sizes */
  --font-size-xs: ${theme.typography.fontSize.xs};
  --font-size-sm: ${theme.typography.fontSize.sm};
  --font-size-base: ${theme.typography.fontSize.base};
  --font-size-lg: ${theme.typography.fontSize.lg};
  --font-size-xl: ${theme.typography.fontSize.xl};
  --font-size-2xl: ${theme.typography.fontSize["2xl"]};
  --font-size-3xl: ${theme.typography.fontSize["3xl"]};
  --font-size-4xl: ${theme.typography.fontSize["4xl"]};
  
  /* Font Weights */
  --font-weight-normal: ${theme.typography.fontWeight.normal};
  --font-weight-medium: ${theme.typography.fontWeight.medium};
  --font-weight-semibold: ${theme.typography.fontWeight.semibold};
  --font-weight-bold: ${theme.typography.fontWeight.bold};

  /* Spacing */
  --spacing-xs: ${theme.spacing.xs};
  --spacing-sm: ${theme.spacing.sm};
  --spacing-md: ${theme.spacing.md};
  --spacing-lg: ${theme.spacing.lg};
  --spacing-xl: ${theme.spacing.xl};
  --spacing-2xl: ${theme.spacing["2xl"]};
  --spacing-3xl: ${theme.spacing["3xl"]};

  /* Border Radius */
  --border-radius-sm: ${theme.borderRadius.sm};
  --border-radius-md: ${theme.borderRadius.md};
  --border-radius-lg: ${theme.borderRadius.lg};
  --border-radius-xl: ${theme.borderRadius.xl};

  /* Shadows */
  --shadow-sm: ${theme.shadows.sm};
  --shadow-md: ${theme.shadows.md};
  --shadow-lg: ${theme.shadows.lg};
  --shadow-xl: ${theme.shadows.xl};

  /* Transitions */
  --transition-base: 150ms ease-in-out;
  --transition-fast: 100ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}

/* ${theme.style.charAt(0).toUpperCase() + theme.style.slice(1)} Style Theme */`;
};

/**
 * Generate base CSS reset and typography styles
 */
export const generateBaseStyles = (_theme: ThemeConfig): string => {
  return `/* CSS Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  line-height: 1.5;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-family-sans);
  line-height: 1.6;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
  margin-bottom: var(--spacing-md);
}

h1 { font-size: var(--font-size-4xl); }
h2 { font-size: var(--font-size-3xl); }
h3 { font-size: var(--font-size-2xl); }
h4 { font-size: var(--font-size-xl); }
h5 { font-size: var(--font-size-lg); }
h6 { font-size: var(--font-size-base); }

p {
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-base);
}

a:hover {
  color: var(--color-accent);
  text-decoration: underline;
}

code {
  font-family: var(--font-family-mono);
  font-size: 0.9em;
  background-color: var(--color-surface);
  padding: 0.125rem 0.25rem;
  border-radius: var(--border-radius-sm);
}

pre {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  overflow-x: auto;
}

img {
  max-width: 100%;
  height: auto;
}

ul, ol {
  padding-left: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}`;
};

/**
 * Generate layout and utility styles
 */
export const generateLayoutStyles = (_theme: ThemeConfig): string => {
  return `/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

/* Grid System */
.grid {
  display: grid;
  gap: var(--spacing-md);
}

.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

/* Flexbox */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-start { justify-content: flex-start; }
.justify-end { justify-content: flex-end; }

/* Spacing */
.gap-xs { gap: var(--spacing-xs); }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }
.gap-xl { gap: var(--spacing-xl); }

.p-xs { padding: var(--spacing-xs); }
.p-sm { padding: var(--spacing-sm); }
.p-md { padding: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }
.p-xl { padding: var(--spacing-xl); }

.m-xs { margin: var(--spacing-xs); }
.m-sm { margin: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
.m-lg { margin: var(--spacing-lg); }
.m-xl { margin: var(--spacing-xl); }

.mt-md { margin-top: var(--spacing-md); }
.mb-md { margin-bottom: var(--spacing-md); }
.ml-md { margin-left: var(--spacing-md); }
.mr-md { margin-right: var(--spacing-md); }

.pt-md { padding-top: var(--spacing-md); }
.pb-lg { padding-bottom: var(--spacing-lg); }
.pl-md { padding-left: var(--spacing-md); }
.pr-md { padding-right: var(--spacing-md); }`;
};

/**
 * Generate component styles
 */
export const generateComponentStyles = (_theme: ThemeConfig): string => {
  return `/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--border-radius-md);
  font-family: var(--font-family-sans);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-base);
  gap: var(--spacing-xs);
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background-color: var(--color-accent);
  color: white;
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.btn-secondary:hover {
  background-color: var(--color-primary);
  color: white;
}

/* Navigation */
.main-nav {
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-md) 0;
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

.nav-logo img {
  height: 2rem;
  width: auto;
}

.nav-items {
  display: flex;
  gap: var(--spacing-lg);
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  display: flex;
}

.nav-item a {
  color: var(--color-text);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-base);
}

.nav-item:hover a {
  background-color: var(--color-surface);
  color: var(--color-primary);
}

.nav-item.active a {
  background-color: var(--color-primary);
  color: white;
}

/* Hero Section */
.hero {
  padding: var(--spacing-3xl) 0;
  text-align: center;
  background: linear-gradient(135deg, var(--color-background) 0%, var(--color-surface) 100%);
}

.hero-title {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
}

.hero-description {
  font-size: var(--font-size-lg);
  color: var(--color-text);
  margin-bottom: var(--spacing-xl);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-buttons {
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  flex-wrap: wrap;
}

/* Cards */
.card {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-lg);
  transition: all var(--transition-base);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

/* Feature Cards */
.feature-card {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  text-align: center;
  transition: all var(--transition-base);
  border: 1px solid var(--color-border);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-primary);
}

.feature-icon {
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-md);
  display: block;
}

.feature-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
  color: var(--color-text);
}

.feature-description {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* Documentation Styles */
.docs-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-lg);
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.docs-sidebar {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  width: 250px;
  height: fit-content;
  position: sticky;
  top: calc(var(--spacing-xl) + 60px);
}

.docs-content {
  background-color: var(--color-background);
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-xl);
  min-width: 0;
  overflow-wrap: break-word;
}

/* API Documentation */
.api-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

.method-doc {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.method-doc:last-child {
  border-bottom: none;
}

.parameters-table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-md) 0;
  background-color: var(--color-surface);
  border-radius: var(--border-radius-md);
  overflow: hidden;
}

.parameters-table th,
.parameters-table td {
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.parameters-table th {
  background-color: var(--color-primary);
  color: white;
  font-weight: var(--font-weight-semibold);
}

/* Code Blocks */
.code-block {
  position: relative;
  background-color: var(--color-surface);
  border-radius: var(--border-radius-md);
  padding: var(--spacing-md);
  margin: var(--spacing-md) 0;
  overflow-x: auto;
  border: 1px solid var(--color-border);
}

.copy-code-btn {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all var(--transition-base);
}

.copy-code-btn:hover {
  background-color: var(--color-accent);
}

/* Footer */
.main-footer {
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-xl) 0;
  margin-top: var(--spacing-3xl);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.footer-copyright {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.footer-links {
  display: flex;
  gap: var(--spacing-lg);
  list-style: none;
  margin: 0;
  padding: 0;
}

.footer-link a {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: color var(--transition-base);
}

.footer-link a:hover {
  color: var(--color-primary);
}`;
};

/**
 * Generate responsive styles with mobile-first approach
 */
export const generateResponsiveStyles = (_theme: ThemeConfig): string => {
  return `/* Mobile Base Styles */
.nav-items {
  display: none;
}

.hero-title {
  font-size: var(--font-size-3xl);
}

.docs-container {
  grid-template-columns: 1fr;
}

/* Small screens (640px and up) */
@media (min-width: 640px) {
  .sm\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .hero-title {
    font-size: var(--font-size-4xl);
  }
}

/* Medium screens (768px and up) */
@media (min-width: 768px) {
  .md\\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  
  .md\\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  
  .md\\:flex {
    display: flex;
  }
  
  .nav-items {
    display: flex;
  }
  
  .docs-container {
    grid-template-columns: 250px 1fr;
  }
}

/* Large screens (1024px and up) */
@media (min-width: 1024px) {
  .lg\\:grid-cols-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  
  .lg\\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  
  .docs-container {
    grid-template-columns: 250px 1fr 200px;
  }
}

/* Extra large screens (1280px and up) */
@media (min-width: 1280px) {
  .xl\\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  
  .xl\\:grid-cols-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}`;
};

/**
 * Generate utility classes
 */
export const generateUtilityStyles = (_theme: ThemeConfig): string => {
  return `/* Text Utilities */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }

.text-xs { font-size: var(--font-size-xs); }
.text-sm { font-size: var(--font-size-sm); }
.text-base { font-size: var(--font-size-base); }
.text-lg { font-size: var(--font-size-lg); }
.text-xl { font-size: var(--font-size-xl); }

.text-primary { color: var(--color-primary); }
.text-secondary { color: var(--color-text-secondary); }
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-error { color: var(--color-error); }

.font-normal { font-weight: var(--font-weight-normal); }
.font-medium { font-weight: var(--font-weight-medium); }
.font-semibold { font-weight: var(--font-weight-semibold); }
.font-bold { font-weight: var(--font-weight-bold); }

/* Background Utilities */
.bg-primary { background-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.bg-surface { background-color: var(--color-surface); }
.bg-background { background-color: var(--color-background); }

/* Spacing Utilities */
.mt-xs { margin-top: var(--spacing-xs); }
.mt-sm { margin-top: var(--spacing-sm); }
.mt-md { margin-top: var(--spacing-md); }
.mt-lg { margin-top: var(--spacing-lg); }
.mt-xl { margin-top: var(--spacing-xl); }

.mb-xs { margin-bottom: var(--spacing-xs); }
.mb-sm { margin-bottom: var(--spacing-sm); }
.mb-md { margin-bottom: var(--spacing-md); }
.mb-lg { margin-bottom: var(--spacing-lg); }
.mb-xl { margin-bottom: var(--spacing-xl); }

.ml-xs { margin-left: var(--spacing-xs); }
.ml-sm { margin-left: var(--spacing-sm); }
.ml-md { margin-left: var(--spacing-md); }
.ml-lg { margin-left: var(--spacing-lg); }
.ml-xl { margin-left: var(--spacing-xl); }

.mr-xs { margin-right: var(--spacing-xs); }
.mr-sm { margin-right: var(--spacing-sm); }
.mr-md { margin-right: var(--spacing-md); }
.mr-lg { margin-right: var(--spacing-lg); }
.mr-xl { margin-right: var(--spacing-xl); }

.pt-xs { padding-top: var(--spacing-xs); }
.pt-sm { padding-top: var(--spacing-sm); }
.pt-md { padding-top: var(--spacing-md); }
.pt-lg { padding-top: var(--spacing-lg); }
.pt-xl { padding-top: var(--spacing-xl); }

.pb-xs { padding-bottom: var(--spacing-xs); }
.pb-sm { padding-bottom: var(--spacing-sm); }
.pb-md { padding-bottom: var(--spacing-md); }
.pb-lg { padding-bottom: var(--spacing-lg); }
.pb-xl { padding-bottom: var(--spacing-xl); }

.pl-xs { padding-left: var(--spacing-xs); }
.pl-sm { padding-left: var(--spacing-sm); }
.pl-md { padding-left: var(--spacing-md); }
.pl-lg { padding-left: var(--spacing-lg); }
.pl-xl { padding-left: var(--spacing-xl); }

.pr-xs { padding-right: var(--spacing-xs); }
.pr-sm { padding-right: var(--spacing-sm); }
.pr-md { padding-right: var(--spacing-md); }
.pr-lg { padding-right: var(--spacing-lg); }
.pr-xl { padding-right: var(--spacing-xl); }

/* Border Utilities */
.border { border: 1px solid var(--color-border); }
.border-primary { border-color: var(--color-primary); }
.border-secondary { border-color: var(--color-secondary); }

.rounded-sm { border-radius: var(--border-radius-sm); }
.rounded-md { border-radius: var(--border-radius-md); }
.rounded-lg { border-radius: var(--border-radius-lg); }
.rounded-xl { border-radius: var(--border-radius-xl); }

/* Shadow Utilities */
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }
.shadow-xl { box-shadow: var(--shadow-xl); }

/* Display Utilities */
.hidden { display: none; }
.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }
.flex { display: flex; }
.grid { display: grid; }

/* Position Utilities */
.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }

/* Overflow Utilities */
.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-x-auto { overflow-x: auto; }
.overflow-y-auto { overflow-y: auto; }

/* Width and Height Utilities */
.w-full { width: 100%; }
.h-full { height: 100%; }
.w-auto { width: auto; }
.h-auto { height: auto; }`;
};

/**
 * Generate layout-specific variations
 */
export const generateLayoutVariations = (theme: ThemeConfig): string => {
  const layoutStyles = {
    "hero-focused": `
/* Hero-Focused Layout */
.hero-focused-layout .hero {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}`,
    "content-focused": `
/* Content-Focused Layout */
.content-focused-layout .main-content {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-md);
}`,
    "docs-focused": `
/* Docs-Focused Layout */
.docs-focused-layout .docs-container {
  grid-template-columns: 280px 1fr 220px;
  gap: var(--spacing-xl);
}`,
    minimal: `
/* Minimal Layout */
.minimal-layout {
  font-size: var(--font-size-sm);
}

.minimal-layout .hero {
  padding: var(--spacing-xl) 0;
}`,
    grid: `
/* Grid Layout */
.grid-layout .features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}`,
    sidebar: `
/* Sidebar Layout */
.sidebar-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: var(--spacing-xl);
}

.sidebar-layout .sidebar {
  background: var(--color-surface);
  padding: var(--spacing-lg);
  border-radius: var(--border-radius-lg);
}`,
    "content-heavy": `
/* Content-Heavy Layout */
.content-heavy-layout .main-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--spacing-xl);
}`,
  };

  return layoutStyles[theme.layout] || layoutStyles["hero-focused"];
};

/**
 * Generate accessibility and performance styles
 */
export const generateAccessibilityStyles = (_theme: ThemeConfig): string => {
  return `
/* Focus Styles for Accessibility */
*:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skip Links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: var(--border-radius-md);
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}

/* Reduced Motion Preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  .btn,
  .card,
  .feature-card {
    border: 2px solid;
  }
  
  .nav-item a:hover,
  .nav-item.active a {
    outline: 2px solid;
  }
}

/* Dark Mode Preferences */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0f172a;
    --color-surface: #1e293b;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-border: #334155;
  }
}

/* Print Styles */
@media print {
  .main-nav,
  .hero-buttons,
  .footer {
    display: none;
  }
  
  body {
    font-size: 12pt;
    line-height: 1.4;
  }
  
  .hero-title,
  h1, h2, h3 {
    page-break-after: avoid;
  }
}`;
};
