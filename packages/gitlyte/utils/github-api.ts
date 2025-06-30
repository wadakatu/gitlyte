import type { Context } from "probot";
import type {
  CodeAnalysis,
  CommitResult,
  FileItem,
  GeneratedSite,
  PagesConfiguration,
  RepoData,
  RepositoryInsights,
  SimilarRepository,
} from "../types/repository.js";

export class GitHubAPI {
  /**
   * Collect comprehensive repository data from GitHub API
   */
  async collectRepositoryData(context: Context): Promise<RepoData> {
    const { owner, repo } = context.repo();

    try {
      // Get basic repository information
      const repoResponse = await context.octokit.rest.repos.get({
        owner,
        repo,
      });

      const basicInfo = {
        name: repoResponse.data.name,
        description: repoResponse.data.description || "",
        html_url: repoResponse.data.html_url,
        stargazers_count: repoResponse.data.stargazers_count,
        forks_count: repoResponse.data.forks_count,
        topics: repoResponse.data.topics || [],
        language: repoResponse.data.language || "",
        license: repoResponse.data.license
          ? {
              key: repoResponse.data.license.key,
              name: repoResponse.data.license.name,
            }
          : null,
        created_at: repoResponse.data.created_at,
        updated_at: repoResponse.data.updated_at,
        default_branch: repoResponse.data.default_branch,
      };

      // Get language breakdown
      const languages = await this.getLanguages(context);

      // Get README content
      const readme = await this.getReadmeContent(context);

      // Get file structure
      const fileStructure = await this.getFileStructure(context);

      // Get package.json if it exists
      const packageJson = await this.getPackageJson(context);

      // Get issues
      const issues = await this.getIssues(context);

      // Get pull requests
      const pullRequests = await this.getPullRequests(context);

      // Get configuration file
      const configFile = await this.getConfigFile(context);

      // Analyze code structure
      const codeStructure = await this.analyzeCodeStructure(
        context,
        fileStructure
      );

      return {
        basicInfo,
        readme,
        packageJson,
        languages,
        issues,
        pullRequests,
        prs: pullRequests,
        configFile,
        codeStructure: codeStructure as unknown as CodeAnalysis,
        fileStructure,
      };
    } catch (error) {
      context.log.error("Failed to collect repository data:", error);
      throw new Error(
        `Repository data collection failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Enable GitHub Pages for the repository
   */
  async enableGitHubPages(context: Context): Promise<PagesConfiguration> {
    const { owner, repo } = context.repo();

    try {
      // Check if Pages is already enabled
      try {
        await context.octokit.rest.repos.getPages({
          owner,
          repo,
        });

        // Pages exists, update to use docs folder
        const updateResult =
          await context.octokit.rest.repos.updateInformationAboutPagesSite({
            owner,
            repo,
            source: {
              branch: "main",
              path: "/docs",
            },
          });

        return {
          enabled: true,
          url:
            ((updateResult.data as Record<string, unknown>)
              .html_url as string) || "",
          source: {
            branch: "main",
            path: "/docs",
          },
        };
      } catch (_pagesError) {
        // Pages doesn't exist, create it
        const createResult = await context.octokit.rest.repos.createPagesSite({
          owner,
          repo,
          source: {
            branch: "main",
            path: "/docs",
          },
        });

        return {
          enabled: true,
          url: createResult.data.url,
          source: {
            branch: "main",
            path: "/docs",
          },
        };
      }
    } catch (error) {
      context.log.error("Failed to enable GitHub Pages:", error);
      return {
        enabled: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Commit generated site files to the repository
   */
  async commitGeneratedSite(
    context: Context,
    site: GeneratedSite
  ): Promise<CommitResult> {
    const { owner, repo } = context.repo();

    try {
      // Get current commit SHA
      const refResponse = await context.octokit.rest.git.getRef({
        owner,
        repo,
        ref: "heads/main",
      });

      const currentSha = refResponse.data.object.sha;

      // Create tree with all site files
      const treeItems = this.createTreeItems(site);

      const treeResponse = await context.octokit.rest.git.createTree({
        owner,
        repo,
        tree: treeItems,
      });

      // Create commit
      const commitMessage = this.createCommitMessage(site);
      const commitResponse = await context.octokit.rest.git.createCommit({
        owner,
        repo,
        message: commitMessage,
        tree: treeResponse.data.sha,
        parents: [currentSha],
      });

      // Update main branch reference
      await context.octokit.rest.git.updateRef({
        owner,
        repo,
        ref: "heads/main",
        sha: commitResponse.data.sha,
      });

      return {
        success: true,
        commitSha: commitResponse.data.sha,
        filesCommitted: treeItems.length,
      };
    } catch (error) {
      context.log.error("Failed to commit generated site:", error);
      return {
        success: false,
        filesCommitted: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Search for similar repositories based on topics and languages
   */
  async searchSimilarRepositories(
    context: Context,
    repoData: Partial<RepoData>
  ): Promise<SimilarRepository[]> {
    try {
      const query = this.buildSearchQuery(repoData);

      const searchResponse = await context.octokit.rest.search.repos({
        q: query,
        sort: "stars",
        order: "desc",
        per_page: 10,
      });

      return searchResponse.data.items.map((item) => ({
        name: item.name,
        fullName: item.full_name,
        description: item.description || "",
        stars: item.stargazers_count,
        topics: item.topics || [],
        language: item.language || undefined,
      }));
    } catch (error) {
      context.log.warn("Failed to search for similar repositories:", error);
      return [];
    }
  }

  /**
   * Get repository insights and analytics
   */
  async getRepositoryInsights(context: Context): Promise<RepositoryInsights> {
    const { owner, repo } = context.repo();

    try {
      const repoResponse = await context.octokit.rest.repos.get({
        owner,
        repo,
      });

      const data = repoResponse.data;

      // Get recent PR files for code quality insights
      let hasTests = false;
      try {
        const prFiles = await context.octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: 1, // This would be dynamic in real implementation
        });

        hasTests = prFiles.data.some(
          (file) =>
            file.filename.includes("test") ||
            file.filename.includes("spec") ||
            file.filename.includes(".test.") ||
            file.filename.includes(".spec.")
        );
      } catch {
        // PR might not exist, ignore
      }

      return {
        popularity: {
          stars: data.stargazers_count,
          forks: data.forks_count,
          watchers: data.watchers_count,
          issues: data.open_issues_count,
        },
        activity: {
          recentCommits: 0, // Would need commits API call
          recentPRs: 0, // Would need PRs API call
          recentIssues: 0, // Would need issues API call
          lastUpdate: data.updated_at,
        },
        codeQuality: {
          hasTests,
          hasCI: false, // Would need to check for CI files
          hasLinting: false, // Would need to check for linting config
          hasTypeScript: data.language === "TypeScript",
          testCoverage: undefined,
        },
        community: {
          contributors: 0, // Would need contributors API call
          hasContributing: false, // Would need to check for CONTRIBUTING.md
          hasCodeOfConduct: false, // Would need to check for CODE_OF_CONDUCT.md
          hasIssueTemplates: false, // Would need to check .github/ISSUE_TEMPLATE/
        },
      };
    } catch (error) {
      context.log.error("Failed to get repository insights:", error);
      throw new Error(
        `Failed to get repository insights: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // Private helper methods

  private async getLanguages(
    context: Context
  ): Promise<Record<string, number>> {
    try {
      const response = await context.octokit.rest.repos.listLanguages(
        context.repo()
      );
      return response.data;
    } catch (error) {
      context.log.warn("Failed to get languages:", error);
      return {};
    }
  }

  private async getReadmeContent(context: Context): Promise<string> {
    try {
      const response = await context.octokit.rest.repos.getContent({
        ...context.repo(),
        path: "README.md",
      });

      if ("content" in response.data && response.data.content) {
        return Buffer.from(response.data.content, "base64").toString("utf-8");
      }
      return "";
    } catch (_error) {
      context.log.warn("README.md not found or inaccessible");
      return "";
    }
  }

  private async getFileStructure(context: Context): Promise<FileItem[]> {
    try {
      const response = await context.octokit.rest.repos.getContent({
        ...context.repo(),
        path: "",
      });

      if (Array.isArray(response.data)) {
        return response.data.map((item) => ({
          name: item.name,
          type: item.type as "file" | "dir",
          path: item.path,
          size: item.size,
        }));
      }
      return [];
    } catch (error) {
      context.log.warn("Failed to get file structure:", error);
      return [];
    }
  }

  private async getPackageJson(
    context: Context
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await context.octokit.rest.repos.getContent({
        ...context.repo(),
        path: "package.json",
      });

      if ("content" in response.data && response.data.content) {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        );
        return JSON.parse(content);
      }
      return null;
    } catch (_error) {
      return null;
    }
  }

  private async getIssues(context: Context): Promise<
    Array<{
      title: string;
      number: number;
      state: string;
      user: { login: string } | null;
      created_at: string;
    }>
  > {
    try {
      const response = await context.octokit.rest.issues.listForRepo({
        ...context.repo(),
        state: "all",
        per_page: 100,
      });
      return response.data as Array<{
        title: string;
        number: number;
        state: string;
        user: { login: string } | null;
        created_at: string;
      }>;
    } catch (error) {
      context.log.warn("Failed to get issues:", error);
      return [];
    }
  }

  private async getPullRequests(context: Context): Promise<
    Array<{
      title: string;
      user: { login: string } | null;
      merged_at: string | null;
    }>
  > {
    try {
      const response = await context.octokit.rest.pulls.list({
        ...context.repo(),
        state: "all",
        per_page: 100,
      });
      return response.data as Array<{
        title: string;
        user: { login: string } | null;
        merged_at: string | null;
      }>;
    } catch (error) {
      context.log.warn("Failed to get pull requests:", error);
      return [];
    }
  }

  private async getConfigFile(context: Context): Promise<string | null> {
    // Try to get gitlyte.json or .gitlyte.json
    const configFiles = ["gitlyte.json", ".gitlyte.json"];

    for (const filename of configFiles) {
      try {
        const response = await context.octokit.rest.repos.getContent({
          ...context.repo(),
          path: filename,
        });

        if ("content" in response.data && response.data.content) {
          const content = Buffer.from(response.data.content, "base64").toString(
            "utf-8"
          );
          return JSON.parse(content);
        }
      } catch {
        // Continue to next file
      }
    }
    return null;
  }

  private async analyzeCodeStructure(
    _context: Context,
    fileStructure: FileItem[]
  ): Promise<Record<string, unknown>> {
    const files = fileStructure
      .filter((item) => item.type === "file")
      .map((item) => item.name);
    const directories = fileStructure
      .filter((item) => item.type === "dir")
      .map((item) => item.name);

    const hasTests =
      files.some(
        (file) =>
          file.includes("test") ||
          file.includes("spec") ||
          file.includes(".test.") ||
          file.includes(".spec.")
      ) ||
      directories.some(
        (dir) =>
          dir.includes("test") || dir.includes("spec") || dir === "__tests__"
      );

    const testFiles = files.filter(
      (file) =>
        file.includes("test") ||
        file.includes("spec") ||
        file.includes(".test.") ||
        file.includes(".spec.")
    );

    return {
      files,
      directories,
      hasTests,
      testFiles,
      hasTypeScript: files.some(
        (file) => file.endsWith(".ts") || file.endsWith(".tsx")
      ),
      hasTsConfig: files.includes("tsconfig.json"),
      hasPackageJson: files.includes("package.json"),
      testFramework: this.detectTestFramework(files),
      buildTool: this.detectBuildTool(files),
      lintingSetup: this.detectLintingSetup(files),
      complexity: this.assessComplexity(fileStructure),
    };
  }

  private detectTestFramework(files: string[]): string | undefined {
    if (
      files.includes("vitest.config.ts") ||
      files.includes("vitest.config.js")
    )
      return "vitest";
    if (files.includes("jest.config.js") || files.includes("jest.config.ts"))
      return "jest";
    if (files.includes("mocha.opts") || files.some((f) => f.includes("mocha")))
      return "mocha";
    return undefined;
  }

  private detectBuildTool(files: string[]): string | undefined {
    if (files.includes("vite.config.ts") || files.includes("vite.config.js"))
      return "vite";
    if (
      files.includes("webpack.config.js") ||
      files.includes("webpack.config.ts")
    )
      return "webpack";
    if (
      files.includes("rollup.config.js") ||
      files.includes("rollup.config.ts")
    )
      return "rollup";
    return undefined;
  }

  private detectLintingSetup(files: string[]): string[] {
    const linting: string[] = [];
    if (
      files.includes(".eslintrc.js") ||
      files.includes(".eslintrc.json") ||
      files.includes("eslint.config.js")
    ) {
      linting.push("eslint");
    }
    if (files.includes(".prettierrc") || files.includes("prettier.config.js")) {
      linting.push("prettier");
    }
    if (files.includes("biome.json") || files.includes("biome.jsonc")) {
      linting.push("biome");
    }
    return linting;
  }

  private assessComplexity(
    fileStructure: FileItem[]
  ): "simple" | "moderate" | "complex" {
    const fileCount = fileStructure.filter(
      (item) => item.type === "file"
    ).length;
    const dirCount = fileStructure.filter((item) => item.type === "dir").length;

    if (fileCount <= 10 && dirCount <= 3) return "simple";
    if (fileCount <= 50 && dirCount <= 10) return "moderate";
    return "complex";
  }

  private createTreeItems(
    site: GeneratedSite
  ): Array<{ path: string; mode: "100644"; type: "blob"; content: string }> {
    const items: Array<{
      path: string;
      mode: "100644";
      type: "blob";
      content: string;
    }> = [];

    // Add pages
    for (const [filename, content] of Object.entries(site.pages)) {
      items.push({
        path: `docs/${filename}`,
        mode: "100644",
        type: "blob",
        content,
      });
    }

    // Add assets
    for (const [filename, content] of Object.entries(site.assets)) {
      items.push({
        path: `docs/${filename}`,
        mode: "100644",
        type: "blob",
        content,
      });
    }

    // Add meta files
    items.push({
      path: "docs/robots.txt",
      mode: "100644",
      type: "blob",
      content: site.meta.robotsTxt,
    });

    return items;
  }

  private createCommitMessage(site: GeneratedSite): string {
    const pageCount = Object.keys(site.pages).length;
    const assetCount = Object.keys(site.assets).length;

    return `🤖 GitLyte: Generate static site

- Generated ${pageCount} page(s)
- Created ${assetCount} asset(s)
- Updated robots.txt and sitemap

Generated automatically by GitLyte 🚀`;
  }

  private buildSearchQuery(repoData: Partial<RepoData>): string {
    const queryParts: string[] = [];

    if (repoData.basicInfo?.language) {
      queryParts.push(`language:${repoData.basicInfo.language}`);
    }

    if (repoData.basicInfo?.topics) {
      repoData.basicInfo.topics.slice(0, 3).forEach((topic) => {
        queryParts.push(`topic:${topic}`);
      });
    }

    // Exclude the current repository
    if (repoData.basicInfo?.name) {
      queryParts.push(`-repo:${repoData.basicInfo.name}`);
    }

    return queryParts.join(" ");
  }
}
