import { describe, expect, it } from "vitest";
import {
  TriggerController,
  GENERATION_LABELS,
} from "../../services/trigger-controller.js";
import type { GitLyteConfig } from "../../types/config.js";
import type { PullRequest } from "../../types/repository.js";

describe("TriggerController", () => {
  const triggerController = new TriggerController();

  const mockPR: PullRequest = {
    title: "Test PR",
    number: 1,
    user: { login: "testuser" },
    merged_at: "2023-01-01T00:00:00Z",
    labels: [],
  };

  const mockConfig: GitLyteConfig = {
    generation: {
      trigger: "auto",
      branches: ["main"],
      labels: ["enhancement", "feat"],
    },
  };

  describe("shouldGenerateOnPRMerge", () => {
    it("should skip generation when skip label is present", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: GENERATION_LABELS.SKIP }],
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("skip");
      expect(result.reason).toBe("Skip label found");
    });

    it("should force generation when force label is present", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: GENERATION_LABELS.FORCE }],
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("label");
      expect(result.generationType).toBe("force");
      expect(result.reason).toBe("Force generation label found");
    });

    it("should generate when manual label is present", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: GENERATION_LABELS.MANUAL }],
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("label");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("Manual generation label found");
    });

    it("should generate preview when preview label is present", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: GENERATION_LABELS.PREVIEW }],
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("label");
      expect(result.generationType).toBe("preview");
      expect(result.reason).toBe("Preview generation label found");
    });

    it("should auto-generate for enhancement labels", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: "enhancement" }],
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("auto");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("Config-based auto generation");
    });

    it("should not generate when manual config is set", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: "enhancement" }],
      };

      const config = {
        ...mockConfig,
        generation: {
          ...mockConfig.generation!,
          trigger: "manual" as const,
        },
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        config
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("manual");
      expect(result.reason).toBe("Manual trigger configured");
    });

    it("should not generate when required labels are missing", async () => {
      const pr = {
        ...mockPR,
        labels: [{ name: "documentation" }],
      };

      const result = await triggerController.shouldGenerateOnPRMerge(
        pr,
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("manual");
      expect(result.reason).toBe("No trigger conditions met");
    });
  });

  describe("parseCommentCommand", () => {
    it("should parse generate command", () => {
      const command =
        triggerController.parseCommentCommand("@gitlyte generate");

      expect(command).toEqual({
        command: "@gitlyte generate",
        action: "generate",
        options: {},
      });
    });

    it("should parse generate command with options", () => {
      const command = triggerController.parseCommentCommand(
        "@gitlyte generate --force --layout=minimal"
      );

      expect(command).toEqual({
        command: "@gitlyte generate",
        action: "generate",
        options: {
          force: "true",
          layout: "minimal",
        },
      });
    });

    it("should parse preview command", () => {
      const command = triggerController.parseCommentCommand("@gitlyte preview");

      expect(command).toEqual({
        command: "@gitlyte preview",
        action: "preview",
        options: {},
      });
    });

    it("should parse help command", () => {
      const command = triggerController.parseCommentCommand("@gitlyte help");

      expect(command).toEqual({
        command: "@gitlyte help",
        action: "help",
        options: {},
      });
    });

    it("should parse config command", () => {
      const command = triggerController.parseCommentCommand("@gitlyte config");

      expect(command).toEqual({
        command: "@gitlyte config",
        action: "config",
        options: {},
      });
    });

    it("should return null for invalid commands", () => {
      const command = triggerController.parseCommentCommand("not a command");

      expect(command).toBeNull();
    });

    it("should return null for partial commands", () => {
      const command = triggerController.parseCommentCommand("@gitlyte");

      expect(command).toBeNull();
    });
  });

  describe("shouldGenerateOnComment", () => {
    it("should generate on generate command", async () => {
      const result = await triggerController.shouldGenerateOnComment(
        "@gitlyte generate",
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("comment");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("Comment command: @gitlyte generate");
    });

    it("should force generate with force option", async () => {
      const result = await triggerController.shouldGenerateOnComment(
        "@gitlyte generate --force",
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("comment");
      expect(result.generationType).toBe("force");
      expect(result.reason).toBe("Comment command: @gitlyte generate");
    });

    it("should generate preview on preview command", async () => {
      const result = await triggerController.shouldGenerateOnComment(
        "@gitlyte preview",
        mockConfig
      );

      expect(result.shouldGenerate).toBe(true);
      expect(result.triggerType).toBe("comment");
      expect(result.generationType).toBe("preview");
      expect(result.reason).toBe("Preview command: @gitlyte preview");
    });

    it("should not generate on config command", async () => {
      const result = await triggerController.shouldGenerateOnComment(
        "@gitlyte config",
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("comment");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("Non-generation command");
    });

    it("should not generate on help command", async () => {
      const result = await triggerController.shouldGenerateOnComment(
        "@gitlyte help",
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("comment");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("Non-generation command");
    });

    it("should not generate on invalid command", async () => {
      const result = await triggerController.shouldGenerateOnComment(
        "invalid command",
        mockConfig
      );

      expect(result.shouldGenerate).toBe(false);
      expect(result.triggerType).toBe("comment");
      expect(result.generationType).toBe("full");
      expect(result.reason).toBe("No valid command found");
    });
  });

  describe("generateHelpMessage", () => {
    it("should generate comprehensive help message", () => {
      const helpMessage = triggerController.generateHelpMessage();

      expect(helpMessage).toContain("GitLyte コマンド一覧");
      expect(helpMessage).toContain("@gitlyte generate");
      expect(helpMessage).toContain("@gitlyte preview");
      expect(helpMessage).toContain("@gitlyte config");
      expect(helpMessage).toContain("@gitlyte help");
      expect(helpMessage).toContain("gitlyte:auto");
      expect(helpMessage).toContain("gitlyte:generate");
      expect(helpMessage).toContain("gitlyte:preview");
      expect(helpMessage).toContain("gitlyte:force");
      expect(helpMessage).toContain("gitlyte:skip");
    });
  });

  describe("generateConfigMessage", () => {
    it("should generate config display message", () => {
      const configMessage = triggerController.generateConfigMessage(mockConfig);

      expect(configMessage).toContain("現在の GitLyte 設定");
      expect(configMessage).toContain("auto");
      expect(configMessage).toContain("main");
      expect(configMessage).toContain("enhancement, feat");
      expect(configMessage).toContain("hero-focused");
      expect(configMessage).toContain("professional");
    });

    it("should handle missing generation config", () => {
      const config = { site: { layout: "minimal" as const } };
      const configMessage = triggerController.generateConfigMessage(config);

      expect(configMessage).toContain("現在の GitLyte 設定");
      expect(configMessage).toContain("auto"); // default
      expect(configMessage).toContain("すべて"); // default for branches
      expect(configMessage).toContain("なし"); // default for labels
      expect(configMessage).toContain("minimal");
    });
  });
});
