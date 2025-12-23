import { describe, expect, it, afterEach } from "vitest";
import {
  generateLighthouseReport,
  createLighthouseConfig,
  type LighthouseResult,
} from "../../eval/lighthouse.js";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

describe("lighthouse", () => {
  describe("generateLighthouseReport", () => {
    it("should generate markdown report from single result", () => {
      const results: LighthouseResult[] = [
        {
          url: "/test/index.html",
          scores: {
            performance: 95,
            accessibility: 100,
            bestPractices: 90,
            seo: 85,
          },
          passed: true,
        },
      ];

      const report = generateLighthouseReport(results);

      expect(report).toContain("# Lighthouse Evaluation Report");
      expect(report).toContain("/test/index.html");
      expect(report).toContain("Status: **PASS**");
      expect(report).toContain("| Performance | 95 |");
      expect(report).toContain("| Accessibility | 100 |");
      expect(report).toContain("| Best Practices | 90 |");
      expect(report).toContain("| SEO | 85 |");
    });

    it("should generate report with FAIL status when not passed", () => {
      const results: LighthouseResult[] = [
        {
          url: "/test/index.html",
          scores: {
            performance: 50,
            accessibility: 70,
            bestPractices: 60,
            seo: 55,
          },
          passed: false,
        },
      ];

      const report = generateLighthouseReport(results);

      expect(report).toContain("Status: **FAIL**");
    });

    it("should handle multiple results", () => {
      const results: LighthouseResult[] = [
        {
          url: "/page1.html",
          scores: {
            performance: 90,
            accessibility: 95,
            bestPractices: 85,
            seo: 90,
          },
          passed: true,
        },
        {
          url: "/page2.html",
          scores: {
            performance: 80,
            accessibility: 85,
            bestPractices: 80,
            seo: 80,
          },
          passed: true,
        },
      ];

      const report = generateLighthouseReport(results);

      expect(report).toContain("/page1.html");
      expect(report).toContain("/page2.html");
      expect(report.match(/Status: \*\*PASS\*\*/g)).toHaveLength(2);
    });

    it("should generate empty report for no results", () => {
      const results: LighthouseResult[] = [];

      const report = generateLighthouseReport(results);

      expect(report).toContain("# Lighthouse Evaluation Report");
      expect(report).not.toContain("Status:");
    });
  });

  describe("createLighthouseConfig", () => {
    const testOutputDir = join(process.cwd(), "test-output-dir");
    const configPath = join(process.cwd(), "lighthouserc.json");

    afterEach(() => {
      // Clean up generated config file
      if (existsSync(configPath)) {
        rmSync(configPath);
      }
    });

    it("should create valid JSON config file", () => {
      createLighthouseConfig(testOutputDir);

      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.ci).toBeDefined();
      expect(config.ci.collect).toBeDefined();
      expect(config.ci.assert).toBeDefined();
      expect(config.ci.upload).toBeDefined();
    });

    it("should set staticDistDir from argument", () => {
      createLighthouseConfig(testOutputDir);

      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.ci.collect.staticDistDir).toBe(testOutputDir);
    });

    it("should configure default assertions", () => {
      createLighthouseConfig(testOutputDir);

      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.ci.assert.assertions["categories:performance"]).toEqual([
        "warn",
        { minScore: 0.8 },
      ]);
      expect(config.ci.assert.assertions["categories:accessibility"]).toEqual([
        "error",
        { minScore: 0.9 },
      ]);
      expect(config.ci.assert.assertions["categories:best-practices"]).toEqual([
        "warn",
        { minScore: 0.8 },
      ]);
      expect(config.ci.assert.assertions["categories:seo"]).toEqual([
        "warn",
        { minScore: 0.8 },
      ]);
    });

    it("should configure temporary public storage for upload", () => {
      createLighthouseConfig(testOutputDir);

      const content = readFileSync(configPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.ci.upload.target).toBe("temporary-public-storage");
    });
  });

  // Note: runLighthouse is not tested directly as it requires actual Lighthouse CLI execution
  // Integration tests would be added in a separate file that runs in CI environment
});
