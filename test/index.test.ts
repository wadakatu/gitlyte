import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Store original env
const originalEnv = { ...process.env };

// Create mock functions
const mockGetInput = vi.fn();
const mockInfo = vi.fn();
const mockWarning = vi.fn();
const mockError = vi.fn();
const mockSetFailed = vi.fn();
const mockSetOutput = vi.fn();
const mockGetOctokit = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockGenerateSite = vi.fn();
const mockCreateAIProvider = vi.fn();

// Mock modules
vi.mock("@actions/core", () => ({
  getInput: (...args: unknown[]) => mockGetInput(...args),
  info: (...args: unknown[]) => mockInfo(...args),
  warning: (...args: unknown[]) => mockWarning(...args),
  error: (...args: unknown[]) => mockError(...args),
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
  setOutput: (...args: unknown[]) => mockSetOutput(...args),
}));

vi.mock("@actions/github", () => ({
  context: {
    repo: {
      owner: "test-owner",
      repo: "test-repo",
    },
  },
  getOctokit: (...args: unknown[]) => mockGetOctokit(...args),
}));

vi.mock("node:fs", () => ({
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
}));

vi.mock("../src/site-generator.js", () => ({
  generateSite: (...args: unknown[]) => mockGenerateSite(...args),
}));

vi.mock("../src/ai-provider.js", () => ({
  createAIProvider: (...args: unknown[]) => mockCreateAIProvider(...args),
  AI_PROVIDERS: ["anthropic", "openai", "google"],
  QUALITY_MODES: ["standard", "high"],
}));

describe("GitHub Action Entry Point", () => {
  // Default mock octokit
  const createMockOctokit = (overrides: Record<string, unknown> = {}) => ({
    rest: {
      repos: {
        get: vi.fn().mockResolvedValue({
          data: {
            name: "test-repo",
            full_name: "test-owner/test-repo",
            description: "Test description",
            html_url: "https://github.com/test-owner/test-repo",
            language: "TypeScript",
            topics: ["testing"],
          },
        }),
        getReadme: vi.fn().mockResolvedValue({
          data: {
            content: Buffer.from("# Test README").toString("base64"),
          },
        }),
        getContent: vi.fn().mockRejectedValue({ status: 404 }),
        ...overrides,
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GITHUB_TOKEN;

    // Setup default mocks
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "api-key": "test-api-key",
        provider: "anthropic",
        quality: "standard",
        "output-directory": "docs",
        "github-token": "test-github-token",
      };
      return inputs[name] || "";
    });

    mockGetOctokit.mockReturnValue(createMockOctokit());

    mockGenerateSite.mockResolvedValue({
      pages: [{ path: "index.html", html: "<html></html>" }],
      assets: [],
    });

    mockCreateAIProvider.mockReturnValue({
      provider: "anthropic",
      quality: "standard",
      generateText: vi.fn().mockResolvedValue({ text: "{}" }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  // Helper to run the action
  async function runAction() {
    const { run } = await import("../src/index.js");
    await run();
  }

  describe("Input Validation", () => {
    it("should fail when provider is invalid", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "invalid-provider";
        if (name === "api-key") return "test-key";
        if (name === "quality") return "standard";
        if (name === "github-token") return "token";
        return "";
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid provider")
      );
    });

    it("should fail when quality mode is invalid", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "anthropic";
        if (name === "api-key") return "test-key";
        if (name === "quality") return "invalid-quality";
        if (name === "github-token") return "token";
        return "";
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid quality")
      );
    });

    it("should fail when GitHub token is missing", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "anthropic";
        if (name === "api-key") return "test-key";
        if (name === "quality") return "standard";
        if (name === "github-token") return "";
        return "";
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("GitHub token is required")
      );
    });

    it("should use GITHUB_TOKEN env var when github-token input is not provided", async () => {
      process.env.GITHUB_TOKEN = "env-github-token";
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "anthropic";
        if (name === "api-key") return "test-key";
        if (name === "quality") return "standard";
        if (name === "github-token") return "";
        return "";
      });

      await runAction();

      expect(mockGetOctokit).toHaveBeenCalledWith("env-github-token");
    });
  });

  describe("README Handling", () => {
    it("should handle missing README gracefully", async () => {
      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getReadme: vi.fn().mockRejectedValue({ status: 404 }),
        })
      );

      await runAction();

      expect(mockInfo).toHaveBeenCalledWith(
        "📄 No README found, proceeding without it"
      );
    });

    it("should warn on README fetch error (non-404)", async () => {
      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getReadme: vi
            .fn()
            .mockRejectedValue(new Error("Network error")),
        })
      );

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch README")
      );
    });
  });

  describe("Config Loading", () => {
    it("should use default config when .gitlyte.json is not found", async () => {
      await runAction();

      expect(mockInfo).toHaveBeenCalledWith(
        "📄 No .gitlyte.json found, using defaults"
      );
    });

    it("should load and apply custom config from .gitlyte.json", async () => {
      const customConfig = {
        outputDirectory: "public",
        theme: { mode: "light" },
        prompts: { siteInstructions: "Be friendly" },
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(customConfig)).toString(
                "base64"
              ),
            },
          }),
        })
      );

      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          outputDirectory: "public",
          theme: { mode: "light" },
          prompts: { siteInstructions: "Be friendly" },
        })
      );
    });

    it("should fail on invalid JSON in .gitlyte.json", async () => {
      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from("invalid json {").toString("base64"),
            },
          }),
        })
      );

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid JSON in .gitlyte.json")
      );
    });

    it("should warn on config fetch error (non-404)", async () => {
      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi
            .fn()
            .mockRejectedValue(new Error("Network error")),
        })
      );

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining("Failed to load .gitlyte.json")
      );
    });

    it("should merge partial config with defaults", async () => {
      // Config with only theme, no outputDirectory or prompts
      const partialConfig = {
        theme: { mode: "light" },
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(partialConfig)).toString(
                "base64"
              ),
            },
          }),
        })
      );

      await runAction();

      // Should use default outputDirectory from input but apply theme from config
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          outputDirectory: "docs", // Default from input
          theme: { mode: "light" }, // From config
          prompts: { siteInstructions: undefined }, // Default (empty)
        })
      );
    });

    it("should preserve config theme mode as-is without falling back to dark", async () => {
      // Config with explicit light mode
      const configWithLight = {
        theme: { mode: "light" },
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(configWithLight)).toString(
                "base64"
              ),
            },
          }),
        })
      );

      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          theme: { mode: "light" },
        })
      );
    });
  });

  describe("File Writing", () => {
    it("should write generated pages to output directory", async () => {
      await runAction();

      expect(mockMkdirSync).toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("index.html"),
        "<html></html>",
        "utf-8"
      );
    });

    it("should write assets when present", async () => {
      mockGenerateSite.mockResolvedValue({
        pages: [{ path: "index.html", html: "<html></html>" }],
        assets: [{ path: "styles.css", content: "body {}" }],
      });

      await runAction();

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("styles.css"),
        "body {}",
        "utf-8"
      );
    });

    it("should prevent path traversal attacks in pages", async () => {
      mockGenerateSite.mockResolvedValue({
        pages: [{ path: "../../../etc/passwd", html: "malicious" }],
        assets: [],
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("path escapes output directory")
      );
    });

    it("should prevent path traversal attacks in assets", async () => {
      mockGenerateSite.mockResolvedValue({
        pages: [{ path: "index.html", html: "<html></html>" }],
        assets: [{ path: "../../../etc/shadow", content: "malicious" }],
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("path escapes output directory")
      );
    });

    it("should handle asset write errors gracefully", async () => {
      let writeCallCount = 0;
      mockGenerateSite.mockResolvedValue({
        pages: [{ path: "index.html", html: "<html></html>" }],
        assets: [{ path: "styles.css", content: "body {}" }],
      });

      mockWriteFileSync.mockImplementation(() => {
        writeCallCount++;
        // First call for index.html succeeds, second call for styles.css fails
        if (writeCallCount > 1) {
          throw new Error("Permission denied");
        }
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Failed to write asset")
      );
    });

    it("should handle page write errors gracefully", async () => {
      mockWriteFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Failed to write page")
      );
    });
  });

  describe("Input Validation - API Key", () => {
    it("should fail when api-key is missing", async () => {
      mockGetInput.mockImplementation((name: string, options?: unknown) => {
        if (name === "api-key") {
          // When required: true, throw an error if missing
          if (options && (options as { required?: boolean }).required) {
            throw new Error("Input required and not supplied: api-key");
          }
          return "";
        }
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "token";
        return "";
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("api-key")
      );
    });
  });

  describe("Repository API Failures", () => {
    it("should fail when repository API returns an error", async () => {
      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockRejectedValue(new Error("API rate limit exceeded")),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: vi.fn().mockRejectedValue({ status: 404 }),
          },
        },
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("API rate limit exceeded")
      );
    });

    it("should fail when repository is not found", async () => {
      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockRejectedValue({ status: 404, message: "Not Found" }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: vi.fn().mockRejectedValue({ status: 404 }),
          },
        },
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalled();
    });
  });

  describe("Output Setting", () => {
    it("should set output-directory and pages-count outputs", async () => {
      await runAction();

      expect(mockSetOutput).toHaveBeenCalledWith("output-directory", "docs");
      expect(mockSetOutput).toHaveBeenCalledWith("pages-count", 1);
    });
  });

  describe("Error Handling", () => {
    it("should log stack trace on error", async () => {
      const errorWithStack = new Error("Test error");
      errorWithStack.stack = "Error: Test error\n    at test.ts:1:1";
      mockGenerateSite.mockRejectedValue(errorWithStack);

      await runAction();

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Stack trace:")
      );
    });

    it("should log cause when present", async () => {
      const cause = new Error("Original error");
      const errorWithCause = new Error("Wrapper error", { cause });
      mockGenerateSite.mockRejectedValue(errorWithCause);

      await runAction();

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Caused by:")
      );
    });

    it("should handle non-Error objects in catch", async () => {
      mockGenerateSite.mockRejectedValue("String error message");

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("unknown error")
      );
    });
  });

  describe("Logging", () => {
    it("should log start message with owner/repo", async () => {
      await runAction();

      expect(mockInfo).toHaveBeenCalledWith(
        "🚀 Starting GitLyte site generation for test-owner/test-repo"
      );
    });

    it("should log provider and quality", async () => {
      await runAction();

      expect(mockInfo).toHaveBeenCalledWith(
        "📦 Provider: anthropic, Quality: standard"
      );
    });

    it("should log success message on completion", async () => {
      await runAction();

      expect(mockInfo).toHaveBeenCalledWith(
        expect.stringContaining("Site generated successfully")
      );
    });
  });

  describe("AI Provider Creation", () => {
    it("should create AI provider with correct parameters", async () => {
      await runAction();

      expect(mockCreateAIProvider).toHaveBeenCalledWith(
        "anthropic",
        "standard",
        "test-api-key"
      );
    });

    it("should use different providers based on input", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "openai";
        if (name === "api-key") return "openai-key";
        if (name === "quality") return "high";
        if (name === "github-token") return "token";
        return "";
      });

      await runAction();

      expect(mockCreateAIProvider).toHaveBeenCalledWith(
        "openai",
        "high",
        "openai-key"
      );
    });
  });

  describe("Repository Info", () => {
    it("should pass correct repo info to generateSite", async () => {
      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-repo",
          fullName: "test-owner/test-repo",
          description: "Test description",
          htmlUrl: "https://github.com/test-owner/test-repo",
          language: "TypeScript",
          topics: ["testing"],
        }),
        expect.anything(),
        expect.anything()
      );
    });

    it("should handle repo with no description", async () => {
      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: null,
                html_url: "https://github.com/test-owner/test-repo",
                language: null,
                topics: null,
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: vi.fn().mockRejectedValue({ status: 404 }),
          },
        },
      });

      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          language: undefined,
          topics: [],
        }),
        expect.anything(),
        expect.anything()
      );
    });
  });
});
