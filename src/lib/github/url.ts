export function isGitHubRepositoryUrl(value?: string) {
  return Boolean(value && /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/i.test(value.trim()));
}
