'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useEduTrack } from '@/contexts/EduTrackContext';
import {
  CalendarEvent, calendarEventService, gradeService, moduleService,
} from '@/lib/services/edutrackService';
import { getChatCompletion } from '@/lib/ai/chatCompletion';
import { toast } from 'sonner';
import {
  Armchair, BookOpenText, Bot, CalendarDays, Download, GanttChartSquare,
  Plus, Save, Settings, Trash2, Upload, Users,
} from 'lucide-react';

type Tab = 'contents' | 'calendar' | 'gantt' | 'seating' | 'correction' | 'import' | 'settings';
type ContentItem = { id: string; unitId: string; title: string; type: string; description: string };
type SeatMap = Record<string, string>;
type ImportRow = { nia: string; activity: string; grade: number; studentId?: string; activityId?: string; error?: string };

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'contents', label: 'Contenidos', icon: BookOpenText },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
  { id: 'seating', label: 'Puestos', icon: Armchair },
  { id: 'correction', label: 'Corrección IA', icon: Bot },
  { id: 'import', label: 'Importar notas', icon: Upload },
  { id: 'settings', label: 'Cursos y ajustes', icon: Settings },
];

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export default function AulaTrackPage() {
  const data = useEduTrack();
  const [tab, setTab] = useState<Tab>('contents');
  const storageKey = (suffix: string) => `edutrack:${data.activeModuleId}:${suffix}`;

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (requested && TABS.some(item => item.id === requested)) setTab(requested);
  }, []);

  return (
    <AppLayout>
      <div className="px-6 lg:px-8 py-6 max-w-screen-2xl w-full fade-in">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-foreground">AulaTrack integrado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión operativa del aula para {data.activeModule?.name ?? 'el módulo activo'}.
          </p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-border mb-6">
          {TABS.map(item => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${tab === item.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Icon size={16} />{item.label}
            </button>;
          })}
        </div>
        {data.loading ? <p className="text-sm text-muted-foreground">Cargando datos…</p> : data.error ? <p className="text-sm text-danger">{data.error}</p> : <>
          {tab === 'contents' && <ContentsPanel storageKey={storageKey('contents')} />}
          {tab === 'calendar' && <CalendarPanel />}
          {tab === 'gantt' && <GanttPanel />}
          {tab === 'seating' && <SeatingPanel storageKey={storageKey('seating')} />}
          {tab === 'correction' && <CorrectionPanel />}
          {tab === 'import' && <ImportPanel />}
          {tab === 'settings' && <SettingsPanel storageKey={storageKey('settings')} />}
        </>}
      </div>
    </AppLayout>
  );
}

function Panel({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
    <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
      <div><h2 className="font-semibold text-foreground">{title}</h2>{description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}</div>{actions}
    </header>
    <div className="p-5">{children}</div>
  </section>;
}

const inputClass = 'w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30';
const primaryButton = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50';

function ContentsPanel({ storageKey }: { storageKey: string }) {
  const { workUnits } = useEduTrack();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState({ unitId: '', title: '', type: 'concepto', description: '' });
  useEffect(() => setItems(readStored(storageKey, [])), [storageKey]);
  const persist = (next: ContentItem[]) => { setItems(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const add = () => {
    if (!form.unitId || !form.title.trim()) return toast.error('Selecciona una unidad e indica un título');
    persist([...items, { ...form, id: crypto.randomUUID() }]);
    setForm({ unitId: form.unitId, title: '', type: 'concepto', description: '' }); toast.success('Contenido guardado');
  };
  return <Panel title="Contenidos del módulo" description="Organiza conceptos, procedimientos y recursos por unidad de trabajo.">
    <div className="grid md:grid-cols-4 gap-3 mb-5">
      <select className={inputClass} value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}><option value="">Unidad…</option>{workUnits.map(u => <option key={u.id} value={u.id}>{u.code} · {u.name}</option>)}</select>
      <input className={`${inputClass} md:col-span-2`} placeholder="Título del contenido" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}><option>concepto</option><option>procedimiento</option><option>actitud</option><option>recurso</option></select>
      <textarea className={`${inputClass} md:col-span-3`} rows={2} placeholder="Descripción o enlace" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      <button className={primaryButton} onClick={add}><Plus size={16} />Añadir</button>
    </div>
    <div className="space-y-4">{workUnits.map(unit => {
      const unitItems = items.filter(item => item.unitId === unit.id);
      return <div key={unit.id} className="border border-border rounded-lg"><div className="px-4 py-3 bg-muted/40 text-sm font-semibold">{unit.code} · {unit.name} <span className="text-muted-foreground font-normal">({unitItems.length})</span></div>
        {unitItems.length === 0 ? <p className="px-4 py-3 text-xs text-muted-foreground">Sin contenidos.</p> : unitItems.map(item => <div key={item.id} className="px-4 py-3 border-t border-border flex gap-3 items-start"><span className="text-[10px] uppercase rounded bg-primary/10 text-primary px-2 py-1">{item.type}</span><div className="flex-1"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground mt-1">{item.description}</p></div><button aria-label="Eliminar" onClick={() => persist(items.filter(i => i.id !== item.id))}><Trash2 size={15} className="text-danger" /></button></div>)}
      </div>;
    })}</div>
  </Panel>;
}

function CalendarPanel() {
  const { activeModuleId, calendarEvents, refreshCalendarEvents } = useEduTrack();
  const [form, setForm] = useState({ date: '', title: '', type: 'otro' as CalendarEvent['type'], notes: '' });
  const save = async () => {
    if (!form.date || !form.title.trim()) return toast.error('Fecha y título son obligatorios');
    await calendarEventService.upsert({ id: crypto.randomUUID(), moduleId: activeModuleId, ...form });
    await refreshCalendarEvents(); setForm({ date: '', title: '', type: 'otro', notes: '' }); toast.success('Evento guardado');
  };
  const remove = async (id: string) => { await calendarEventService.delete(id); await refreshCalendarEvents(); toast.success('Evento eliminado'); };
  const grouped = Object.entries(calendarEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => { (acc[event.date] ||= []).push(event); return acc; }, {})).sort(([a], [b]) => a.localeCompare(b));
  return <Panel title="Calendario del módulo" description="Entregas, exámenes, tutorías, reuniones y fechas relevantes.">
    <div className="grid md:grid-cols-5 gap-3 mb-5"><input type="date" className={inputClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /><input className={`${inputClass} md:col-span-2`} placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /><select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEvent['type'] }))}>{['entrega','examen','tutoría','festivo','reunión','otro'].map(x => <option key={x}>{x}</option>)}</select><button className={primaryButton} onClick={save}><Save size={16} />Guardar</button></div>
    <div className="space-y-3">{grouped.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos.</p>}{grouped.map(([date, events]) => <div key={date} className="flex gap-4"><div className="w-28 text-sm font-semibold pt-3">{new Date(`${date}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div className="flex-1 border-l-2 border-primary/30 pl-4 space-y-2">{events.map(event => <div key={event.id} className="border border-border rounded-lg p-3 flex items-center gap-3"><span className="text-[10px] uppercase bg-muted rounded px-2 py-1">{event.type}</span><div className="flex-1"><p className="text-sm font-medium">{event.title}</p>{event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}</div><button onClick={() => remove(event.id)}><Trash2 size={15} className="text-danger" /></button></div>)}</div></div>)}</div>
  </Panel>;
}

function GanttPanel() {
  const { activities, workUnits } = useEduTrack();
  const dates = activities.map(a => a.dueDate).filter(Boolean).sort();
  const min = dates[0] ? new Date(dates[0]).getTime() - 21 * 86400000 : Date.now();
  const max = dates.at(-1) ? new Date(dates.at(-1)!).getTime() + 3 * 86400000 : min + 30 * 86400000;
  return <Panel title="Vista Gantt" description="Secuencia temporal de actividades agrupada por unidad.">
    <div className="space-y-5">{workUnits.map(unit => { const acts = activities.filter(a => a.unitId === unit.id); if (!acts.length) return null; return <div key={unit.id}><p className="text-sm font-semibold mb-2">{unit.code} · {unit.name}</p><div className="space-y-2">{acts.map(activity => { const due = new Date(activity.dueDate).getTime(); const start = due - 14 * 86400000; const left = Math.max(0, ((start - min) / (max - min)) * 100); const width = Math.max(4, ((due - start) / (max - min)) * 100); return <div key={activity.id} className="grid grid-cols-[minmax(150px,260px)_1fr] gap-3 items-center"><div className="truncate text-xs" title={activity.name}>{activity.name}</div><div className="h-7 bg-muted rounded relative overflow-hidden"><div className="absolute h-full rounded bg-primary/75 flex items-center px-2 text-[10px] text-white" style={{ left: `${left}%`, width: `${width}%` }} title={`Entrega: ${activity.dueDate}`}>{activity.dueDate}</div></div></div>; })}</div></div>; })}</div>
  </Panel>;
}

function SeatingPanel({ storageKey }: { storageKey: string }) {
  const { students } = useEduTrack();
  const [seats, setSeats] = useState<SeatMap>({});
  useEffect(() => setSeats(readStored(storageKey, {})), [storageKey]);
  const assign = (seat: string, studentId: string) => { const next = { ...seats }; Object.keys(next).forEach(k => { if (next[k] === studentId) delete next[k]; }); if (studentId) next[seat] = studentId; else delete next[seat]; setSeats(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  return <Panel title="Distribución de puestos" description="Asigna un alumno por puesto; los cambios se guardan automáticamente." actions={<button className="text-xs text-danger" onClick={() => { setSeats({}); localStorage.removeItem(storageKey); }}>Vaciar plano</button>}>
    <div className="mx-auto mb-6 max-w-lg text-center py-2 rounded bg-muted text-xs font-semibold">PIZARRA</div>
    <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">{Array.from({ length: Math.max(15, students.length) }, (_, i) => `P${i + 1}`).map(seat => <div key={seat} className="border border-border rounded-lg p-3"><div className="flex items-center gap-2 mb-2"><Armchair size={15} className="text-primary"/><span className="text-xs font-semibold">{seat}</span></div><select className={`${inputClass} text-xs`} value={seats[seat] || ''} onChange={e => assign(seat, e.target.value)}><option value="">Libre</option>{students.map(s => <option key={s.id} value={s.id} disabled={Object.values(seats).includes(s.id) && seats[seat] !== s.id}>{s.name}</option>)}</select></div>)}</div>
  </Panel>;
}

function CorrectionPanel() {
  const { activities, students, criteria, refreshGrades } = useEduTrack();
  const [activityId, setActivityId] = useState(''); const [studentId, setStudentId] = useState(''); const [submission, setSubmission] = useState('');
  const [result, setResult] = useState<{ grade: number; feedback: string } | null>(null); const [loading, setLoading] = useState(false);
  const correct = async () => {
    const activity = activities.find(a => a.id === activityId); if (!activity || !studentId || !submission.trim()) return toast.error('Completa actividad, alumno y entrega');
    setLoading(true); setResult(null);
    try {
      const related = criteria.filter(c => activity.ceIds.includes(c.id));
      const prompt = `Actúa como docente de FP. Corrige la entrega para la actividad "${activity.name}". Descripción: ${activity.description}. Criterios: ${related.map(c => `${c.code}: ${c.description} (${c.weight}%)`).join('; ')}. Entrega: ${submission}. Devuelve solo JSON válido con {"grade": número de 0 a 10, "feedback": "comentario claro y accionable"}.`;
      const response = await getChatCompletion('OPEN_AI', 'gpt-4o', [{ role: 'user', content: prompt }], { temperature: 0.2 });
      const raw = response?.choices?.[0]?.message?.content || ''; const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
      setResult({ grade: Math.min(10, Math.max(0, Number(parsed.grade))), feedback: String(parsed.feedback) });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo completar la corrección'); } finally { setLoading(false); }
  };
  const save = async () => { if (!result) return; await gradeService.upsertGrade(studentId, activityId, result.grade); await refreshGrades(); toast.success('Calificación guardada'); };
  return <Panel title="Corrección asistida por IA" description="Analiza una entrega con los criterios reales de la actividad y guarda la nota tras revisarla.">
    <div className="grid md:grid-cols-2 gap-3 mb-3"><select className={inputClass} value={activityId} onChange={e => setActivityId(e.target.value)}><option value="">Actividad…</option>{activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><select className={inputClass} value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">Alumno…</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
    <textarea className={inputClass} rows={10} placeholder="Pega aquí la entrega del alumno…" value={submission} onChange={e => setSubmission(e.target.value)} /><button className={`${primaryButton} mt-3`} disabled={loading} onClick={correct}><Bot size={16}/>{loading ? 'Corrigiendo…' : 'Corregir con IA'}</button>
    {result && <div className="mt-5 border border-primary/30 bg-primary/5 rounded-lg p-4"><div className="flex items-center justify-between"><p className="font-semibold">Propuesta de corrección</p><label className="flex items-center gap-2 text-sm">Nota <input type="number" min="0" max="10" step="0.1" className="w-20 border rounded px-2 py-1" value={result.grade} onChange={e => setResult({ ...result, grade: Number(e.target.value) })}/></label></div><p className="text-sm mt-3 whitespace-pre-wrap">{result.feedback}</p><button className={`${primaryButton} mt-4`} onClick={save}><Save size={16}/>Guardar nota revisada</button></div>}
  </Panel>;
}

function ImportPanel() {
  const { students, activities, refreshGrades } = useEduTrack(); const [rows, setRows] = useState<ImportRow[]>([]); const [saving, setSaving] = useState(false);
  const validate = (raw: Record<string, unknown>[]) => setRows(raw.map(item => { const nia = String(item.nia ?? item.NIA ?? '').trim(); const activity = String(item.activity ?? item.actividad ?? item.Actividad ?? '').trim(); const grade = Number(item.grade ?? item.nota ?? item.Nota); const student = students.find(s => s.nia === nia); const act = activities.find(a => a.id === activity || a.name.toLowerCase() === activity.toLowerCase()); let error = ''; if (!student) error = 'NIA no encontrado'; else if (!act) error = 'Actividad no encontrada'; else if (!Number.isFinite(grade) || grade < 0 || grade > 10) error = 'Nota inválida'; return { nia, activity, grade, studentId: student?.id, activityId: act?.id, error }; }));
  const load = async (file: File) => { try { const XLSX = await import('xlsx'); const book = XLSX.read(await file.arrayBuffer()); validate(XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '' })); } catch { toast.error('No se pudo leer el fichero'); } };
  const save = async () => { const valid = rows.filter(r => !r.error && r.studentId && r.activityId); setSaving(true); try { await Promise.all(valid.map(r => gradeService.upsertGrade(r.studentId!, r.activityId!, r.grade))); await refreshGrades(); toast.success(`${valid.length} calificaciones importadas`); setRows([]); } finally { setSaving(false); } };
  return <Panel title="Importar calificaciones" description="Admite CSV y Excel con las columnas nia, actividad y nota." actions={<button className="text-xs text-primary flex gap-1 items-center" onClick={() => downloadText('plantilla_notas.csv', 'nia,actividad,nota\n123456,Nombre de actividad,8.5')}><Download size={14}/>Plantilla</button>}>
    <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center cursor-pointer hover:bg-muted/30"><Upload size={28} className="text-primary mb-2"/><span className="text-sm font-semibold">Seleccionar CSV o Excel</span><input className="hidden" type="file" accept=".csv,.xlsx,.xls" onChange={e => e.target.files?.[0] && load(e.target.files[0])}/></label>
    {rows.length > 0 && <><div className="overflow-x-auto mt-5"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">NIA</th><th className="text-left p-2">Actividad</th><th className="text-right p-2">Nota</th><th className="text-left p-2">Estado</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-b"><td className="p-2">{r.nia}</td><td className="p-2">{r.activity}</td><td className="p-2 text-right">{Number.isFinite(r.grade) ? r.grade : '—'}</td><td className={`p-2 ${r.error ? 'text-danger' : 'text-green-700'}`}>{r.error || 'Correcto'}</td></tr>)}</tbody></table></div><button className={`${primaryButton} mt-4`} disabled={saving || rows.every(r => r.error)} onClick={save}><Save size={16}/>{saving ? 'Importando…' : 'Aplicar calificaciones válidas'}</button></>}
  </Panel>;
}

function SettingsPanel({ storageKey }: { storageKey: string }) {
  const { modules, activeModule, setActiveModuleId } = useEduTrack();
  const [settings, setSettings] = useState({ passingGrade: 5, latePenalty: 0, showRiskAlerts: true });
  const [moduleForm, setModuleForm] = useState({ code: '', name: '', cycle: '', course: new Date().getFullYear() + '–' + (new Date().getFullYear() + 1) });
  useEffect(() => setSettings(readStored(storageKey, settings)), [storageKey]);
  const saveSettings = () => { localStorage.setItem(storageKey, JSON.stringify(settings)); toast.success('Configuración guardada'); };
  const addModule = async () => { if (!moduleForm.code.trim() || !moduleForm.name.trim() || !moduleForm.cycle.trim()) return toast.error('Código, nombre y ciclo son obligatorios'); const id = `module-${crypto.randomUUID()}`; await moduleService.upsert({ id, ...moduleForm, evaluationCount: 2, totalStudents: 0 }); setActiveModuleId(id); toast.success('Módulo creado'); window.location.reload(); };
  const removeModule = async (id: string) => { if (modules.length <= 1) return toast.error('Debe existir al menos un módulo'); if (!confirm('Se eliminará el módulo y todos sus datos relacionados. ¿Continuar?')) return; await moduleService.delete(id); if (id === activeModule?.id) setActiveModuleId(modules.find(m => m.id !== id)!.id); toast.success('Módulo eliminado'); window.location.reload(); };
  return <div className="grid xl:grid-cols-2 gap-6"><Panel title="Gestión de cursos" description="Crea, activa o elimina módulos completos.">
    <div className="space-y-2 mb-5">{modules.map(m => <div key={m.id} className={`border rounded-lg p-3 flex items-center gap-3 ${m.id === activeModule?.id ? 'border-primary bg-primary/5' : 'border-border'}`}><Users size={17} className="text-primary"/><button className="flex-1 text-left" onClick={() => setActiveModuleId(m.id)}><p className="text-sm font-semibold">{m.code} · {m.name}</p><p className="text-xs text-muted-foreground">{m.cycle} · {m.course} · {m.totalStudents} alumnos</p></button><button onClick={() => removeModule(m.id)}><Trash2 size={15} className="text-danger"/></button></div>)}</div>
    <div className="grid sm:grid-cols-2 gap-3"><input className={inputClass} placeholder="Código" value={moduleForm.code} onChange={e => setModuleForm(f => ({ ...f, code: e.target.value }))}/><input className={inputClass} placeholder="Nombre" value={moduleForm.name} onChange={e => setModuleForm(f => ({ ...f, name: e.target.value }))}/><input className={inputClass} placeholder="Ciclo y curso" value={moduleForm.cycle} onChange={e => setModuleForm(f => ({ ...f, cycle: e.target.value }))}/><input className={inputClass} placeholder="Curso académico" value={moduleForm.course} onChange={e => setModuleForm(f => ({ ...f, course: e.target.value }))}/></div><button className={`${primaryButton} mt-3`} onClick={addModule}><Plus size={16}/>Crear módulo</button>
  </Panel><Panel title="Parámetros de evaluación" description="Preferencias guardadas por módulo.">
    <div className="space-y-4"><label className="block text-sm">Nota mínima para aprobar<input type="number" min="0" max="10" step="0.1" className={`${inputClass} mt-1`} value={settings.passingGrade} onChange={e => setSettings(s => ({ ...s, passingGrade: Number(e.target.value) }))}/></label><label className="block text-sm">Penalización por entrega tardía (%)<input type="number" min="0" max="100" className={`${inputClass} mt-1`} value={settings.latePenalty} onChange={e => setSettings(s => ({ ...s, latePenalty: Number(e.target.value) }))}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.showRiskAlerts} onChange={e => setSettings(s => ({ ...s, showRiskAlerts: e.target.checked }))}/>Mostrar alertas de alumnado en riesgo</label><button className={primaryButton} onClick={saveSettings}><Save size={16}/>Guardar ajustes</button></div>
  </Panel></div>;
}
