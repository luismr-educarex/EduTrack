import { NextRequest, NextResponse } from 'next/server';
import { GitHubRepositoryError, listGitHubContents } from '@/lib/github/server';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    if (!await getAuthenticatedUser()) {
      return NextResponse.json({ error: 'Autenticación requerida.' }, { status: 401 });
    }

    const body = await request.json() as { repositoryUrl?: string; path?: string };
    return NextResponse.json(await listGitHubContents(body.repositoryUrl || '', body.path || ''));
  } catch (error) {
    const status = error instanceof GitHubRepositoryError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo consultar GitHub.' }, { status });
  }
}
