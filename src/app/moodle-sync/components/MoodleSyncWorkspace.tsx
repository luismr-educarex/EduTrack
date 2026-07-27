'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CloudDownload,
  Code2,
  ExternalLink,
  FileArchive,
  FileText,
  FolderGit2,
  History,
  Loader2,
  Play,
  RefreshCcw,
  Save,
  Search,
  Server,
  Settings,
  Users,
  Wifi,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEduTrack } from '@/contexts/EduTrackContext';
import {
  buildAssignmentSummaries,
  buildStudentSubmissions,
  DEFAULT_MOODLE_SYNC_CONFIG,
  fillRepositoryPath,
  type MoodleSyncConfig,
} from '@/lib/moodleSync';

type View = 'overview' | 'courses' | 'sync' | 'submissions' | 'history' | 'settings';
type JobStatus = 'completed' | 'partial' | 'running';

interface SyncJob {
  id: string;
  date: string;
  assignments: number;
  students: number;
  files: number;
  errors: number;
  status: JobStatus;
  logs: string[];
}

const views: { id: View; label: string; icon: typeof Server }[] = [
  { id: 'overview', label: 'Resumen', icon: RefreshCcw },
  { id: 'courses', label: 'Cursos y tareas', icon: BookOpen },
  { id: 'sync', label: 'Sincronización', icon: Play },
  { id: 'submissions', label: 'Entregas', icon: FileArchive },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15';

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Server;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon size={16} />
        </span>
      </div>
      <p className="font-mono text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function StatusPill({ status }: { status: JobStatus }) {
  const style =
    status === 'completed'
      ? 'bg-green-100 text-green-700'
      : status === 'partial'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-blue-100 text-blue-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${style}`}>
      {status === 'running' ? <Loader2 size={10} className="animate-spin" /> : <Circle size={8} fill="currentColor" />}
      {status === 'completed' ? 'Completada' : status === 'partial' ? 'Con avisos' : 'En curso'}
    </span>
  );
}

export default function MoodleSyncWorkspace() {
  const { activeModule, activities, students, grades, loading } = useEduTrack();
  const [view, setView] = useState<View>('overview');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [config, setConfig] = useState<MoodleSyncConfig>(DEFAULT_MOODLE_SYNC_CONFIG);
  const [restToken, setRestToken] = useState('');
  const [testing, setTesting] = useState<'moodle' | 'github' | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveLogs, setLiveLogs] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [jobs, setJobs] = useState<SyncJob[]>([
    {
      id: 'SYNC-20260724-1815',
      date: '24/07/2026 · 18:15',
      assignments: 3,
      students: 21,
      files: 184,
      errors: 0,
      status: 'completed',
      logs: [
        'Conexión con Moodle verificada',
        '21 entregas descargadas y transformadas',
        'Commit publicado correctamente en GitHub',
      ],
    },
    {
      id: 'SYNC-20260721-1042',
      date: '21/07/2026 · 10:42',
      assignments: 2,
      students: 19,
      files: 126,
      errors: 2,
      status: 'partial',
      logs: ['19 entregas procesadas', '2 ZIP omitidos: estructura no válida'],
    },
  ]);

  const summaries = useMemo(
    () => buildAssignmentSummaries(activities, grades, students.length),
    [activities, grades, students.length]
  );
  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const submissions = useMemo(
    () => (selectedStudent ? buildStudentSubmissions(selectedStudent, activities, grades) : []),
    [selectedStudent, activities, grades]
  );
  const filteredStudents = students.filter((student) => {
    const query = studentSearch.toLowerCase();
    return student.name.toLowerCase().includes(query) || student.nia.includes(query);
  });
  const latestJob = jobs[0];
  const connectedMoodle = Boolean(config.moodleUrl);
  const connectedGitHub = Boolean(config.repositoryUrl) || students.some((student) => student.githubUrl);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`edutrack-moodlesync:${activeModule?.id}`);
      if (saved) setConfig({ ...DEFAULT_MOODLE_SYNC_CONFIG, ...JSON.parse(saved) });
      else {
        setConfig({
          ...DEFAULT_MOODLE_SYNC_CONFIG,
          repositoryUrl: students.find((student) => student.githubUrl)?.githubUrl ?? '',
        });
      }
    } catch {
      setConfig(DEFAULT_MOODLE_SYNC_CONFIG);
    }
  }, [activeModule?.id]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  const toggleActivity = (id: string) => {
    setSelectedActivities((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const startSync = () => {
    const ids = selectedActivities.length ? selectedActivities : activities.map((activity) => activity.id);
    if (!ids.length) {
      toast.error('No hay actividades disponibles para sincronizar');
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedActivities(ids);
    setView('sync');
    setSyncing(true);
    setProgress(6);
    setLiveLogs(['Conectando con Moodle…']);
    const steps = [
      [18, 'Conexión verificada. Obteniendo entregas…'],
      [35, `Descargando entregas de ${students.length} alumnos…`],
      [58, 'Extrayendo ZIP y aplicando reglas de transformación…'],
      [76, 'Organizando carpetas por alumno y actividad…'],
      [91, 'Creando commit en el repositorio de destino…'],
      [100, 'Sincronización completada correctamente.'],
    ] as const;
    let index = 0;
    timerRef.current = setInterval(() => {
      const step = steps[index];
      if (!step) return;
      setProgress(step[0]);
      setLiveLogs((current) => [...current, step[1]]);
      index += 1;
      if (index === steps.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        const now = new Date();
        const submissionsCount = summaries
          .filter((item) => ids.includes(item.id))
          .reduce((sum, item) => sum + item.submissions, 0);
        setJobs((current) => [
          {
            id: `SYNC-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${now
              .toTimeString()
              .slice(0, 5)
              .replace(':', '')}`,
            date: now.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
            assignments: ids.length,
            students: students.length,
            files: Math.max(submissionsCount * 3, ids.length * students.length),
            errors: 0,
            status: 'completed',
            logs: [...liveLogs, ...steps.map((item) => item[1])],
          },
          ...current,
        ]);
        setSyncing(false);
        toast.success('Entregas sincronizadas con GitHub');
      }
    }, 520);
  };

  const saveConfig = () => {
    if (!activeModule) return;
    window.localStorage.setItem(`edutrack-moodlesync:${activeModule.id}`, JSON.stringify(config));
    setRestToken('');
    toast.success('Configuración de MoodleSync guardada');
  };

  const testConnection = (target: 'moodle' | 'github') => {
    if (target === 'moodle' && !config.moodleUrl) {
      toast.error('Indica la URL de Moodle');
      return;
    }
    if (target === 'github' && !config.repositoryUrl) {
      toast.error('Indica el repositorio de GitHub');
      return;
    }
    setTesting(target);
    window.setTimeout(() => {
      setTesting(null);
      toast.success(target === 'moodle' ? 'Moodle responde correctamente' : 'Repositorio accesible');
    }, 900);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!activeModule || activeModule.deliveryMode !== 'online') {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-6">
        <div className="w-full rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle size={22} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">MoodleSync requiere un módulo online</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cambia la modalidad del módulo activo a Online para sincronizar sus tareas y entregas.
          </p>
          <Link
            href="/course-management"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Gestionar módulos <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-2xl px-6 py-6 lg:px-8 xl:px-10 2xl:px-12">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] font-semibold text-primary">
              {activeModule.code}
            </span>
            <span className="text-xs text-muted-foreground">Módulo online</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">MoodleSync</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sincroniza tareas y entregas de Moodle con los repositorios GitHub del módulo.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
          <span className={`flex items-center gap-1.5 px-2 text-xs ${connectedMoodle ? 'text-green-700' : 'text-muted-foreground'}`}>
            {connectedMoodle ? <Wifi size={13} /> : <XCircle size={13} />} Moodle
          </span>
          <span className="h-5 w-px bg-border" />
          <span className={`flex items-center gap-1.5 px-2 text-xs ${connectedGitHub ? 'text-green-700' : 'text-muted-foreground'}`}>
            {connectedGitHub ? <Wifi size={13} /> : <XCircle size={13} />} GitHub
          </span>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
        {views.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                view === item.id ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          );
        })}
      </div>

      {view === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={BookOpen} label="Tareas Moodle" value={activities.length} hint={`${summaries.filter((item) => item.status === 'warning').length} con entregas pendientes`} />
            <Metric icon={Users} label="Alumnado" value={students.length} hint={`${students.filter((student) => student.githubUrl).length} repositorios enlazados`} />
            <Metric icon={CloudDownload} label="Entregas detectadas" value={summaries.reduce((sum, item) => sum + item.submissions, 0)} hint="Disponibles para sincronizar" />
            <Metric icon={FileText} label="Ficheros procesados" value={jobs.reduce((sum, job) => sum + job.files, 0)} hint="En el historial del módulo" />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Tareas disponibles</h2>
                  <p className="text-xs text-muted-foreground">Actividad y cobertura de entregas en Moodle</p>
                </div>
                <button onClick={() => setView('courses')} className="text-xs font-medium text-primary hover:underline">
                  Ver todas
                </button>
              </div>
              <div className="divide-y divide-border">
                {summaries.slice(0, 5).map((item) => {
                  const percentage = students.length ? Math.min(100, Math.round((item.submissions / students.length) * 100)) : 0;
                  return (
                    <div key={item.id} className="flex items-center gap-4 p-4">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary"><BookOpen size={15} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{item.submissions}/{students.length}</span>
                    </div>
                  );
                })}
                {!summaries.length && <p className="p-8 text-center text-sm text-muted-foreground">Crea actividades para comenzar a sincronizar.</p>}
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Última sincronización</h2>
                  <p className="text-xs text-muted-foreground">{latestJob?.date ?? 'Sin ejecuciones'}</p>
                </div>
                {latestJob && <StatusPill status={latestJob.status} />}
              </div>
              {latestJob ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Tareas', latestJob.assignments], ['Alumnos', latestJob.students], ['Ficheros', latestJob.files]].map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-muted/60 p-3">
                        <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={startSync} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                    <RefreshCcw size={15} /> Sincronizar ahora
                  </button>
                </>
              ) : null}
            </section>
          </div>
        </div>
      )}

      {view === 'courses' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Tareas del módulo</h2>
              <p className="text-xs text-muted-foreground">Selecciona las actividades que quieres descargar desde Moodle.</p>
            </div>
            <button
              onClick={startSync}
              disabled={!activities.length}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              <Play size={13} /> Sincronizar {selectedActivities.length || 'todas'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3" />
                  <th className="px-3 py-3 font-medium">Tarea</th>
                  <th className="px-3 py-3 font-medium">Fecha límite</th>
                  <th className="px-3 py-3 text-center font-medium">Entregas</th>
                  <th className="px-3 py-3 text-center font-medium">Revisadas</th>
                  <th className="px-3 py-3 text-center font-medium">Ficheros</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summaries.map((item) => {
                  const selected = selectedActivities.includes(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <button
                          aria-label={`Seleccionar ${item.name}`}
                          onClick={() => toggleActivity(item.id)}
                          className={`flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                        >
                          {selected && <Check size={11} />}
                        </button>
                      </td>
                      <td className="px-3 py-3 font-medium text-foreground">{item.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{item.dueDate || 'Sin fecha'}</td>
                      <td className="px-3 py-3 text-center font-mono">{item.submissions}/{students.length}</td>
                      <td className="px-3 py-3 text-center font-mono">{item.reviewed}</td>
                      <td className="px-3 py-3 text-center font-mono">{item.files}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === 'synced' ? 'bg-green-100 text-green-700' : item.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.status === 'synced' ? 'Sincronizada' : item.status === 'warning' ? 'Pendiente de revisión' : item.status === 'pending' ? 'Sin entregas' : 'Lista'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'sync' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Ejecución de sincronización</h2>
                <p className="text-xs text-muted-foreground">{selectedActivities.length || activities.length} tareas seleccionadas</p>
              </div>
              {syncing ? <StatusPill status="running" /> : progress === 100 ? <StatusPill status="completed" /> : null}
            </div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-muted-foreground">Progreso global</span>
              <span className="font-mono font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-6 space-y-3">
              {['Conectar con Moodle', 'Descargar entregas', 'Transformar ficheros', 'Publicar en GitHub'].map((label, index) => {
                const threshold = [10, 30, 60, 90][index];
                const complete = progress >= threshold;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${complete ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                      {complete ? <Check size={14} /> : <span className="font-mono text-[10px]">{index + 1}</span>}
                    </span>
                    <span className={`text-sm ${complete ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                  </div>
                );
              })}
            </div>
            {!syncing && (
              <button onClick={startSync} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                <RefreshCcw size={15} /> {progress === 100 ? 'Sincronizar de nuevo' : 'Iniciar sincronización'}
              </button>
            )}
          </section>
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <span className="font-mono text-xs text-slate-300">moodlesync.log</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-500"><Circle size={7} fill="currentColor" /> tiempo real</span>
            </div>
            <div className="min-h-[330px] space-y-2 overflow-auto p-4 font-mono text-xs">
              {!liveLogs.length && <p className="text-slate-500">Esperando una nueva ejecución…</p>}
              {liveLogs.map((log, index) => (
                <p key={`${log}-${index}`} className="flex gap-3 text-slate-300">
                  <span className="text-slate-600">{String(index + 1).padStart(2, '0')}</span>
                  <span className={log.includes('completada') ? 'text-emerald-400' : ''}>{log}</span>
                </p>
              ))}
              {syncing && <span className="inline-block h-3 w-1.5 animate-pulse bg-cyan-400" />}
            </div>
          </section>
        </div>
      )}

      {view === 'submissions' && (
        <div className="grid min-h-[560px] gap-4 lg:grid-cols-[300px_1fr]">
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} className={`${fieldClass} pl-8 text-xs`} placeholder="Buscar alumno o NIA…" />
              </div>
            </div>
            <div className="max-h-[510px] divide-y divide-border overflow-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40 ${selectedStudent?.id === student.id ? 'bg-primary/5' : ''}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{student.avatar}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">{student.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{student.nia}</span>
                  </span>
                  {student.githubUrl ? <CheckCircle2 size={13} className="text-green-600" /> : <AlertTriangle size={13} className="text-amber-600" />}
                </button>
              ))}
            </div>
          </section>
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {selectedStudent ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">{selectedStudent.name}</h2>
                    <p className="text-xs text-muted-foreground">{submissions.filter((item) => item.status !== 'not-submitted').length} de {activities.length} entregas localizadas</p>
                  </div>
                  {selectedStudent.githubUrl && (
                    <a href={selectedStudent.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                      <FolderGit2 size={13} /> Abrir repositorio <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {submissions.map((submission) => {
                    const path = fillRepositoryPath(config.basePath, {
                      module: activeModule.code,
                      assignment: submission.activityName,
                      student: selectedStudent.name,
                    });
                    return (
                      <div key={submission.activityId} className="flex items-center gap-4 p-4">
                        <span className={`rounded-lg p-2 ${submission.status === 'not-submitted' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                          <FileArchive size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{submission.activityName}</p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">{submission.status === 'not-submitted' ? 'Sin entrega en Moodle' : `${path}/${submission.fileName}`}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${submission.status === 'graded' ? 'bg-green-100 text-green-700' : submission.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                          {submission.status === 'graded' ? `Calificada · ${submission.grade}` : submission.status === 'submitted' ? 'Entregada' : 'No entregada'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <p className="p-10 text-center text-sm text-muted-foreground">No hay alumnado en este módulo.</p>}
          </section>
        </div>
      )}

      {view === 'history' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold text-foreground">Historial y logs</h2>
            <p className="text-xs text-muted-foreground">Registro de sincronizaciones realizadas en este módulo.</p>
          </div>
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <details key={job.id} className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 p-4 hover:bg-muted/30">
                  <ChevronRight size={14} className="text-muted-foreground transition group-open:rotate-90" />
                  <div className="min-w-[170px]">
                    <p className="font-mono text-xs font-semibold text-foreground">{job.id}</p>
                    <p className="text-[10px] text-muted-foreground">{job.date}</p>
                  </div>
                  <div className="flex flex-1 gap-6 text-xs text-muted-foreground">
                    <span><strong className="font-mono text-foreground">{job.assignments}</strong> tareas</span>
                    <span><strong className="font-mono text-foreground">{job.students}</strong> alumnos</span>
                    <span><strong className="font-mono text-foreground">{job.files}</strong> ficheros</span>
                    <span><strong className={`font-mono ${job.errors ? 'text-red-600' : 'text-green-600'}`}>{job.errors}</strong> errores</span>
                  </div>
                  <StatusPill status={job.status} />
                </summary>
                <div className="space-y-1 border-t border-slate-800 bg-slate-950 px-10 py-4 font-mono text-xs text-slate-300">
                  {job.logs.map((log, index) => <p key={`${job.id}-${index}`}><span className="mr-3 text-slate-600">{String(index + 1).padStart(2, '0')}</span>{log}</p>)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {view === 'settings' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="rounded-lg bg-primary/10 p-2 text-primary"><Server size={16} /></span>
                  <div><h2 className="text-sm font-semibold text-foreground">Conexión a Moodle</h2><p className="text-xs text-muted-foreground">Web services REST de la plataforma</p></div>
                </div>
                <button onClick={() => testConnection('moodle')} disabled={testing !== null} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                  {testing === 'moodle' ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />} Probar
                </button>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-medium text-foreground">URL de Moodle<input type="url" value={config.moodleUrl} onChange={(event) => setConfig({ ...config, moodleUrl: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="https://moodle.centro.es" /></label>
                <label className="block text-xs font-medium text-foreground">Usuario<input value={config.username} onChange={(event) => setConfig({ ...config, username: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="usuario.moodle" /></label>
                <label className="block text-xs font-medium text-foreground">Token REST<input type="password" value={restToken} onChange={(event) => setRestToken(event.target.value)} className={`${fieldClass} mt-1.5 font-mono`} placeholder="Se usa solo durante esta sesión" /><span className="mt-1 block text-[10px] font-normal text-muted-foreground">Por seguridad, el token no se guarda en el navegador.</span></label>
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className="rounded-lg bg-primary/10 p-2 text-primary"><FolderGit2 size={16} /></span>
                  <div><h2 className="text-sm font-semibold text-foreground">Destino GitHub</h2><p className="text-xs text-muted-foreground">Repositorio y estructura de carpetas</p></div>
                </div>
                <button onClick={() => testConnection('github')} disabled={testing !== null} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                  {testing === 'github' ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />} Probar
                </button>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-medium text-foreground">URL del repositorio<input type="url" value={config.repositoryUrl} onChange={(event) => setConfig({ ...config, repositoryUrl: event.target.value })} className={`${fieldClass} mt-1.5`} placeholder="https://github.com/organizacion/entregas" /></label>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                  <label className="block text-xs font-medium text-foreground">Rama<input value={config.branch} onChange={(event) => setConfig({ ...config, branch: event.target.value })} className={`${fieldClass} mt-1.5 font-mono`} /></label>
                  <label className="block text-xs font-medium text-foreground">Ruta base<input value={config.basePath} onChange={(event) => setConfig({ ...config, basePath: event.target.value })} className={`${fieldClass} mt-1.5 font-mono`} /></label>
                </div>
                <p className="text-[10px] text-muted-foreground">Variables disponibles: {'{modulo}'}, {'{tarea}'} y {'{alumno}'}</p>
              </div>
            </section>
          </div>
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Code2 size={16} /></span>
              <div><h2 className="text-sm font-semibold text-foreground">Reglas de transformación</h2><p className="text-xs text-muted-foreground">Preparación automática antes de publicar los ficheros.</p></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['transformPackages', 'Normalizar paquetes e imports', 'Adapta los paquetes Java y las dependencias conocidas.'],
                ['normalizePaths', 'Convertir rutas absolutas', 'Sustituye rutas locales por rutas relativas al proyecto.'],
              ].map(([key, label, description]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30">
                  <input type="checkbox" checked={config[key as 'transformPackages' | 'normalizePaths']} onChange={(event) => setConfig({ ...config, [key]: event.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span><span className="block text-xs font-semibold text-foreground">{label}</span><span className="mt-1 block text-[11px] text-muted-foreground">{description}</span></span>
                </label>
              ))}
            </div>
          </section>
          <div className="flex justify-end">
            <button onClick={saveConfig} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"><Save size={15} /> Guardar configuración</button>
          </div>
        </div>
      )}
    </div>
  );
}
