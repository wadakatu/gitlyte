import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeRepository,
  generateDesignStrategy,
  setOpenAIClient,
  type RepoAnalysis,
  type DesignStrategy,
} from "../../src/services/ai-analyzer.js";
import type { RepoData } from "../../src/types.js";

// OpenAI mockを作成
const createMockOpenAI = () => ({
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
});

describe("AI Analyzer", () => {
  let mockOpenAI: any;

  beforeEach(() => {
    mockOpenAI = createMockOpenAI();
    setOpenAIClient(mockOpenAI as any);
  });

  afterEach(() => {
    setOpenAIClient(null);
    vi.clearAllMocks();
  });

  describe("analyzeRepository", () => {
    const mockRepoData: RepoData = {
      repo: {
        name: "test-repo",
        description: "A test repository",
        stargazers_count: 10,
        forks_count: 5,
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

    it("should analyze repository and return analysis", async () => {
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

      const result = await analyzeRepository(mockRepoData);

      expect(result).toEqual(mockAnalysis);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: expect.stringContaining("test-repo") }],
        temperature: 0.3,
        max_tokens: 500,
      });
    });

    it("should handle JSON with code blocks", async () => {
      const mockAnalysis: RepoAnalysis = {
        projectType: "library",
        techStack: ["JavaScript"],
        primaryLanguage: "JavaScript",
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
              content: "```json\n" + JSON.stringify(mockAnalysis) + "\n```",
            },
          },
        ],
      });

      const result = await analyzeRepository(mockRepoData);

      expect(result).toEqual(mockAnalysis);
    });

    it("should return fallback analysis on error", async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("API Error")
      );

      const result = await analyzeRepository(mockRepoData);

      expect(result).toEqual({
        projectType: "application",
        techStack: ["JavaScript"],
        primaryLanguage: "JavaScript",
        activity: "medium",
        audience: "developer",
        purpose: "A software project",
        tone: "professional",
        complexity: "moderate",
      });
    });

    it("should handle empty response", async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const result = await analyzeRepository(mockRepoData);

      expect(result.projectType).toBe("application");
    });
  });

  describe("generateDesignStrategy", () => {
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

    it("should generate design strategy", async () => {
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
        layout: "hero-focused",
        style: "modern",
        animations: true,
        darkMode: false,
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

      const result = await generateDesignStrategy(mockAnalysis);

      expect(result).toEqual(mockDesign);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: expect.stringContaining("application") },
        ],
        temperature: 0.7,
        max_tokens: 600,
      });
    });

    it("should return fallback design on error", async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error("API Error")
      );

      const result = await generateDesignStrategy(mockAnalysis);

      expect(result).toEqual({
        colorScheme: {
          primary: "#667eea",
          secondary: "#764ba2",
          accent: "#f093fb",
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
      });
    });
  });
});