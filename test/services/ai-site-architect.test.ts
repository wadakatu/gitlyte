import { describe, it, expect, beforeEach } from "vitest";
import { 
  designSiteArchitecture, 
  generateComponentSpecs,
  setOpenAIClient 
} from "../../src/services/ai-site-architect.js";
import type { RepoData } from "../../src/types.js";
import type { RepoAnalysis } from "../../src/services/ai-analyzer.js";

// Mock OpenAI client
const mockOpenAI = {
  chat: {
    completions: {
      create: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              concept: {
                theme: "Modern Developer Tool",
                mood: "professional",
                target_impression: "innovative"
              },
              layout: {
                structure: "single-page",
                navigation: "sticky-header",
                sections: [
                  {
                    id: "hero",
                    type: "hero",
                    position: 1,
                    content_strategy: {
                      focus: "repository-overview",
                      tone: "welcoming",
                      data_source: ["repo"]
                    },
                    design_spec: {
                      layout_pattern: "centered",
                      visual_hierarchy: "prominent",
                      interaction: "animated",
                      responsive_behavior: "stack on mobile"
                    }
                  }
                ]
              },
              design: {
                color_palette: {
                  primary: "#667eea",
                  secondary: "#764ba2",
                  accent: "#f093fb",
                  background: "#ffffff",
                  surface: "#f8fafc",
                  text: {
                    primary: "#2d3748",
                    secondary: "#718096",
                    accent: "#667eea"
                  }
                },
                typography: {
                  heading: {
                    font: "Inter, sans-serif",
                    weight: "700",
                    scale: "moderate"
                  },
                  body: {
                    font: "system-ui, sans-serif",
                    size: "16px",
                    line_height: "1.6"
                  },
                  code: {
                    font: "JetBrains Mono, monospace",
                    style: "minimal"
                  }
                },
                spacing: {
                  scale: "normal",
                  rhythm: "geometric"
                },
                visual_style: {
                  approach: "gradient",
                  borders: "subtle",
                  shadows: "soft",
                  animations: "engaging"
                }
              }
            })
          }
        }]
      })
    }
  }
} as any;

describe("AI Site Architect", () => {
  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      description: "A test repository",
      stargazers_count: 42,
      forks_count: 7,
      open_issues_count: 3
    },
    issues: [],
    prs: [],
    readme: "# Test Repo\nThis is a test repository for AI generation."
  };

  const mockAnalysis: RepoAnalysis = {
    projectType: "tool",
    techStack: ["TypeScript", "Node.js"],
    primaryLanguage: "TypeScript",
    activity: "medium",
    audience: "developer",
    purpose: "Testing AI site generation",
    tone: "professional",
    complexity: "moderate"
  };

  beforeEach(() => {
    setOpenAIClient(mockOpenAI);
  });

  describe("designSiteArchitecture", () => {
    it("should generate a complete site architecture", async () => {
      const result = await designSiteArchitecture(mockRepoData, mockAnalysis);
      
      expect(result).toBeDefined();
      expect(result.concept).toBeDefined();
      expect(result.concept.theme).toBe("Modern Developer Tool");
      expect(result.layout).toBeDefined();
      expect(result.layout.sections).toHaveLength(1);
      expect(result.design).toBeDefined();
      expect(result.design.color_palette).toBeDefined();
    });

    it("should have proper section structure", async () => {
      const result = await designSiteArchitecture(mockRepoData, mockAnalysis);
      
      const section = result.layout.sections[0];
      expect(section.id).toBe("hero");
      expect(section.type).toBe("hero");
      expect(section.content_strategy).toBeDefined();
      expect(section.design_spec).toBeDefined();
    });

    it("should have complete design system", async () => {
      const result = await designSiteArchitecture(mockRepoData, mockAnalysis);
      
      expect(result.design.color_palette.primary).toBe("#667eea");
      expect(result.design.typography.heading.font).toBe("Inter, sans-serif");
      expect(result.design.visual_style.animations).toBe("engaging");
    });
  });

  describe("generateComponentSpecs", () => {
    it("should generate component specifications", async () => {
      // First get architecture
      const architecture = await designSiteArchitecture(mockRepoData, mockAnalysis);
      const section = architecture.layout.sections[0];

      // Mock component specs response
      const mockComponentSpecsOpenAI = {
        chat: {
          completions: {
            create: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify([
                    {
                      name: "HeroSection",
                      purpose: "Display repository overview with stats",
                      props_interface: "export interface Props { title: string; description: string; stats: any; }",
                      html_structure: "<section><h1>{title}</h1><p>{description}</p></section>",
                      css_styles: "section { padding: 4rem 0; background: var(--primary); }",
                      responsive_rules: "@media (max-width: 768px) { section { padding: 2rem 0; } }"
                    }
                  ])
                }
              }]
            })
          }
        }
      } as any;

      setOpenAIClient(mockComponentSpecsOpenAI);
      
      const result = await generateComponentSpecs(section, architecture, mockRepoData);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("HeroSection");
      expect(result[0].purpose).toContain("repository overview");
      expect(result[0].props_interface).toContain("Props");
      expect(result[0].html_structure).toContain("section");
      expect(result[0].css_styles).toContain("padding");
    });
  });

  describe("fallback behavior", () => {
    it("should handle OpenAI API failures gracefully", async () => {
      // Mock failing OpenAI client
      const failingOpenAI = {
        chat: {
          completions: {
            create: async () => {
              throw new Error("API Error");
            }
          }
        }
      } as any;

      setOpenAIClient(failingOpenAI);
      
      const result = await designSiteArchitecture(mockRepoData, mockAnalysis);
      
      // Should return fallback architecture
      expect(result).toBeDefined();
      expect(result.concept.theme).toBe("Modern Project Showcase");
      expect(result.layout.sections).toHaveLength(1);
    });
  });
});