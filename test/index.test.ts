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
  THEME_MODES: ["light", "dark", "auto"],
  isValidThemeMode: (value: unknown) =>
    typeof value === "string" && ["light", "dark", "auto"].includes(value),
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
    // Note: theme-mode and theme-toggle return "" to simulate "not explicitly set"
    // This allows config file values to take precedence
    mockGetInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        "api-key": "test-api-key",
        provider: "anthropic",
        quality: "standard",
        "output-directory": "docs",
        "theme-mode": "", // Empty = not explicitly set, defaults to "dark"
        "theme-toggle": "", // Empty = not explicitly set, defaults to false
        "site-instructions": "", // Empty = not explicitly set
        "logo-path": "", // Empty = not provided
        "favicon-path": "", // Empty = not provided
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

    it("should fail when theme-mode is invalid", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "anthropic";
        if (name === "api-key") return "test-key";
        if (name === "quality") return "standard";
        if (name === "theme-mode") return "invalid-theme";
        if (name === "github-token") return "token";
        return "";
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid theme-mode")
      );
    });

    it("should accept valid theme-mode values", async () => {
      for (const mode of ["light", "dark", "auto"]) {
        vi.clearAllMocks();
        mockGetInput.mockImplementation((name: string) => {
          if (name === "provider") return "anthropic";
          if (name === "api-key") return "test-key";
          if (name === "quality") return "standard";
          if (name === "theme-mode") return mode;
          if (name === "theme-toggle") return "false";
          if (name === "github-token") return "token";
          return "";
        });
        mockGetOctokit.mockReturnValue(createMockOctokit());
        mockGenerateSite.mockResolvedValue({
          pages: [{ path: "index.html", html: "<html></html>" }],
          assets: [],
        });

        await runAction();

        expect(mockSetFailed).not.toHaveBeenCalled();
      }
    });

    it("should pass theme-toggle true when input is 'true'", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "provider") return "anthropic";
        if (name === "api-key") return "test-key";
        if (name === "quality") return "standard";
        if (name === "theme-mode") return "dark";
        if (name === "theme-toggle") return "true";
        if (name === "github-token") return "token";
        return "";
      });

      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          theme: { mode: "dark", toggle: true },
        })
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
        theme: { mode: "light", toggle: true },
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
          theme: { mode: "light", toggle: true },
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
      // Config with only theme mode, no outputDirectory, prompts, or toggle
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
          theme: { mode: "light", toggle: false }, // mode from config, toggle defaults to false
          prompts: { siteInstructions: undefined }, // Default (empty)
        })
      );
    });

    it("should preserve config theme mode as-is without falling back to dark", async () => {
      // Config with explicit light mode and toggle
      const configWithLight = {
        theme: { mode: "light", toggle: true },
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
          theme: { mode: "light", toggle: true },
        })
      );
    });

    it("should reject invalid theme mode in config file", async () => {
      const invalidConfig = {
        theme: { mode: "night" }, // Invalid mode
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(invalidConfig)).toString(
                "base64"
              ),
            },
          }),
        })
      );

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Invalid theme mode "night" in .gitlyte.json')
      );
    });

    it("should reject non-boolean toggle in config file", async () => {
      const invalidConfig = {
        theme: { mode: "dark", toggle: "true" }, // String instead of boolean
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(invalidConfig)).toString(
                "base64"
              ),
            },
          }),
        })
      );

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Invalid theme.toggle value "true" in .gitlyte.json')
      );
    });

    it("should allow explicit action input to override config file", async () => {
      // Config has light mode
      const configWithLight = {
        theme: { mode: "light", toggle: true },
      };

      // But action input explicitly sets dark mode
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "theme-mode") return "dark"; // Explicit dark
        if (name === "theme-toggle") return "false"; // Explicit false
        return "";
      });

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

      // Explicit action input should override config file
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          theme: { mode: "dark", toggle: false },
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

  describe("Site Instructions Input", () => {
    it("should pass site-instructions from action input to generateSite", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "site-instructions") return "Use a friendly tone";
        return "";
      });

      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          prompts: { siteInstructions: "Use a friendly tone" },
        })
      );
    });

    it("should log when site-instructions is provided", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "site-instructions") return "Use a friendly tone";
        return "";
      });

      await runAction();

      expect(mockInfo).toHaveBeenCalledWith(
        "📝 Custom site instructions provided"
      );
    });

    it("should not log site-instructions message when not provided", async () => {
      await runAction();

      expect(mockInfo).not.toHaveBeenCalledWith("📝 Custom site instructions provided");
    });

    it("should use config file site-instructions when action input is not provided", async () => {
      const configWithInstructions = {
        prompts: { siteInstructions: "Be formal and professional" },
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(configWithInstructions)).toString(
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
          prompts: { siteInstructions: "Be formal and professional" },
        })
      );
    });

    it("should allow action input to override config file site-instructions", async () => {
      const configWithInstructions = {
        prompts: { siteInstructions: "Be formal and professional" },
      };

      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "site-instructions") return "Use a casual tone"; // Override config
        return "";
      });

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(configWithInstructions)).toString(
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
          prompts: { siteInstructions: "Use a casual tone" },
        })
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

  describe("Logo and Favicon", () => {
    it("should fetch and write logo file when logo-path is provided", async () => {
      const logoContent = Buffer.from("fake-logo-content");
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "assets/logo.svg";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "assets/logo.svg") {
          return Promise.resolve({
            data: {
              content: logoContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockInfo).toHaveBeenCalledWith("🖼️ Logo: assets/logo.svg");
      expect(mockInfo).toHaveBeenCalledWith("✅ Logo fetched: assets/logo.svg");
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("logo.svg"),
        logoContent
      );
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          logo: { path: "logo.svg", alt: "test-repo" },
        })
      );
    });

    it("should fetch and write favicon file when favicon-path is provided", async () => {
      const faviconContent = Buffer.from("fake-favicon-content");
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "assets/favicon.ico";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "assets/favicon.ico") {
          return Promise.resolve({
            data: {
              content: faviconContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockInfo).toHaveBeenCalledWith("⭐ Favicon: assets/favicon.ico");
      expect(mockInfo).toHaveBeenCalledWith("✅ Favicon fetched: assets/favicon.ico");
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("favicon.ico"),
        faviconContent
      );
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          favicon: { path: "favicon.ico" },
        })
      );
    });

    it("should warn when logo file is not found", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "missing-logo.svg";
        return "";
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Logo file not found: missing-logo.svg"
      );
    });

    it("should warn when favicon file is not found", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "missing-favicon.ico";
        return "";
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Favicon file not found: missing-favicon.ico"
      );
    });

    it("should not set logo/favicon config when paths are not provided", async () => {
      await runAction();

      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          logo: undefined,
          favicon: undefined,
        })
      );
    });

    it("should fetch logo from config file when action input is not provided", async () => {
      const logoContent = Buffer.from("config-logo-content");
      const configWithLogo = {
        logo: { path: "images/brand-logo.png", alt: "Brand Logo" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "images/brand-logo.png") {
          return Promise.resolve({
            data: {
              content: logoContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockInfo).toHaveBeenCalledWith("✅ Logo fetched from config: images/brand-logo.png");
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("brand-logo.png"),
        logoContent
      );
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          logo: { path: "brand-logo.png", alt: "Brand Logo" },
        })
      );
    });

    it("should fetch favicon from config file when action input is not provided", async () => {
      const faviconContent = Buffer.from("config-favicon-content");
      const configWithFavicon = {
        favicon: { path: "static/favicon.ico" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithFavicon)).toString("base64"),
            },
          });
        }
        if (path === "static/favicon.ico") {
          return Promise.resolve({
            data: {
              content: faviconContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockInfo).toHaveBeenCalledWith("✅ Favicon fetched from config: static/favicon.ico");
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("favicon.ico"),
        faviconContent
      );
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          favicon: { path: "favicon.ico" },
        })
      );
    });

    it("should prefer action input over config file for logo", async () => {
      const actionLogoContent = Buffer.from("action-logo-content");
      const configWithLogo = {
        logo: { path: "images/config-logo.png", alt: "Config Logo" },
      };

      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "assets/action-logo.svg";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "assets/action-logo.svg") {
          return Promise.resolve({
            data: {
              content: actionLogoContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      // Should use action input, not config file logo
      expect(mockGenerateSite).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          logo: { path: "action-logo.svg", alt: "test-repo" },
        })
      );
    });

    it("should warn on logo 403 access denied error", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "private/logo.svg";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "private/logo.svg") {
          return Promise.reject({ status: 403 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Access denied to logo file: private/logo.svg"
      );
    });

    it("should warn on favicon 401 authentication error", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "protected/favicon.ico";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "protected/favicon.ico") {
          return Promise.reject({ status: 401 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Authentication failed for favicon file: protected/favicon.ico"
      );
    });

    it("should warn on favicon 403 access denied error", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "private/favicon.ico";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "private/favicon.ico") {
          return Promise.reject({ status: 403 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Access denied to favicon file: private/favicon.ico"
      );
    });

    it("should warn on generic favicon fetch error", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "broken/favicon.ico";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "broken/favicon.ico") {
          return Promise.reject(new Error("Network timeout"));
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Failed to fetch favicon: Network timeout"
      );
    });

    it("should warn on generic logo fetch error", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "broken/logo.svg";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "broken/logo.svg") {
          return Promise.reject(new Error("Connection refused"));
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Failed to fetch logo: Connection refused"
      );
    });

    it("should warn on logo unexpected format from action input", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "assets/logo.svg";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "assets/logo.svg") {
          // Return directory-like response (no content field)
          return Promise.resolve({
            data: {
              type: "dir",
              name: "logo.svg",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        '⚠️ Logo file "assets/logo.svg" is not a file or has unexpected format'
      );
    });

    it("should warn on favicon unexpected format from action input", async () => {
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "assets/favicon.ico";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "assets/favicon.ico") {
          // Return directory-like response (no content field)
          return Promise.resolve({
            data: {
              type: "dir",
              name: "favicon.ico",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        '⚠️ Favicon file "assets/favicon.ico" is not a file or has unexpected format'
      );
    });

    it("should fail on invalid logo config in .gitlyte.json", async () => {
      const invalidConfig = {
        logo: { alt: "Missing path" }, // Missing required 'path' field
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(invalidConfig)).toString("base64"),
            },
          }),
        })
      );

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid logo config in .gitlyte.json")
      );
    });

    it("should fail on invalid favicon config in .gitlyte.json", async () => {
      const invalidConfig = {
        favicon: "just-a-string", // Should be an object with 'path'
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(invalidConfig)).toString("base64"),
            },
          }),
        })
      );

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid favicon config in .gitlyte.json")
      );
    });

    it("should prevent path traversal in logo config from .gitlyte.json", async () => {
      const maliciousConfig = {
        logo: { path: "../../../etc/passwd" },
      };
      const fakeContent = Buffer.from("malicious-content");

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(maliciousConfig)).toString("base64"),
            },
          });
        }
        if (path === "../../../etc/passwd") {
          return Promise.resolve({
            data: {
              content: fakeContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      // path.basename strips the traversal, so the file gets written as just "passwd"
      // This is actually the expected safe behavior - the file is sanitized
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining("passwd"),
        fakeContent
      );
      // The path should NOT contain directory traversal
      expect(mockWriteFileSync).not.toHaveBeenCalledWith(
        expect.stringContaining("../"),
        expect.anything()
      );
    });

    it("should handle logo write errors gracefully", async () => {
      const logoContent = Buffer.from("logo-content");
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "logo-path") return "logo.svg";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "logo.svg") {
          return Promise.resolve({
            data: {
              content: logoContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      let writeCallCount = 0;
      mockWriteFileSync.mockImplementation((...args: unknown[]) => {
        writeCallCount++;
        const filePath = args[0] as string;
        // First call for index.html succeeds, subsequent calls for logo fail
        if (filePath.includes("logo.svg")) {
          throw new Error("Disk full");
        }
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Failed to write logo")
      );
    });

    it("should handle favicon write errors gracefully", async () => {
      const faviconContent = Buffer.from("favicon-content");
      mockGetInput.mockImplementation((name: string) => {
        if (name === "api-key") return "test-key";
        if (name === "provider") return "anthropic";
        if (name === "quality") return "standard";
        if (name === "github-token") return "test-token";
        if (name === "favicon-path") return "favicon.ico";
        return "";
      });

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === "favicon.ico") {
          return Promise.resolve({
            data: {
              content: faviconContent.toString("base64"),
              encoding: "base64",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      mockWriteFileSync.mockImplementation((...args: unknown[]) => {
        const filePath = args[0] as string;
        if (filePath.includes("favicon.ico")) {
          throw new Error("Permission denied");
        }
      });

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Failed to write favicon")
      );
    });

    it("should fail on favicon config with empty path in .gitlyte.json", async () => {
      const invalidConfig = {
        favicon: { path: "   " }, // Empty/whitespace path
      };

      mockGetOctokit.mockReturnValue(
        createMockOctokit({
          getContent: vi.fn().mockResolvedValue({
            data: {
              content: Buffer.from(JSON.stringify(invalidConfig)).toString("base64"),
            },
          }),
        })
      );

      await runAction();

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid favicon config in .gitlyte.json")
      );
    });

    it("should warn on logo 403 error from config file", async () => {
      const configWithLogo = {
        logo: { path: "private/logo.svg", alt: "Logo" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "private/logo.svg") {
          return Promise.reject({ status: 403 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Access denied to logo file (from config): private/logo.svg"
      );
    });

    it("should warn on logo 401 error from config file", async () => {
      const configWithLogo = {
        logo: { path: "auth/logo.svg", alt: "Logo" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "auth/logo.svg") {
          return Promise.reject({ status: 401 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Authentication failed for logo file (from config): auth/logo.svg"
      );
    });

    it("should warn on favicon 403 error from config file", async () => {
      const configWithFavicon = {
        favicon: { path: "private/favicon.ico" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithFavicon)).toString("base64"),
            },
          });
        }
        if (path === "private/favicon.ico") {
          return Promise.reject({ status: 403 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Access denied to favicon file (from config): private/favicon.ico"
      );
    });

    it("should warn on favicon 401 error from config file", async () => {
      const configWithFavicon = {
        favicon: { path: "auth/favicon.ico" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithFavicon)).toString("base64"),
            },
          });
        }
        if (path === "auth/favicon.ico") {
          return Promise.reject({ status: 401 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Authentication failed for favicon file (from config): auth/favicon.ico"
      );
    });

    it("should warn on favicon unexpected format from config file", async () => {
      const configWithFavicon = {
        favicon: { path: "assets/favicon.ico" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithFavicon)).toString("base64"),
            },
          });
        }
        if (path === "assets/favicon.ico") {
          // Return directory-like response (no content field)
          return Promise.resolve({
            data: {
              type: "dir",
              name: "favicon.ico",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        '⚠️ Favicon file "assets/favicon.ico" from config is not a file or has unexpected format'
      );
    });

    it("should warn on logo unexpected format from config file", async () => {
      const configWithLogo = {
        logo: { path: "assets/logo.svg", alt: "Logo" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "assets/logo.svg") {
          // Return directory-like response (no content field)
          return Promise.resolve({
            data: {
              type: "dir",
              name: "logo.svg",
            },
          });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        '⚠️ Logo file "assets/logo.svg" from config is not a file or has unexpected format'
      );
    });

    it("should warn on generic logo fetch error from config file", async () => {
      const configWithLogo = {
        logo: { path: "broken/logo.svg", alt: "Logo" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "broken/logo.svg") {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Failed to fetch logo from config: Network error"
      );
    });

    it("should warn on generic favicon fetch error from config file", async () => {
      const configWithFavicon = {
        favicon: { path: "broken/favicon.ico" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithFavicon)).toString("base64"),
            },
          });
        }
        if (path === "broken/favicon.ico") {
          return Promise.reject(new Error("Connection timeout"));
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Failed to fetch favicon from config: Connection timeout"
      );
    });

    it("should warn on logo 404 error from config file", async () => {
      const configWithLogo = {
        logo: { path: "missing/logo.svg", alt: "Logo" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithLogo)).toString("base64"),
            },
          });
        }
        if (path === "missing/logo.svg") {
          return Promise.reject({ status: 404 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Logo file not found (from config): missing/logo.svg"
      );
    });

    it("should warn on favicon 404 error from config file", async () => {
      const configWithFavicon = {
        favicon: { path: "missing/favicon.ico" },
      };

      const mockGetContent = vi.fn().mockImplementation(({ path }: { path: string }) => {
        if (path === ".gitlyte.json") {
          return Promise.resolve({
            data: {
              content: Buffer.from(JSON.stringify(configWithFavicon)).toString("base64"),
            },
          });
        }
        if (path === "missing/favicon.ico") {
          return Promise.reject({ status: 404 });
        }
        return Promise.reject({ status: 404 });
      });

      mockGetOctokit.mockReturnValue({
        rest: {
          repos: {
            get: vi.fn().mockResolvedValue({
              data: {
                name: "test-repo",
                full_name: "test-owner/test-repo",
                description: "Test",
                html_url: "https://github.com/test-owner/test-repo",
                language: "TypeScript",
                topics: [],
              },
            }),
            getReadme: vi.fn().mockRejectedValue({ status: 404 }),
            getContent: mockGetContent,
          },
        },
      });

      await runAction();

      expect(mockWarning).toHaveBeenCalledWith(
        "⚠️ Favicon file not found (from config): missing/favicon.ico"
      );
    });
  });
});
