import { describe, expect, it } from "vitest";
import { TriggerController } from "../../services/trigger-controller.js";
import type { GitLyteConfig } from "../../types/config.js";

describe("TriggerController - Push Trigger", () => {
  const triggerController = new TriggerController();

  const mockConfig: GitLyteConfig = {
    generation: {
      push: {
        enabled: true,
        branches: ["main", "production"],
        ignorePaths: ["docs/", ".github/"],
      },
    },
  };

  const mockCommits = [
    {
      added: ["src/new-file.ts"],
      modified: ["src/existing-file.ts", "README.md"],
      removed: [],
    },
    {
      added: [],
      modified: ["package.json"],
      removed: ["old-file.ts"],
    },
  ];

  describe("shouldGenerateOnPush", () => {
    it("should generate when push trigger is enabled and branch matches", async () => {
      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        mockCommits,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("auto");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("Push trigger activated");
    });

    it("should not generate when push trigger is explicitly disabled", async () => {
      const config = {
        ...mockConfig,
        generation: {
          ...mockConfig.generation,
          push: {
            ...mockConfig.generation!.push,
            enabled: false,
          },
        },
      };

      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        mockCommits,
        config
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("auto");
      expect(result.reason).toBe("Push trigger disabled");
    });

    it("should not generate when branch is not in target branches", async () => {
      const result = await triggerController.shouldGenerateOnPush(
        "feature-branch",
        "main",
        mockCommits,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("auto");
      expect(result.reason).toBe(
        "Branch feature-branch not in target branches: main, production"
      );
    });

    it("should use default branch when no target branches specified", async () => {
      const config = {
        ...mockConfig,
        generation: {
          ...mockConfig.generation,
          push: {
            enabled: true,
            // branches not specified
          },
        },
      };

      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        mockCommits,
        config
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe("Push trigger activated");
    });

    it("should not generate when all changes are in ignored paths", async () => {
      const ignoredCommits = [
        {
          added: ["docs/new-page.md"],
          modified: [".github/workflows/ci.yml"],
          removed: ["docs/old-page.md"],
        },
      ];

      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        ignoredCommits,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("auto");
      expect(result.reason).toBe("All changes in ignored paths: docs/, .github/");
    });

    it("should generate when some changes are not in ignored paths", async () => {
      const mixedCommits = [
        {
          added: ["docs/new-page.md"], // ignored
          modified: ["src/important-file.ts"], // not ignored
          removed: [],
        },
      ];

      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        mixedCommits,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe("Push trigger activated");
    });

    it("should handle empty commits", async () => {
      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        [],
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe("Push trigger activated");
    });

    it("should default to enabled when push config is missing", async () => {
      const configWithoutPush = {
        generation: {
          trigger: "auto" as const,
        },
      };

      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        mockCommits,
        configWithoutPush
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.reason).toBe("Push trigger activated");
    });

    it("should work with multiple target branches", async () => {
      // Test production branch
      const prodResult = await triggerController.shouldGenerateOnPush(
        "production",
        "main",
        mockCommits,
        mockConfig
      );

      expect(prodResult.shouldGenerate).toBe(true);
      expect(prodResult.reason).toBe("Push trigger activated");

      // Test non-target branch
      const featureResult = await triggerController.shouldGenerateOnPush(
        "feature",
        "main",
        mockCommits,
        mockConfig
      );

      expect(featureResult.shouldGenerate).toBe(false);
      expect(featureResult.reason).toBe(
        "Branch feature not in target branches: main, production"
      );
    });

    it("should handle complex ignore path scenarios", async () => {
      const complexConfig = {
        ...mockConfig,
        generation: {
          ...mockConfig.generation,
          push: {
            enabled: true,
            branches: ["main"],
            ignorePaths: ["docs/", "test/", ".github/workflows/"],
          },
        },
      };

      const complexCommits = [
        {
          added: ["docs/api.md", "test/unit.test.ts"],
          modified: [".github/workflows/deploy.yml"],
          removed: ["docs/old.md"],
        },
      ];

      const result = await triggerController.shouldGenerateOnPush(
        "main",
        "main",
        complexCommits,
        complexConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.reason).toBe(
        "All changes in ignored paths: docs/, test/, .github/workflows/"
      );
    });
  });
});