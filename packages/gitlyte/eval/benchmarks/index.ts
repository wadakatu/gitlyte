/**
 * Benchmark Repository Definitions
 *
 * Sample repositories used for evaluating GitLyte's generation quality.
 * Each benchmark represents a different type of project.
 */

export interface BenchmarkRepository {
  id: string;
  name: string;
  description: string;
  type: "cli" | "library" | "webapp" | "docs" | "self";
  github: {
    owner: string;
    repo: string;
  };
  expectedCharacteristics: {
    projectType: string;
    audience: string;
    designStyle: string;
  };
}

/**
 * GitLyte's own repository - primary benchmark
 */
export const GITLYTE_BENCHMARK: BenchmarkRepository = {
  id: "gitlyte",
  name: "GitLyte",
  description: "AI-powered website generator for GitHub repositories",
  type: "self",
  github: {
    owner: "wadakatu",
    repo: "gitlyte",
  },
  expectedCharacteristics: {
    projectType: "tool",
    audience: "developers",
    designStyle: "modern, professional",
  },
};

/**
 * Sample benchmark repositories for diverse testing
 */
export const SAMPLE_BENCHMARKS: BenchmarkRepository[] = [
  {
    id: "cli-tool",
    name: "Sample CLI Tool",
    description: "A command-line interface tool for developers",
    type: "cli",
    github: {
      owner: "example",
      repo: "cli-tool",
    },
    expectedCharacteristics: {
      projectType: "tool",
      audience: "developers",
      designStyle: "minimal, technical",
    },
  },
  {
    id: "js-library",
    name: "Sample JS Library",
    description: "A JavaScript utility library",
    type: "library",
    github: {
      owner: "example",
      repo: "js-library",
    },
    expectedCharacteristics: {
      projectType: "library",
      audience: "developers",
      designStyle: "clean, documentation-focused",
    },
  },
  {
    id: "webapp",
    name: "Sample Web App",
    description: "A modern web application",
    type: "webapp",
    github: {
      owner: "example",
      repo: "webapp",
    },
    expectedCharacteristics: {
      projectType: "application",
      audience: "end-users",
      designStyle: "modern, user-friendly",
    },
  },
];

/**
 * All benchmark repositories
 */
export const ALL_BENCHMARKS: BenchmarkRepository[] = [
  GITLYTE_BENCHMARK,
  ...SAMPLE_BENCHMARKS,
];

/**
 * Get benchmark by ID
 */
export function getBenchmark(id: string): BenchmarkRepository | undefined {
  return ALL_BENCHMARKS.find((b) => b.id === id);
}

/**
 * Mock repository data for testing (when actual GitHub API is not available)
 */
export interface MockRepositoryData {
  name: string;
  description: string;
  language: string;
  topics: string[];
  readme: string;
  stars: number;
  forks: number;
}

export const MOCK_REPOSITORY_DATA: Record<string, MockRepositoryData> = {
  gitlyte: {
    name: "GitLyte",
    description: "AI-powered website generator for GitHub repositories",
    language: "TypeScript",
    topics: ["github-app", "ai", "website-generator", "probot"],
    readme: `# GitLyte

Instantly turn your GitHub repo into a live website with AI-powered design - no code needed.

## Features
- AI-Powered Design
- Static HTML Sites
- Unique Styling
- Responsive Design
- Auto-Deploy`,
    stars: 100,
    forks: 10,
  },
  "cli-tool": {
    name: "FastCLI",
    description: "A blazing fast CLI tool for file operations",
    language: "Rust",
    topics: ["cli", "rust", "performance", "files"],
    readme: `# FastCLI

Fast file operations from the command line.

## Features
- Copy files 10x faster
- Parallel processing
- Progress bars`,
    stars: 500,
    forks: 50,
  },
  "js-library": {
    name: "QuickUtils",
    description: "Lightweight JavaScript utility functions",
    language: "JavaScript",
    topics: ["javascript", "utilities", "npm", "lightweight"],
    readme: `# QuickUtils

A collection of lightweight utility functions for JavaScript.

## Installation
\`\`\`bash
npm install quickutils
\`\`\`

## Usage
\`\`\`js
import { debounce, throttle } from 'quickutils';
\`\`\``,
    stars: 1000,
    forks: 100,
  },
  webapp: {
    name: "TaskFlow",
    description: "Modern task management application",
    language: "TypeScript",
    topics: ["react", "task-management", "productivity", "webapp"],
    readme: `# TaskFlow

A modern task management app for teams.

## Features
- Kanban boards
- Team collaboration
- Real-time updates
- Mobile friendly`,
    stars: 2000,
    forks: 200,
  },
};

/**
 * Get mock data for a benchmark
 */
export function getMockData(
  benchmarkId: string
): MockRepositoryData | undefined {
  return MOCK_REPOSITORY_DATA[benchmarkId];
}
