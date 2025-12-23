import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAIProvider,
  getApiKeyEnvVar,
  getAvailableProviders,
  hasApiKey,
  TEMPERATURE,
} from "../../utils/ai-provider.js";

// Mock the AI SDK modules
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() =>
    vi.fn(() => ({ modelId: "claude-sonnet-4-20250514" }))
  ),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ modelId: "gpt-4o" }))),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() =>
    vi.fn(() => ({ modelId: "gemini-2.0-flash" }))
  ),
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "Generated text response",
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    },
  }),
}));

describe("ai-provider", () => {
  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    vi.stubEnv("GOOGLE_API_KEY", "test-google-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("TEMPERATURE", () => {
    it("should have correct temperature values for each task type", () => {
      expect(TEMPERATURE.analysis).toBe(0.3);
      expect(TEMPERATURE.design).toBe(0.5);
      expect(TEMPERATURE.content).toBe(0.7);
      expect(TEMPERATURE.evaluation).toBe(0.0);
    });
  });

  describe("getApiKeyEnvVar", () => {
    it("should return correct env var name for anthropic", () => {
      expect(getApiKeyEnvVar("anthropic")).toBe("ANTHROPIC_API_KEY");
    });

    it("should return correct env var name for openai", () => {
      expect(getApiKeyEnvVar("openai")).toBe("OPENAI_API_KEY");
    });

    it("should return correct env var name for google", () => {
      expect(getApiKeyEnvVar("google")).toBe("GOOGLE_API_KEY");
    });
  });

  describe("hasApiKey", () => {
    it("should return true when API key is set", () => {
      expect(hasApiKey("anthropic")).toBe(true);
      expect(hasApiKey("openai")).toBe(true);
      expect(hasApiKey("google")).toBe(true);
    });

    it("should return false when API key is not set", () => {
      vi.unstubAllEnvs();
      expect(hasApiKey("anthropic")).toBe(false);
      expect(hasApiKey("openai")).toBe(false);
      expect(hasApiKey("google")).toBe(false);
    });
  });

  describe("getAvailableProviders", () => {
    it("should return all providers when all API keys are set", () => {
      const providers = getAvailableProviders();
      expect(providers).toContain("anthropic");
      expect(providers).toContain("openai");
      expect(providers).toContain("google");
    });

    it("should return empty array when no API keys are set", () => {
      vi.unstubAllEnvs();
      const providers = getAvailableProviders();
      expect(providers).toHaveLength(0);
    });

    it("should return only providers with API keys", () => {
      vi.unstubAllEnvs();
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      const providers = getAvailableProviders();
      expect(providers).toEqual(["anthropic"]);
    });
  });

  describe("createAIProvider", () => {
    it("should create provider with default values", () => {
      const provider = createAIProvider();
      expect(provider.provider).toBe("anthropic");
      expect(provider.quality).toBe("standard");
      expect(typeof provider.generateText).toBe("function");
    });

    it("should create provider with specified provider", () => {
      const provider = createAIProvider("openai");
      expect(provider.provider).toBe("openai");
    });

    it("should create provider with specified quality", () => {
      const provider = createAIProvider("anthropic", "high");
      expect(provider.quality).toBe("high");
    });

    it("should create google provider", () => {
      const provider = createAIProvider("google", "standard");
      expect(provider.provider).toBe("google");
    });

    it("should generate text with correct options", async () => {
      const provider = createAIProvider();
      const result = await provider.generateText({
        prompt: "Test prompt",
        taskType: "analysis",
      });

      expect(result.text).toBe("Generated text response");
      expect(result.usage?.promptTokens).toBe(100);
      expect(result.usage?.completionTokens).toBe(50);
      expect(result.usage?.totalTokens).toBe(150);
    });

    it("should use task-based temperature", async () => {
      const { generateText } = await import("ai");
      const provider = createAIProvider();

      await provider.generateText({
        prompt: "Test prompt",
        taskType: "content",
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: TEMPERATURE.content,
        })
      );
    });

    it("should override temperature when specified", async () => {
      const { generateText } = await import("ai");
      const provider = createAIProvider();

      await provider.generateText({
        prompt: "Test prompt",
        temperature: 0.9,
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.9,
        })
      );
    });

    it("should pass system prompt when provided", async () => {
      const { generateText } = await import("ai");
      const provider = createAIProvider();

      await provider.generateText({
        prompt: "Test prompt",
        system: "You are a helpful assistant",
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a helpful assistant",
        })
      );
    });

    it("should pass maxOutputTokens when provided", async () => {
      const { generateText } = await import("ai");
      const provider = createAIProvider();

      await provider.generateText({
        prompt: "Test prompt",
        maxOutputTokens: 1000,
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          maxOutputTokens: 1000,
        })
      );
    });

    it("should handle response without usage info", async () => {
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValueOnce({
        text: "Response without usage",
        usage: undefined,
      } as Awaited<ReturnType<typeof generateText>>);

      const provider = createAIProvider();
      const result = await provider.generateText({
        prompt: "Test prompt",
      });

      expect(result.text).toBe("Response without usage");
      expect(result.usage).toBeUndefined();
    });

    it("should throw error when API key is missing", () => {
      vi.unstubAllEnvs();

      expect(() => createAIProvider("anthropic")).toThrow(
        'API key not found for provider "anthropic"'
      );
      expect(() => createAIProvider("anthropic")).toThrow("ANTHROPIC_API_KEY");
    });

    it("should throw error with provider context when AI generation fails", async () => {
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );

      const provider = createAIProvider();
      await expect(
        provider.generateText({ prompt: "Test prompt" })
      ).rejects.toThrow(
        "[anthropic] AI generation failed: API rate limit exceeded"
      );
    });

    it("should include original error as cause when AI generation fails", async () => {
      const { generateText } = await import("ai");
      const originalError = new Error("Network timeout");
      vi.mocked(generateText).mockRejectedValueOnce(originalError);

      const provider = createAIProvider();
      try {
        await provider.generateText({ prompt: "Test prompt" });
        expect.fail("Should have thrown");
      } catch (error) {
        expect((error as Error).cause).toBe(originalError);
      }
    });
  });
});
