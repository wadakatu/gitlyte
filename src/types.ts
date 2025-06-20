export interface RepoData {
  repo: {
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    topics?: string[];
    created_at: string;
    updated_at: string;
    pushed_at: string;
    size: number;
    default_branch: string;
    license: { key: string; name: string } | null;
  };
  readme: string;
  prs: Array<{
    title: string;
    user: { login: string } | null;
    merged_at: string | null;
  }>;
  issues: Array<{
    title: string;
    number: number;
    state: string;
    user: { login: string } | null;
    created_at: string;
  }>;
}

export interface PullRequest {
  title: string;
  number: number;
  user: { login: string } | null;
  merged_at: string | null;
  labels: Array<{ name: string }>;
}
