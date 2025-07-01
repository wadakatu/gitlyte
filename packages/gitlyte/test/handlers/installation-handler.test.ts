import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleInstallation,
  handleUninstallation,
} from "../../handlers/installation-handler.js";

describe("Installation Handler", () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      log: {
        info: vi.fn(),
        error: vi.fn(),
      },
      octokit: {
        issues: {
          getLabel: vi.fn(),
          createLabel: vi.fn(),
          deleteLabel: vi.fn(),
        },
        apps: {
          listReposAccessibleToInstallation: vi.fn(),
        },
      },
      payload: {},
    };
  });

  describe("handleInstallation", () => {
    it("should create labels for new repositories", async () => {
      mockContext.payload = {
        installation: { id: 123 },
        repositories: [
          {
            name: "test-repo",
            full_name: "owner/test-repo",
            owner: { login: "owner" },
          },
        ],
      };

      // ラベルが存在しない場合
      mockContext.octokit.issues.getLabel.mockRejectedValue(
        new Error("Not found")
      );

      await handleInstallation(mockContext);

      // 2つのラベルが作成されることを確認
      expect(mockContext.octokit.issues.createLabel).toHaveBeenCalledTimes(2);
      expect(mockContext.octokit.issues.createLabel).toHaveBeenCalledWith({
        owner: "owner",
        repo: "test-repo",
        name: "gitlyte",
        color: "667eea",
        description: "Generate full GitLyte site on PR merge",
      });
      expect(mockContext.octokit.issues.createLabel).toHaveBeenCalledWith({
        owner: "owner",
        repo: "test-repo",
        name: "gitlyte:preview",
        color: "f093fb",
        description: "Generate preview GitLyte site on PR merge",
      });
    });

    it("should skip existing labels", async () => {
      mockContext.payload = {
        installation: { id: 123 },
        repositories: [
          {
            name: "test-repo",
            full_name: "owner/test-repo",
            owner: { login: "owner" },
          },
        ],
      };

      // ラベルが既に存在する場合
      mockContext.octokit.issues.getLabel.mockResolvedValue({ data: {} });

      await handleInstallation(mockContext);

      // ラベルが作成されないことを確認
      expect(mockContext.octokit.issues.createLabel).not.toHaveBeenCalled();
    });

    it("should handle installation without repositories list", async () => {
      mockContext.payload = {
        installation: { id: 123 },
      };

      // リポジトリリストをAPIから取得
      mockContext.octokit.apps.listReposAccessibleToInstallation.mockResolvedValue(
        {
          data: {
            repositories: [
              {
                name: "test-repo",
                full_name: "owner/test-repo",
                owner: { login: "owner" },
              },
            ],
          },
        }
      );

      mockContext.octokit.issues.getLabel.mockRejectedValue(
        new Error("Not found")
      );

      await handleInstallation(mockContext);

      expect(
        mockContext.octokit.apps.listReposAccessibleToInstallation
      ).toHaveBeenCalledWith({
        installation_id: 123,
      });
      expect(mockContext.octokit.issues.createLabel).toHaveBeenCalledTimes(2);
    });

    it("should handle errors gracefully", async () => {
      mockContext.payload = {
        installation: { id: 123 },
        repositories: [
          {
            name: "test-repo",
            full_name: "owner/test-repo",
            owner: { login: "owner" },
          },
        ],
      };

      // エラーが発生した場合
      mockContext.octokit.issues.getLabel.mockRejectedValue(
        new Error("API Error")
      );
      mockContext.octokit.issues.createLabel.mockRejectedValue(
        new Error("Create failed")
      );

      await handleInstallation(mockContext);

      expect(mockContext.log.error).toHaveBeenCalled();
    });
  });

  describe("handleUninstallation", () => {
    it("should delete labels from repositories", async () => {
      mockContext.payload = {
        repositories: [
          {
            name: "test-repo",
            full_name: "owner/test-repo",
            owner: { login: "owner" },
          },
        ],
      };

      await handleUninstallation(mockContext);

      // 2つのラベルが削除されることを確認
      expect(mockContext.octokit.issues.deleteLabel).toHaveBeenCalledTimes(2);
      expect(mockContext.octokit.issues.deleteLabel).toHaveBeenCalledWith({
        owner: "owner",
        repo: "test-repo",
        name: "gitlyte",
      });
      expect(mockContext.octokit.issues.deleteLabel).toHaveBeenCalledWith({
        owner: "owner",
        repo: "test-repo",
        name: "gitlyte:preview",
      });
    });

    it("should handle missing labels gracefully", async () => {
      mockContext.payload = {
        repositories: [
          {
            name: "test-repo",
            full_name: "owner/test-repo",
            owner: { login: "owner" },
          },
        ],
      };

      // ラベルが存在しない場合（404エラー）
      const notFoundError = new Error("Not found") as Error & {
        status: number;
      };
      notFoundError.status = 404;
      mockContext.octokit.issues.deleteLabel.mockRejectedValue(notFoundError);

      await handleUninstallation(mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("not found, skipping")
      );
    });

    it("should handle no repositories gracefully", async () => {
      mockContext.payload = {};

      await handleUninstallation(mockContext);

      expect(mockContext.octokit.issues.deleteLabel).not.toHaveBeenCalled();
      expect(mockContext.log.info).toHaveBeenCalledWith(
        expect.stringContaining("uninstalled from 0 repositories")
      );
    });

    it("should handle deletion errors", async () => {
      mockContext.payload = {
        repositories: [
          {
            name: "test-repo",
            full_name: "owner/test-repo",
            owner: { login: "owner" },
          },
        ],
      };

      // 削除エラー（404以外）
      mockContext.octokit.issues.deleteLabel.mockRejectedValue(
        new Error("API Error")
      );

      await handleUninstallation(mockContext);

      expect(mockContext.log.error).toHaveBeenCalled();
    });
  });
});
