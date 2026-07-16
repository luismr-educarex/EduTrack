'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [accessKey, setAccessKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-muted/30"><p className="text-sm text-muted-foreground">Comprobando sesión…</p></main>;
  }
  if (user) return children;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/access-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || 'No se pudo completar el acceso.');
      }

      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar el acceso.');
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 grid place-items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl">
        <div className="mb-7 flex items-center gap-3">
          <AppLogo size={44} />
          <div><h1 className="text-xl font-bold">EduTrack</h1><p className="text-xs text-muted-foreground">Acceso privado</p></div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-xs font-semibold">Clave de acceso<input type="password" autoComplete="current-password" autoFocus className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={accessKey} onChange={event => setAccessKey(event.target.value)} required /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{error}</p>}
          <button disabled={submitting || !accessKey} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Comprobando…' : 'Entrar en EduTrack'}</button>
        </form>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">Aplicación de uso privado protegida mediante una clave única.</p>
      </section>
    </main>
  );
}
