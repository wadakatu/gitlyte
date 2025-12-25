import { beforeEach, describe, expect, it, vi } from "vitest";
import { handlePushV2 } from "../../handlers/v2-push-handler.js";

// Mock dependencies
vi.mock("../../services/v2-site-generator.js", () => ({
  generateSite: vi.fn().mockResolvedValue({
    pages: [{ path: "index.html", html: "<html></html>" }],
    assets: [],
  }),
}));

vi.mock("../../utils/ai-provider.js", () => ({
  createAIProvider: vi.fn(() => ({
    provider: "anthropic",
    quality: "standard",
    generateText: vi.fn(),
  })),
}));

vi.mock("../../utils/deployment-guard.js", () => ({
  safeGenerateWithDeploymentGuard: vi.fn((_ctx, fn) => fn()),
}));

describe("v2-push-handler", () => {
  let mockContext: {
    log: {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };
    octokit: {
      repos: {
        getContent: ReturnType<typeof vi.fn>;
        getReadme: ReturnType<typeof vi.fn>;
      };
      git: {
        getRef: ReturnType<typeof vi.fn>;
        createTree: ReturnType<typeof vi.fn>;
        createCommit: ReturnType<typeof vi.fn>;
        createRef: ReturnType<typeof vi.fn>;
        deleteRef: ReturnType<typeof vi.fn>;
      };
      pulls: {
        create: ReturnType<typeof vi.fn>;
      };
    };
    payload: {
      ref: string;
      repository: {
        name: string;
        full_name: string;
        default_branch: string;
        owner: { login: string };
        description: string | null;
        html_url: string;
        language: string | null;
        topics?: string[];
      };
      commits: Array<{
        id: string;
        message: string;
        added: string[];
        modified: string[];
        removed: string[];
      }>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      octokit: {
        repos: {
          getContent: vi.fn(),
          getReadme: vi.fn(),
        },
        git: {
          getRef: vi.fn(),
          createTree: vi.fn(),
          createCommit: vi.fn(),
          createRef: vi.fn(),
          deleteRef: vi.fn(),
        },
        pulls: {
          create: vi.fn(),
        },
      },
      payload: {
        ref: "refs/heads/main",
        repository: {
          name: "test-repo",
          full_name: "owner/test-repo",
          default_branch: "main",
          owner: { login: "owner" },
          description: "A test repository",
          html_url: "https://github.com/owner/test-repo",
          language: "TypeScript",
          topics: ["typescript"],
        },
        commits: [
          {
            id: "abc123",
            message: "feat: add new feature",
            added: [],
            modified: ["src/index.ts"],
            removed: [],
          },
        ],
      },
    };

    // Default mocks - config with auto trigger for generation tests
    mockContext.octokit.repos.getContent.mockResolvedValue({
      data: {
        type: "file",
        content: Buffer.from(
          JSON.stringify({ generation: { trigger: "auto" } })
        ).toString("base64"),
      },
    });
    mockContext.octokit.repos.getReadme.mockRejectedValue({ status: 404 });
    mockContext.octokit.git.getRef.mockResolvedValue({
      data: { object: { sha: "parent-sha" } },
    });
    mockContext.octokit.git.createTree.mockResolvedValue({
      data: { sha: "tree-sha" },
    });
    mockContext.octokit.git.createCommit.mockResolvedValue({
      data: { sha: "commit-sha" },
    });
    mockContext.octokit.git.createRef.mockResolvedValue({});
    mockContext.octokit.git.deleteRef.mockResolvedValue({});
    mockContext.octokit.pulls.create.mockResolvedValue({
      data: {
        number: 42,
        html_url: "https://github.com/owner/test-repo/pull/42",
      },
    });
  });

  describe("handlePushV2", () => {
    it("should skip non-default branch pushes", async () => {
      mockContext.payload.ref = "refs/heads/feature-branch";

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Skipping: not default branch")
      );
      expect(mockContext.octokit.git.createCommit).not.toHaveBeenCalled();
    });

    it("should skip GitLyte-generated commits", async () => {
      mockContext.payload.commits = [
        {
          id: "abc123",
          message: "chore: update GitLyte generated site [skip gitlyte]",
          added: [],
          modified: [],
          removed: [],
        },
      ];

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("GitLyte-generated commit detected")
      );
      expect(mockContext.octokit.git.createCommit).not.toHaveBeenCalled();
    });

    it("should process push when not all commits are GitLyte-generated", async () => {
      mockContext.payload.commits = [
        {
          id: "abc123",
          message: "chore: update GitLyte generated site [skip gitlyte]",
          added: [],
          modified: [],
          removed: [],
        },
        {
          id: "def456",
          message: "feat: add new feature",
          added: [],
          modified: [],
          removed: [],
        },
      ];

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting site generation")
      );
    });

    it("should skip when generation is disabled in config", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from(JSON.stringify({ enabled: false })).toString(
            "base64"
          ),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("generation disabled in config")
      );
      expect(mockContext.octokit.git.createCommit).not.toHaveBeenCalled();
    });

    it("should use default config when .gitlyte.json not found", async () => {
      mockContext.octokit.repos.getContent.mockRejectedValue({ status: 404 });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("No .gitlyte.json found, using defaults")
      );
      // Default trigger is "manual", so generation should be skipped
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("manual trigger mode")
      );
    });

    it("should skip when trigger mode is manual (default)", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from(
            JSON.stringify({ generation: { trigger: "manual" } })
          ).toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("manual trigger mode")
      );
      expect(mockContext.octokit.git.createCommit).not.toHaveBeenCalled();
    });

    it("should load and use custom config", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from(
            JSON.stringify({
              enabled: true,
              outputDirectory: "public",
              ai: { provider: "openai", quality: "high" },
              generation: { trigger: "auto" },
            })
          ).toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("provider: openai")
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("quality: high")
      );
    });

    it("should log config validation warnings", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from(
            JSON.stringify({
              enabled: true,
              unknownField: "value",
              generation: { trigger: "auto" },
            })
          ).toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Config warnings")
      );
    });

    it("should fetch README when available", async () => {
      mockContext.octokit.repos.getReadme.mockResolvedValue({
        data: {
          content: Buffer.from("# My Project").toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.octokit.repos.getReadme).toHaveBeenCalled();
    });

    it("should handle missing README gracefully", async () => {
      mockContext.octokit.repos.getReadme.mockRejectedValue({ status: 404 });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("No README found")
      );
    });

    it("should create commit with correct message", async () => {
      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.octokit.git.createCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("[skip gitlyte]"),
        })
      );
      expect(mockContext.octokit.git.createCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Generated by GitLyte v2"),
        })
      );
    });

    it("should create branch and PR after creating commit", async () => {
      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      // Should create a new branch
      expect(mockContext.octokit.git.createRef).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "owner",
          repo: "test-repo",
          ref: expect.stringMatching(/^refs\/heads\/gitlyte\/update-site-/),
          sha: "commit-sha",
        })
      );

      // Should create a PR
      expect(mockContext.octokit.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "owner",
          repo: "test-repo",
          title: "chore: update GitLyte generated site",
          base: "main",
        })
      );
    });

    it("should log success message with duration", async () => {
      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringMatching(/Site generated successfully in \d+ms/)
      );
    });

    it("should throw and log error on failure", async () => {
      const error = new Error("Git API error");
      mockContext.octokit.git.createTree.mockRejectedValue(error);

      await expect(
        handlePushV2(mockContext as Parameters<typeof handlePushV2>[0])
      ).rejects.toThrow(
        "Failed to create PR for owner/test-repo: Git API error"
      );

      expect(mockContext.log.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        expect.stringContaining("Site generation failed")
      );
    });

    it("should handle empty commits array", async () => {
      mockContext.payload.commits = [];

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      // Empty commits should not trigger skip (not GitLyte-generated)
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting site generation")
      );
    });

    it("should create PR for configured output directory", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from(
            JSON.stringify({
              outputDirectory: "public",
              generation: { trigger: "auto" },
            })
          ).toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Creating PR for public/")
      );
    });

    it("should handle invalid JSON in config file and use defaults", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from("{ invalid json }").toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      // Should warn about the error and use defaults
      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        expect.stringContaining("Error loading config")
      );
      // Default trigger is "manual", so generation should be skipped
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("manual trigger mode")
      );
    });

    it("should handle PR creation failure with branch cleanup", async () => {
      const prError = new Error("Permission denied");
      mockContext.octokit.pulls.create.mockRejectedValue(prError);

      await expect(
        handlePushV2(mockContext as Parameters<typeof handlePushV2>[0])
      ).rejects.toThrow("Failed to create PR for owner/test-repo");

      // Should attempt to clean up the orphaned branch
      expect(mockContext.octokit.git.deleteRef).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "owner",
          repo: "test-repo",
          ref: expect.stringMatching(/^heads\/gitlyte\/update-site-/),
        })
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Cleaned up orphaned branch")
      );
    });

    it("should handle branch already exists (422) error", async () => {
      const branchExistsError = new Error("Reference already exists");
      (branchExistsError as { status?: number }).status = 422;
      mockContext.octokit.git.createRef.mockRejectedValue(branchExistsError);

      await expect(
        handlePushV2(mockContext as Parameters<typeof handlePushV2>[0])
      ).rejects.toThrow("already exists");
    });

    it("should warn but proceed when README fetch fails with non-404 error", async () => {
      const networkError = new Error("Network timeout");
      (networkError as { status?: number }).status = 500;
      mockContext.octokit.repos.getReadme.mockRejectedValue(networkError);

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Failed to fetch README (proceeding without it)"
        )
      );
      // Should still proceed with generation
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting site generation")
      );
    });

    it("should include repository name in error log", async () => {
      const error = new Error("Generation failed");
      mockContext.octokit.git.createTree.mockRejectedValue(error);

      await expect(
        handlePushV2(mockContext as Parameters<typeof handlePushV2>[0])
      ).rejects.toThrow();

      expect(mockContext.log.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        expect.stringContaining("owner/test-repo")
      );
    });
  });
});
