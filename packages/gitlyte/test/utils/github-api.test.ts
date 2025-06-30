import type { Context } from "probot";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeneratedSite, RepoData } from "../../types/repository.js";
import { GitHubAPI } from "../../utils/github-api.js";

// Mock Probot context
const mockContext = {
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  repo: vi.fn(() => ({ owner: "test-owner", repo: "test-repo" })),
  octokit: {
    rest: {
      repos: {
        get: vi.fn(),
        getContent: vi.fn(),
        listLanguages: vi.fn(),
        listTopics: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
        getPages: vi.fn(),
        createPagesSite: vi.fn(),
        updateInformationAboutPagesSite: vi.fn(),
      },
      issues: {
        listForRepo: vi.fn(),
        createComment: vi.fn(),
      },
      pulls: {
        listFiles: vi.fn(),
        get: vi.fn(),
      },
      git: {
        createTree: vi.fn(),
        createCommit: vi.fn(),
        updateRef: vi.fn(),
        getRef: vi.fn(),
      },
      search: {
        repos: vi.fn(),
      },
    },
  },
  payload: {
    repository: {
      id: 123456,
      name: "test-repo",
      full_name: "test-owner/test-repo",
      description: "A test repository",
      html_url: "https://github.com/test-owner/test-repo",
      default_branch: "main",
      language: "TypeScript",
      topics: ["typescript", "testing"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-12-29T00:00:00Z",
      stargazers_count: 100,
      forks_count: 25,
      watchers_count: 50,
      open_issues_count: 5,
    },
  },
} as unknown as Context<"pull_request">;

const mockGeneratedSite: GeneratedSite = {
  pages: {
    "index.html": "<html><body><h1>Test Site</h1></body></html>",
    "docs.html": "<html><body><h1>Documentation</h1></body></html>",
  },
  assets: {
    "style.css": "body { font-family: Arial; }",
    "navigation.js": 'console.log("Navigation loaded");',
  },
  meta: {
    sitemap: '<?xml version="1.0"?><urlset></urlset>',
    robotsTxt: "User-agent: *\nAllow: /",
  },
};

describe("GitHub API Wrapper", () => {
  let githubAPI: GitHubAPI;

  beforeEach(() => {
    githubAPI = new GitHubAPI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("collectRepositoryData", () => {
    it("should collect comprehensive repository data", async () => {
      // Mock GitHub API responses
      vi.mocked(mockContext.octokit.rest.repos.get).mockResolvedValue({
        data: mockContext.payload.repository,
      } as never);

      vi.mocked(mockContext.octokit.rest.repos.listLanguages).mockResolvedValue(
        {
          data: { TypeScript: 15000, JavaScript: 5000 },
        } as never
      );

      vi.mocked(mockContext.octokit.rest.repos.getContent).mockResolvedValue({
        data: {
          type: "file",
          content: Buffer.from("# Test Repository\nThis is a test.").toString(
            "base64"
          ),
        },
      } as never);

      vi.mocked(mockContext.octokit.rest.issues.listForRepo).mockResolvedValue({
        data: [
          { number: 1, title: "Test Issue", state: "open", labels: [] },
          {
            number: 2,
            title: "Bug Report",
            state: "closed",
            labels: [{ name: "bug" }],
          },
        ],
      } as never);

      const result = await githubAPI.collectRepositoryData(mockContext);

      expect(result).toBeDefined();
      expect(result.basicInfo.name).toBe("test-repo");
      expect(result.basicInfo.description).toBe("A test repository");
      expect(result.languages).toEqual({ TypeScript: 15000, JavaScript: 5000 });
      expect(result.readme).toContain("Test Repository");
      expect(result.issues).toHaveLength(2);
    });

    it("should handle missing README gracefully", async () => {
      vi.mocked(mockContext.octokit.rest.repos.get).mockResolvedValue({
        data: mockContext.payload.repository,
      } as never);

      vi.mocked(mockContext.octokit.rest.repos.listLanguages).mockResolvedValue(
        {
          data: { TypeScript: 15000 },
        } as never
      );

      vi.mocked(mockContext.octokit.rest.repos.getContent).mockRejectedValue(
        new Error("Not found")
      );

      vi.mocked(mockContext.octokit.rest.issues.listForRepo).mockResolvedValue({
        data: [],
      } as never);

      const result = await githubAPI.collectRepositoryData(mockContext);

      expect(result.readme).toBe("");
      expect(result.basicInfo.name).toBe("test-repo");
    });

    it("should collect file structure information", async () => {
      vi.mocked(mockContext.octokit.rest.repos.get).mockResolvedValue({
        data: mockContext.payload.repository,
      } as never);

      vi.mocked(mockContext.octokit.rest.repos.listLanguages).mockResolvedValue(
        {
          data: { TypeScript: 15000 },
        } as never
      );

      // Mock directory listing (for file structure)
      vi.mocked(mockContext.octokit.rest.repos.getContent).mockImplementation(
        (params?: {
          path?: string;
          owner?: string;
          repo?: string;
          ref?: string;
        }) => {
          if (params?.path === "") {
            // Root directory listing
            return Promise.resolve({
              data: [
                { name: "src", type: "dir", path: "src" },
                { name: "test", type: "dir", path: "test" },
                { name: "package.json", type: "file", path: "package.json" },
                { name: "README.md", type: "file", path: "README.md" },
              ],
            } as never);
          }
          if (params?.path === "README.md") {
            // README content
            return Promise.resolve({
              data: {
                type: "file",
                content: Buffer.from("# Test").toString("base64"),
              },
            } as never);
          }
          return Promise.reject(new Error("File not found"));
        }
      );

      vi.mocked(mockContext.octokit.rest.issues.listForRepo).mockResolvedValue({
        data: [],
      } as never);

      const result = await githubAPI.collectRepositoryData(mockContext);

      expect(result.fileStructure).toBeDefined();
      expect(result.fileStructure.some((f) => f.name === "src")).toBe(true);
      expect(result.fileStructure.some((f) => f.name === "package.json")).toBe(
        true
      );
    });
  });

  describe("enableGitHubPages", () => {
    it("should enable GitHub Pages when not already enabled", async () => {
      vi.mocked(mockContext.octokit.rest.repos.getPages).mockRejectedValue(
        new Error("Not found")
      );

      vi.mocked(
        mockContext.octokit.rest.repos.createPagesSite
      ).mockResolvedValue({
        data: { url: "https://test-owner.github.io/test-repo" },
      } as never);

      const result = await githubAPI.enableGitHubPages(mockContext);

      expect(
        mockContext.octokit.rest.repos.createPagesSite
      ).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        source: {
          branch: "main",
          path: "/docs",
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.url).toBe("https://test-owner.github.io/test-repo");
    });

    it("should update existing GitHub Pages configuration", async () => {
      vi.mocked(mockContext.octokit.rest.repos.getPages).mockResolvedValue({
        data: {
          url: "https://test-owner.github.io/test-repo",
          source: { branch: "gh-pages", path: "/" },
        },
      } as never);

      vi.mocked(
        mockContext.octokit.rest.repos.updateInformationAboutPagesSite
      ).mockResolvedValue({
        data: { html_url: "https://test-owner.github.io/test-repo" },
      } as never);

      const result = await githubAPI.enableGitHubPages(mockContext);

      expect(
        mockContext.octokit.rest.repos.updateInformationAboutPagesSite
      ).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        source: {
          branch: "main",
          path: "/docs",
        },
      });

      expect(result.enabled).toBe(true);
      expect(result.url).toBe("https://test-owner.github.io/test-repo");
    });

    it("should handle Pages enablement errors gracefully", async () => {
      vi.mocked(mockContext.octokit.rest.repos.getPages).mockRejectedValue(
        new Error("Not found")
      );

      vi.mocked(
        mockContext.octokit.rest.repos.createPagesSite
      ).mockRejectedValue(new Error("Pages not available for this repository"));

      const result = await githubAPI.enableGitHubPages(mockContext);

      expect(result.enabled).toBe(false);
      expect(result.error).toContain("Pages not available");
    });
  });

  describe("commitGeneratedSite", () => {
    it("should commit generated site files to docs directory", async () => {
      // Mock getting current ref
      vi.mocked(mockContext.octokit.rest.git.getRef).mockResolvedValue({
        data: { object: { sha: "abc123" } },
      } as never);

      // Mock tree creation
      vi.mocked(mockContext.octokit.rest.git.createTree).mockResolvedValue({
        data: { sha: "tree456" },
      } as never);

      // Mock commit creation
      vi.mocked(mockContext.octokit.rest.git.createCommit).mockResolvedValue({
        data: { sha: "commit789" },
      } as never);

      // Mock ref update
      vi.mocked(mockContext.octokit.rest.git.updateRef).mockResolvedValue({
        data: { object: { sha: "commit789" } },
      } as never);

      const result = await githubAPI.commitGeneratedSite(
        mockContext,
        mockGeneratedSite
      );

      expect(result.success).toBe(true);
      expect(result.commitSha).toBe("commit789");
      expect(result.filesCommitted).toBe(5); // 2 pages + 2 assets + 1 meta

      // Verify tree creation with correct file structure
      expect(mockContext.octokit.rest.git.createTree).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        tree: expect.arrayContaining([
          expect.objectContaining({
            path: "docs/index.html",
            content: mockGeneratedSite.pages["index.html"],
          }),
          expect.objectContaining({
            path: "docs/style.css",
            content: mockGeneratedSite.assets["style.css"],
          }),
        ]),
      });
    });

    it("should handle commit errors gracefully", async () => {
      vi.mocked(mockContext.octokit.rest.git.getRef).mockRejectedValue(
        new Error("Reference not found")
      );

      const result = await githubAPI.commitGeneratedSite(
        mockContext,
        mockGeneratedSite
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Reference not found");
      expect(result.filesCommitted).toBe(0);
    });

    it("should create proper commit message with generation details", async () => {
      vi.mocked(mockContext.octokit.rest.git.getRef).mockResolvedValue({
        data: { object: { sha: "abc123" } },
      } as never);

      vi.mocked(mockContext.octokit.rest.git.createTree).mockResolvedValue({
        data: { sha: "tree456" },
      } as never);

      vi.mocked(mockContext.octokit.rest.git.createCommit).mockResolvedValue({
        data: { sha: "commit789" },
      } as never);

      vi.mocked(mockContext.octokit.rest.git.updateRef).mockResolvedValue({
        data: { object: { sha: "commit789" } },
      } as never);

      await githubAPI.commitGeneratedSite(mockContext, mockGeneratedSite);

      expect(mockContext.octokit.rest.git.createCommit).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        message: expect.stringContaining("🤖 GitLyte: Generate static site"),
        tree: "tree456",
        parents: ["abc123"],
      });
    });
  });

  describe("searchSimilarRepositories", () => {
    it("should find repositories with similar topics and languages", async () => {
      const repoData = {
        basicInfo: {
          name: "test-repo",
          description: "A test repository",
          html_url: "https://github.com/test/test-repo",
          stargazers_count: 100,
          forks_count: 20,
          topics: ["typescript", "testing"],
          language: "TypeScript",
          license: { key: "mit", name: "MIT License" },
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-12-01T00:00:00Z",
          default_branch: "main",
        },
        readme: "# Test Repo",
        packageJson: null,
        languages: { TypeScript: 15000, JavaScript: 5000 },
        issues: [],
        pullRequests: [],
        prs: [],
        configFile: null,
        codeStructure: {
          files: [],
          directories: [],
          hasTests: false,
          testFiles: [],
        },
        fileStructure: [],
      } as RepoData;

      vi.mocked(mockContext.octokit.rest.search.repos).mockResolvedValue({
        data: {
          items: [
            {
              name: "similar-repo-1",
              full_name: "user/similar-repo-1",
              description: "Similar TypeScript project",
              stargazers_count: 200,
              topics: ["typescript", "testing", "library"],
            },
            {
              name: "similar-repo-2",
              full_name: "org/similar-repo-2",
              description: "Another TypeScript testing tool",
              stargazers_count: 150,
              topics: ["typescript", "test-framework"],
            },
          ],
        },
      } as never);

      const result = await githubAPI.searchSimilarRepositories(
        mockContext,
        repoData
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("similar-repo-1");
      expect(result[1].name).toBe("similar-repo-2");

      // Verify search query construction
      expect(mockContext.octokit.rest.search.repos).toHaveBeenCalledWith({
        q: expect.stringContaining(
          "language:TypeScript topic:typescript topic:testing"
        ),
        sort: "stars",
        order: "desc",
        per_page: 10,
      });
    });

    it("should handle search API errors gracefully", async () => {
      const repoData: Partial<RepoData> = {
        basicInfo: { topics: ["typescript"], language: "TypeScript" },
      } as RepoData;

      vi.mocked(mockContext.octokit.rest.search.repos).mockRejectedValue(
        new Error("API rate limit exceeded")
      );

      const result = await githubAPI.searchSimilarRepositories(
        mockContext,
        repoData
      );

      expect(result).toEqual([]);
      expect(mockContext.log.warn).toHaveBeenCalledWith(
        "Failed to search for similar repositories:",
        expect.any(Error)
      );
    });
  });

  describe("getRepositoryInsights", () => {
    it("should collect repository analytics and insights", async () => {
      // Mock various API calls for insights
      vi.mocked(mockContext.octokit.rest.repos.get).mockResolvedValue({
        data: {
          ...mockContext.payload.repository,
          stargazers_count: 100,
          forks_count: 25,
          watchers_count: 50,
        },
      } as never);

      vi.mocked(mockContext.octokit.rest.pulls.listFiles).mockResolvedValue({
        data: [
          { filename: "src/main.ts", additions: 50, deletions: 10 },
          { filename: "test/main.test.ts", additions: 20, deletions: 5 },
        ],
      } as never);

      const result = await githubAPI.getRepositoryInsights(mockContext);

      expect(result.popularity.stars).toBe(100);
      expect(result.popularity.forks).toBe(25);
      expect(result.popularity.watchers).toBe(50);
      expect(result.activity).toBeDefined();
      expect(result.codeQuality).toBeDefined();
    });
  });
});
