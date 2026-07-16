'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink,
  FileText, FolderGit2 as Github, GraduationCap, Mail, MessageSquare, Save, TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { studentService, tutoringService } from '@/lib/services/edutrackService';
import { getActivityGrade } from '@/lib/mockData';

type Tab = 'performance' | 'activities' | 'competencies' | 'tracking';

function average(values: Array<number | null | undefined>) {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null;
}

function gradeClass(value: number | null) {
  if (value === null) return 'text-muted-foreground';
  if (value >= 7) return 'text-success';
  if (value >= 5) return 'text-warning';
  return 'text-danger';
}

function gradeBackground(value: number | null) {
  if (value === null) return 'bg-muted text-muted-foreground';
  if (value >= 7) return 'bg-green-100 text-green-700';
  if (value >= 5) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function Grade({ value }: { value: number | null }) {
  return <span className={`inline-flex min-w-12 justify-center rounded-md px-2 py-1 text-xs font-bold font-mono-nums ${gradeBackground(value)}`}>{value === null ? '—' : value.toFixed(2)}</span>;
}

function Metric({ label, value, detail, tone = 'text-foreground' }: { label: string; value: React.ReactNode; detail?: string; tone?: string }) {
  return <article className="bg-card border border-border rounded-xl p-4 shadow-sm"><p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p><p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>{detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}</article>;
}

export default function StudentDetailContent({ studentId }: { studentId: string }) {
  const router = useRouter();
  const {
    students, activities, grades, evaluations, workUnits, learningOutcomes, criteria,
    incidents, tutoringActions, loading, error, refreshTutoringActions, refreshStudents,
  } = useEduTrack();
  const [tab, setTab] = useState<Tab>('performance');
  const [comment, setComment] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [repositoryDraft, setRepositoryDraft] = useState('');
  const [savingRepository, setSavingRepository] = useState(false);

  const student = students.find(item => item.id === studentId);
  useEffect(() => { setRepositoryDraft(student?.githubUrl || ''); }, [student?.githubUrl]);
  const studentIndex = students.findIndex(item => item.id === studentId);
  const studentGrades = grades.filter(grade => grade.studentId === studentId);

  const activityRows = useMemo(() => activities.map(activity => {
    const storedGrade = studentGrades.find(item => item.activityId === activity.id);
    const grade = storedGrade?.grade ?? null;
    return {
      activity,
      grade,
      unit: workUnits.find(unit => unit.id === activity.unitId),
      evaluation: evaluations.find(evaluation => evaluation.id === activity.evaluationId),
    };
  }).sort((a, b) => a.activity.dueDate.localeCompare(b.activity.dueDate)), [activities, evaluations, studentGrades, studentId, workUnits]);

  const evaluatedActivityRows = activityRows.filter(row => row.grade !== null);
  const calculatedModuleGrade = average(evaluatedActivityRows.map(row => row.grade));
  const moduleGrade = student?.moduleGrade ?? calculatedModuleGrade;
  const passedActivities = evaluatedActivityRows.filter(row => Number(row.grade) >= 5).length;
  const failedActivities = evaluatedActivityRows.filter(row => Number(row.grade) < 5).length;

  const evaluationRows = evaluations.map(evaluation => {
    const rows = activityRows.filter(row => row.activity.evaluationId === evaluation.id);
    return { evaluation, grade: average(rows.map(row => row.grade)), activityCount: rows.length };
  });

  const unitRows = workUnits.map(unit => {
    const rows = activityRows.filter(row => row.activity.unitId === unit.id);
    return { unit, grade: average(rows.map(row => row.grade)), rows };
  });

  const criterionRows = criteria.map(criterion => {
    const linkedRows = activityRows.filter(row => row.activity.ceIds.includes(criterion.id));
    return { criterion, grade: average(linkedRows.map(row => row.grade)), activityCount: linkedRows.length };
  });

  const outcomeRows = learningOutcomes.map(outcome => {
    const rows = criterionRows.filter(row => row.criterion.raId === outcome.id);
    return { outcome, grade: average(rows.map(row => row.grade)), rows };
  });

  const evolution = evaluatedActivityRows.map(row => ({
    name: row.activity.name.length > 18 ? `${row.activity.name.slice(0, 17)}…` : row.activity.name,
    date: row.activity.dueDate,
    nota: row.grade,
  }));

  const studentIncidents = incidents.filter(incident => incident.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
  const studentComments = tutoringActions.filter(action => action.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));

  const navigateRelative = (offset: number) => {
    if (!students.length || studentIndex < 0) return;
    const next = students[(studentIndex + offset + students.length) % students.length];
    router.push(`/students-tutoring/${next.id}`);
  };

  const saveComment = async () => {
    if (!comment.trim()) return toast.error('Escribe un comentario');
    setSavingComment(true);
    try {
      await tutoringService.upsert({
        id: `ta-${crypto.randomUUID()}`,
        studentId,
        date: new Date().toISOString().slice(0, 10),
        type: 'seguimiento',
        content: comment.trim(),
        followUp: followUp.trim() || undefined,
      });
      await refreshTutoringActions();
      setComment('');
      setFollowUp('');
      toast.success('Comentario guardado');
    } catch {
      toast.error('No se pudo guardar el comentario');
    } finally {
      setSavingComment(false);
    }
  };

  const saveRepository = async () => {
    if (!student) return;
    const url = repositoryDraft.trim().replace(/\/$/, '');
    if (url && !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(url)) return toast.error('Usa https://github.com/usuario/repositorio');
    setSavingRepository(true);
    try {
      await studentService.upsert({ ...student, githubUrl: url || undefined });
      await refreshStudents();
      toast.success('Repositorio asociado al alumno');
    } catch { toast.error('No se pudo guardar el repositorio'); }
    finally { setSavingRepository(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Cargando ficha…</div>;
  if (error) return <div className="p-8 text-sm text-danger">{error}</div>;
  if (!student) return <div className="p-8"><h1 className="text-xl font-bold">Alumno no encontrado</h1><Link href="/students-tutoring" className="text-primary text-sm mt-3 inline-block">Volver al listado</Link></div>;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'performance', label: 'Rendimiento', icon: TrendingUp },
    { id: 'activities', label: 'Actividades y notas', icon: ClipboardCheck },
    { id: 'competencies', label: 'Competencias', icon: GraduationCap },
    { id: 'tracking', label: 'Seguimiento y comentarios', icon: MessageSquare },
  ];

  return <div className="px-6 lg:px-8 py-6 max-w-screen-2xl w-full fade-in">
    <header className="bg-card border border-border rounded-xl shadow-sm p-5 mb-5">
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/students-tutoring" aria-label="Volver al alumnado" className="p-2 rounded-lg border border-border hover:bg-muted"><ArrowLeft size={18} /></Link>
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${student.riskLevel === 'high' ? 'bg-red-100 text-danger' : student.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-primary/10 text-primary'}`}>{student.avatar || student.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div>
        <div className="flex-1 min-w-64"><h1 className="text-2xl font-bold text-foreground">{student.name}</h1><div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground"><span className="font-mono">NIA {student.nia}</span><span className="inline-flex items-center gap-1"><Mail size={12} />{student.email}</span>{student.githubUrl && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={student.githubUrl} target="_blank" rel="noreferrer">GitHub <ExternalLink size={11} /></a>}</div></div>
        <div className="flex items-center gap-2"><button className="p-2 border border-border rounded-lg hover:bg-muted" onClick={() => navigateRelative(-1)} aria-label="Alumno anterior"><ChevronLeft size={17} /></button><span className="text-xs font-mono text-muted-foreground min-w-14 text-center">{studentIndex + 1} / {students.length}</span><button className="p-2 border border-border rounded-lg hover:bg-muted" onClick={() => navigateRelative(1)} aria-label="Alumno siguiente"><ChevronRight size={17} /></button></div>
      </div>
    </header>

    <nav className="flex gap-1 overflow-x-auto border-b border-border mb-6">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 px-4 py-2.5 whitespace-nowrap text-sm border-b-2 ${tab === item.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Icon size={15} />{item.label}</button>; })}</nav>

    {tab === 'performance' && <div className="space-y-6">
      <section className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3"><Metric label="Nota del módulo" value={moduleGrade?.toFixed(2) ?? '—'} tone={gradeClass(moduleGrade)} /><Metric label="Actividades evaluadas" value={evaluatedActivityRows.length} detail={`${activities.length - evaluatedActivityRows.length} pendientes`} /><Metric label="Superadas" value={passedActivities} tone="text-success" /><Metric label="En riesgo" value={failedActivities} tone={failedActivities ? 'text-danger' : 'text-success'} /><Metric label="Ausencias" value={student.absences} detail={`${student.incidents} incidencias`} tone={student.absences > 8 ? 'text-danger' : 'text-foreground'} /></section>
      <section className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
        <article className="bg-card border border-border rounded-xl p-5 shadow-sm"><h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={17} className="text-primary" />Evolución de calificaciones</h2>{evolution.length > 1 ? <ResponsiveContainer width="100%" height={260}><LineChart data={evolution} margin={{ top: 8, right: 12, left: -18, bottom: 35 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" angle={-30} textAnchor="end" height={60} tick={{ fontSize: 9 }} /><YAxis domain={[0, 10]} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} formatter={(value: number) => [value?.toFixed(2), 'Nota']} labelFormatter={(label, payload) => `${label}${payload?.[0]?.payload?.date ? ` · ${payload[0].payload.date}` : ''}`} /><Line type="monotone" dataKey="nota" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary)' }} /></LineChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground py-16 text-center">Se necesitan al menos dos actividades calificadas para mostrar la evolución.</p>}</article>
        <article className="bg-card border border-border rounded-xl p-5 shadow-sm"><h2 className="font-semibold mb-4">Evaluaciones</h2><div className="space-y-3">{evaluationRows.map(row => <div key={row.evaluation.id} className="border border-border rounded-lg p-3 flex items-center gap-3"><div className="flex-1"><p className="text-sm font-medium">{row.evaluation.name}</p><p className="text-xs text-muted-foreground">{row.activityCount} actividades</p></div><Grade value={row.grade} /></div>)}</div></article>
      </section>
      <article className="bg-card border border-border rounded-xl p-5 shadow-sm"><h2 className="font-semibold mb-4">Desglose por unidades de trabajo</h2><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{unitRows.map(row => <div key={row.unit.id} className="border border-border rounded-lg p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-primary">{row.unit.code}</p><p className="text-sm font-medium mt-1">{row.unit.name}</p></div><Grade value={row.grade} /></div><p className="text-xs text-muted-foreground mt-3">{row.rows.length} actividades · {row.unit.taughtPercentage}% impartido</p></div>)}</div></article>
    </div>}

    {tab === 'activities' && <article className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"><header className="p-5 border-b border-border"><h2 className="font-semibold">Actividades y calificaciones</h2><p className="text-xs text-muted-foreground mt-1">Historial completo de actividades del módulo.</p></header><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/30"><th className="text-left p-3">Actividad</th><th className="text-left p-3">Unidad</th><th className="text-left p-3">Evaluación</th><th className="text-left p-3">Entrega</th><th className="text-left p-3">Estado</th><th className="text-right p-3">Nota</th><th className="p-3" /></tr></thead><tbody>{activityRows.map(row => <tr key={row.activity.id} className="border-b last:border-0 hover:bg-muted/20"><td className="p-3"><p className="font-medium">{row.activity.name}</p><p className="text-xs text-muted-foreground line-clamp-1">{row.activity.description}</p></td><td className="p-3">{row.unit?.code ?? 'Directa'}</td><td className="p-3">{row.evaluation?.name ?? '—'}</td><td className="p-3 font-mono text-xs">{row.activity.dueDate}</td><td className="p-3 capitalize">{row.activity.status}</td><td className="p-3 text-right"><Grade value={row.grade} /></td><td className="p-3 text-right"><Link className="text-xs text-primary hover:underline" href={`/corrections?activity=${row.activity.id}&student=${student.id}`}>Corrección</Link></td></tr>)}</tbody></table></div></article>}

    {tab === 'competencies' && <div className="space-y-4">{outcomeRows.map(row => <article key={row.outcome.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"><header className="p-4 flex items-center gap-3 bg-muted/30"><span className="text-xs font-bold text-primary bg-primary/10 rounded px-2 py-1">{row.outcome.code}</span><p className="flex-1 text-sm font-medium">{row.outcome.description}</p><Grade value={row.grade} /></header><div className="divide-y divide-border">{row.rows.map(criterionRow => <div key={criterionRow.criterion.id} className="p-3 flex items-start gap-3"><span className="text-xs font-semibold text-primary w-16">{criterionRow.criterion.code}</span><p className="flex-1 text-xs text-muted-foreground">{criterionRow.criterion.description}</p><span className="text-[10px] text-muted-foreground">{criterionRow.activityCount} act.</span><Grade value={criterionRow.grade} /></div>)}</div></article>)}</div>}

    {tab === 'tracking' && <div className="grid xl:grid-cols-2 gap-6">
      <div className="space-y-6"><article className="bg-card border border-border rounded-xl p-5 shadow-sm"><h2 className="font-semibold mb-3 flex items-center gap-2"><Github size={17} className="text-primary" />Repositorio GitHub</h2><p className="mb-3 text-xs text-muted-foreground">Este repositorio se utilizará para explorar y cargar entregas desde la corrección automática o manual.</p><input value={repositoryDraft} onChange={event => setRepositoryDraft(event.target.value)} placeholder="https://github.com/usuario/repositorio" className="w-full rounded-lg border border-border bg-background p-3 text-sm" /><div className="mt-3 flex justify-end gap-2">{student.githubUrl && <Link href={`/corrections?student=${student.id}`} className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary">Abrir en Corrección</Link>}<button disabled={savingRepository || repositoryDraft === (student.githubUrl || '')} onClick={() => void saveRepository()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Save size={13} />{savingRepository ? 'Guardando…' : 'Guardar repositorio'}</button></div></article><article className="bg-card border border-border rounded-xl p-5 shadow-sm"><h2 className="font-semibold mb-4 flex items-center gap-2"><MessageSquare size={17} className="text-primary" />Nuevo comentario de seguimiento</h2><textarea className="w-full border border-border rounded-lg p-3 text-sm bg-background min-h-28" placeholder="Observaciones, acuerdos, evolución o medidas de apoyo…" value={comment} onChange={event => setComment(event.target.value)} /><input className="w-full border border-border rounded-lg p-3 text-sm bg-background mt-3" placeholder="Próxima acción o fecha de revisión (opcional)" value={followUp} onChange={event => setFollowUp(event.target.value)} /><button className="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50" disabled={savingComment} onClick={saveComment}>{savingComment ? 'Guardando…' : 'Guardar comentario'}</button></article><article className="bg-card border border-border rounded-xl p-5 shadow-sm"><h2 className="font-semibold mb-4">Comentarios y acciones tutoriales</h2><div className="space-y-3">{studentComments.map(item => <div key={item.id} className="border-l-2 border-primary pl-3 py-1"><div className="flex justify-between gap-3"><p className="text-xs font-semibold capitalize">{item.type}</p><span className="text-[10px] text-muted-foreground">{new Date(`${item.date}T12:00:00`).toLocaleDateString('es-ES')}</span></div><p className="text-sm mt-1 whitespace-pre-wrap">{item.content}</p>{item.followUp && <p className="text-xs text-primary mt-2">Seguimiento: {item.followUp}</p>}</div>)}{studentComments.length === 0 && <p className="text-sm text-muted-foreground">Sin comentarios registrados.</p>}</div></article></div>
      <article className="bg-card border border-border rounded-xl p-5 shadow-sm h-fit"><h2 className="font-semibold mb-4 flex items-center gap-2"><FileText size={17} className="text-primary" />Incidencias y observaciones</h2><div className="space-y-3">{studentIncidents.map(item => <div key={item.id} className="border border-border rounded-lg p-3"><div className="flex justify-between gap-3"><span className={`text-[10px] uppercase rounded px-2 py-1 ${item.type === 'positivo' ? 'bg-green-100 text-green-700' : item.type === 'falta' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.type}</span><span className="text-[10px] text-muted-foreground">{new Date(`${item.date}T12:00:00`).toLocaleDateString('es-ES')}</span></div><p className="text-sm mt-2">{item.detail}</p></div>)}{studentIncidents.length === 0 && <p className="text-sm text-muted-foreground">Sin incidencias registradas.</p>}</div></article>
    </div>}
  </div>;
}
