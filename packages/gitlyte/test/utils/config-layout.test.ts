import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyzeRepository,
  type DesignStrategy,
  generateDesignStrategy,
  type RepoAnalysis,
  setOpenAIClient,
} from "../../services/ai-analyzer.js";
import type { GitLyteConfig } from "../../types/config.js";
import type { RepoData } from "../../types.js";

interface MockOpenAI {
  chat: {
    completions: {
      create: ReturnType<typeof vi.fn>;
    };
  };
}

// OpenAI mockを作成
const createMockOpenAI = (): MockOpenAI => ({
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
});

describe("Layout Configuration Override", () => {
  let mockOpenAI: MockOpenAI;

  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    setOpenAIClient(
      mockOpenAI as unknown as Parameters<typeof setOpenAIClient>[0]
    );
  });

  afterEach(() => {
    setOpenAIClient(null);
    vi.clearAllMocks();
  });

  const mockRepoData: RepoData = {
    repo: {
      name: "test-repo",
      full_name: "test/test-repo",
      description: "A test repository",
      html_url: "https://github.com/test/test-repo",
      stargazers_count: 10,
      forks_count: 5,
      language: "TypeScript",
      topics: ["test"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-12-01T00:00:00Z",
      pushed_at: "2023-12-01T00:00:00Z",
      size: 1000,
      default_branch: "main",
      license: { key: "mit", name: "MIT License" },
    },
    readme: "# Test Repo\nThis is a test repository for testing.",
    prs: [
      {
        title: "Add feature",
        user: { login: "testuser" },
        merged_at: "2023-01-01T00:00:00Z",
      },
    ],
    issues: [
      {
        title: "Fix bug",
        number: 1,
        state: "open",
        user: { login: "testuser" },
        created_at: "2023-01-01T00:00:00Z",
      },
    ],
  };

  describe("analyzeRepository with layout config", () => {
    it("should use configured layout when provided", async () => {
      const config: GitLyteConfig = {
        site: {
          layout: "minimal",
        },
      };

      const mockAnalysis: RepoAnalysis = {
        projectType: "application",
        techStack: ["JavaScript", "TypeScript"],
        primaryLanguage: "TypeScript",
        activity: "medium",
        audience: "developer",
        purpose: "A test application",
        tone: "professional",
        complexity: "moderate",
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
      });

      const result = await analyzeRepository(mockRepoData, config);

      expect(result.layout).toBe("minimal");
      expect(result.projectType).toBe("application");
    });

    it("should fallback to AI analysis when no layout configured", async () => {
      const config: GitLyteConfig = {};

      const mockAnalysis: RepoAnalysis = {
        projectType: "library",
        techStack: ["TypeScript"],
        primaryLanguage: "TypeScript",
        activity: "high",
        audience: "developer",
        purpose: "A library",
        tone: "technical",
        complexity: "simple",
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAnalysis),
            },
          },
        ],
      });

      const result = await analyzeRepository(mockRepoData, config);

      expect(result.layout).toBeUndefined(); // AI didn't return layout
      expect(result.projectType).toBe("library");
    });

    it("should use configured layout in fallback scenario", async () => {
      const config: GitLyteConfig = {
        site: {
          layout: "grid",
        },
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("API Error")
      );

      const result = await analyzeRepository(mockRepoData, config);

      expect(result.layout).toBe("grid");
      expect(result.projectType).toBe("application"); // fallback value
    });
  });

  describe("generateDesignStrategy with layout config", () => {
    const mockAnalysis: RepoAnalysis = {
      projectType: "application",
      techStack: ["JavaScript", "React"],
      primaryLanguage: "JavaScript",
      activity: "high",
      audience: "developer",
      purpose: "A web application",
      tone: "professional",
      complexity: "moderate",
    };

    it("should override AI-generated layout with config", async () => {
      const config: GitLyteConfig = {
        site: {
          layout: "sidebar",
        },
      };

      const mockDesign: DesignStrategy = {
        colorScheme: {
          primary: "#007acc",
          secondary: "#005999",
          accent: "#ff6b35",
          background: "#ffffff",
        },
        typography: {
          heading: "Inter, sans-serif",
          body: "system-ui, sans-serif",
          code: "Fira Code, monospace",
        },
        layout: "hero-focused", // AI suggests hero-focused
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

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockDesign),
            },
          },
        ],
      });

      const result = await generateDesignStrategy(mockAnalysis, config);

      expect(result.layout).toBe("sidebar"); // config overrides AI
      expect(result.style).toBe("modern");
    });

    it("should use analysis layout in fallback when available", async () => {
      const config: GitLyteConfig = {};
      const analysisWithLayout: RepoAnalysis = {
        ...mockAnalysis,
        layout: "content-heavy",
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("API Error")
      );

      const result = await generateDesignStrategy(analysisWithLayout, config);

      expect(result.layout).toBe("content-heavy");
    });

    it("should prioritize config over analysis layout in fallback", async () => {
      const config: GitLyteConfig = {
        site: {
          layout: "minimal",
        },
      };
      const analysisWithLayout: RepoAnalysis = {
        ...mockAnalysis,
        layout: "content-heavy",
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("API Error")
      );

      const result = await generateDesignStrategy(analysisWithLayout, config);

      expect(result.layout).toBe("minimal"); // config wins over analysis
    });
  });

  describe("layout validation", () => {
    it("should only accept valid layout values", async () => {
      const validLayouts = [
        "minimal",
        "grid",
        "sidebar",
        "hero-focused",
        "content-heavy",
      ] as const;

      for (const layout of validLayouts) {
        const config: GitLyteConfig = {
          site: {
            layout: layout,
          },
        };

        mockOpenAI.chat.completions.create.mockRejectedValue(
          new Error("Use fallback")
        );

        const result = await analyzeRepository(mockRepoData, config);
        expect(result.layout).toBe(layout);
      }
    });
  });
});
