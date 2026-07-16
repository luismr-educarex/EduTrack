'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (loading) {
    return <main className="min-h-screen grid place-items-center bg-muted/30"><p className="text-sm text-muted-foreground">Comprobando sesión…</p></main>;
  }
  if (user) return children;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        const result = await signUp(email.trim(), password, { fullName: fullName.trim() });
        if (!result.session) setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.');
      } else {
        await signIn(email.trim(), password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar el acceso.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 grid place-items-center">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl">
        <div className="mb-7 flex items-center gap-3">
          <AppLogo size={44} />
          <div><h1 className="text-xl font-bold">EduTrack</h1><p className="text-xs text-muted-foreground">Acceso docente seguro</p></div>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1">
          <button type="button" onClick={() => setMode('signin')} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === 'signin' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>Entrar</button>
          <button type="button" onClick={() => setMode('signup')} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === 'signup' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>Crear cuenta</button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {mode === 'signup' && <label className="block text-xs font-semibold">Nombre completo<input className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={fullName} onChange={event => setFullName(event.target.value)} required /></label>}
          <label className="block text-xs font-semibold">Correo electrónico<input type="email" autoComplete="email" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label className="block text-xs font-semibold">Contraseña<input type="password" minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" value={password} onChange={event => setPassword(event.target.value)} required /></label>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-danger">{error}</p>}
          {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{message}</p>}
          <button disabled={submitting} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Procesando…' : mode === 'signin' ? 'Entrar en EduTrack' : 'Crear cuenta'}</button>
        </form>
        <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">Los datos académicos se aíslan por cuenta mediante las políticas de seguridad de Supabase.</p>
      </section>
    </main>
  );
}
