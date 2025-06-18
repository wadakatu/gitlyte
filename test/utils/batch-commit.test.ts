import { describe, it, expect, vi, beforeEach } from "vitest";
import { batchCommitFiles } from "../../src/utils/batch-commit.js";

// Context mockを作成
const createMockContext = (overrides = {}) => {
  const defaultContext = {
    repo: () => ({ owner: "test-owner", repo: "test-repo" }),
    octokit: {
      git: {
        getRef: vi.fn(),
        getCommit: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        updateRef: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
  return { ...defaultContext, ...overrides };
};

describe("Batch Commit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("batchCommitFiles", () => {
    it("should create batch commit successfully", async () => {
      const mockRef = {
        data: {
          object: { sha: "current-commit-sha" },
        },
      };

      const mockCurrentCommit = {
        data: {
          tree: { sha: "current-tree-sha" },
        },
      };

      const mockNewTree = {
        data: { sha: "new-tree-sha" },
      };

      const mockNewCommit = {
        data: { sha: "new-commit-sha" },
      };

      const ctx = createMockContext();
      ctx.octokit.git.getRef.mockResolvedValue(mockRef);
      ctx.octokit.git.getCommit.mockResolvedValue(mockCurrentCommit);
      ctx.octokit.git.createTree.mockResolvedValue(mockNewTree);
      ctx.octokit.git.createCommit.mockResolvedValue(mockNewCommit);
      ctx.octokit.git.updateRef.mockResolvedValue({});

      const files = [
        { path: "docs/package.json", content: '{"name": "test"}' },
        { path: "docs/index.html", content: "<h1>Test</h1>" },
      ];

      await batchCommitFiles(ctx as any, files, "Test commit message");

      expect(ctx.octokit.git.getRef).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        ref: "heads/main",
      });

      expect(ctx.octokit.git.getCommit).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        commit_sha: "current-commit-sha",
      });

      expect(ctx.octokit.git.createTree).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        tree: [
          {
            path: "docs/package.json",
            mode: "100644",
            type: "blob",
            content: '{"name": "test"}',
          },
          {
            path: "docs/index.html",
            mode: "100644",
            type: "blob",
            content: "<h1>Test</h1>",
          },
        ],
        base_tree: "current-tree-sha",
      });

      expect(ctx.octokit.git.createCommit).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        message: "Test commit message",
        tree: "new-tree-sha",
        parents: ["current-commit-sha"],
      });

      expect(ctx.octokit.git.updateRef).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        ref: "heads/main",
        sha: "new-commit-sha",
      });

      expect(ctx.log.info).toHaveBeenCalledWith(
        "📦 Batch commit successful: 2 files in one commit"
      );
    });

    it("should handle API errors properly", async () => {
      const ctx = createMockContext();
      ctx.octokit.git.getRef.mockRejectedValue(new Error("API Error"));

      const files = [
        { path: "docs/test.txt", content: "test content" },
      ];

      await expect(
        batchCommitFiles(ctx as any, files, "Test commit")
      ).rejects.toThrow("API Error");

      expect(ctx.log.error).toHaveBeenCalledWith(
        "Batch commit failed:",
        expect.any(Error)
      );
    });

    it("should handle empty file list", async () => {
      const mockRef = {
        data: {
          object: { sha: "current-commit-sha" },
        },
      };

      const mockCurrentCommit = {
        data: {
          tree: { sha: "current-tree-sha" },
        },
      };

      const mockNewTree = {
        data: { sha: "new-tree-sha" },
      };

      const mockNewCommit = {
        data: { sha: "new-commit-sha" },
      };

      const ctx = createMockContext();
      ctx.octokit.git.getRef.mockResolvedValue(mockRef);
      ctx.octokit.git.getCommit.mockResolvedValue(mockCurrentCommit);
      ctx.octokit.git.createTree.mockResolvedValue(mockNewTree);
      ctx.octokit.git.createCommit.mockResolvedValue(mockNewCommit);
      ctx.octokit.git.updateRef.mockResolvedValue({});

      await batchCommitFiles(ctx as any, [], "Empty commit");

      expect(ctx.octokit.git.createTree).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        tree: [],
        base_tree: "current-tree-sha",
      });

      expect(ctx.log.info).toHaveBeenCalledWith(
        "📦 Batch commit successful: 0 files in one commit"
      );
    });
  });
});