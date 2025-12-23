import { describe, expect, it } from "vitest";
import {
  GITLYTE_BENCHMARK,
  SAMPLE_BENCHMARKS,
  ALL_BENCHMARKS,
  getBenchmark,
  getMockData,
  MOCK_REPOSITORY_DATA,
} from "../../eval/benchmarks/index.js";

describe("benchmarks", () => {
  describe("GITLYTE_BENCHMARK", () => {
    it("should have correct id", () => {
      expect(GITLYTE_BENCHMARK.id).toBe("gitlyte");
    });

    it("should have correct type", () => {
      expect(GITLYTE_BENCHMARK.type).toBe("self");
    });

    it("should have github info", () => {
      expect(GITLYTE_BENCHMARK.github.owner).toBe("wadakatu");
      expect(GITLYTE_BENCHMARK.github.repo).toBe("gitlyte");
    });

    it("should have expected characteristics", () => {
      expect(GITLYTE_BENCHMARK.expectedCharacteristics.projectType).toBe(
        "tool"
      );
      expect(GITLYTE_BENCHMARK.expectedCharacteristics.audience).toBe(
        "developers"
      );
    });
  });

  describe("SAMPLE_BENCHMARKS", () => {
    it("should have at least 3 sample benchmarks", () => {
      expect(SAMPLE_BENCHMARKS.length).toBeGreaterThanOrEqual(3);
    });

    it("should have cli-tool benchmark", () => {
      const cliTool = SAMPLE_BENCHMARKS.find((b) => b.id === "cli-tool");
      expect(cliTool).toBeDefined();
      expect(cliTool?.type).toBe("cli");
    });

    it("should have js-library benchmark", () => {
      const jsLibrary = SAMPLE_BENCHMARKS.find((b) => b.id === "js-library");
      expect(jsLibrary).toBeDefined();
      expect(jsLibrary?.type).toBe("library");
    });

    it("should have webapp benchmark", () => {
      const webapp = SAMPLE_BENCHMARKS.find((b) => b.id === "webapp");
      expect(webapp).toBeDefined();
      expect(webapp?.type).toBe("webapp");
    });

    it("should all have required fields", () => {
      for (const benchmark of SAMPLE_BENCHMARKS) {
        expect(benchmark.id).toBeTruthy();
        expect(benchmark.name).toBeTruthy();
        expect(benchmark.description).toBeTruthy();
        expect(benchmark.type).toBeTruthy();
        expect(benchmark.github.owner).toBeTruthy();
        expect(benchmark.github.repo).toBeTruthy();
        expect(benchmark.expectedCharacteristics.projectType).toBeTruthy();
        expect(benchmark.expectedCharacteristics.audience).toBeTruthy();
        expect(benchmark.expectedCharacteristics.designStyle).toBeTruthy();
      }
    });
  });

  describe("ALL_BENCHMARKS", () => {
    it("should include gitlyte benchmark first", () => {
      expect(ALL_BENCHMARKS[0]).toBe(GITLYTE_BENCHMARK);
    });

    it("should include all sample benchmarks", () => {
      for (const sample of SAMPLE_BENCHMARKS) {
        expect(ALL_BENCHMARKS).toContainEqual(sample);
      }
    });

    it("should have correct total count", () => {
      expect(ALL_BENCHMARKS.length).toBe(1 + SAMPLE_BENCHMARKS.length);
    });
  });

  describe("getBenchmark", () => {
    it("should return benchmark by id", () => {
      const benchmark = getBenchmark("gitlyte");
      expect(benchmark).toBe(GITLYTE_BENCHMARK);
    });

    it("should return sample benchmark by id", () => {
      const benchmark = getBenchmark("cli-tool");
      expect(benchmark?.type).toBe("cli");
    });

    it("should return undefined for unknown id", () => {
      const benchmark = getBenchmark("unknown-id");
      expect(benchmark).toBeUndefined();
    });
  });

  describe("MOCK_REPOSITORY_DATA", () => {
    it("should have mock data for gitlyte", () => {
      const mockData = MOCK_REPOSITORY_DATA["gitlyte"];
      expect(mockData).toBeDefined();
      expect(mockData.name).toBe("GitLyte");
      expect(mockData.language).toBe("TypeScript");
    });

    it("should have mock data for cli-tool", () => {
      const mockData = MOCK_REPOSITORY_DATA["cli-tool"];
      expect(mockData).toBeDefined();
      expect(mockData.language).toBe("Rust");
    });

    it("should have mock data for js-library", () => {
      const mockData = MOCK_REPOSITORY_DATA["js-library"];
      expect(mockData).toBeDefined();
      expect(mockData.language).toBe("JavaScript");
    });

    it("should have mock data for webapp", () => {
      const mockData = MOCK_REPOSITORY_DATA["webapp"];
      expect(mockData).toBeDefined();
      expect(mockData.language).toBe("TypeScript");
    });

    it("should have all required fields in mock data", () => {
      for (const [, mockData] of Object.entries(MOCK_REPOSITORY_DATA)) {
        expect(mockData.name).toBeTruthy();
        expect(mockData.description).toBeTruthy();
        expect(mockData.language).toBeTruthy();
        expect(Array.isArray(mockData.topics)).toBe(true);
        expect(mockData.readme).toBeTruthy();
        expect(typeof mockData.stars).toBe("number");
        expect(typeof mockData.forks).toBe("number");
      }
    });
  });

  describe("getMockData", () => {
    it("should return mock data for valid benchmark id", () => {
      const mockData = getMockData("gitlyte");
      expect(mockData).toBeDefined();
      expect(mockData?.name).toBe("GitLyte");
    });

    it("should return undefined for invalid benchmark id", () => {
      const mockData = getMockData("invalid-id");
      expect(mockData).toBeUndefined();
    });

    it("should return correct data for each benchmark", () => {
      for (const benchmark of ALL_BENCHMARKS) {
        const mockData = getMockData(benchmark.id);
        expect(mockData).toBeDefined();
      }
    });
  });
});
