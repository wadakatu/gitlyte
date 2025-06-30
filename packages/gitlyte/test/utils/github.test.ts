import { beforeEach, describe, expect, it, vi } from "vitest";
import { collectRepoData } from "../../utils/github.js";

// Context mockを作成
const createMockContext = (overrides = {}) => {
  const defaultContext = {
    repo: () => ({ owner: "test-owner", repo: "test-repo" }),
    octokit: {
      repos: {
        get: vi.fn(),
        getReadme: vi.fn(),
      },
      pulls: {
        list: vi.fn(),
      },
      issues: {
        listForRepo: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
  return { ...defaultContext, ...overrides };
};

describe("GitHub Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("collectRepoData", () => {
    it("should collect repository data successfully", async () => {
      const mockRepo = {
        data: {
          name: "test-repo",
          description: "A test repository",
          html_url: "https://github.com/test-owner/test-repo",
          stargazers_count: 10,
          forks_count: 5,
          topics: [],
          language: "TypeScript",
          license: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          default_branch: "main",
        },
      };

      const mockPRs = {
        data: [
          {
            title: "Test PR",
            user: { login: "testuser" },
            merged_at: "2023-01-01T00:00:00Z",
          },
        ],
      };

      const mockIssues = {
        data: [
          {
            title: "Test Issue",
            number: 1,
            state: "open",
            user: { login: "testuser" },
            created_at: "2023-01-01T00:00:00Z",
          },
        ],
      };

      const mockReadme = {
        data: {
          content: Buffer.from("# Test Repo\nThis is a test").toString(
            "base64"
          ),
        },
      };

      const ctx = createMockContext();
      ctx.octokit.repos.get.mockResolvedValue(mockRepo);
      ctx.octokit.pulls.list.mockResolvedValue(mockPRs);
      ctx.octokit.issues.listForRepo.mockResolvedValue(mockIssues);
      ctx.octokit.repos.getReadme.mockResolvedValue(mockReadme);

      const result = await collectRepoData(
        ctx as unknown as Parameters<typeof collectRepoData>[0]
      );

      expect(result).toEqual({
        basicInfo: {
          name: mockRepo.data.name,
          description: mockRepo.data.description,
          html_url: mockRepo.data.html_url,
          stargazers_count: mockRepo.data.stargazers_count,
          forks_count: mockRepo.data.forks_count,
          topics: mockRepo.data.topics || [],
          language: mockRepo.data.language || "Unknown",
          license: mockRepo.data.license,
          created_at: mockRepo.data.created_at,
          updated_at: mockRepo.data.updated_at,
          default_branch: mockRepo.data.default_branch,
        },
        readme: "# Test Repo\nThis is a test",
        packageJson: null,
        languages: {},
        issues: mockIssues.data,
        pullRequests: mockPRs.data.filter((pr) => pr.merged_at),
        prs: mockPRs.data.filter((pr) => pr.merged_at),
        configFile: null,
        codeStructure: {
          files: [],
          directories: [],
          hasTests: false,
          testFiles: [],
        },
        fileStructure: [],
      });

      expect(ctx.octokit.repos.get).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
      });
    });

    it("should handle API errors gracefully", async () => {
      const mockRepo = {
        data: {
          name: "test-repo",
          description: "A test repository",
          html_url: "https://github.com/test-owner/test-repo",
          stargazers_count: 10,
          forks_count: 5,
          topics: [],
          language: "TypeScript",
          license: null,
          created_at: "2023-01-01T00:00:00Z",
          updated_at: "2023-01-01T00:00:00Z",
          default_branch: "main",
        },
      };

      const ctx = createMockContext();
      ctx.octokit.repos.get.mockResolvedValue(mockRepo);
      ctx.octokit.pulls.list.mockRejectedValue(new Error("API Error"));
      ctx.octokit.issues.listForRepo.mockRejectedValue(new Error("API Error"));
      ctx.octokit.repos.getReadme.mockRejectedValue(new Error("API Error"));

      const result = await collectRepoData(
        ctx as unknown as Parameters<typeof collectRepoData>[0]
      );

      expect(result).toEqual({
        basicInfo: {
          name: mockRepo.data.name,
          description: mockRepo.data.description,
          html_url: mockRepo.data.html_url,
          stargazers_count: mockRepo.data.stargazers_count,
          forks_count: mockRepo.data.forks_count,
          topics: mockRepo.data.topics || [],
          language: mockRepo.data.language || "Unknown",
          license: mockRepo.data.license,
          created_at: mockRepo.data.created_at,
          updated_at: mockRepo.data.updated_at,
          default_branch: mockRepo.data.default_branch,
        },
        readme: "",
        packageJson: null,
        languages: {},
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
      });

      expect(ctx.log.warn).toHaveBeenCalledTimes(3);
    });

    it("should filter merged PRs only", async () => {
      const mockRepo = {
        data: {
          name: "test-repo",
          description: "A test repository",
          stargazers_count: 10,
          forks_count: 5,
        },
      };

      const mockPRs = {
        data: [
          {
            title: "Merged PR",
            user: { login: "testuser" },
            merged_at: "2023-01-01T00:00:00Z",
          },
          {
            title: "Unmerged PR",
            user: { login: "testuser" },
            merged_at: null,
          },
        ],
      };

      const ctx = createMockContext();
      ctx.octokit.repos.get.mockResolvedValue(mockRepo);
      ctx.octokit.pulls.list.mockResolvedValue(mockPRs);
      ctx.octokit.issues.listForRepo.mockResolvedValue({ data: [] });
      ctx.octokit.repos.getReadme.mockResolvedValue({
        data: { content: Buffer.from("readme").toString("base64") },
      });

      const result = await collectRepoData(
        ctx as unknown as Parameters<typeof collectRepoData>[0]
      );

      expect(result.prs).toHaveLength(1);
      expect(result.prs[0].title).toBe("Merged PR");
    });
  });
});
