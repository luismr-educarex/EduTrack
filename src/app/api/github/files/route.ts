import { NextRequest, NextResponse } from 'next/server';
import { GitHubRepositoryError, loadGitHubFiles } from '@/lib/github/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { repositoryUrl?: string; paths?: string[] };
    return NextResponse.json(await loadGitHubFiles(body.repositoryUrl || '', Array.isArray(body.paths) ? body.paths : []));
  } catch (error) {
    const status = error instanceof GitHubRepositoryError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar los ficheros.' }, { status });
  }
}
