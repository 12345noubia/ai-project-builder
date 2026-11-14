export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i)
    ?? url.trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  return m && m[1] && m[2] ? { owner: m[1], repo: m[2] } : null;
}
