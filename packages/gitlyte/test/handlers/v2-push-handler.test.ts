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
        updateRef: ReturnType<typeof vi.fn>;
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
          updateRef: vi.fn(),
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

    // Default mocks
    mockContext.octokit.repos.getContent.mockRejectedValue({ status: 404 });
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
    mockContext.octokit.git.updateRef.mockResolvedValue({});
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
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Starting site generation")
      );
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

    it("should update ref after creating commit", async () => {
      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.octokit.git.updateRef).toHaveBeenCalledWith({
        owner: "owner",
        repo: "test-repo",
        ref: "heads/main",
        sha: "commit-sha",
      });
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
      ).rejects.toThrow("Git API error");

      expect(mockContext.log.error).toHaveBeenCalledWith(
        expect.stringContaining("Site generation failed"),
        error
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

    it("should deploy to configured output directory", async () => {
      mockContext.octokit.repos.getContent.mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from(
            JSON.stringify({ outputDirectory: "public" })
          ).toString("base64"),
        },
      });

      await handlePushV2(mockContext as Parameters<typeof handlePushV2>[0]);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("Deploying to public/")
      );
    });
  });
});
