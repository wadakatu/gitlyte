import { describe, expect, it } from "vitest";
import {
  generateBaseStyles,
  generateComponentStyles,
  generateCSS,
  generateLayoutStyles,
  generateResponsiveStyles,
  generateThemeVariables,
  generateUtilityStyles,
} from "../../templates/css/css-generator.js";

describe("CSS Generation System", () => {
  const mockThemeConfig = {
    colorScheme: "blue" as const,
    style: "modern" as const,
    layout: "hero-focused" as const,
    colors: {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#f59e0b",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1e293b",
      textSecondary: "#64748b",
      border: "#e2e8f0",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
    },
    typography: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
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
      },
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
    },
    spacing: {
      xs: "0.5rem",
      sm: "0.75rem",
      md: "1rem",
      lg: "1.5rem",
      xl: "2rem",
      "2xl": "3rem",
      "3xl": "4rem",
    },
    borderRadius: {
      sm: "0.125rem",
      md: "0.375rem",
      lg: "0.5rem",
      xl: "0.75rem",
    },
    shadows: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    },
  };

  describe("generateCSS", () => {
    it("should generate complete CSS file with all sections", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain("/* CSS Variables and Theme */");
      expect(css).toContain("/* Base Styles */");
      expect(css).toContain("/* Layout Styles */");
      expect(css).toContain("/* Component Styles */");
      expect(css).toContain("/* Responsive Styles */");
      expect(css).toContain("/* Utility Classes */");
    });

    it("should include CSS reset and base styles", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain("* {");
      expect(css).toContain("box-sizing: border-box");
      expect(css).toContain("html {");
      expect(css).toContain("body {");
      expect(css).toContain("margin: 0");
      expect(css).toContain("padding: 0");
    });

    it("should include theme variables", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain(":root {");
      expect(css).toContain("--color-primary: #3b82f6");
      expect(css).toContain("--color-background: #ffffff");
      expect(css).toContain("--font-family-sans: Inter");
    });

    it("should include component styles", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain(".btn {");
      expect(css).toContain(".nav-container {");
      expect(css).toContain(".hero {");
      expect(css).toContain(".feature-card {");
    });

    it("should include responsive breakpoints", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain("@media (min-width: 640px)");
      expect(css).toContain("@media (min-width: 768px)");
      expect(css).toContain("@media (min-width: 1024px)");
      expect(css).toContain("@media (min-width: 1280px)");
    });
  });

  describe("generateThemeVariables", () => {
    it("should generate CSS custom properties for colors", () => {
      const variables = generateThemeVariables(mockThemeConfig);

      expect(variables).toContain(":root {");
      expect(variables).toContain("--color-primary: #3b82f6;");
      expect(variables).toContain("--color-secondary: #64748b;");
      expect(variables).toContain("--color-background: #ffffff;");
      expect(variables).toContain("--color-text: #1e293b;");
    });

    it("should generate typography variables", () => {
      const variables = generateThemeVariables(mockThemeConfig);

      expect(variables).toContain(
        "--font-family-sans: Inter, system-ui, sans-serif;"
      );
      expect(variables).toContain(
        "--font-family-mono: JetBrains Mono, monospace;"
      );
      expect(variables).toContain("--font-size-base: 1rem;");
      expect(variables).toContain("--font-weight-semibold: 600;");
    });

    it("should generate spacing variables", () => {
      const variables = generateThemeVariables(mockThemeConfig);

      expect(variables).toContain("--spacing-xs: 0.5rem;");
      expect(variables).toContain("--spacing-md: 1rem;");
      expect(variables).toContain("--spacing-xl: 2rem;");
    });

    it("should generate border radius variables", () => {
      const variables = generateThemeVariables(mockThemeConfig);

      expect(variables).toContain("--border-radius-sm: 0.125rem;");
      expect(variables).toContain("--border-radius-md: 0.375rem;");
      expect(variables).toContain("--border-radius-lg: 0.5rem;");
    });

    it("should generate shadow variables", () => {
      const variables = generateThemeVariables(mockThemeConfig);

      expect(variables).toContain(
        "--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);"
      );
      expect(variables).toContain(
        "--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
      );
    });
  });

  describe("generateBaseStyles", () => {
    it("should generate CSS reset", () => {
      const baseStyles = generateBaseStyles(mockThemeConfig);

      expect(baseStyles).toContain("* {");
      expect(baseStyles).toContain("box-sizing: border-box;");
      expect(baseStyles).toContain("margin: 0;");
      expect(baseStyles).toContain("padding: 0;");
    });

    it("should set base typography", () => {
      const baseStyles = generateBaseStyles(mockThemeConfig);

      expect(baseStyles).toContain("html {");
      expect(baseStyles).toContain("font-family: var(--font-family-sans);");
      expect(baseStyles).toContain("font-size: var(--font-size-base);");
      expect(baseStyles).toContain("line-height: 1.5;");
    });

    it("should set body styles", () => {
      const baseStyles = generateBaseStyles(mockThemeConfig);

      expect(baseStyles).toContain("body {");
      expect(baseStyles).toContain(
        "background-color: var(--color-background);"
      );
      expect(baseStyles).toContain("color: var(--color-text);");
    });

    it("should style headings", () => {
      const baseStyles = generateBaseStyles(mockThemeConfig);

      expect(baseStyles).toContain("h1, h2, h3, h4, h5, h6 {");
      expect(baseStyles).toContain("font-weight: var(--font-weight-semibold);");
      expect(baseStyles).toContain("line-height: 1.2;");
    });

    it("should style links", () => {
      const baseStyles = generateBaseStyles(mockThemeConfig);

      expect(baseStyles).toContain("a {");
      expect(baseStyles).toContain("color: var(--color-primary);");
      expect(baseStyles).toContain("text-decoration: none;");
    });

    it("should style code elements", () => {
      const baseStyles = generateBaseStyles(mockThemeConfig);

      expect(baseStyles).toContain("code {");
      expect(baseStyles).toContain("font-family: var(--font-family-mono);");
      expect(baseStyles).toContain("background-color: var(--color-surface);");
    });
  });

  describe("generateLayoutStyles", () => {
    it("should generate container styles", () => {
      const layoutStyles = generateLayoutStyles(mockThemeConfig);

      expect(layoutStyles).toContain(".container {");
      expect(layoutStyles).toContain("max-width: 1200px;");
      expect(layoutStyles).toContain("margin: 0 auto;");
      expect(layoutStyles).toContain("padding: 0 var(--spacing-md);");
    });

    it("should generate grid system", () => {
      const layoutStyles = generateLayoutStyles(mockThemeConfig);

      expect(layoutStyles).toContain(".grid {");
      expect(layoutStyles).toContain("display: grid;");
      expect(layoutStyles).toContain(".grid-cols-1 {");
      expect(layoutStyles).toContain(
        "grid-template-columns: repeat(1, minmax(0, 1fr));"
      );
      expect(layoutStyles).toContain(".grid-cols-2 {");
      expect(layoutStyles).toContain(
        "grid-template-columns: repeat(2, minmax(0, 1fr));"
      );
    });

    it("should generate flexbox utilities", () => {
      const layoutStyles = generateLayoutStyles(mockThemeConfig);

      expect(layoutStyles).toContain(".flex {");
      expect(layoutStyles).toContain("display: flex;");
      expect(layoutStyles).toContain(".flex-col {");
      expect(layoutStyles).toContain("flex-direction: column;");
      expect(layoutStyles).toContain(".justify-center {");
      expect(layoutStyles).toContain("justify-content: center;");
    });

    it("should generate spacing utilities", () => {
      const layoutStyles = generateLayoutStyles(mockThemeConfig);

      expect(layoutStyles).toContain(".gap-md {");
      expect(layoutStyles).toContain("gap: var(--spacing-md);");
      expect(layoutStyles).toContain(".p-md {");
      expect(layoutStyles).toContain("padding: var(--spacing-md);");
      expect(layoutStyles).toContain(".m-lg {");
      expect(layoutStyles).toContain("margin: var(--spacing-lg);");
    });
  });

  describe("generateComponentStyles", () => {
    it("should generate button component styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".btn {");
      expect(componentStyles).toContain("display: inline-flex;");
      expect(componentStyles).toContain("align-items: center;");
      expect(componentStyles).toContain(
        "padding: var(--spacing-sm) var(--spacing-md);"
      );
      expect(componentStyles).toContain(
        "border-radius: var(--border-radius-md);"
      );
      expect(componentStyles).toContain(
        "font-weight: var(--font-weight-medium);"
      );
      expect(componentStyles).toContain(
        "transition: all var(--transition-base);"
      );
    });

    it("should generate button variants", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".btn-primary {");
      expect(componentStyles).toContain(
        "background-color: var(--color-primary);"
      );
      expect(componentStyles).toContain("color: white;");
      expect(componentStyles).toContain(".btn-secondary {");
      expect(componentStyles).toContain(
        "background-color: var(--color-secondary);"
      );
    });

    it("should generate navigation styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".main-nav {");
      expect(componentStyles).toContain(".nav-container {");
      expect(componentStyles).toContain("display: flex;");
      expect(componentStyles).toContain("align-items: center;");
      expect(componentStyles).toContain("justify-content: space-between;");
    });

    it("should generate hero section styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".hero {");
      expect(componentStyles).toContain("padding: var(--spacing-3xl) 0;");
      expect(componentStyles).toContain("text-align: center;");
      expect(componentStyles).toContain(".hero-title {");
      expect(componentStyles).toContain("font-size: var(--font-size-4xl);");
    });

    it("should generate card component styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".card {");
      expect(componentStyles).toContain(
        "background-color: var(--color-surface);"
      );
      expect(componentStyles).toContain(
        "border-radius: var(--border-radius-lg);"
      );
      expect(componentStyles).toContain("box-shadow: var(--shadow-md);");
      expect(componentStyles).toContain("padding: var(--spacing-lg);");
    });

    it("should generate feature card styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".feature-card {");
      expect(componentStyles).toContain(".feature-icon {");
      expect(componentStyles).toContain("font-size: var(--font-size-2xl);");
      expect(componentStyles).toContain(".feature-title {");
      expect(componentStyles).toContain("font-size: var(--font-size-lg);");
    });

    it("should generate documentation styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".docs-container {");
      expect(componentStyles).toContain("display: grid;");
      expect(componentStyles).toContain(".docs-sidebar {");
      expect(componentStyles).toContain("width: 250px;");
      expect(componentStyles).toContain(".docs-content {");
      expect(componentStyles).toContain("min-width: 0;");
    });

    it("should generate API documentation styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".api-container {");
      expect(componentStyles).toContain(".method-doc {");
      expect(componentStyles).toContain(
        "border-bottom: 1px solid var(--color-border);"
      );
      expect(componentStyles).toContain(".parameters-table {");
      expect(componentStyles).toContain("width: 100%;");
      expect(componentStyles).toContain("border-collapse: collapse;");
    });

    it("should generate code block styles", () => {
      const componentStyles = generateComponentStyles(mockThemeConfig);

      expect(componentStyles).toContain(".code-block {");
      expect(componentStyles).toContain(
        "background-color: var(--color-surface);"
      );
      expect(componentStyles).toContain(
        "border-radius: var(--border-radius-md);"
      );
      expect(componentStyles).toContain("overflow-x: auto;");
      expect(componentStyles).toContain(".copy-code-btn {");
      expect(componentStyles).toContain("position: absolute;");
      expect(componentStyles).toContain("top: var(--spacing-sm);");
      expect(componentStyles).toContain("right: var(--spacing-sm);");
    });
  });

  describe("generateResponsiveStyles", () => {
    it("should generate mobile-first breakpoints", () => {
      const responsiveStyles = generateResponsiveStyles(mockThemeConfig);

      expect(responsiveStyles).toContain("@media (min-width: 640px) {");
      expect(responsiveStyles).toContain("@media (min-width: 768px) {");
      expect(responsiveStyles).toContain("@media (min-width: 1024px) {");
      expect(responsiveStyles).toContain("@media (min-width: 1280px) {");
    });

    it("should generate responsive grid classes", () => {
      const responsiveStyles = generateResponsiveStyles(mockThemeConfig);

      expect(responsiveStyles).toContain(".sm\\:grid-cols-2 {");
      expect(responsiveStyles).toContain(".md\\:grid-cols-3 {");
      expect(responsiveStyles).toContain(".lg\\:grid-cols-4 {");
    });

    it("should generate responsive typography", () => {
      const responsiveStyles = generateResponsiveStyles(mockThemeConfig);

      expect(responsiveStyles).toContain(".hero-title {");
      expect(responsiveStyles).toContain("font-size: var(--font-size-3xl);");
    });

    it("should generate responsive navigation", () => {
      const responsiveStyles = generateResponsiveStyles(mockThemeConfig);

      expect(responsiveStyles).toContain(".nav-items {");
      expect(responsiveStyles).toContain("display: none;");
      expect(responsiveStyles).toContain(".md\\:flex {");
      expect(responsiveStyles).toContain("display: flex;");
    });

    it("should generate responsive documentation layout", () => {
      const responsiveStyles = generateResponsiveStyles(mockThemeConfig);

      expect(responsiveStyles).toContain(".docs-container {");
      expect(responsiveStyles).toContain("grid-template-columns: 1fr;");
      expect(responsiveStyles).toContain(
        "grid-template-columns: 250px 1fr 200px;"
      );
    });
  });

  describe("generateUtilityStyles", () => {
    it("should generate text utilities", () => {
      const utilityStyles = generateUtilityStyles(mockThemeConfig);

      expect(utilityStyles).toContain(".text-center {");
      expect(utilityStyles).toContain("text-align: center;");
      expect(utilityStyles).toContain(".text-left {");
      expect(utilityStyles).toContain("text-align: left;");
      expect(utilityStyles).toContain(".text-primary {");
      expect(utilityStyles).toContain("color: var(--color-primary);");
    });

    it("should generate background utilities", () => {
      const utilityStyles = generateUtilityStyles(mockThemeConfig);

      expect(utilityStyles).toContain(".bg-primary {");
      expect(utilityStyles).toContain(
        "background-color: var(--color-primary);"
      );
      expect(utilityStyles).toContain(".bg-surface {");
      expect(utilityStyles).toContain(
        "background-color: var(--color-surface);"
      );
    });

    it("should generate spacing utilities", () => {
      const utilityStyles = generateUtilityStyles(mockThemeConfig);

      expect(utilityStyles).toContain(".mt-md {");
      expect(utilityStyles).toContain("margin-top: var(--spacing-md);");
      expect(utilityStyles).toContain(".pb-lg {");
      expect(utilityStyles).toContain("padding-bottom: var(--spacing-lg);");
    });

    it("should generate border utilities", () => {
      const utilityStyles = generateUtilityStyles(mockThemeConfig);

      expect(utilityStyles).toContain(".border {");
      expect(utilityStyles).toContain("border: 1px solid var(--color-border);");
      expect(utilityStyles).toContain(".rounded-md {");
      expect(utilityStyles).toContain(
        "border-radius: var(--border-radius-md);"
      );
    });

    it("should generate shadow utilities", () => {
      const utilityStyles = generateUtilityStyles(mockThemeConfig);

      expect(utilityStyles).toContain(".shadow-sm {");
      expect(utilityStyles).toContain("box-shadow: var(--shadow-sm);");
      expect(utilityStyles).toContain(".shadow-lg {");
      expect(utilityStyles).toContain("box-shadow: var(--shadow-lg);");
    });

    it("should generate display utilities", () => {
      const utilityStyles = generateUtilityStyles(mockThemeConfig);

      expect(utilityStyles).toContain(".hidden {");
      expect(utilityStyles).toContain("display: none;");
      expect(utilityStyles).toContain(".block {");
      expect(utilityStyles).toContain("display: block;");
      expect(utilityStyles).toContain(".inline {");
      expect(utilityStyles).toContain("display: inline;");
    });
  });

  describe("Theme Variations", () => {
    it("should handle different color schemes", () => {
      const blueTheme = { ...mockThemeConfig, colorScheme: "blue" as const };
      const greenTheme = { ...mockThemeConfig, colorScheme: "green" as const };
      const purpleTheme = {
        ...mockThemeConfig,
        colorScheme: "purple" as const,
      };

      const blueCss = generateCSS(blueTheme);
      const greenCss = generateCSS(greenTheme);
      const purpleCss = generateCSS(purpleTheme);

      expect(blueCss).toContain("--color-primary: #3b82f6");
      expect(greenCss).toContain("--color-primary:");
      expect(purpleCss).toContain("--color-primary:");
    });

    it("should handle different style variants", () => {
      const modernTheme = { ...mockThemeConfig, style: "modern" as const };
      const classicTheme = { ...mockThemeConfig, style: "classic" as const };
      const minimalistTheme = {
        ...mockThemeConfig,
        style: "minimalist" as const,
      };

      const modernCss = generateCSS(modernTheme);
      const classicCss = generateCSS(classicTheme);
      const minimalistCss = generateCSS(minimalistTheme);

      expect(modernCss).toContain("/* Modern Style Theme */");
      expect(classicCss).toContain("/* Classic Style Theme */");
      expect(minimalistCss).toContain("/* Minimalist Style Theme */");
    });

    it("should handle different layout types", () => {
      const heroTheme = { ...mockThemeConfig, layout: "hero-focused" as const };
      const contentTheme = {
        ...mockThemeConfig,
        layout: "content-focused" as const,
      };
      const docsTheme = { ...mockThemeConfig, layout: "docs-focused" as const };

      const heroCss = generateCSS(heroTheme);
      const contentCss = generateCSS(contentTheme);
      const docsCss = generateCSS(docsTheme);

      expect(heroCss).toContain(".hero {");
      expect(contentCss).toContain("/* Content-Focused Layout */");
      expect(docsCss).toContain("/* Docs-Focused Layout */");
    });
  });

  describe("Accessibility and Performance", () => {
    it("should include focus styles", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain("*:focus {");
      expect(css).toContain("outline: 2px solid var(--color-primary);");
      expect(css).toContain("outline-offset: 2px;");
    });

    it("should include hover states", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain(".btn:hover {");
      expect(css).toContain(".nav-item:hover a {");
      expect(css).toContain("a:hover {");
    });

    it("should include reduced motion preferences", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain("@media (prefers-reduced-motion: reduce) {");
      expect(css).toContain("animation-duration: 0.01ms !important;");
      expect(css).toContain("animation-iteration-count: 1 !important;");
      expect(css).toContain("transition-duration: 0.01ms !important;");
    });

    it("should include high contrast support", () => {
      const css = generateCSS(mockThemeConfig);

      expect(css).toContain("@media (prefers-contrast: high) {");
      expect(css).toContain("border: 2px solid;");
    });

    it("should use efficient CSS selectors", () => {
      const css = generateCSS(mockThemeConfig);

      // Should not have overly specific selectors
      expect(css).not.toContain("div.container.hero.section");
      // Should use class-based selectors
      expect(css).toContain(".container {");
      expect(css).toContain(".hero {");
    });
  });
});
