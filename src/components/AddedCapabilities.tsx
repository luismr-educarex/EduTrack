'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useEduTrack } from '@/contexts/EduTrackContext';
import {
  CalendarEvent, calendarEventService, gradeService, moduleService,
} from '@/lib/services/edutrackService';
import { getChatCompletion } from '@/lib/ai/chatCompletion';
import { toast } from 'sonner';
import {
  Armchair, Bot, CalendarDays, ChevronLeft, ChevronRight, Download,
  Filter, Plus, Save, Search, Trash2, Upload, Users,
} from 'lucide-react';

type ContentItem = {
  id: string;
  unitId: string;
  title: string;
  type: string;
  description: string;
};

type SeatMap = Record<string, string>;
type ImportRow = {
  nia: string;
  activity: string;
  grade: number;
  studentId?: string;
  activityId?: string;
  error?: string;
};

type ClassGroup = { id: string; name: string; tutor: string; room: string };
type GradingScale = { id: string; name: string; passingGrade: number; latePenalty: number };

export const inputClass = 'w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30';
export const primaryButton = 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50';

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function FeaturePage({ title, description, children }: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { loading, error } = useEduTrack();
  return (
    <AppLayout>
      <div className="px-6 lg:px-8 py-6 max-w-screen-2xl w-full fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Cargando datos…</p>
          : error ? <p className="text-sm text-danger">{error}</p>
            : children}
      </div>
    </AppLayout>
  );
}

export function Panel({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ContentsFeature() {
  const { activeModuleId, workUnits } = useEduTrack();
  const storageKey = `edutrack:${activeModuleId}:contents`;
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState({ unitId: '', title: '', type: 'concepto', description: '' });
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => setItems(readStored(storageKey, [])), [storageKey]);

  const persist = (next: ContentItem[]) => {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const save = () => {
    if (!form.unitId || !form.title.trim()) return toast.error('Selecciona una unidad e indica un título');
    if (editingId) {
      persist(items.map(item => item.id === editingId ? { ...item, ...form } : item));
      toast.success('Contenido actualizado');
    } else {
      persist([...items, { ...form, id: crypto.randomUUID() }]);
      toast.success('Contenido creado');
    }
    setEditingId(null);
    setForm({ unitId: form.unitId, title: '', type: 'concepto', description: '' });
  };

  const edit = (item: ContentItem) => {
    setEditingId(item.id);
    setForm({ unitId: item.unitId, title: item.title, type: item.type, description: item.description });
  };

  const visibleItems = useMemo(() => items.filter(item => {
    const matchesUnit = unitFilter === 'all' || item.unitId === unitFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const query = search.toLowerCase();
    const matchesSearch = !query || item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query);
    return matchesUnit && matchesType && matchesSearch;
  }), [items, search, typeFilter, unitFilter]);

  return (
    <Panel title="Contenidos didácticos" description="Organiza conceptos, procedimientos, actitudes y recursos por unidad de trabajo.">
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <select className={inputClass} value={form.unitId} onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
          <option value="">Unidad…</option>
          {workUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.code} · {unit.name}</option>)}
        </select>
        <input className={`${inputClass} md:col-span-2`} placeholder="Título del contenido" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          <option value="concepto">Concepto</option>
          <option value="procedimiento">Procedimiento</option>
          <option value="actitud">Actitud</option>
          <option value="recurso">Recurso</option>
        </select>
        <textarea className={`${inputClass} md:col-span-3`} rows={2} placeholder="Descripción o enlace" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="flex gap-2">
          <button className={`${primaryButton} flex-1`} onClick={save}><Save size={16} />{editingId ? 'Actualizar' : 'Añadir'}</button>
          {editingId && <button className="px-3 border border-border rounded-md text-sm" onClick={() => { setEditingId(null); setForm({ unitId: '', title: '', type: 'concepto', description: '' }); }}>Cancelar</button>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-5 border-t border-border pt-4">
        <label className="relative"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><input className={`${inputClass} pl-9`} placeholder="Buscar contenido…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <select className={inputClass} value={unitFilter} onChange={e => setUnitFilter(e.target.value)}><option value="all">Todas las unidades</option>{workUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.code}</option>)}</select>
        <select className={inputClass} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="all">Todos los tipos</option>{['concepto', 'procedimiento', 'actitud', 'recurso'].map(type => <option key={type} value={type}>{type}</option>)}</select>
      </div>

      <div className="space-y-4">{workUnits.map(unit => {
        const unitItems = visibleItems.filter(item => item.unitId === unit.id);
        if (unitFilter !== 'all' && unitFilter !== unit.id) return null;
        return <div key={unit.id} className="border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 text-sm font-semibold">{unit.code} · {unit.name} <span className="text-muted-foreground font-normal">({unitItems.length})</span></div>
          {unitItems.length === 0 ? <p className="px-4 py-3 text-xs text-muted-foreground">Sin contenidos que coincidan con los filtros.</p> : unitItems.map(item => <div key={item.id} className="px-4 py-3 border-t border-border flex gap-3 items-start">
            <span className="text-[10px] uppercase rounded bg-primary/10 text-primary px-2 py-1">{item.type}</span>
            <div className="flex-1"><p className="text-sm font-medium">{item.title}</p><p className="text-xs text-muted-foreground mt-1">{item.description}</p></div>
            <button className="text-xs text-primary" onClick={() => edit(item)}>Editar</button>
            <button aria-label="Eliminar contenido" onClick={() => persist(items.filter(current => current.id !== item.id))}><Trash2 size={15} className="text-danger" /></button>
          </div>)}
        </div>;
      })}</div>
    </Panel>
  );
}

export function CalendarFeature() {
  const { activeModuleId, calendarEvents, refreshCalendarEvents } = useEduTrack();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<'month' | 'list'>('month');
  const [form, setForm] = useState({ date: '', title: '', type: 'otro' as CalendarEvent['type'], notes: '' });
  const categories: CalendarEvent['type'][] = ['entrega', 'examen', 'tutoría', 'festivo', 'reunión', 'otro'];

  const save = async () => {
    if (!form.date || !form.title.trim()) return toast.error('Fecha y título son obligatorios');
    await calendarEventService.upsert({ id: crypto.randomUUID(), moduleId: activeModuleId, ...form });
    await refreshCalendarEvents();
    setForm({ date: '', title: '', type: 'otro', notes: '' });
    toast.success('Evento guardado');
  };

  const remove = async (id: string) => {
    await calendarEventService.delete(id);
    await refreshCalendarEvents();
    toast.success('Evento eliminado');
  };

  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const keyFor = (date: Date) => date.toISOString().slice(0, 10);
  const sortedEvents = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date));

  return <div className="space-y-6">
    <Panel title="Nuevo evento" description="Registra entregas, exámenes, tutorías, reuniones y otras fechas relevantes.">
      <div className="grid md:grid-cols-6 gap-3">
        <input type="date" className={inputClass} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        <input className={`${inputClass} md:col-span-2`} placeholder="Título" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <select className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CalendarEvent['type'] }))}>{categories.map(category => <option key={category}>{category}</option>)}</select>
        <input className={inputClass} placeholder="Notas" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <button className={primaryButton} onClick={save}><Plus size={16} />Guardar</button>
      </div>
    </Panel>
    <Panel title="Calendario del módulo" actions={<div className="flex gap-2"><button className={`px-3 py-1.5 rounded text-xs ${view === 'month' ? 'bg-primary text-white' : 'bg-muted'}`} onClick={() => setView('month')}>Mes</button><button className={`px-3 py-1.5 rounded text-xs ${view === 'list' ? 'bg-primary text-white' : 'bg-muted'}`} onClick={() => setView('list')}>Lista</button></div>}>
      {view === 'month' ? <>
        <div className="flex items-center justify-center gap-4 mb-4"><button aria-label="Mes anterior" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><p className="font-semibold min-w-44 text-center capitalize">{cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p><button aria-label="Mes siguiente" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div>
        <div className="grid grid-cols-7 border-l border-t border-border text-xs">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(label => <div key={label} className="p-2 text-center font-semibold bg-muted border-r border-b border-border">{label}</div>)}{days.map(day => { const dateKey = keyFor(day); const events = calendarEvents.filter(event => event.date === dateKey); return <div key={dateKey} className={`min-h-24 p-2 border-r border-b border-border ${day.getMonth() === cursor.getMonth() ? 'bg-card' : 'bg-muted/30 text-muted-foreground'}`}><p className="font-semibold mb-1">{day.getDate()}</p>{events.slice(0, 3).map(event => <button key={event.id} title={event.notes} onClick={() => remove(event.id)} className="block w-full truncate text-left rounded bg-primary/10 text-primary px-1.5 py-1 mb-1">{event.title}</button>)}{events.length > 3 && <span>+{events.length - 3}</span>}</div>; })}</div>
      </> : <div className="space-y-3">{sortedEvents.length === 0 ? <p className="text-sm text-muted-foreground">No hay eventos.</p> : sortedEvents.map(event => <div key={event.id} className="border border-border rounded-lg p-3 flex items-center gap-3"><CalendarDays size={17} className="text-primary" /><div className="w-28 text-xs font-semibold">{new Date(`${event.date}T12:00:00`).toLocaleDateString('es-ES')}</div><span className="text-[10px] uppercase bg-muted rounded px-2 py-1">{event.type}</span><div className="flex-1"><p className="text-sm font-medium">{event.title}</p>{event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}</div><button onClick={() => remove(event.id)}><Trash2 size={15} className="text-danger" /></button></div>)}</div>}
    </Panel>
  </div>;
}

export function GanttFeature() {
  const { activities, workUnits, evaluations } = useEduTrack();
  const [evaluationFilter, setEvaluationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = activities.filter(activity => (evaluationFilter === 'all' || activity.evaluationId === evaluationFilter) && (statusFilter === 'all' || activity.status === statusFilter));
  const dates = filtered.map(activity => activity.dueDate).filter(Boolean).sort();
  const min = dates[0] ? new Date(dates[0]).getTime() - 21 * 86400000 : Date.now();
  const max = dates.at(-1) ? new Date(dates.at(-1)!).getTime() + 3 * 86400000 : min + 30 * 86400000;
  return <Panel title="Cronograma de actividades" description="Secuencia temporal, progreso de corrección y estado de las actividades." actions={<Filter size={17} className="text-muted-foreground" />}>
    <div className="grid sm:grid-cols-2 gap-3 mb-6"><select className={inputClass} value={evaluationFilter} onChange={e => setEvaluationFilter(e.target.value)}><option value="all">Todas las evaluaciones</option>{evaluations.map(evaluation => <option key={evaluation.id} value={evaluation.id}>{evaluation.name}</option>)}</select><select className={inputClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Todos los estados</option>{Array.from(new Set(activities.map(activity => activity.status))).map(status => <option key={status}>{status}</option>)}</select></div>
    <div className="space-y-5">{workUnits.map(unit => { const unitActivities = filtered.filter(activity => activity.unitId === unit.id); if (!unitActivities.length) return null; return <div key={unit.id}><div className="flex justify-between mb-2"><p className="text-sm font-semibold">{unit.code} · {unit.name}</p><span className="text-xs text-muted-foreground">Impartida: {unit.taughtPercentage}%</span></div><div className="space-y-2">{unitActivities.map(activity => { const due = new Date(activity.dueDate).getTime(); const start = due - 14 * 86400000; const left = Math.max(0, ((start - min) / Math.max(1, max - min)) * 100); const width = Math.max(4, ((due - start) / Math.max(1, max - min)) * 100); const progress = activity.correctionCount ? Math.round((activity.reviewedCount / activity.correctionCount) * 100) : 0; return <div key={activity.id} className="grid grid-cols-[minmax(150px,260px)_1fr_80px] gap-3 items-center"><div><p className="truncate text-xs font-medium" title={activity.name}>{activity.name}</p><p className="text-[10px] text-muted-foreground">{activity.status}</p></div><div className="h-8 bg-muted rounded relative overflow-hidden"><div className="absolute h-full rounded bg-primary/75 flex items-center px-2 text-[10px] text-white" style={{ left: `${left}%`, width: `${width}%` }} title={`Entrega: ${activity.dueDate}`}>{activity.dueDate}</div></div><div className="text-right"><p className="text-xs font-semibold">{progress}%</p><p className="text-[10px] text-muted-foreground">corregido</p></div></div>; })}</div></div>; })}{filtered.length === 0 && <p className="text-sm text-muted-foreground">No hay actividades que coincidan con los filtros.</p>}</div>
  </Panel>;
}

export function SeatingFeature() {
  const { activeModuleId, students } = useEduTrack();
  const storageKey = `edutrack:${activeModuleId}:seating`;
  const dimensionKey = `${storageKey}:dimensions`;
  const [seats, setSeats] = useState<SeatMap>({});
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(5);
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [draggedSeatId, setDraggedSeatId] = useState<string | null>(null);
  const [status, setStatus] = useState('Arrastra un alumno hasta su puesto.');
  useEffect(() => { setSeats(readStored(storageKey, {})); const dimensions = readStored(dimensionKey, { rows: 3, columns: 5 }); setRows(dimensions.rows); setColumns(dimensions.columns); }, [dimensionKey, storageKey]);
  const persist = (next: SeatMap) => { setSeats(next); localStorage.setItem(storageKey, JSON.stringify(next)); };
  const clearDrag = () => { setDraggedStudentId(null); setDraggedSeatId(null); };
  const assign = (targetSeat: string, studentId: string) => {
    const next = { ...seats };
    const sourceSeat = Object.keys(next).find(seat => next[seat] === studentId);
    const targetStudent = next[targetSeat];
    if (sourceSeat && sourceSeat !== targetSeat) {
      if (targetStudent) next[sourceSeat] = targetStudent;
      else delete next[sourceSeat];
    }
    next[targetSeat] = studentId;
    persist(next);
    clearDrag();
    setStatus(sourceSeat && targetStudent ? 'Alumnos intercambiados.' : 'Puesto actualizado.');
  };
  const unassign = (seat: string) => {
    const next = { ...seats };
    delete next[seat];
    persist(next);
    clearDrag();
    setStatus('Alumno devuelto a la lista de pendientes.');
  };
  const saveDimensions = (nextRows: number, nextColumns: number) => { setRows(nextRows); setColumns(nextColumns); localStorage.setItem(dimensionKey, JSON.stringify({ rows: nextRows, columns: nextColumns })); };
  const pendingStudents = students.filter(student => !Object.values(seats).includes(student.id));
  const seatIds = Array.from({ length: rows * columns }, (_, index) => `P${index + 1}`);
  return <Panel title="Aula · Distribución de puestos" description="Arrastra al alumnado a un puesto, intercambia dos puestos o suelta un alumno en pendientes para liberarlo. La distribución se guarda por módulo." actions={<button className="text-xs text-danger" onClick={() => { persist({}); setStatus('Plano vaciado.'); }}>Vaciar plano</button>}>
    <div className="flex flex-wrap gap-4 mb-5"><label className="text-xs">Filas<input type="number" min="1" max="8" className={`${inputClass} mt-1 w-24`} value={rows} onChange={e => saveDimensions(Math.max(1, Number(e.target.value)), columns)} /></label><label className="text-xs">Columnas<input type="number" min="1" max="10" className={`${inputClass} mt-1 w-24`} value={columns} onChange={e => saveDimensions(rows, Math.max(1, Number(e.target.value)))} /></label><div className="flex-1 min-w-48 self-end text-center py-2 rounded bg-muted text-xs font-semibold">PIZARRA</div></div>
    <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">{status}</p>
    <div className="grid xl:grid-cols-[minmax(0,1fr)_280px] gap-5">
      <div className="overflow-x-auto pb-2">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(140px, 1fr))`, minWidth: `${columns * 150}px` }}>
          {seatIds.map(seat => { const student = students.find(candidate => candidate.id === seats[seat]); return <div key={seat}
            draggable={Boolean(student)}
            onDragStart={() => { if (!student) return; setDraggedStudentId(student.id); setDraggedSeatId(seat); setStatus(`Moviendo a ${student.name}.`); }}
            onDragEnd={clearDrag}
            onDragOver={event => event.preventDefault()}
            onDrop={() => draggedStudentId && assign(seat, draggedStudentId)}
            onDoubleClick={() => student && unassign(seat)}
            className={`min-h-28 rounded-xl border-2 p-3 transition-colors ${student ? 'cursor-grab border-primary/30 bg-primary/5 active:cursor-grabbing' : 'border-dashed border-border bg-muted/20'} ${draggedSeatId === seat ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-2 mb-3"><span className="flex items-center gap-1.5 text-xs font-semibold"><Armchair size={15} className="text-primary" />{seat}</span>{student && <button type="button" className="text-[10px] text-danger hover:underline" onClick={() => unassign(seat)}>Quitar</button>}</div>
            {student ? <div className="flex items-center gap-2"><div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{student.avatar}</div><div className="min-w-0"><p className="truncate text-xs font-semibold">{student.name}</p><Link href={`/students-tutoring/${student.id}`} onClick={event => event.stopPropagation()} className="text-[10px] font-semibold text-primary hover:underline">Ver ficha</Link></div></div> : <div className="flex h-12 items-center justify-center text-center text-[11px] text-muted-foreground">Arrastra un alumno aquí</div>}
          </div>; })}
        </div>
      </div>
      <aside onDragOver={event => event.preventDefault()} onDrop={() => draggedSeatId && unassign(draggedSeatId)} className="rounded-xl border border-border bg-muted/20 p-3">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Pendientes de colocar</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{pendingStudents.length}</span></div>
        <div className="space-y-2">{pendingStudents.map(student => <div key={student.id} draggable onDragStart={() => { setDraggedStudentId(student.id); setDraggedSeatId(null); setStatus(`Colocando a ${student.name}.`); }} onDragEnd={clearDrag} className="flex cursor-grab items-center gap-2 rounded-lg border border-border bg-card p-2 active:cursor-grabbing"><div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{student.avatar}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{student.name}</p><p className="text-[10px] text-muted-foreground">NIA {student.nia}</p></div><Link href={`/students-tutoring/${student.id}`} className="text-[10px] font-semibold text-primary hover:underline">Ficha</Link></div>)}{pendingStudents.length === 0 && <p className="py-5 text-center text-xs text-muted-foreground">Todo el alumnado está colocado.</p>}</div>
        <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">También puedes hacer doble clic en un puesto ocupado para liberarlo.</p>
      </aside>
    </div>
  </Panel>;
}

export function CorrectionsFeature() {
  const { activities, students, criteria, grades, refreshGrades } = useEduTrack();
  const [activityId, setActivityId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [submission, setSubmission] = useState('');
  const [result, setResult] = useState<{ grade: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedActivity = params.get('activity');
    const requestedStudent = params.get('student');
    if (requestedActivity) setActivityId(requestedActivity);
    if (requestedStudent) setStudentId(requestedStudent);
  }, []);
  const selectedActivity = activities.find(activity => activity.id === activityId);
  const existingGrade = grades.find(grade => grade.activityId === activityId && grade.studentId === studentId)?.grade;
  const correct = async () => {
    if (!selectedActivity || !studentId || !submission.trim()) return toast.error('Completa actividad, alumno y entrega');
    setLoading(true); setResult(null);
    try {
      const related = criteria.filter(criterion => selectedActivity.ceIds.includes(criterion.id));
      const prompt = `Actúa como docente de FP. Corrige la entrega para la actividad "${selectedActivity.name}". Descripción: ${selectedActivity.description}. Criterios: ${related.map(criterion => `${criterion.code}: ${criterion.description} (${criterion.weight}%)`).join('; ')}. Entrega: ${submission}. Devuelve solo JSON válido con {"grade": número de 0 a 10, "feedback": "comentario claro y accionable"}.`;
      const response = await getChatCompletion('OPEN_AI', 'gpt-4o', [{ role: 'user', content: prompt }], { temperature: 0.2 });
      const raw = response?.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
      setResult({ grade: Math.min(10, Math.max(0, Number(parsed.grade))), feedback: String(parsed.feedback) });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar la corrección');
    } finally { setLoading(false); }
  };
  const save = async () => { if (!result) return; await gradeService.upsertGrade(studentId, activityId, result.grade); await refreshGrades(); toast.success('Calificación guardada'); };
  return <div className="grid xl:grid-cols-[1fr_320px] gap-6"><Panel title="Corrección asistida" description="La IA propone una nota a partir de los criterios reales; el docente siempre la revisa antes de guardarla.">
    <div className="grid md:grid-cols-2 gap-3 mb-3"><select className={inputClass} value={activityId} onChange={e => setActivityId(e.target.value)}><option value="">Actividad…</option>{activities.map(activity => <option key={activity.id} value={activity.id}>{activity.name}</option>)}</select><select className={inputClass} value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">Alumno…</option>{students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}</select></div>
    {existingGrade !== undefined && <p className="mb-3 text-xs text-muted-foreground">Calificación actual: <strong>{existingGrade ?? 'Sin calificar'}</strong></p>}
    <textarea className={inputClass} rows={12} placeholder="Pega aquí la entrega del alumno…" value={submission} onChange={e => setSubmission(e.target.value)} /><button className={`${primaryButton} mt-3`} disabled={loading} onClick={correct}><Bot size={16} />{loading ? 'Corrigiendo…' : 'Corregir con IA'}</button>
    {result && <div className="mt-5 border border-primary/30 bg-primary/5 rounded-lg p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold">Propuesta revisable</p><label className="flex items-center gap-2 text-sm">Nota <input type="number" min="0" max="10" step="0.1" className="w-20 border rounded px-2 py-1" value={result.grade} onChange={e => setResult({ ...result, grade: Number(e.target.value) })} /></label></div><textarea className={`${inputClass} mt-3`} rows={6} value={result.feedback} onChange={e => setResult({ ...result, feedback: e.target.value })} /><button className={`${primaryButton} mt-4`} onClick={save}><Save size={16} />Guardar nota revisada</button></div>}
  </Panel><Panel title="Criterios aplicados" description="Criterios asociados a la actividad seleccionada."><div className="space-y-3">{selectedActivity ? criteria.filter(criterion => selectedActivity.ceIds.includes(criterion.id)).map(criterion => <div key={criterion.id} className="border border-border rounded-lg p-3"><div className="flex justify-between"><strong className="text-xs text-primary">{criterion.code}</strong><span className="text-xs">{criterion.weight}%</span></div><p className="text-xs text-muted-foreground mt-1">{criterion.description}</p></div>) : <p className="text-sm text-muted-foreground">Selecciona una actividad.</p>}</div></Panel></div>;
}

export function GradeImportFeature() {
  const { students, activities, refreshGrades } = useEduTrack();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const validate = (raw: Record<string, unknown>[]) => setRows(raw.map(item => { const nia = String(item.nia ?? item.NIA ?? '').trim(); const activity = String(item.activity ?? item.actividad ?? item.Actividad ?? '').trim(); const grade = Number(item.grade ?? item.nota ?? item.Nota); const student = students.find(candidate => candidate.nia === nia); const matchedActivity = activities.find(candidate => candidate.id === activity || candidate.name.toLowerCase() === activity.toLowerCase()); let error = ''; if (!student) error = 'NIA no encontrado'; else if (!matchedActivity) error = 'Actividad no encontrada'; else if (!Number.isFinite(grade) || grade < 0 || grade > 10) error = 'Nota inválida'; return { nia, activity, grade, studentId: student?.id, activityId: matchedActivity?.id, error }; }));
  const load = async (file: File) => { try { setFileName(file.name); const XLSX = await import('xlsx'); const book = XLSX.read(await file.arrayBuffer()); validate(XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '' })); } catch { toast.error('No se pudo leer el fichero'); } };
  const save = async () => { const valid = rows.filter(row => !row.error && row.studentId && row.activityId); setSaving(true); try { await Promise.all(valid.map(row => gradeService.upsertGrade(row.studentId!, row.activityId!, row.grade))); await refreshGrades(); toast.success(`${valid.length} calificaciones importadas`); setRows([]); setFileName(''); } finally { setSaving(false); } };
  const validCount = rows.filter(row => !row.error).length;
  return <Panel title="Importación de calificaciones" description="Proceso de validación previo: ninguna fila errónea se aplica." actions={<button className="text-xs text-primary flex gap-1 items-center" onClick={() => downloadText('plantilla_notas.csv', 'nia,actividad,nota\n123456,Nombre de actividad,8.5')}><Download size={14} />Descargar plantilla</button>}>
    <div className="flex items-center justify-center gap-3 mb-5 text-xs"><span className={`rounded-full px-3 py-1 ${!rows.length ? 'bg-primary text-white' : 'bg-muted'}`}>1. Archivo</span><span className={`rounded-full px-3 py-1 ${rows.length ? 'bg-primary text-white' : 'bg-muted'}`}>2. Validación</span><span className="rounded-full px-3 py-1 bg-muted">3. Aplicación</span></div>
    <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center cursor-pointer hover:bg-muted/30"><Upload size={28} className="text-primary mb-2" /><span className="text-sm font-semibold">{fileName || 'Seleccionar CSV o Excel'}</span><span className="text-xs text-muted-foreground mt-1">Columnas: nia, actividad y nota</span><input className="hidden" type="file" accept=".csv,.xlsx,.xls" onChange={e => e.target.files?.[0] && load(e.target.files[0])} /></label>
    {rows.length > 0 && <><div className="flex gap-3 mt-5 mb-3"><span className="text-xs rounded bg-green-100 text-green-700 px-2 py-1">{validCount} válidas</span><span className="text-xs rounded bg-red-100 text-red-700 px-2 py-1">{rows.length - validCount} con errores</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">NIA</th><th className="text-left p-2">Actividad</th><th className="text-right p-2">Nota</th><th className="text-left p-2">Estado</th></tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b"><td className="p-2">{row.nia}</td><td className="p-2">{row.activity}</td><td className="p-2 text-right">{Number.isFinite(row.grade) ? row.grade : '—'}</td><td className={`p-2 ${row.error ? 'text-danger' : 'text-green-700'}`}>{row.error || 'Correcto'}</td></tr>)}</tbody></table></div><button className={`${primaryButton} mt-4`} disabled={saving || validCount === 0} onClick={save}><Save size={16} />{saving ? 'Importando…' : `Aplicar ${validCount} calificaciones válidas`}</button></>}
  </Panel>;
}

export function CourseManagementFeature() {
  const { activeModuleId, modules, activeModule, students, setActiveModuleId } = useEduTrack();
  const storageKey = `edutrack:${activeModuleId}:academic-management`;
  const [tab, setTab] = useState<'modules' | 'groups' | 'enrollments' | 'scales'>('modules');
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [moduleForm, setModuleForm] = useState({ code: '', name: '', cycle: '', course: new Date().getFullYear() + '–' + (new Date().getFullYear() + 1) });
  const [groupForm, setGroupForm] = useState({ name: '', tutor: '', room: '' });
  const [scaleForm, setScaleForm] = useState({ name: '', passingGrade: 5, latePenalty: 0 });
  useEffect(() => { const stored = readStored(storageKey, { groups: [] as ClassGroup[], scales: [] as GradingScale[] }); setGroups(stored.groups); setScales(stored.scales); }, [storageKey]);
  const persist = (nextGroups: ClassGroup[], nextScales: GradingScale[]) => { setGroups(nextGroups); setScales(nextScales); localStorage.setItem(storageKey, JSON.stringify({ groups: nextGroups, scales: nextScales })); };
  const addModule = async () => { if (!moduleForm.code.trim() || !moduleForm.name.trim() || !moduleForm.cycle.trim()) return toast.error('Código, nombre y ciclo son obligatorios'); const id = `module-${crypto.randomUUID()}`; await moduleService.upsert({ id, ...moduleForm, evaluationCount: 2, totalStudents: 0 }); setActiveModuleId(id); toast.success('Módulo creado'); window.location.reload(); };
  const removeModule = async (id: string) => { if (modules.length <= 1) return toast.error('Debe existir al menos un módulo'); if (!confirm('Se eliminará el módulo y todos sus datos relacionados. ¿Continuar?')) return; await moduleService.delete(id); if (id === activeModule?.id) setActiveModuleId(modules.find(module => module.id !== id)!.id); toast.success('Módulo eliminado'); window.location.reload(); };
  const tabs = [{ id: 'modules', label: 'Módulos' }, { id: 'groups', label: 'Grupos' }, { id: 'enrollments', label: 'Matrículas' }, { id: 'scales', label: 'Escalas' }] as const;
  return <div className="space-y-5"><div className="flex gap-2 border-b border-border">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`px-4 py-2 text-sm border-b-2 ${tab === item.id ? 'border-primary text-primary font-semibold' : 'border-transparent text-muted-foreground'}`}>{item.label}</button>)}</div>
    {tab === 'modules' && <Panel title="Módulos formativos" description="Crea, activa o elimina módulos de EduTrack."><div className="space-y-2 mb-5">{modules.map(module => <div key={module.id} className={`border rounded-lg p-3 flex items-center gap-3 ${module.id === activeModule?.id ? 'border-primary bg-primary/5' : 'border-border'}`}><Users size={17} className="text-primary" /><button className="flex-1 text-left" onClick={() => setActiveModuleId(module.id)}><p className="text-sm font-semibold">{module.code} · {module.name}</p><p className="text-xs text-muted-foreground">{module.cycle} · {module.course} · {module.totalStudents} alumnos</p></button><button onClick={() => removeModule(module.id)}><Trash2 size={15} className="text-danger" /></button></div>)}</div><div className="grid sm:grid-cols-2 gap-3"><input className={inputClass} placeholder="Código" value={moduleForm.code} onChange={e => setModuleForm(form => ({ ...form, code: e.target.value }))} /><input className={inputClass} placeholder="Nombre" value={moduleForm.name} onChange={e => setModuleForm(form => ({ ...form, name: e.target.value }))} /><input className={inputClass} placeholder="Ciclo y curso" value={moduleForm.cycle} onChange={e => setModuleForm(form => ({ ...form, cycle: e.target.value }))} /><input className={inputClass} placeholder="Curso académico" value={moduleForm.course} onChange={e => setModuleForm(form => ({ ...form, course: e.target.value }))} /></div><button className={`${primaryButton} mt-3`} onClick={addModule}><Plus size={16} />Crear módulo</button></Panel>}
    {tab === 'groups' && <Panel title="Grupos de clase" description="Define grupos, tutoría y aula para el módulo activo."><div className="grid md:grid-cols-4 gap-3 mb-4"><input className={inputClass} placeholder="Nombre del grupo" value={groupForm.name} onChange={e => setGroupForm(form => ({ ...form, name: e.target.value }))} /><input className={inputClass} placeholder="Tutor/a" value={groupForm.tutor} onChange={e => setGroupForm(form => ({ ...form, tutor: e.target.value }))} /><input className={inputClass} placeholder="Aula" value={groupForm.room} onChange={e => setGroupForm(form => ({ ...form, room: e.target.value }))} /><button className={primaryButton} onClick={() => { if (!groupForm.name.trim()) return toast.error('Indica el nombre del grupo'); persist([...groups, { id: crypto.randomUUID(), ...groupForm }], scales); setGroupForm({ name: '', tutor: '', room: '' }); }}>Añadir grupo</button></div><div className="space-y-2">{groups.map(group => <div key={group.id} className="border border-border rounded-lg p-3 flex items-center"><div className="flex-1"><p className="text-sm font-semibold">{group.name}</p><p className="text-xs text-muted-foreground">Tutoría: {group.tutor || '—'} · Aula: {group.room || '—'}</p></div><button onClick={() => persist(groups.filter(current => current.id !== group.id), scales)}><Trash2 size={15} className="text-danger" /></button></div>)}{groups.length === 0 && <p className="text-sm text-muted-foreground">No hay grupos creados.</p>}</div></Panel>}
    {tab === 'enrollments' && <Panel title="Matrículas del módulo" description="Consulta el alumnado matriculado y su situación académica."><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left p-2">NIA</th><th className="text-left p-2">Alumno</th><th className="text-left p-2">Correo</th><th className="text-right p-2">Nota</th><th className="text-left p-2">Riesgo</th></tr></thead><tbody>{students.map(student => <tr key={student.id} className="border-b"><td className="p-2">{student.nia}</td><td className="p-2 font-medium">{student.name}</td><td className="p-2 text-muted-foreground">{student.email}</td><td className="p-2 text-right">{student.moduleGrade ?? '—'}</td><td className="p-2 capitalize">{student.riskLevel}</td></tr>)}</tbody></table></div></Panel>}
    {tab === 'scales' && <Panel title="Escalas de calificación" description="Configura reglas de aprobado y penalización por retraso."><div className="grid md:grid-cols-4 gap-3 mb-4"><input className={inputClass} placeholder="Nombre" value={scaleForm.name} onChange={e => setScaleForm(form => ({ ...form, name: e.target.value }))} /><input type="number" min="0" max="10" step="0.1" className={inputClass} value={scaleForm.passingGrade} onChange={e => setScaleForm(form => ({ ...form, passingGrade: Number(e.target.value) }))} /><input type="number" min="0" max="100" className={inputClass} value={scaleForm.latePenalty} onChange={e => setScaleForm(form => ({ ...form, latePenalty: Number(e.target.value) }))} /><button className={primaryButton} onClick={() => { if (!scaleForm.name.trim()) return toast.error('Indica un nombre'); persist(groups, [...scales, { id: crypto.randomUUID(), ...scaleForm }]); setScaleForm({ name: '', passingGrade: 5, latePenalty: 0 }); }}>Añadir escala</button></div><div className="space-y-2">{scales.map(scale => <div key={scale.id} className="border border-border rounded-lg p-3 flex items-center"><div className="flex-1"><p className="text-sm font-semibold">{scale.name}</p><p className="text-xs text-muted-foreground">Aprobado desde {scale.passingGrade} · Penalización tardía {scale.latePenalty}%</p></div><button onClick={() => persist(groups, scales.filter(current => current.id !== scale.id))}><Trash2 size={15} className="text-danger" /></button></div>)}{scales.length === 0 && <p className="text-sm text-muted-foreground">No hay escalas personalizadas.</p>}</div></Panel>}
  </div>;
}
