'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Panel, inputClass, primaryButton } from '@/components/AddedCapabilities';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { CalendarEvent, calendarEventService } from '@/lib/services/edutrackService';

type CalendarItem = CalendarEvent & { key: string; source: 'event' | 'activity' };

const CATEGORIES: CalendarEvent['type'][] = [
  'entrega',
  'examen',
  'tutoría',
  'festivo',
  'reunión',
  'otro',
];
const LABELS: Record<CalendarEvent['type'], string> = {
  entrega: 'Entrega',
  examen: 'Examen',
  tutoría: 'Tutoría',
  festivo: 'Festivo',
  reunión: 'Reunión',
  otro: 'Actividad lectiva',
};
const STYLES: Record<CalendarEvent['type'], string> = {
  entrega: 'border-primary/25 bg-primary/10 text-primary',
  examen: 'border-danger/25 bg-danger/10 text-danger',
  tutoría: 'border-info/25 bg-info/10 text-info',
  festivo: 'border-red-200 bg-red-50 text-red-700',
  reunión: 'border-warning/30 bg-warning/10 text-amber-700',
  otro: 'border-border bg-muted/60 text-secondary-foreground',
};

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function displayDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-ES', options);
}

export default function CalendarFeature() {
  const {
    activeModule,
    activeModuleId,
    activities,
    calendarEvents,
    evaluations,
    refreshCalendarEvents,
    workUnits,
  } = useEduTrack();
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState<'month' | 'list'>('month');
  const [showForm, setShowForm] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: '',
    title: '',
    type: 'otro' as CalendarEvent['type'],
    notes: '',
  });

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
        type: (activity.type.toLowerCase().includes('examen')
          ? 'examen'
          : 'entrega') as CalendarEvent['type'],
        notes: `Fecha de entrega · ${activity.status}`,
      }));
    return [...saved, ...deadlines].sort(
      (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    );
  }, [activeModuleId, activities, calendarEvents]);

  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const monthPrefix = dateKey(firstDay).slice(0, 7);
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

  const save = async () => {
    if (!form.date || !form.title.trim()) return toast.error('Fecha y título son obligatorios');
    await calendarEventService.upsert({
      id: crypto.randomUUID(),
      moduleId: activeModuleId,
      ...form,
    });
    await refreshCalendarEvents();
    setForm({ date: '', title: '', type: 'otro', notes: '' });
    setShowForm(false);
    toast.success('Evento guardado');
  };

  const remove = async (id: string) => {
    await calendarEventService.delete(id);
    await refreshCalendarEvents();
    setSelectedKey(null);
    toast.success('Evento eliminado');
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {activeModule?.code ?? 'Módulo'} · calendario académico
            </p>
            <h2 className="mt-1 text-lg font-semibold capitalize">{monthTitle}</h2>
          </div>
          <button className={primaryButton} onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Nuevo evento
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
          title="Nuevo evento"
          description="Registra festivos, tutorías, reuniones y otros hitos."
          actions={
            <button
              aria-label="Cerrar formulario"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              onClick={() => setShowForm(false)}
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
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as CalendarEvent['type'],
                }))
              }
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {LABELS[category]}
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
            <button className={primaryButton} onClick={save}>
              <Save size={16} />
              Guardar evento
            </button>
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-1">
          {(['month', 'list'] as const).map((option) => (
            <button
              key={option}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setView(option)}
            >
              {option === 'month' ? 'Mes' : 'Lista'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Mes anterior"
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-40 text-center text-sm font-semibold capitalize">{monthTitle}</p>
          <button
            aria-label="Mes siguiente"
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight size={16} />
          </button>
          <button
            className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Hoy
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Leyenda</h3>
              <div className="mt-3 space-y-2">
                {CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center gap-2 text-xs">
                    <span className={`h-3 w-3 rounded-sm border ${STYLES[category]}`} />
                    <span>{LABELS[category]}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold">Horas por evaluación</h3>
              <div className="mt-3 divide-y divide-border">
                {evaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between py-2 text-xs"
                  >
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
          </aside>
          <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="grid grid-cols-7 border-b border-border bg-muted/35 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, index) => (
                <div
                  key={label}
                  className={`border-r border-border px-3 py-2.5 last:border-r-0 ${index > 4 ? 'bg-muted/40' : ''}`}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-xs">
              {days.map((day) => {
                const currentKey = dateKey(day);
                const dayItems = items.filter((item) => item.date === currentKey);
                const inMonth = day.getMonth() === cursor.getMonth();
                const weekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={currentKey}
                    className={`min-h-28 border-b border-r border-border p-2 xl:min-h-32 ${inMonth ? (weekend ? 'bg-muted/25' : 'bg-card') : 'bg-muted/35 text-muted-foreground'}`}
                  >
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${currentKey === dateKey(today) ? 'bg-primary text-primary-foreground' : ''}`}
                    >
                      {day.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayItems.slice(0, 3).map((item) => (
                        <button
                          key={item.key}
                          title={item.notes}
                          onClick={() => setSelectedKey(item.key)}
                          className={`block w-full truncate rounded border px-1.5 py-1 text-left text-[10px] font-medium hover:shadow-sm ${STYLES[item.type]} ${selectedKey === item.key ? 'ring-1 ring-primary' : ''}`}
                        >
                          {item.title}
                        </button>
                      ))}
                      {dayItems.length > 3 && (
                        <button
                          className="text-[10px] font-medium text-primary"
                          onClick={() => setView('list')}
                        >
                          +{dayItems.length - 3} más
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <header className="border-b border-border px-5 py-4">
            <h3 className="font-semibold">Agenda completa</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Eventos guardados y fechas de entrega de las actividades.
            </p>
          </header>
          <div className="divide-y divide-border">
            {items.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No hay eventos planificados.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setSelectedKey(item.key)}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-muted/30"
                >
                  <div className="w-24 flex-shrink-0">
                    <p className="text-xs font-semibold">
                      {displayDate(item.date, { day: '2-digit', month: 'short' })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {displayDate(item.date, { weekday: 'long' })}
                    </p>
                  </div>
                  <span
                    className={`rounded border px-2 py-1 text-[10px] font-semibold ${STYLES[item.type]}`}
                  >
                    {LABELS[item.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.notes && (
                      <p className="truncate text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {selectedItem && (
        <section className="flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <span
            className={`rounded border px-2 py-1 text-[10px] font-semibold ${STYLES[selectedItem.type]}`}
          >
            {LABELS[selectedItem.type]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{selectedItem.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 size={13} />
              {displayDate(selectedItem.date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            {selectedItem.notes && (
              <p className="mt-2 text-xs text-muted-foreground">{selectedItem.notes}</p>
            )}
          </div>
          {selectedItem.source === 'event' && (
            <button
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
              onClick={() => remove(selectedItem.id)}
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button
            aria-label="Cerrar detalle"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setSelectedKey(null)}
          >
            <X size={15} />
          </button>
        </section>
      )}
    </div>
  );
}
