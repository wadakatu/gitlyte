import type { DesignTokens } from '../types/index.js';

export const designTokens: DesignTokens = {
  colors: {
    primary: "#667eea",
    secondary: "#764ba2",
    accent: "#f093fb",
    background: "#ffffff",
    surface: "#f8fafc",
    textPrimary: "#2d3748",
    textSecondary: "#718096",
    textMuted: "#a0aec0",
    border: "#e2e8f0",
    success: "#48bb78",
    warning: "#ed8936",
    error: "#f56565"
  },
  typography: {
    fontFamily: {
      heading: "'Inter', system-ui, -apple-system, sans-serif",
      body: "'Inter', system-ui, -apple-system, sans-serif",
      code: "'JetBrains Mono', 'Fira Code', monospace"
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem", 
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem", 
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "2.5rem",
    "3xl": "3rem",
    "4xl": "4rem",
    "5xl": "6rem"
  },
  breakpoints: {
    mobile: "768px",
    tablet: "1024px", 
    desktop: "1200px",
    wide: "1440px"
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem", 
    xl: "0.75rem",
    full: "9999px"
  }
};

export function generateCSSVariables(tokens: DesignTokens): string {
  return `
    :root {
      /* Colors */
      --color-primary: ${tokens.colors.primary};
      --color-secondary: ${tokens.colors.secondary};
      --color-accent: ${tokens.colors.accent};
      --color-background: ${tokens.colors.background};
      --color-surface: ${tokens.colors.surface};
      --color-text-primary: ${tokens.colors.textPrimary};
      --color-text-secondary: ${tokens.colors.textSecondary};
      --color-text-muted: ${tokens.colors.textMuted};
      --color-border: ${tokens.colors.border};
      --color-success: ${tokens.colors.success};
      --color-warning: ${tokens.colors.warning};
      --color-error: ${tokens.colors.error};

      /* Typography */
      --font-heading: ${tokens.typography.fontFamily.heading};
      --font-body: ${tokens.typography.fontFamily.body};
      --font-code: ${tokens.typography.fontFamily.code};

      /* Font Sizes */
      --text-xs: ${tokens.typography.fontSize.xs};
      --text-sm: ${tokens.typography.fontSize.sm};
      --text-base: ${tokens.typography.fontSize.base};
      --text-lg: ${tokens.typography.fontSize.lg};
      --text-xl: ${tokens.typography.fontSize.xl};
      --text-2xl: ${tokens.typography.fontSize["2xl"]};
      --text-3xl: ${tokens.typography.fontSize["3xl"]};
      --text-4xl: ${tokens.typography.fontSize["4xl"]};
      --text-5xl: ${tokens.typography.fontSize["5xl"]};

      /* Spacing */
      --space-xs: ${tokens.spacing.xs};
      --space-sm: ${tokens.spacing.sm};
      --space-md: ${tokens.spacing.md};
      --space-lg: ${tokens.spacing.lg};
      --space-xl: ${tokens.spacing.xl};
      --space-2xl: ${tokens.spacing["2xl"]};
      --space-3xl: ${tokens.spacing["3xl"]};
      --space-4xl: ${tokens.spacing["4xl"]};
      --space-5xl: ${tokens.spacing["5xl"]};

      /* Shadows */
      --shadow-sm: ${tokens.shadows.sm};
      --shadow-md: ${tokens.shadows.md};
      --shadow-lg: ${tokens.shadows.lg};
      --shadow-xl: ${tokens.shadows.xl};

      /* Border Radius */
      --radius-sm: ${tokens.borderRadius.sm};
      --radius-md: ${tokens.borderRadius.md};
      --radius-lg: ${tokens.borderRadius.lg};
      --radius-xl: ${tokens.borderRadius.xl};
      --radius-full: ${tokens.borderRadius.full};
    }
  `.trim();
}