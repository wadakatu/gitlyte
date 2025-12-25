import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createAIProvider,
  AI_PROVIDERS,
  QUALITY_MODES,
  type AIProvider,
  type QualityMode,
} from "../src/ai-provider.js";

// Mock the AI SDK modules
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn(() => ({ modelId: "claude-sonnet-4" }))),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => ({ modelId: "gpt-4o" }))),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn(() => ({ modelId: "gemini" }))),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

describe("AI Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Constants", () => {
    it("should export valid AI providers", () => {
      expect(AI_PROVIDERS).toEqual(["anthropic", "openai", "google"]);
    });

    it("should export valid quality modes", () => {
      expect(QUALITY_MODES).toEqual(["standard", "high"]);
    });
  });

  describe("createAIProvider", () => {
    it("should create an Anthropic provider with standard quality", () => {
      const provider = createAIProvider("anthropic", "standard", "test-api-key");

      expect(provider.provider).toBe("anthropic");
      expect(provider.quality).toBe("standard");
      expect(typeof provider.generateText).toBe("function");
    });

    it("should create an OpenAI provider", () => {
      const provider = createAIProvider("openai", "standard", "test-api-key");

      expect(provider.provider).toBe("openai");
      expect(provider.quality).toBe("standard");
    });

    it("should create a Google provider", () => {
      const provider = createAIProvider("google", "high", "test-api-key");

      expect(provider.provider).toBe("google");
      expect(provider.quality).toBe("high");
    });

    it("should throw error when API key is missing", () => {
      expect(() => createAIProvider("anthropic", "standard", "")).toThrow(
        'API key is required for provider "anthropic"'
      );
    });

    it("should throw error when API key is undefined", () => {
      expect(() =>
        createAIProvider("anthropic", "standard", undefined as unknown as string)
      ).toThrow('API key is required for provider "anthropic"');
    });

    it("should work with all provider and quality combinations", () => {
      for (const provider of AI_PROVIDERS) {
        for (const quality of QUALITY_MODES) {
          const instance = createAIProvider(provider, quality, "test-key");
          expect(instance.provider).toBe(provider);
          expect(instance.quality).toBe(quality);
        }
      }
    });
  });

  describe("generateText", () => {
    it("should call AI SDK generateText with correct parameters", async () => {
      const { generateText: mockGenerateText } = await import("ai");
      vi.mocked(mockGenerateText).mockResolvedValue({
        text: "Generated text response",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20 },
      } as ReturnType<typeof mockGenerateText> extends Promise<infer T> ? T : never);

      const provider = createAIProvider("anthropic", "standard", "test-api-key");
      const result = await provider.generateText({
        prompt: "Test prompt",
        temperature: 0.5,
      });

      expect(result.text).toBe("Generated text response");
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Test prompt",
          temperature: 0.5,
        })
      );
    });

    it("should use default temperature of 0.7 when not specified", async () => {
      const { generateText: mockGenerateText } = await import("ai");
      vi.mocked(mockGenerateText).mockResolvedValue({
        text: "Response",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20 },
      } as ReturnType<typeof mockGenerateText> extends Promise<infer T> ? T : never);

      const provider = createAIProvider("anthropic", "standard", "test-api-key");
      await provider.generateText({ prompt: "Test" });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it("should pass system prompt when provided", async () => {
      const { generateText: mockGenerateText } = await import("ai");
      vi.mocked(mockGenerateText).mockResolvedValue({
        text: "Response",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: 20 },
      } as ReturnType<typeof mockGenerateText> extends Promise<infer T> ? T : never);

      const provider = createAIProvider("anthropic", "standard", "test-api-key");
      await provider.generateText({
        prompt: "Test",
        system: "You are a helpful assistant",
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a helpful assistant",
        })
      );
    });

    it("should wrap AI SDK errors with provider context", async () => {
      const { generateText: mockGenerateText } = await import("ai");
      vi.mocked(mockGenerateText).mockRejectedValue(new Error("API rate limit exceeded"));

      const provider = createAIProvider("anthropic", "standard", "test-api-key");

      await expect(provider.generateText({ prompt: "Test" })).rejects.toThrow(
        "[anthropic] AI generation failed: API rate limit exceeded"
      );
    });

    it("should handle non-Error objects in catch", async () => {
      const { generateText: mockGenerateText } = await import("ai");
      vi.mocked(mockGenerateText).mockRejectedValue("String error");

      const provider = createAIProvider("openai", "standard", "test-api-key");

      await expect(provider.generateText({ prompt: "Test" })).rejects.toThrow(
        "[openai] AI generation failed: String error"
      );
    });

    it("should include cause in error", async () => {
      const { generateText: mockGenerateText } = await import("ai");
      const originalError = new Error("Original error");
      vi.mocked(mockGenerateText).mockRejectedValue(originalError);

      const provider = createAIProvider("google", "standard", "test-api-key");

      try {
        await provider.generateText({ prompt: "Test" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).cause).toBe(originalError);
      }
    });
  });

  describe("Provider type safety", () => {
    it("should only accept valid provider types", () => {
      // This test verifies TypeScript type checking at runtime
      const validProviders: AIProvider[] = ["anthropic", "openai", "google"];
      for (const p of validProviders) {
        expect(() => createAIProvider(p, "standard", "key")).not.toThrow();
      }
    });

    it("should only accept valid quality modes", () => {
      const validModes: QualityMode[] = ["standard", "high"];
      for (const m of validModes) {
        expect(() => createAIProvider("anthropic", m, "key")).not.toThrow();
      }
    });
  });
});
