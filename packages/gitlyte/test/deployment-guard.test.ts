import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkDeploymentStatus,
  safeGenerateWithDeploymentGuard,
  waitForDeploymentCompletion,
} from "../utils/deployment-guard.js";

interface MockContext {
  log: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  repo: ReturnType<typeof vi.fn>;
  octokit: {
    repos: {
      listDeployments: ReturnType<typeof vi.fn>;
      listDeploymentStatuses: ReturnType<typeof vi.fn>;
    };
  };
}

describe("Deployment Guard", () => {
  let mockContext: MockContext;

  beforeEach(() => {
    mockContext = {
      log: {
        info: vi.fn(),
        warn: vi.fn(),
      },
      repo: vi.fn().mockReturnValue({ owner: "test", repo: "test-repo" }),
      octokit: {
        repos: {
          listDeployments: vi.fn(),
          listDeploymentStatuses: vi.fn(),
        },
      },
    };
  });

  describe("checkDeploymentStatus", () => {
    it("should return false when no deployments exist", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [],
      });

      const result = await checkDeploymentStatus(
        mockContext as unknown as Parameters<typeof checkDeploymentStatus>[0]
      );
      expect(result).toBe(false);
    });

    it("should return true when deployment is in progress", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [{ id: 123 }],
      });
      mockContext.octokit.repos.listDeploymentStatuses.mockResolvedValue({
        data: [{ state: "in_progress" }],
      });

      const result = await checkDeploymentStatus(
        mockContext as unknown as Parameters<typeof checkDeploymentStatus>[0]
      );
      expect(result).toBe(true);
    });

    it("should return false when deployment is completed", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [{ id: 123 }],
      });
      mockContext.octokit.repos.listDeploymentStatuses.mockResolvedValue({
        data: [{ state: "success" }],
      });

      const result = await checkDeploymentStatus(
        mockContext as unknown as Parameters<typeof checkDeploymentStatus>[0]
      );
      expect(result).toBe(false);
    });

    it("should return true when deployment is pending", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [{ id: 123 }],
      });
      mockContext.octokit.repos.listDeploymentStatuses.mockResolvedValue({
        data: [{ state: "pending" }],
      });

      const result = await checkDeploymentStatus(
        mockContext as unknown as Parameters<typeof checkDeploymentStatus>[0]
      );
      expect(result).toBe(true);
    });

    it("should return false on API error", async () => {
      mockContext.octokit.repos.listDeployments.mockRejectedValue(
        new Error("API Error")
      );

      const result = await checkDeploymentStatus(
        mockContext as unknown as Parameters<typeof checkDeploymentStatus>[0]
      );
      expect(result).toBe(false);
      expect(mockContext.log.warn).toHaveBeenCalled();
    });
  });

  describe("waitForDeploymentCompletion", () => {
    it("should return immediately when no deployment in progress", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [],
      });

      const start = Date.now();
      await waitForDeploymentCompletion(
        mockContext as unknown as Parameters<
          typeof waitForDeploymentCompletion
        >[0],
        1000
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
      expect(mockContext.log.info).toHaveBeenCalledWith(
        "✅ Previous deployment completed, proceeding"
      );
    });

    it("should wait and then proceed when deployment completes", async () => {
      let callCount = 0;
      mockContext.octokit.repos.listDeployments.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: deployment in progress
          return Promise.resolve({ data: [{ id: 123 }] });
        }
        // Second call: no deployments (completed)
        return Promise.resolve({ data: [] });
      });

      mockContext.octokit.repos.listDeploymentStatuses.mockResolvedValue({
        data: [{ state: "in_progress" }],
      });

      await waitForDeploymentCompletion(
        mockContext as unknown as Parameters<
          typeof waitForDeploymentCompletion
        >[0],
        2000
      );

      expect(mockContext.log.info).toHaveBeenCalledWith(
        "✅ Previous deployment completed, proceeding"
      );
      expect(callCount).toBeGreaterThan(1); // Should have checked multiple times
    });

    it("should timeout after max wait time", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [{ id: 123 }],
      });
      mockContext.octokit.repos.listDeploymentStatuses.mockResolvedValue({
        data: [{ state: "in_progress" }],
      });

      await waitForDeploymentCompletion(
        mockContext as unknown as Parameters<
          typeof waitForDeploymentCompletion
        >[0],
        50
      ); // Very short timeout

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        "⚠️ Timeout waiting for deployment completion, proceeding anyway"
      );
    });
  });

  describe("safeGenerateWithDeploymentGuard", () => {
    it("should execute function immediately when no deployment in progress", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [],
      });

      const mockGenerateFn = vi.fn().mockResolvedValue("result");

      const result = await safeGenerateWithDeploymentGuard(
        mockContext as unknown as Parameters<
          typeof safeGenerateWithDeploymentGuard
        >[0],
        mockGenerateFn
      );

      expect(result).toBe("result");
      expect(mockGenerateFn).toHaveBeenCalledOnce();
    });

    it("should wait for deployment completion before executing function", async () => {
      let deploymentCallCount = 0;
      mockContext.octokit.repos.listDeployments.mockImplementation(() => {
        deploymentCallCount++;
        if (deploymentCallCount === 1) {
          // First call: deployment in progress
          return Promise.resolve({ data: [{ id: 123 }] });
        }
        // Second call: no deployments (completed)
        return Promise.resolve({ data: [] });
      });

      mockContext.octokit.repos.listDeploymentStatuses.mockResolvedValue({
        data: [{ state: "in_progress" }],
      });

      const mockGenerateFn = vi.fn().mockResolvedValue("result");

      const result = await safeGenerateWithDeploymentGuard(
        mockContext as unknown as Parameters<
          typeof safeGenerateWithDeploymentGuard
        >[0],
        mockGenerateFn
      );

      expect(result).toBe("result");
      expect(mockGenerateFn).toHaveBeenCalledOnce();
      expect(deploymentCallCount).toBeGreaterThan(1); // Should have checked status
    });

    it("should propagate errors from generate function", async () => {
      mockContext.octokit.repos.listDeployments.mockResolvedValue({
        data: [],
      });

      const mockGenerateFn = vi
        .fn()
        .mockRejectedValue(new Error("Generation failed"));

      await expect(
        safeGenerateWithDeploymentGuard(
          mockContext as unknown as Parameters<
            typeof safeGenerateWithDeploymentGuard
          >[0],
          mockGenerateFn
        )
      ).rejects.toThrow("Generation failed");
    });
  });
});
