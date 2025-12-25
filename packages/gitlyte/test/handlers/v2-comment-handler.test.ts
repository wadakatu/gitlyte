import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleCommentV2 } from "../../handlers/v2-comment-handler.js";

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

vi.mock("../../handlers/v2-push-handler.js", () => ({
  loadConfigV2: vi.fn(),
}));

describe("v2-comment-handler", () => {
  let mockContext: {
    log: {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
    };
    octokit: {
      issues: {
        createComment: ReturnType<typeof vi.fn>;
        updateComment: ReturnType<typeof vi.fn>;
      };
      repos: {
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
      action: string;
      comment: {
        id: number;
        body: string;
        user: { login: string };
      };
      issue: {
        number: number;
        pull_request?: unknown;
      };
      repository: {
        owner: { login: string };
        name: string;
        description: string | null;
        html_url: string;
        language: string | null;
        topics?: string[];
        default_branch: string;
      };
    };
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset loadConfigV2 mock with default enabled config
    const { loadConfigV2 } = await import("../../handlers/v2-push-handler.js");
    vi.mocked(loadConfigV2).mockResolvedValue({
      enabled: true,
      outputDirectory: "docs",
      ai: { provider: "anthropic", quality: "standard" },
      generation: { trigger: "manual" },
      pages: [],
    });

    mockContext = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      octokit: {
        issues: {
          createComment: vi.fn().mockResolvedValue({
            data: { id: 123 },
          }),
          updateComment: vi.fn().mockResolvedValue({}),
        },
        repos: {
          getReadme: vi.fn().mockRejectedValue({ status: 404 }),
        },
        git: {
          getRef: vi.fn().mockResolvedValue({
            data: { object: { sha: "parent-sha" } },
          }),
          createTree: vi.fn().mockResolvedValue({
            data: { sha: "tree-sha" },
          }),
          createCommit: vi.fn().mockResolvedValue({
            data: { sha: "commit-sha" },
          }),
          createRef: vi.fn().mockResolvedValue({}),
          deleteRef: vi.fn().mockResolvedValue({}),
        },
        pulls: {
          create: vi.fn().mockResolvedValue({
            data: {
              number: 42,
              html_url: "https://github.com/owner/test-repo/pull/42",
            },
          }),
        },
      },
      payload: {
        action: "created",
        comment: {
          id: 1,
          body: "@gitlyte generate",
          user: { login: "testuser" },
        },
        issue: {
          number: 10,
        },
        repository: {
          owner: { login: "owner" },
          name: "test-repo",
          description: "A test repository",
          html_url: "https://github.com/owner/test-repo",
          language: "TypeScript",
          topics: ["typescript"],
          default_branch: "main",
        },
      },
    };
  });

  describe("handleCommentV2", () => {
    describe("command parsing", () => {
      it("should ignore non-created comments", async () => {
        mockContext.payload.action = "edited";

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.log.info).not.toHaveBeenCalled();
        expect(mockContext.octokit.issues.createComment).not.toHaveBeenCalled();
      });

      it("should ignore comments without @gitlyte command", async () => {
        mockContext.payload.comment.body = "Just a regular comment";

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.log.info).not.toHaveBeenCalled();
        expect(mockContext.octokit.issues.createComment).not.toHaveBeenCalled();
      });

      it("should parse @gitlyte generate command (case insensitive)", async () => {
        mockContext.payload.comment.body = "@GITLYTE GENERATE";

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.log.info).toHaveBeenCalledWith(
          expect.stringContaining("Command detected: @gitlyte generate")
        );
      });

      it("should parse @gitlyte help command", async () => {
        mockContext.payload.comment.body = "@gitlyte help";

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.log.info).toHaveBeenCalledWith(
          expect.stringContaining("Command detected: @gitlyte help")
        );
      });
    });

    describe("help command", () => {
      it("should post help message when @gitlyte help is used", async () => {
        mockContext.payload.comment.body = "@gitlyte help";

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith({
          owner: "owner",
          repo: "test-repo",
          issue_number: 10,
          body: expect.stringContaining("GitLyte Commands"),
        });
        expect(mockContext.log.info).toHaveBeenCalledWith(
          expect.stringContaining("Help message posted")
        );
      });

      it("should handle help command failure", async () => {
        mockContext.payload.comment.body = "@gitlyte help";
        const error = new Error("API error");
        mockContext.octokit.issues.createComment.mockRejectedValue(error);

        await expect(
          handleCommentV2(mockContext as Parameters<typeof handleCommentV2>[0])
        ).rejects.toThrow("Failed to post help message");

        expect(mockContext.log.error).toHaveBeenCalledWith(
          expect.stringContaining("Failed to post help message"),
          expect.any(Error)
        );
      });
    });

    describe("generate command", () => {
      it("should post initial status comment", async () => {
        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.issues.createComment).toHaveBeenCalledWith({
          owner: "owner",
          repo: "test-repo",
          issue_number: 10,
          body: expect.stringContaining("Site generation starting"),
        });
      });

      it("should skip when generation is disabled", async () => {
        const { loadConfigV2 } = await import(
          "../../handlers/v2-push-handler.js"
        );
        vi.mocked(loadConfigV2).mockResolvedValue({
          enabled: false,
          outputDirectory: "docs",
          ai: { provider: "anthropic", quality: "standard" },
          generation: { trigger: "manual" },
          pages: [],
        });

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.issues.updateComment).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.stringContaining("disabled in config"),
          })
        );
        expect(mockContext.octokit.pulls.create).not.toHaveBeenCalled();
      });

      it("should create PR on successful generation", async () => {
        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.pulls.create).toHaveBeenCalledWith(
          expect.objectContaining({
            owner: "owner",
            repo: "test-repo",
            title: "chore: update GitLyte generated site",
            base: "main",
          })
        );
      });

      it("should update status comment with success", async () => {
        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.issues.updateComment).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.stringContaining("Site generated successfully"),
          })
        );
        expect(mockContext.octokit.issues.updateComment).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.stringContaining("Pull Request:"),
          })
        );
      });

      it("should update status comment with error on failure", async () => {
        const error = new Error("Generation failed");
        mockContext.octokit.git.createTree.mockRejectedValue(error);

        await expect(
          handleCommentV2(mockContext as Parameters<typeof handleCommentV2>[0])
        ).rejects.toThrow();

        expect(mockContext.octokit.issues.updateComment).toHaveBeenCalledWith(
          expect.objectContaining({
            body: expect.stringContaining("Site generation failed"),
          })
        );
      });

      it("should handle status comment update failure gracefully", async () => {
        const generationError = new Error("Generation failed");
        const updateError = new Error("Comment update failed");

        mockContext.octokit.git.createTree.mockRejectedValue(generationError);
        mockContext.octokit.issues.updateComment.mockRejectedValue(updateError);

        await expect(
          handleCommentV2(mockContext as Parameters<typeof handleCommentV2>[0])
        ).rejects.toThrow("Generation failed");

        expect(mockContext.log.warn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to update status comment"),
          expect.any(Error)
        );
      });
    });

    describe("branch and PR creation", () => {
      it("should create branch with correct name format", async () => {
        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.git.createRef).toHaveBeenCalledWith(
          expect.objectContaining({
            owner: "owner",
            repo: "test-repo",
            ref: expect.stringMatching(/^refs\/heads\/gitlyte\/update-site-/),
          })
        );
      });

      it("should handle branch already exists (422) error", async () => {
        const branchExistsError = new Error("Reference already exists");
        (branchExistsError as { status?: number }).status = 422;
        mockContext.octokit.git.createRef.mockRejectedValue(branchExistsError);

        await expect(
          handleCommentV2(mockContext as Parameters<typeof handleCommentV2>[0])
        ).rejects.toThrow("already exists");
      });

      it("should clean up orphaned branch on PR creation failure", async () => {
        const prError = new Error("Permission denied");
        mockContext.octokit.pulls.create.mockRejectedValue(prError);

        await expect(
          handleCommentV2(mockContext as Parameters<typeof handleCommentV2>[0])
        ).rejects.toThrow();

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

      it("should log warning if branch cleanup fails", async () => {
        const prError = new Error("Permission denied");
        const cleanupError = new Error("Cleanup failed");

        mockContext.octokit.pulls.create.mockRejectedValue(prError);
        mockContext.octokit.git.deleteRef.mockRejectedValue(cleanupError);

        await expect(
          handleCommentV2(mockContext as Parameters<typeof handleCommentV2>[0])
        ).rejects.toThrow();

        expect(mockContext.log.warn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to clean up orphaned branch"),
          expect.any(Error)
        );
      });
    });

    describe("README handling", () => {
      it("should log info when README not found (404)", async () => {
        mockContext.octokit.repos.getReadme.mockRejectedValue({ status: 404 });

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.log.info).toHaveBeenCalledWith(
          expect.stringContaining("No README found")
        );
      });

      it("should warn on non-404 README fetch error", async () => {
        const networkError = new Error("Network timeout");
        (networkError as { status?: number }).status = 500;
        mockContext.octokit.repos.getReadme.mockRejectedValue(networkError);

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.log.warn).toHaveBeenCalledWith(
          expect.stringContaining("Failed to fetch README"),
          expect.any(Error)
        );
      });

      it("should proceed with generation even when README fetch fails", async () => {
        const networkError = new Error("Network timeout");
        (networkError as { status?: number }).status = 500;
        mockContext.octokit.repos.getReadme.mockRejectedValue(networkError);

        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.pulls.create).toHaveBeenCalled();
      });
    });

    describe("commit message", () => {
      it("should include [skip gitlyte] marker in commit message", async () => {
        await handleCommentV2(
          mockContext as Parameters<typeof handleCommentV2>[0]
        );

        expect(mockContext.octokit.git.createCommit).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("[skip gitlyte]"),
          })
        );
      });
    });
  });
});
