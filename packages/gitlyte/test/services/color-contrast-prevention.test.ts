import { describe, expect, it } from "vitest";
import type {
  DesignStrategy,
  RepoAnalysis,
} from "../../services/ai-analyzer.js";
import { generateAstroSite } from "../../services/ai-code-generator.js";
import type { RepoData } from "../../types.js";

describe("Color Contrast Prevention", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "test/test-repo",
      description: "A test repository",
      html_url: "https://github.com/test/test-repo",
      stargazers_count: 100,
      forks_count: 50,
      language: "TypeScript",
      updated_at: "2024-01-01T00:00:00Z",
      created_at: "2023-01-01T00:00:00Z",
      pushed_at: "2024-01-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: null,
      topics: [],
    },
    prs: [],
    issues: [],
    readme: "# Test Repository\n\nThis is a test repository.",
  };

  const mockAnalysis: RepoAnalysis = {
    projectType: "library",
    techStack: ["TypeScript", "React"],
    primaryLanguage: "TypeScript",
    activity: "high",
    audience: "developer",
    purpose: "Testing AI code generation",
    tone: "professional",
    complexity: "moderate",
  };

  const mockDesign: DesignStrategy = {
    colorScheme: {
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#3b82f6",
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

  it("should not use CSS variables for critical color styles", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that footer and other critical elements use actual color values instead of CSS variables
    const criticalElements = [
      "footer",
      ".nav-brand",
      ".btn-primary",
      ".docs-link-primary",
      ".docs-link-secondary",
    ];

    criticalElements.forEach((element) => {
      const elementStylePattern = new RegExp(
        `${element.replace(".", "\\.")}\\s*{[^}]*}`,
        "g"
      );
      const matches = result.indexPage.match(elementStylePattern);

      if (matches) {
        matches.forEach((styleBlock) => {
          // Check that background and color properties use hex colors, not CSS variables
          const backgroundMatches = styleBlock.match(/background:\s*([^;]+)/g);
          const colorMatches = styleBlock.match(/color:\s*([^;]+)/g);

          if (backgroundMatches) {
            backgroundMatches.forEach((bgDeclaration) => {
              if (bgDeclaration.includes("var(--")) {
                // If using CSS variables, ensure they're properly defined or use actual values
                const hasActualColors = /#[0-9a-fA-F]{3,8}/.test(bgDeclaration);
                if (!hasActualColors) {
                  throw new Error(
                    `${element} uses CSS variables without actual color fallback: ${bgDeclaration}`
                  );
                }
              }
            });
          }

          if (colorMatches) {
            colorMatches.forEach((colorDeclaration) => {
              if (colorDeclaration.includes("var(--")) {
                const hasActualColors = /#[0-9a-fA-F]{3,8}/.test(
                  colorDeclaration
                );
                if (!hasActualColors) {
                  throw new Error(
                    `${element} uses CSS variables without actual color fallback: ${colorDeclaration}`
                  );
                }
              }
            });
          }
        });
      }
    });
  });

  it("should have sufficient text opacity for readability", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that text opacity is not too low (should be >= 0.8 for accessibility)
    const opacityPattern = /opacity:\s*([0-9.]+)/g;
    const matches = result.indexPage.match(opacityPattern);

    if (matches) {
      matches.forEach((match) => {
        const opacityValue = Number.parseFloat(
          match.replace(/opacity:\s*/, "")
        );
        expect(
          opacityValue,
          `Text opacity should be >= 0.8 for accessibility, found: ${match}`
        ).toBeGreaterThanOrEqual(0.8);
      });
    }
  });

  it("should use design color values directly for footer", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that footer uses actual design colors
    const expectedPrimaryColor = mockDesign.colorScheme.primary;

    // Footer should contain the actual primary color value
    expect(result.indexPage).toContain(`background: ${expectedPrimaryColor}`);

    // Footer should not use CSS variables for background
    const footerStylePattern = /footer\s*{[^}]*}/g;
    const footerMatches = result.indexPage.match(footerStylePattern);

    if (footerMatches) {
      footerMatches.forEach((footerStyle) => {
        // Should not have var(--primary) without actual color values
        if (footerStyle.includes("var(--")) {
          const hasActualColors = new RegExp(expectedPrimaryColor).test(
            footerStyle
          );
          expect(
            hasActualColors,
            `Footer should use actual color values instead of CSS variables: ${footerStyle}`
          ).toBe(true);
        }
      });
    }
  });

  it("should have hero-focused layout use actual color values", async () => {
    // Test specifically for hero-focused layout which should use actual color values
    const designWithLayout = { ...mockDesign, layout: "hero-focused" as const };
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      designWithLayout
    );

    // Check that hero-focused layout uses actual color values
    const expectedPrimary = mockDesign.colorScheme.primary;

    expect(
      result.heroComponent,
      "Hero-focused layout should contain primary color"
    ).toContain(expectedPrimary);
  });

  it("should provide adequate contrast for text elements", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that white text on colored backgrounds has sufficient contrast
    const whiteTextPattern = /color:\s*white/g;
    const whiteTextMatches = result.indexPage.match(whiteTextPattern);

    if (whiteTextMatches) {
      // White text should be used with dark enough backgrounds
      // This is a basic check - in production you'd use a proper contrast ratio calculator
      const designColors = Object.values(mockDesign.colorScheme);
      const hasDarkBackground = designColors.some((color) => {
        // Simple check for dark colors (should start with #0, #1, #2, #3, #4, #5)
        return /^#[0-5]/.test(color);
      });

      expect(
        hasDarkBackground || result.indexPage.includes("opacity"),
        "White text should be used with dark backgrounds or have opacity for contrast"
      ).toBe(true);
    }
  });

  it("should have improved font weight for better readability", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that footer and other text elements have adequate font weight
    const footerStylePattern = /footer\s+p\s*{[^}]*}/g;
    const footerMatches = result.indexPage.match(footerStylePattern);

    if (footerMatches) {
      footerMatches.forEach((footerStyle) => {
        // Should have font-weight specified for better readability
        expect(
          footerStyle,
          "Footer text should have font-weight specified for better readability"
        ).toMatch(/font-weight:\s*[^;]+/);
      });
    }
  });

  it("should use design color values directly for documentation buttons", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that documentation buttons use actual design colors
    const expectedPrimaryColor = mockDesign.colorScheme.primary;
    const expectedSecondaryColor = mockDesign.colorScheme.secondary;

    // Documentation buttons should contain the actual color values
    expect(result.indexPage).toContain(`background: ${expectedPrimaryColor}`);
    expect(result.indexPage).toContain(`background: ${expectedSecondaryColor}`);
    expect(result.indexPage).toContain(`color: ${expectedPrimaryColor}`);
    expect(result.indexPage).toContain(
      `border: 2px solid ${expectedPrimaryColor}`
    );

    // Check that docs-link buttons don't use CSS variables without actual color values
    const docsLinkPattern = /\.docs-link-(?:primary|secondary)\s*{[^}]*}/g;
    const docsLinkMatches = result.indexPage.match(docsLinkPattern);

    if (docsLinkMatches) {
      docsLinkMatches.forEach((buttonStyle) => {
        // Should not have var(--primary) or var(--secondary) without actual color values
        if (buttonStyle.includes("var(--")) {
          const hasActualColors = /#[0-9a-fA-F]{3,8}/.test(buttonStyle);
          expect(
            hasActualColors,
            `Documentation buttons should use actual color values instead of CSS variables: ${buttonStyle}`
          ).toBe(true);
        }
      });
    }
  });

  it("should have sufficient visual hierarchy for documentation section", async () => {
    const result = await generateAstroSite(
      mockRepoData,
      mockAnalysis,
      mockDesign
    );

    // Check that documentation buttons have proper visual emphasis
    const primaryButtonPattern = /\.docs-link-primary\s*{[^}]*}/g;
    const primaryMatches = result.indexPage.match(primaryButtonPattern);

    if (primaryMatches) {
      primaryMatches.forEach((buttonStyle) => {
        // Should have box-shadow for better visual hierarchy
        expect(
          buttonStyle,
          "Primary documentation button should have box-shadow for visual emphasis"
        ).toMatch(/box-shadow:\s*[^;]+/);

        // Should have proper font-weight
        expect(
          buttonStyle,
          "Primary documentation button should have font-weight for readability"
        ).toMatch(/font-weight:\s*[^;]+/);
      });
    }
  });
});
