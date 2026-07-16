import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function matchesAccessKey(received: string, configured: string) {
  const receivedBuffer = Buffer.from(received);
  const configuredBuffer = Buffer.from(configured);

  return receivedBuffer.length === configuredBuffer.length
    && timingSafeEqual(receivedBuffer, configuredBuffer);
}

export async function POST(request: NextRequest) {
  const configuredKey = process.env.EDUTRACK_ACCESS_KEY;
  const ownerEmail = process.env.EDUTRACK_OWNER_EMAIL;
  const ownerPassword = process.env.EDUTRACK_OWNER_PASSWORD;

  if (!configuredKey || !ownerEmail || !ownerPassword) {
    return NextResponse.json(
      { error: 'El acceso mediante clave todavía no está configurado.' },
      { status: 503 },
    );
  }

  let accessKey = '';
  try {
    const body = await request.json() as { accessKey?: unknown };
    accessKey = typeof body.accessKey === 'string' ? body.accessKey : '';
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  }

  const clientId = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const now = Date.now();
  const currentAttempt = attempts.get(clientId);

  if (currentAttempt && currentAttempt.resetAt > now && currentAttempt.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos antes de volver a probar.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((currentAttempt.resetAt - now) / 1000)) } },
    );
  }

  if (!matchesAccessKey(accessKey, configuredKey)) {
    const nextAttempt = !currentAttempt || currentAttempt.resetAt <= now
      ? { count: 1, resetAt: now + ATTEMPT_WINDOW_MS }
      : { ...currentAttempt, count: currentAttempt.count + 1 };
    attempts.set(clientId, nextAttempt);
    await new Promise(resolve => setTimeout(resolve, 400));
    return NextResponse.json({ error: 'La clave de acceso no es correcta.' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });

  if (error) {
    console.error('No se pudo iniciar la sesión técnica de EduTrack:', error.message);
    return NextResponse.json(
      { error: 'No se pudo iniciar la sesión de EduTrack.' },
      { status: 500 },
    );
  }

  attempts.delete(clientId);
  return NextResponse.json({ ok: true });
}
