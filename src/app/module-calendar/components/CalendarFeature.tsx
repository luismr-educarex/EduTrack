'use client';

import { type CSSProperties, type DragEvent, useMemo, useState } from 'react';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Panel, inputClass, primaryButton } from '@/components/AddedCapabilities';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { CalendarEvent, calendarEventService } from '@/lib/services/edutrackService';

type CalendarItem = CalendarEvent & { key: string; source: 'event' | 'activity' };
type CalendarView = 'month' | 'week' | 'evaluations';

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function fromDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function startOfWeek(value: Date) {
  const result = new Date(value);
  result.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return result;
}

function displayDate(value: string, options: Intl.DateTimeFormatOptions) {
  return fromDateKey(value).toLocaleDateString('es-ES', options);
}

function hexToRgba(hex: string, alpha: number) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#64748b';
  const number = Number.parseInt(safe.slice(1), 16);
  return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
}

export default function CalendarFeature() {
  const {
    activeModule,
    activeModuleId,
    activities,
    calendarEvents,
    calendarEventTypes,
    evaluations,
    refreshCalendarEvents,
    workUnits,
  } = useEduTrack();
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today));
  const [view, setView] = useState<CalendarView>('month');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const fallbackType = calendarEventTypes.find((type) => type.code === 'otro')?.code ?? 'otro';
  const [form, setForm] = useState({ date: '', title: '', type: 'otro', notes: '' });

  const typeMap = useMemo(
    () => new Map(calendarEventTypes.map((type) => [type.code, type])),
    [calendarEventTypes]
  );
  const typeFor = (code: string) =>
    typeMap.get(code) ??
    typeMap.get('otro') ?? {
      id: 'fallback',
      moduleId: activeModuleId,
      code,
      name: code,
      color: '#64748b',
      sortOrder: 999,
    };
  const labelStyle = (code: string): CSSProperties => {
    const color = typeFor(code).color;
    return { color, borderColor: hexToRgba(color, 0.32), backgroundColor: hexToRgba(color, 0.1) };
  };

  const items = useMemo<CalendarItem[]>(() => {
    const saved = calendarEvents.map((event) => ({
      ...event,
      key: `event:${event.id}`,
      source: 'event' as const,
    }));
    const deadlines = activities
      .filter((activity) => Boolean(activity.dueDate))
      .map((activity) => ({
        id: activity.id,
        key: `activity:${activity.id}`,
        source: 'activity' as const,
        moduleId: activeModuleId,
        date: activity.dueDate,
        title: activity.name,
        type: activity.type.toLowerCase().includes('examen') ? 'examen' : 'entrega',
        notes: `Fecha de entrega · ${activity.status}`,
      }));
    return [...saved, ...deadlines].sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    );
  }, [activeModuleId, activities, calendarEvents]);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const monthPrefix = dateKey(monthStart).slice(0, 7);
  const monthItems = items.filter((item) => item.date.startsWith(monthPrefix));
  const holidays = new Set(
    monthItems.filter((item) => item.type === 'festivo').map((item) => item.date)
  );
  const workingDays = Array.from(
    { length: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate() },
    (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1)
  ).filter((day) => day.getDay() !== 0 && day.getDay() !== 6 && !holidays.has(dateKey(day))).length;
  const selectedItem = items.find((item) => item.key === selectedKey);
  const monthTitle = cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const weekTitle = `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const resetForm = () => {
    setEditingId(null);
    setForm({ date: '', title: '', type: fallbackType, notes: '' });
    setShowForm(false);
  };

  const startNew = (date = '') => {
    setEditingId(null);
    setForm({ date, title: '', type: fallbackType, notes: '' });
    setShowForm(true);
  };

  const startEdit = (item: CalendarItem) => {
    if (item.source !== 'event') return;
    setEditingId(item.id);
    setForm({ date: item.date, title: item.title, type: item.type, notes: item.notes ?? '' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.date || !form.title.trim()) return toast.error('Fecha y título son obligatorios');
    await calendarEventService.upsert({
      id: editingId ?? crypto.randomUUID(),
      moduleId: activeModuleId,
      date: form.date,
      title: form.title.trim(),
      type: form.type,
      notes: form.notes.trim(),
    });
    await refreshCalendarEvents();
    resetForm();
    toast.success(editingId ? 'Evento actualizado' : 'Evento guardado');
  };

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este evento del calendario?')) return;
    await calendarEventService.delete(id);
    await refreshCalendarEvents();
    setSelectedKey(null);
    toast.success('Evento eliminado');
  };

  const dropOn = async (date: string) => {
    const item = items.find((candidate) => candidate.key === draggingKey);
    setDraggingKey(null);
    if (!item || item.source !== 'event' || item.date === date) return;
    await calendarEventService.upsert({ ...item, date });
    await refreshCalendarEvents();
    setSelectedKey(item.key);
    toast.success(`Evento movido al ${displayDate(date, { day: 'numeric', month: 'long' })}`);
  };

  const moveCursor = (direction: number) => {
    if (view === 'week') {
      const next = new Date(cursor);
      next.setDate(cursor.getDate() + direction * 7);
      setCursor(next);
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1));
    }
  };

  const EventButton = ({ item }: { item: CalendarItem }) => (
    <button
      type="button"
      draggable={item.source === 'event'}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        setDraggingKey(item.key);
      }}
      onDragEnd={() => setDraggingKey(null)}
      onClick={() => setSelectedKey(item.key)}
      title={`${item.title}${item.source === 'event' ? ' · Arrastra para cambiar de día' : ''}`}
      className={`block w-full truncate rounded border px-1.5 py-1 text-left text-[10px] font-medium hover:shadow-sm ${selectedKey === item.key ? 'ring-1 ring-primary' : ''} ${draggingKey === item.key ? 'opacity-50' : ''}`}
      style={labelStyle(item.type)}
    >
      {item.title}
    </button>
  );

  const DetailPanel = () =>
    selectedItem ? (
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <span
            className="rounded border px-2 py-1 text-[10px] font-semibold"
            style={labelStyle(selectedItem.type)}
          >
            {typeFor(selectedItem.type).name}
          </span>
          <button
            type="button"
            aria-label="Cerrar detalle"
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => setSelectedKey(null)}
          >
            <X size={14} />
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold">{selectedItem.title}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Clock3 size={13} className="mt-0.5 shrink-0" />
          {displayDate(selectedItem.date, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        {selectedItem.notes && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{selectedItem.notes}</p>
        )}
        {selectedItem.source === 'event' && (
          <div className="mt-4 flex gap-2 border-t border-border pt-3">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 py-2 text-xs font-medium hover:bg-muted"
              onClick={() => startEdit(selectedItem)}
            >
              <Pencil size={13} /> Editar
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-danger hover:bg-danger/10"
              onClick={() => remove(selectedItem.id)}
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        )}
      </section>
    ) : null;

  const Aside = () => (
    <aside className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Leyenda</h3>
        <div className="mt-3 space-y-2">
          {calendarEventTypes.map((type) => (
            <div key={type.id} className="flex items-center gap-2 text-xs">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: type.color }} />
              <span>{type.name}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Horas por evaluación</h3>
        <div className="mt-3 divide-y divide-border">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="flex items-center justify-between py-2 text-xs">
              <span className="truncate pr-2">{evaluation.name}</span>
              <span className="font-mono font-semibold">
                {workUnits
                  .filter((unit) => unit.evaluationId === evaluation.id)
                  .reduce((total, unit) => total + unit.hours, 0)}{' '}
                h
              </span>
            </div>
          ))}
        </div>
      </section>
      <DetailPanel />
    </aside>
  );

  const DayColumn = ({ day, compact = false }: { day: Date; compact?: boolean }) => {
    const currentKey = dateKey(day);
    const dayItems = items.filter((item) => item.date === currentKey);
    const inMonth = day.getMonth() === cursor.getMonth();
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    return (
      <div
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          if (draggingKey) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          dropOn(currentKey);
        }}
        onDoubleClick={() => startNew(currentKey)}
        className={`${compact ? 'min-h-[28rem]' : 'min-h-28 xl:min-h-32'} border-b border-r border-border p-2 transition-colors ${weekend ? 'bg-slate-200/70 dark:bg-slate-800/60' : inMonth || compact ? 'bg-card' : 'bg-muted/35 text-muted-foreground'} ${draggingKey ? 'hover:bg-primary/10' : ''}`}
      >
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${currentKey === dateKey(today) ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {day.getDate()}
        </span>
        <div className="mt-1 space-y-1">
          {dayItems.slice(0, compact ? 12 : 3).map((item) => (
            <EventButton key={item.key} item={item} />
          ))}
          {!compact && dayItems.length > 3 && (
            <button
              type="button"
              className="text-[10px] font-medium text-primary"
              onClick={() => {
                setCursor(day);
                setView('week');
              }}
            >
              +{dayItems.length - 3} más
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {activeModule?.code ?? 'Módulo'} · calendario académico
            </p>
            <h2 className="mt-1 text-lg font-semibold capitalize">
              {view === 'week'
                ? weekTitle
                : view === 'evaluations'
                  ? 'Planificación por evaluaciones'
                  : monthTitle}
            </h2>
          </div>
          <button type="button" className={primaryButton} onClick={() => startNew(dateKey(today))}>
            <Plus size={16} /> Nuevo evento
          </button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          {[
            { value: workingDays, label: 'días lectivos' },
            { value: monthItems.length, label: 'hitos este mes' },
            {
              value: monthItems.filter((item) => item.type === 'entrega').length,
              label: 'entregas',
            },
            {
              value: monthItems.filter((item) => item.type === 'examen').length,
              label: 'exámenes',
            },
          ].map((metric) => (
            <div key={metric.label} className="px-5 py-3">
              <p className="text-xl font-semibold">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>

      {showForm && (
        <Panel
          title={editingId ? 'Editar evento' : 'Nuevo evento'}
          description="Completa los datos del hito lectivo."
          actions={
            <button
              type="button"
              aria-label="Cerrar formulario"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              onClick={resetForm}
            >
              <X size={16} />
            </button>
          }
        >
          <div className="grid gap-3 md:grid-cols-6">
            <input
              aria-label="Fecha del evento"
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Título del evento"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            <select
              aria-label="Tipo de evento"
              className={inputClass}
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
            >
              {calendarEventTypes.map((type) => (
                <option key={type.id} value={type.code}>
                  {type.name}
                </option>
              ))}
            </select>
            <input
              className={inputClass}
              placeholder="Notas opcionales"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
            <button type="button" className={primaryButton} onClick={save}>
              <Save size={16} /> {editingId ? 'Guardar cambios' : 'Guardar evento'}
            </button>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1">
          {(
            [
              ['month', 'Mes'],
              ['week', 'Semana'],
              ['evaluations', 'Evaluaciones'],
            ] as const
          ).map(([option, label]) => (
            <button
              type="button"
              key={option}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setView(option)}
            >
              {label}
            </button>
          ))}
        </div>
        {view !== 'evaluations' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Periodo anterior"
              className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
              onClick={() => moveCursor(-1)}
            >
              <ChevronLeft size={16} />
            </button>
            <p className="min-w-40 text-center text-sm font-semibold capitalize">
              {view === 'week' ? weekTitle : monthTitle}
            </p>
            <button
              type="button"
              aria-label="Periodo siguiente"
              className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
              onClick={() => moveCursor(1)}
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
              onClick={() => setCursor(new Date(today))}
            >
              Hoy
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <Aside />
        {view === 'month' && (
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b border-border bg-muted/35 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => (
                <div
                  key={label}
                  className={`border-r border-border px-3 py-2.5 last:border-r-0 ${index > 4 ? 'bg-slate-200/70 dark:bg-slate-800/60' : ''}`}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-xs">
              {monthDays.map((day) => (
                <DayColumn key={dateKey(day)} day={day} />
              ))}
            </div>
          </section>
        )}
        {view === 'week' && (
          <section className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <div className="grid min-w-[760px] grid-cols-7 border-b border-border bg-muted/35 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {weekDays.map((day) => (
                <div
                  key={dateKey(day)}
                  className={`border-r border-border px-3 py-2.5 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-slate-200/70 dark:bg-slate-800/60' : ''}`}
                >
                  {day.toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              ))}
            </div>
            <div className="grid min-w-[760px] grid-cols-7 text-xs">
              {weekDays.map((day) => (
                <DayColumn key={dateKey(day)} day={day} compact />
              ))}
            </div>
          </section>
        )}
        {view === 'evaluations' && (
          <section className="space-y-4">
            {evaluations.map((evaluation) => {
              const evaluationItems = items.filter(
                (item) => item.date >= evaluation.startDate && item.date <= evaluation.endDate
              );
              return (
                <div
                  key={evaluation.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-5 py-4">
                    <div>
                      <h3 className="text-sm font-semibold">{evaluation.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {displayDate(evaluation.startDate, { day: 'numeric', month: 'short' })} –{' '}
                        {displayDate(evaluation.endDate, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <CalendarRange size={13} /> {evaluationItems.length} eventos
                    </span>
                  </header>
                  <div className="divide-y divide-border">
                    {evaluationItems.length ? (
                      evaluationItems.map((item) => (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => setSelectedKey(item.key)}
                          className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/30"
                        >
                          <div className="w-20 shrink-0 text-xs font-semibold">
                            {displayDate(item.date, { day: '2-digit', month: 'short' })}
                          </div>
                          <span
                            className="rounded border px-2 py-1 text-[10px] font-semibold"
                            style={labelStyle(item.type)}
                          >
                            {typeFor(item.type).name}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                          <ChevronRight size={15} className="text-muted-foreground" />
                        </button>
                      ))
                    ) : (
                      <p className="px-5 py-4 text-xs text-muted-foreground">
                        No hay eventos en este periodo.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
