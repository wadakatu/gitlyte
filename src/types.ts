export interface RepoData {
  repo: {
    name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
  };
  readme: string;
  prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
  issues: Array<any>;
}

export interface PullRequest {
  title: string;
  number: number;
  user: { login: string } | null;
  merged_at: string | null;
  labels: Array<{ name: string }>;
}