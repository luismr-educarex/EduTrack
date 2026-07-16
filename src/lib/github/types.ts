export type GitHubRepositoryRef = {
  owner: string;
  repo: string;
  url: string;
};

export type GitHubContentItem = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  downloadUrl?: string;
  htmlUrl?: string;
};

export type GitHubLoadedFile = {
  name: string;
  path: string;
  content: string;
  size: number;
};

export type GitHubContentsResponse = {
  repository: GitHubRepositoryRef;
  path: string;
  items: GitHubContentItem[];
};

export type GitHubFilesResponse = {
  repository: GitHubRepositoryRef;
  paths: string[];
  files: GitHubLoadedFile[];
  skipped: string[];
};
