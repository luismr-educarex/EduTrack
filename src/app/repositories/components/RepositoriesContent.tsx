'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, FolderGit2, Search, Settings2, UserRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import RepositoryPicker from '@/components/github/RepositoryPicker';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { studentService, type Student } from '@/lib/services/edutrackService';
import { isGitHubRepositoryUrl } from '@/lib/github/url';

type Tab = 'dashboard' | 'configuration';

function repositoryLabel(url?: string) {
  return url ? url.replace(/\.git$/i, '').replace(/^https?:\/\/github\.com\//i, '') : 'Sin repositorio';
}

function validGitHubUrl(url: string) {
  return isGitHubRepositoryUrl(url);
}

export default function RepositoriesContent() {
  const router = useRouter();
  const { students, activeModule, loading, refreshStudents } = useEduTrack();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [query, setQuery] = useState('');
  const [onlyConfigured, setOnlyConfigured] = useState(false);
  const [pickerStudent, setPickerStudent] = useState<Student | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [focusStudentId, setFocusStudentId] = useState('');

  useEffect(() => { setDrafts(Object.fromEntries(students.map(student => [student.id, student.githubUrl || '']))); }, [students]);
  useEffect(() => {
    const requestedStudent = new URLSearchParams(window.location.search).get('student') || '';
    setFocusStudentId(requestedStudent);
    if (requestedStudent) setTab('configuration');
  }, []);

  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesQuery = `${student.name} ${student.nia} ${student.githubUrl || ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!onlyConfigured || isGitHubRepositoryUrl(student.githubUrl));
  }), [onlyConfigured, query, students]);

  const configuredCount = students.filter(student => isGitHubRepositoryUrl(student.githubUrl)).length;

  const saveRepository = async (student: Student) => {
    const url = (drafts[student.id] || '').trim().replace(/\/$/, '');
    if (url && !validGitHubUrl(url)) return toast.error('Usa una URL con el formato https://github.com/usuario/repositorio');
    setSavingId(student.id);
    try {
      await studentService.upsert({ ...student, githubUrl: url || undefined });
      await refreshStudents();
      toast.success(url ? 'Repositorio asociado al alumno' : 'Repositorio eliminado del alumno');
    } catch { toast.error('No se pudo guardar el repositorio'); }
    finally { setSavingId(null); }
  };

  const correctSelection = (student: Student, paths: string[]) => {
    setPickerStudent(null);
    const params = new URLSearchParams({ student: student.id, repoPaths: JSON.stringify(paths) });
    router.push(`/corrections?${params.toString()}`);
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Cargando repositorios…</div>;

  return <div className="px-6 lg:px-8 xl:px-10 py-6 max-w-screen-2xl w-full fade-in">
    <PageHeader title="Repositorios GitHub" subtitle={`Gestión centralizada de repositorios del alumnado · ${activeModule?.code || 'Módulo activo'}`} />

    <section className="mb-5 grid gap-3 sm:grid-cols-3">
      <Metric label="Alumnado" value={students.length} />
      <Metric label="Repositorios asociados" value={configuredCount} tone="text-success" />
      <Metric label="Pendientes de configurar" value={students.length - configuredCount} tone="text-warning" />
    </section>

    <nav className="mb-5 flex gap-1 border-b border-border">
      <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')} icon={<FolderGit2 size={16} />} label="Dashboard" />
      <TabButton active={tab === 'configuration'} onClick={() => setTab('configuration')} icon={<Settings2 size={16} />} label="Configuración" />
    </nav>

    <div className="mb-4 flex flex-wrap gap-3">
      <label className="relative min-w-64 flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar alumno, NIA o repositorio…" className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm" /></label>
      <button onClick={() => setOnlyConfigured(value => !value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${onlyConfigured ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>Solo configurados</button>
    </div>

    {tab === 'dashboard' ? <RepositoryTable students={filteredStudents} onExplore={setPickerStudent} onConfigure={student => { setTab('configuration'); setQuery(student.name); }} /> : <section className="grid gap-3 lg:grid-cols-2">
      {filteredStudents.map(student => <article key={student.id} id={`repository-${student.id}`} className={`rounded-xl border bg-card p-4 shadow-sm ${focusStudentId === student.id ? 'border-primary ring-2 ring-primary/10' : 'border-border'}`}>
        <header className="mb-3 flex items-center gap-3"><Avatar student={student} /><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{student.name}</h2><p className="text-[10px] text-muted-foreground">NIA {student.nia}</p></div>{isGitHubRepositoryUrl(student.githubUrl) && <CheckCircle2 size={17} className="text-success" />}</header>
        <label className="text-xs font-medium">URL del repositorio GitHub<input value={drafts[student.id] || ''} onChange={event => setDrafts(current => ({ ...current, [student.id]: event.target.value }))} placeholder="https://github.com/usuario/repositorio" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" /></label>
        <div className="mt-3 flex justify-end gap-2">{isGitHubRepositoryUrl(student.githubUrl) && <button onClick={() => setPickerStudent(student)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold">Explorar</button>}<button disabled={savingId === student.id || (drafts[student.id] || '') === (student.githubUrl || '')} onClick={() => void saveRepository(student)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{savingId === student.id ? 'Guardando…' : 'Guardar'}</button></div>
      </article>)}
    </section>}

    <p className="mt-5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">Los repositorios públicos se consultan directamente. Para repositorios privados, configura la variable segura <code className="font-mono text-foreground">GITHUB_TOKEN</code> en el servidor de EduTrack.</p>
    {pickerStudent?.githubUrl && isGitHubRepositoryUrl(pickerStudent.githubUrl) && <RepositoryPicker repositoryUrl={pickerStudent.githubUrl} studentName={pickerStudent.name} onClose={() => setPickerStudent(null)} onSelect={paths => correctSelection(pickerStudent, paths)} />}
  </div>;
}

function Metric({ label, value, tone = 'text-foreground' }: { label: string; value: number; tone?: string }) {
  return <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></article>;
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${active ? 'border-primary font-semibold text-primary' : 'border-transparent text-muted-foreground'}`}>{icon}{label}</button>;
}

function Avatar({ student }: { student: Student }) {
  return <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{student.avatar}</div>;
}

function RepositoryTable({ students, onExplore, onConfigure }: { students: Student[]; onExplore: (student: Student) => void; onConfigure: (student: Student) => void }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30"><th className="p-3 text-left">Alumno</th><th className="p-3 text-left">Repositorio</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Acciones</th></tr></thead><tbody>
    {students.map(student => <tr key={student.id} className="border-b last:border-0 hover:bg-muted/20">
      <td className="p-3"><div className="flex items-center gap-3"><Avatar student={student} /><div><Link href={`/students-tutoring/${student.id}`} className="font-medium hover:text-primary hover:underline">{student.name}</Link><p className="text-[10px] text-muted-foreground">NIA {student.nia}</p></div></div></td>
      <td className="p-3">{isGitHubRepositoryUrl(student.githubUrl) ? <a href={student.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"><FolderGit2 size={14} />{repositoryLabel(student.githubUrl)}<ExternalLink size={11} /></a> : <span className="text-xs text-muted-foreground">{student.githubUrl ? 'URL de perfil; falta el repositorio' : 'No configurado'}</span>}</td>
      <td className="p-3">{isGitHubRepositoryUrl(student.githubUrl) ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-semibold text-green-700"><CheckCircle2 size={11} />Asociado</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700"><XCircle size={11} />Pendiente</span>}</td>
      <td className="p-3"><div className="flex justify-end gap-2">{isGitHubRepositoryUrl(student.githubUrl) ? <><button onClick={() => onExplore(student)} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">Explorar</button><Link href={`/corrections?student=${student.id}`} className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white">Corregir</Link></> : <button onClick={() => onConfigure(student)} className="rounded-md border border-primary px-2.5 py-1.5 text-xs font-semibold text-primary">Configurar</button>}</div></td>
    </tr>)}
    {!students.length && <tr><td colSpan={4} className="p-10 text-center text-sm text-muted-foreground"><UserRound size={22} className="mx-auto mb-2" />No hay alumnos que coincidan con el filtro.</td></tr>}
  </tbody></table></div></section>;
}
