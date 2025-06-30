import type { Context } from "probot";
import type {
  RepoData,
  RepositoryAnalysis,
  CodeAnalysis,
} from "../types/repository.js";
import { collectRepoData } from "../utils/github.js";
import { OpenAIClient } from "../utils/openai-client.js";

export class RepositoryAnalyzer {
  public openaiClient: OpenAIClient;

  constructor() {
    this.openaiClient = new OpenAIClient();
  }

  async analyzeRepository(context: Context): Promise<RepositoryAnalysis> {
    try {
      const repoData = await collectRepoData(context);
      return this.analyzeRepositoryData(repoData);
    } catch (error: unknown) {
      throw new Error(
        `Failed to analyze repository: ${(error as Error).message}`
      );
    }
  }

  async analyzeRepositoryData(repoData: RepoData): Promise<RepositoryAnalysis> {
    try {
      // Get AI analysis
      const aiAnalysis = await this.openaiClient.analyzeRepository(repoData);

      // Build comprehensive analysis
      const analysis: RepositoryAnalysis = {
        basicInfo: this.extractBasicInfo(repoData),
        codeAnalysis: this.analyzeCodeStructure(repoData),
        contentAnalysis: this.analyzeContent(repoData),
        projectCharacteristics: {
          type: aiAnalysis.projectType,
          industry: aiAnalysis.industry,
          audience: aiAnalysis.audience,
          maturity: this.determineMaturity(repoData),
        },
        technicalStack: this.analyzeTechnicalStack(repoData),
        uniqueFeatures: aiAnalysis.features,
        competitiveAdvantages: this.extractCompetitiveAdvantages(
          repoData,
          aiAnalysis.features
        ),
        suggestedUseCases: this.generateUseCases(aiAnalysis),
      };

      return analysis;
    } catch (error: unknown) {
      throw new Error(
        `Failed to analyze repository: ${(error as Error).message}`
      );
    }
  }

  async enrichAnalysis(
    analysis: RepositoryAnalysis,
    repoData: RepoData
  ): Promise<RepositoryAnalysis> {
    // Add additional insights and recommendations
    const enrichedAnalysis = { ...analysis };

    // Enhance unique features based on code analysis
    enrichedAnalysis.uniqueFeatures = [
      ...analysis.uniqueFeatures,
      ...this.detectUniqueCodeFeatures(repoData),
    ];

    // Add competitive advantages
    enrichedAnalysis.competitiveAdvantages = [
      ...analysis.competitiveAdvantages,
      ...this.analyzeCompetitiveAdvantages(repoData, analysis),
    ];

    // Generate use cases
    enrichedAnalysis.suggestedUseCases = [
      ...analysis.suggestedUseCases,
      ...this.generateAdditionalUseCases(analysis),
    ];

    return enrichedAnalysis;
  }

  private extractBasicInfo(repoData: RepoData) {
    return {
      name: repoData.basicInfo.name,
      description: repoData.basicInfo.description || "",
      topics: repoData.basicInfo.topics,
      language: repoData.basicInfo.language || "Unknown",
      license: repoData.basicInfo.license?.key || "Unknown",
    };
  }

  private analyzeCodeStructure(repoData: RepoData) {
    const { codeStructure, languages } = repoData;

    return {
      languages,
      hasTests: codeStructure.hasTests,
      testCoverage: this.estimateTestCoverage(codeStructure),
      hasDocumentation: this.hasDocumentation(repoData),
      codeComplexity: this.assessCodeComplexity(codeStructure),
    };
  }

  private analyzeContent(repoData: RepoData) {
    const readmeContent = repoData.readme || "";

    return {
      readme: {
        exists: Boolean(readmeContent),
        content: readmeContent,
        sections: this.extractReadmeSections(readmeContent),
        hasInstallation: this.hasInstallationSection(readmeContent),
        hasUsage: this.hasUsageSection(readmeContent),
        hasExamples: this.hasExamplesSection(readmeContent),
      },
      hasChangelog: this.hasChangelog(repoData),
      hasContributing: this.hasContributing(repoData),
      hasLicense: Boolean(repoData.basicInfo.license),
      hasExamples: this.hasExamplesFolder(repoData),
    };
  }

  private determineMaturity(
    repoData: RepoData
  ): "experimental" | "alpha" | "beta" | "stable" | "mature" {
    const { stargazers_count, forks_count } = repoData.basicInfo;
    const hasTests = repoData.codeStructure.hasTests;
    const hasLicense = Boolean(repoData.basicInfo.license);

    if (
      stargazers_count > 1000 &&
      forks_count > 100 &&
      hasTests &&
      hasLicense
    ) {
      return "mature";
    }
    if (stargazers_count > 100 && forks_count > 20 && hasTests) {
      return "stable";
    }
    if (stargazers_count > 10 && hasTests) {
      return "beta";
    }
    if (stargazers_count > 1) {
      return "alpha";
    }
    return "experimental";
  }

  private analyzeTechnicalStack(repoData: RepoData) {
    const packageJson = repoData.packageJson || {};
    const dependencies = {
      ...((packageJson as Record<string, unknown>)?.dependencies as Record<
        string,
        string
      >),
      ...((packageJson as Record<string, unknown>)?.devDependencies as Record<
        string,
        string
      >),
    };

    return {
      frontend: this.detectFrontendTech(dependencies),
      backend: this.detectBackendTech(dependencies),
      database: this.detectDatabaseTech(dependencies),
      deployment: this.detectDeploymentTech(dependencies, repoData),
      testing: this.detectTestingTech(dependencies, repoData.codeStructure),
    };
  }

  private extractCompetitiveAdvantages(
    repoData: RepoData,
    _features: string[]
  ): string[] {
    const advantages = [];

    if (repoData.codeStructure.hasTests) {
      advantages.push("Well-tested codebase");
    }
    if (repoData.basicInfo.language === "TypeScript") {
      advantages.push("Type safety");
    }
    if (repoData.basicInfo.stargazers_count > 100) {
      advantages.push("Community adoption");
    }

    return advantages;
  }

  private generateUseCases(aiAnalysis: {
    projectType?: string;
    features?: string[];
  }): string[] {
    const useCases = [];

    switch (aiAnalysis.projectType) {
      case "library":
        useCases.push("Integration into existing projects");
        break;
      case "application":
        useCases.push("End-user application");
        break;
      case "tool":
        useCases.push("Developer productivity");
        break;
    }

    return useCases;
  }

  // Helper methods for enrichment
  private detectUniqueCodeFeatures(repoData: RepoData): string[] {
    const features = [];

    if (repoData.basicInfo.language === "TypeScript") {
      features.push("Type safety");
    }
    if (repoData.codeStructure.hasTests) {
      features.push("Comprehensive testing");
    }

    return features;
  }

  private analyzeCompetitiveAdvantages(
    repoData: RepoData,
    analysis: RepositoryAnalysis
  ): string[] {
    const advantages = [];

    if (
      analysis.codeAnalysis.testCoverage &&
      analysis.codeAnalysis.testCoverage > 80
    ) {
      advantages.push("High test coverage");
    }
    if (repoData.basicInfo.stargazers_count > 500) {
      advantages.push("Popular in community");
    }

    return advantages;
  }

  private generateAdditionalUseCases(analysis: RepositoryAnalysis): string[] {
    const useCases = [];

    if (analysis.projectCharacteristics.audience === "developers") {
      useCases.push("Developer tooling");
    }
    if (analysis.projectCharacteristics.industry === "web") {
      useCases.push("Web development");
    }

    return useCases;
  }

  // Utility methods
  private estimateTestCoverage(codeStructure: CodeAnalysis): number {
    if (!codeStructure.hasTests) return 0;

    const testFileCount = codeStructure.testFiles?.length || 0;
    const totalFileCount = codeStructure.files?.length || 1;

    return Math.min(85, (testFileCount / totalFileCount) * 200);
  }

  private hasDocumentation(repoData: RepoData): boolean {
    return (
      Boolean(repoData.readme) ||
      repoData.codeStructure.directories.includes("docs")
    );
  }

  private assessCodeComplexity(
    codeStructure: CodeAnalysis
  ): "simple" | "moderate" | "complex" {
    const fileCount = codeStructure.files?.length || 0;
    const dirCount = codeStructure.directories?.length || 0;

    if (fileCount > 50 || dirCount > 10) return "complex";
    if (fileCount > 20 || dirCount > 5) return "moderate";
    return "simple";
  }

  private extractReadmeSections(readme: string): string[] {
    const headers = readme.match(/^#+\s+(.+)$/gm) || [];
    return headers.map((header) => header.replace(/^#+\s+/, ""));
  }

  private hasInstallationSection(readme: string): boolean {
    return /install/i.test(readme);
  }

  private hasUsageSection(readme: string): boolean {
    return /usage|getting started|quick start/i.test(readme);
  }

  private hasExamplesSection(readme: string): boolean {
    return /example/i.test(readme);
  }

  private hasChangelog(repoData: RepoData): boolean {
    return repoData.codeStructure.files.some((file) => /changelog/i.test(file));
  }

  private hasContributing(repoData: RepoData): boolean {
    return repoData.codeStructure.files.some((file) =>
      /contributing/i.test(file)
    );
  }

  private hasExamplesFolder(repoData: RepoData): boolean {
    return repoData.codeStructure.directories.includes("examples");
  }

  private detectFrontendTech(dependencies: Record<string, string>): string[] {
    const frontend = [];
    if (dependencies.react) frontend.push("React");
    if (dependencies.vue) frontend.push("Vue");
    if (dependencies.angular) frontend.push("Angular");
    if (dependencies.svelte) frontend.push("Svelte");
    return frontend;
  }

  private detectBackendTech(dependencies: Record<string, string>): string[] {
    const backend = [];
    if (dependencies.express) backend.push("Express");
    if (dependencies.fastify) backend.push("Fastify");
    if (dependencies["@nestjs/core"]) backend.push("NestJS");
    return backend;
  }

  private detectDatabaseTech(dependencies: Record<string, string>): string[] {
    const database = [];
    if (dependencies.mongoose) database.push("MongoDB");
    if (dependencies.pg) database.push("PostgreSQL");
    if (dependencies.mysql2) database.push("MySQL");
    return database;
  }

  private detectDeploymentTech(
    dependencies: Record<string, string>,
    repoData: RepoData
  ): string[] {
    const deployment = [];
    if (repoData.packageJson?.name) deployment.push("npm");
    if (dependencies.docker) deployment.push("Docker");
    return deployment;
  }

  private detectTestingTech(
    dependencies: Record<string, string>,
    codeStructure: CodeAnalysis
  ): string[] {
    const testing = [];
    if (dependencies.vitest) testing.push("Vitest");
    if (dependencies.jest) testing.push("Jest");
    if (dependencies.mocha) testing.push("Mocha");
    if (codeStructure.hasTests && testing.length === 0) {
      testing.push("Custom testing setup");
    }
    return testing;
  }
}
