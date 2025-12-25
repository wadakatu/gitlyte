import { describe, expect, it, vi } from "vitest";
import app from "../../index.js";

interface MockProbot {
  on: ReturnType<typeof vi.fn>;
  onAny: ReturnType<typeof vi.fn>;
  log: {
    info: ReturnType<typeof vi.fn>;
  };
}

// v2 統合テスト - アプリが正しく初期化されることを確認
describe("GitLyte App Integration (v2)", () => {
  describe("App Initialization", () => {
    it("should export the app function", () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe("function");
    });

    it("should register push and comment event handlers", () => {
      const mockProbot: MockProbot = {
        on: vi.fn(),
        onAny: vi.fn(),
        log: {
          info: vi.fn(),
        },
      };

      app(mockProbot as unknown as Parameters<typeof app>[0]);

      // v2: Push handler and comment handler should be registered
      expect(mockProbot.on).toHaveBeenCalledTimes(2);
      expect(mockProbot.on).toHaveBeenCalledWith("push", expect.any(Function));
      expect(mockProbot.on).toHaveBeenCalledWith(
        "issue_comment.created",
        expect.any(Function)
      );
      // Debug handler should also be registered
      expect(mockProbot.onAny).toHaveBeenCalledTimes(1);
    });

    it("should not register legacy PR or installation handlers (v2)", () => {
      const mockProbot: MockProbot = {
        on: vi.fn(),
        onAny: vi.fn(),
        log: {
          info: vi.fn(),
        },
      };

      app(mockProbot as unknown as Parameters<typeof app>[0]);

      // v2: No legacy PR or installation handlers
      const registeredEvents = mockProbot.on.mock.calls.map(
        (call) => call[0] as string
      );

      expect(registeredEvents).not.toContain("pull_request.closed");
      expect(registeredEvents).not.toContain("installation.created");
      // issue_comment.created is now registered for @gitlyte commands
      expect(registeredEvents).toContain("issue_comment.created");
    });
  });

  describe("v2 Service Modules", () => {
    it("should have all required v2 service modules", async () => {
      const v2SiteGenerator = await import(
        "../../services/v2-site-generator.js"
      );
      const selfRefine = await import("../../services/self-refine.js");
      const aiProvider = await import("../../utils/ai-provider.js");
      const deploymentGuard = await import("../../utils/deployment-guard.js");

      expect(v2SiteGenerator.generateSite).toBeDefined();
      expect(v2SiteGenerator.analyzeRepository).toBeDefined();
      expect(v2SiteGenerator.generateDesignSystem).toBeDefined();
      expect(selfRefine.refinePage).toBeDefined();
      expect(selfRefine.shouldUseSelfRefine).toBeDefined();
      expect(aiProvider.createAIProvider).toBeDefined();
      expect(deploymentGuard.safeGenerateWithDeploymentGuard).toBeDefined();
    });

    it("should have v2 config types", async () => {
      const v2Config = await import("../../types/v2-config.js");

      expect(v2Config.resolveConfigV2).toBeDefined();
      expect(v2Config.validateConfigV2).toBeDefined();
    });
  });
});
