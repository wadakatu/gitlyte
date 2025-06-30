import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../index.js";

interface MockProbot {
  on: ReturnType<typeof vi.fn>;
  load?: ReturnType<typeof vi.fn>;
}

// シンプルな統合テスト - アプリが正しく初期化されることを確認
describe("GitLyte App Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("App Initialization", () => {
    it("should export the app function", () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe("function");
    });

    it("should be able to load the app into a mock probot", () => {
      const mockProbot: MockProbot = {
        on: vi.fn(),
        load: vi.fn(),
      };

      // アプリ関数を呼び出して、Probotにイベントハンドラーが登録されることを確認
      app(mockProbot as unknown as Parameters<typeof app>[0]);

      expect(mockProbot.on).toHaveBeenCalledWith(
        "pull_request.closed",
        expect.any(Function)
      );
    });
  });

  describe("PR Handler Logic", () => {
    it("should handle valid PR payload format", async () => {
      const mockHandler = vi.fn();
      const mockProbot = {
        on: vi.fn().mockImplementation((event, handler) => {
          if (event === "pull_request.closed") {
            mockHandler.mockImplementation(handler);
          }
        }),
      };

      app(mockProbot as unknown as Parameters<typeof app>[0]);

      // PRハンドラーが登録されていることを確認
      expect(mockProbot.on).toHaveBeenCalledWith(
        "pull_request.closed",
        expect.any(Function)
      );

      // ハンドラー関数を取得
      const handler = mockProbot.on.mock.calls[0][1];
      expect(typeof handler).toBe("function");
    });

    it("should filter PRs correctly based on conditions", () => {
      // PR filtering logic test
      const testPRs = [
        {
          merged: true,
          merged_at: "2023-01-01T00:00:00Z",
          labels: [{ name: "enhancement" }],
        },
        {
          merged: false,
          merged_at: null,
          labels: [{ name: "enhancement" }],
        },
        {
          merged: true,
          merged_at: "2023-01-01T00:00:00Z",
          labels: [{ name: "bugfix" }],
        },
        {
          merged: true,
          merged_at: "2023-01-01T00:00:00Z",
          labels: [{ name: "feat" }],
        },
      ];

      const shouldProcess = (pr: {
        merged: boolean;
        merged_at: string | null;
        labels: Array<{ name: string }>;
      }) => {
        if (!pr.merged || !pr.merged_at) return false;
        return pr.labels.some((l: { name: string }) =>
          /(enhancement|feat)/i.test(l.name)
        );
      };

      const validPRs = testPRs.filter(shouldProcess);

      expect(validPRs).toHaveLength(2);
      expect(validPRs[0].labels[0].name).toBe("enhancement");
      expect(validPRs[1].labels[0].name).toBe("feat");
    });
  });

  describe("Component Integration", () => {
    it("should have all required service modules", async () => {
      // 必要なサービスモジュールが存在することを確認
      const repositoryAnalyzer = await import(
        "../../services/repository-analyzer.js"
      );
      const siteGenerator = await import("../../services/site-generator.js");
      const configurationLoader = await import(
        "../../services/configuration-loader.js"
      );
      const staticFileDeployer = await import(
        "../../services/static-file-deployer.js"
      );
      const githubUtils = await import("../../utils/github.js");
      const batchCommit = await import("../../utils/batch-commit.js");

      expect(repositoryAnalyzer.RepositoryAnalyzer).toBeDefined();
      expect(siteGenerator.SiteGenerator).toBeDefined();
      expect(configurationLoader.ConfigurationLoader).toBeDefined();
      expect(staticFileDeployer.StaticFileDeployer).toBeDefined();
      expect(githubUtils.collectRepoData).toBeDefined();
      expect(batchCommit.batchCommitFiles).toBeDefined();
    });
  });
});
