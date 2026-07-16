import 'server-only';

import type { GitHubContentItem, GitHubLoadedFile, GitHubRepositoryRef } from './types';

const GITHUB_API = 'https://api.github.com';
const MAX_FILES = 80;
const MAX_FILE_BYTES = 512_000;
const MAX_TOTAL_BYTES = 2_500_000;
const MAX_DEPTH = 8;

const TEXT_EXTENSIONS = new Set([
  'c', 'cc', 'cpp', 'cs', 'css', 'csv', 'go', 'gradle', 'groovy', 'h', 'hpp', 'html', 'java',
  'js', 'json', 'jsx', 'kt', 'kts', 'md', 'php', 'properties', 'py', 'rb', 'rs', 'scss', 'sh',
  'sql', 'swift', 'toml', 'ts', 'tsx', 'txt', 'xml', 'yaml', 'yml',
]);

type GitHubApiItem = {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size?: number;
  content?: string;
  encoding?: string;
  download_url?: string | null;
  html_url?: string;
};

export class GitHubRepositoryError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function parseGitHubRepository(value: string): GitHubRepositoryRef {
  const raw = String(value || '').trim().replace(/\.git$/i, '').replace(/\/$/, '');
  const match = raw.match(/(?:github\.com[/:])([^/]+)\/([^/#?]+)$/i) || raw.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) throw new GitHubRepositoryError('La URL del repositorio GitHub no es válida. Usa https://github.com/usuario/repositorio.');
  const owner = match[1];
  const repo = match[2];
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new GitHubRepositoryError('El propietario o el nombre del repositorio contiene caracteres no válidos.');
  }
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

function githubHeaders(accept = 'application/vnd.github+json') {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    Accept: accept,
    'User-Agent': 'EduTrack',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizePath(path: string) {
  const clean = String(path || '').trim().replace(/^\/+|\/+$/g, '');
  if (clean.split('/').some(part => part === '..')) throw new GitHubRepositoryError('La ruta solicitada no es válida.');
  return clean;
}

function apiUrl(repository: GitHubRepositoryRef, path: string) {
  const encoded = normalizePath(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `${GITHUB_API}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/contents${encoded ? `/${encoded}` : ''}`;
}

async function githubRequest(repository: GitHubRepositoryRef, path: string): Promise<GitHubApiItem | GitHubApiItem[]> {
  const response = await fetch(apiUrl(repository, path), { headers: githubHeaders(), cache: 'no-store' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    if (response.status === 404) throw new GitHubRepositoryError('No se puede acceder al repositorio o a la ruta. Comprueba la URL y, si es privado, configura GITHUB_TOKEN.', 404);
    if (response.status === 403) throw new GitHubRepositoryError('GitHub ha rechazado la consulta. Revisa el token o el límite de peticiones.', 403);
    throw new GitHubRepositoryError(body.message || `GitHub respondió con el estado ${response.status}.`, response.status);
  }
  return response.json() as Promise<GitHubApiItem | GitHubApiItem[]>;
}

function toContentItem(item: GitHubApiItem): GitHubContentItem | null {
  if (item.type !== 'file' && item.type !== 'dir') return null;
  return {
    name: item.name,
    path: item.path,
    type: item.type,
    size: item.size || 0,
    downloadUrl: item.download_url || undefined,
    htmlUrl: item.html_url,
  };
}

export async function listGitHubContents(repositoryUrl: string, path = '') {
  const repository = parseGitHubRepository(repositoryUrl);
  const response = await githubRequest(repository, path);
  const rows = Array.isArray(response) ? response : [response];
  const items = rows.map(toContentItem).filter((item): item is GitHubContentItem => Boolean(item));
  items.sort((left, right) => left.type === right.type ? left.name.localeCompare(right.name, 'es') : left.type === 'dir' ? -1 : 1);
  return { repository, path: normalizePath(path), items };
}

function isTextFile(path: string) {
  const name = path.split('/').pop() || '';
  if (/^(readme|license|notice|authors|changelog)(\..*)?$/i.test(name)) return true;
  if (['Dockerfile', 'Makefile', '.gitignore', '.env.example', 'pom.xml', 'package.json'].includes(name)) return true;
  const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return TEXT_EXTENSIONS.has(extension);
}

async function readGitHubFile(repository: GitHubRepositoryRef, item: GitHubApiItem): Promise<GitHubLoadedFile | null> {
  const size = item.size || 0;
  if (size > MAX_FILE_BYTES || !isTextFile(item.path)) return null;
  let content = '';
  if (item.content && item.encoding === 'base64') content = Buffer.from(item.content.replace(/\n/g, ''), 'base64').toString('utf8');
  else {
    const response = await fetch(apiUrl(repository, item.path), { headers: githubHeaders('application/vnd.github.raw+json'), cache: 'no-store' });
    if (!response.ok) return null;
    content = await response.text();
  }
  return { name: item.name, path: item.path, content, size: Buffer.byteLength(content, 'utf8') };
}

export async function loadGitHubFiles(repositoryUrl: string, requestedPaths: string[]) {
  const repository = parseGitHubRepository(repositoryUrl);
  const paths = Array.from(new Set(requestedPaths.map(normalizePath).filter(Boolean)));
  if (!paths.length) throw new GitHubRepositoryError('Selecciona al menos una carpeta o un fichero.');
  const files: GitHubLoadedFile[] = [];
  const skipped: string[] = [];
  const visited = new Set<string>();
  let totalBytes = 0;

  const collect = async (path: string, depth: number) => {
    if (visited.has(path) || files.length >= MAX_FILES) return;
    visited.add(path);
    if (depth > MAX_DEPTH) { skipped.push(`${path} (profundidad máxima)`); return; }
    const response = await githubRequest(repository, path);
    const rows = Array.isArray(response) ? response : [response];
    for (const item of rows) {
      if (files.length >= MAX_FILES || totalBytes >= MAX_TOTAL_BYTES) { skipped.push(`${item.path} (límite de carga)`); continue; }
      if (item.type === 'dir') await collect(item.path, depth + 1);
      else if (item.type === 'file') {
        const file = await readGitHubFile(repository, item);
        if (!file) skipped.push(`${item.path} (binario o demasiado grande)`);
        else if (totalBytes + file.size > MAX_TOTAL_BYTES) skipped.push(`${item.path} (límite total)`);
        else { files.push(file); totalBytes += file.size; }
      }
    }
  };

  for (const path of paths) await collect(path, 0);
  if (!files.length) throw new GitHubRepositoryError('La selección no contiene ficheros de texto que se puedan corregir.', 422);
  return { repository, paths, files, skipped };
}
