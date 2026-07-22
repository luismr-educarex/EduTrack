'use client';

import { useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Panel, inputClass, primaryButton } from '@/components/AddedCapabilities';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { CalendarEventType, calendarEventTypeService } from '@/lib/services/edutrackService';

const slug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export default function CalendarTypeSettings() {
  const { activeModuleId, calendarEventTypes, refreshCalendarEventTypes, refreshCalendarEvents } =
    useEduTrack();
  const [editing, setEditing] = useState<CalendarEventType | null>(null);
  const [form, setForm] = useState({ name: '', color: '#2563eb' });

  const startNew = () => {
    setEditing({
      id: '',
      moduleId: activeModuleId,
      code: '',
      name: '',
      color: '#2563eb',
      sortOrder: (calendarEventTypes.at(-1)?.sortOrder ?? 0) + 10,
    });
    setForm({ name: '', color: '#2563eb' });
  };

  const startEdit = (type: CalendarEventType) => {
    setEditing(type);
    setForm({ name: type.name, color: type.color });
  };

  const save = async () => {
    if (!editing || !form.name.trim()) return toast.error('Indica un nombre para el tipo');
    const code = editing.code || slug(form.name);
    if (!code) return toast.error('El nombre debe contener letras o números');
    if (!editing.id && calendarEventTypes.some((type) => type.code === code)) {
      return toast.error('Ya existe un tipo de evento con ese nombre');
    }
    await calendarEventTypeService.upsert({
      ...editing,
      id: editing.id || crypto.randomUUID(),
      code,
      name: form.name.trim(),
      color: form.color,
    });
    await refreshCalendarEventTypes();
    setEditing(null);
    toast.success(editing.id ? 'Tipo de evento actualizado' : 'Tipo de evento creado');
  };

  const remove = async (type: CalendarEventType) => {
    if (type.code === 'otro') return toast.error('El tipo Actividad lectiva es obligatorio');
    if (
      !window.confirm(`¿Eliminar el tipo «${type.name}»? Sus eventos pasarán a Actividad lectiva.`)
    )
      return;
    await calendarEventTypeService.delete(type);
    await Promise.all([refreshCalendarEventTypes(), refreshCalendarEvents()]);
    toast.success('Tipo de evento eliminado');
  };

  return (
    <Panel
      title="Tipos de eventos del calendario"
      description="Define las etiquetas disponibles y el color con el que se muestran en el calendario del módulo."
      actions={
        <button type="button" className={primaryButton} onClick={startNew}>
          <Plus size={15} /> Añadir tipo
        </button>
      }
    >
      {editing && (
        <div className="mb-5 grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
          <label className="text-xs font-medium">
            Nombre
            <input
              className={`${inputClass} mt-1`}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoFocus
            />
          </label>
          <label className="text-xs font-medium">
            Color
            <input
              aria-label="Color de la etiqueta"
              type="color"
              className="mt-1 h-10 w-full cursor-pointer rounded-md border border-border bg-card p-1"
              value={form.color}
              onChange={(event) =>
                setForm((current) => ({ ...current, color: event.target.value }))
              }
            />
          </label>
          <div className="flex items-end gap-2">
            <button type="button" className={primaryButton} onClick={save}>
              <Save size={15} /> Guardar
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              className="rounded-md border border-border p-2.5"
              onClick={() => setEditing(null)}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        {calendarEventTypes.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: type.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{type.name}</p>
              <p className="text-[11px] text-muted-foreground">{type.code}</p>
            </div>
            <span
              className="rounded px-2 py-1 text-[10px] font-semibold text-white"
              style={{ backgroundColor: type.color }}
            >
              Vista previa
            </span>
            <button
              type="button"
              aria-label={`Editar ${type.name}`}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
              onClick={() => startEdit(type)}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${type.name}`}
              disabled={type.code === 'otro'}
              className="rounded-md p-2 text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-30"
              onClick={() => remove(type)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
