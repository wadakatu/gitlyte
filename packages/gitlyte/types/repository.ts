// Repository Analysis Types

export interface RepositoryAnalysis {
  basicInfo: {
    name: string;
    description: string;
    topics: string[];
    language: string;
    license: string;
  };

  codeAnalysis: {
    languages: Record<string, number>;
    hasTests: boolean;
    testCoverage?: number;
    hasDocumentation: boolean;
    codeComplexity: "simple" | "moderate" | "complex";
  };

  contentAnalysis: {
    readme: {
      exists: boolean;
      content: string;
      sections: string[];
      hasInstallation: boolean;
      hasUsage: boolean;
      hasExamples: boolean;
    };

    hasChangelog: boolean;
    hasContributing: boolean;
    hasLicense: boolean;
    hasExamples: boolean;
  };

  projectCharacteristics: {
    type: "library" | "application" | "tool" | "framework" | "game" | "website";
    industry:
      | "web"
      | "mobile"
      | "ai"
      | "data"
      | "devtools"
      | "gaming"
      | "fintech"
      | "other";
    audience: "developers" | "endusers" | "enterprise" | "researchers";
    maturity: "experimental" | "alpha" | "beta" | "stable" | "mature";
  };

  technicalStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    deployment: string[];
    testing: string[];
  };

  uniqueFeatures: string[];
  competitiveAdvantages: string[];
  suggestedUseCases: string[];
}

// Repository Data Types
export interface RepoData {
  basicInfo: {
    name: string;
    description: string;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    topics: string[];
    language: string;
    license: { key: string; name: string } | null;
    created_at: string;
    updated_at: string;
    default_branch: string;
  };
  readme: string;
  packageJson: Record<string, unknown> | null;
  languages: Record<string, number>;
  issues: Array<{
    title: string;
    number: number;
    state: string;
    user: { login: string } | null;
    created_at: string;
  }>;
  pullRequests: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
  prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
  configFile: string | null;
  codeStructure: CodeAnalysis;
  fileStructure: FileItem[];
}

// Code Analysis Types
export interface CodeAnalysis {
  files: string[];
  directories: string[];
  hasTests: boolean;
  testFiles: string[];
  hasTypeScript?: boolean;
  hasTsConfig?: boolean;
  hasPackageJson?: boolean;
  testFramework?: string;
  buildTool?: string;
  lintingSetup?: string[];
  complexity?: "simple" | "moderate" | "complex";
}

// Content Analysis Types
export interface ContentAnalysis {
  readmeStructure: {
    sections: string[];
    hasInstallation: boolean;
    hasUsage: boolean;
    hasExamples: boolean;
    hasAPI: boolean;
    codeBlocks: number;
    wordCount: number;
  };
  documentationQuality: "poor" | "basic" | "good" | "excellent";
  hasChangelog: boolean;
  hasContributing: boolean;
  hasCodeOfConduct: boolean;
  hasIssueTemplates: boolean;
  hasPRTemplates: boolean;
  hasExamplesFolder: boolean;
  hasDocsFolder: boolean;
}

// File System Types
export interface FileItem {
  name: string;
  type: "file" | "dir";
  path?: string;
  size?: number;
}

// GitHub Pages Types
export interface PagesConfiguration {
  enabled: boolean;
  url?: string;
  source?: {
    branch: string;
    path: string;
  };
  error?: string;
}

// Commit Result Types
export interface CommitResult {
  success: boolean;
  commitSha?: string;
  filesCommitted: number;
  error?: string;
}

// Similar Repository Types
export interface SimilarRepository {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  topics: string[];
  language?: string;
}

// Repository Insights Types
export interface RepositoryInsights {
  popularity: {
    stars: number;
    forks: number;
    watchers: number;
    issues: number;
  };
  activity: {
    recentCommits: number;
    recentPRs: number;
    recentIssues: number;
    lastUpdate: string;
  };
  codeQuality: {
    hasTests: boolean;
    hasCI: boolean;
    hasLinting: boolean;
    hasTypeScript: boolean;
    testCoverage?: number;
  };
  community: {
    contributors: number;
    hasContributing: boolean;
    hasCodeOfConduct: boolean;
    hasIssueTemplates: boolean;
  };
}

// Pull Request Types
export interface PullRequest {
  title: string;
  number: number;
  user: { login: string } | null;
  merged_at: string | null;
  labels: Array<{ name: string }>;
}

// Re-export GeneratedSite from generated-site.ts
export type { GeneratedSite } from "./generated-site.js";
