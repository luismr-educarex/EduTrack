'use client';
import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { WORK_UNITS, LEARNING_OUTCOMES } from '@/lib/mockData';
import { toast } from 'sonner';

interface SessionBlock {
  id: string;
  type: 'intro' | 'desarrollo' | 'practica' | 'evaluacion' | 'cierre';
  title: string;
  duration: number; // minutes
  description: string;
  resources: string;
}

const BLOCK_TYPES = {
  intro: { label: 'Introducción', color: 'bg-info/10 text-info border-info/30' },
  desarrollo: { label: 'Desarrollo', color: 'bg-primary/10 text-primary border-primary/30' },
  practica: { label: 'Práctica', color: 'bg-success/10 text-success border-success/30' },
  evaluacion: { label: 'Evaluación', color: 'bg-warning/10 text-warning border-warning/30' },
  cierre: { label: 'Cierre', color: 'bg-neutral/10 text-neutral border-neutral/30' },
};

const DEFAULT_BLOCKS: SessionBlock[] = [
  { id: 'b1', type: 'intro', title: 'Repaso sesión anterior', duration: 10, description: 'Preguntas rápidas sobre el contenido previo', resources: '' },
  { id: 'b2', type: 'desarrollo', title: 'Explicación teórica', duration: 25, description: 'Presentación de nuevos conceptos', resources: 'Diapositivas UT3' },
  { id: 'b3', type: 'practica', title: 'Ejercicio guiado', duration: 20, description: 'Práctica en parejas del concepto explicado', resources: 'Enunciado práctica' },
  { id: 'b4', type: 'cierre', title: 'Síntesis y dudas', duration: 5, description: 'Resumen de lo aprendido y resolución de dudas', resources: '' },
];

export default function SessionPlannerPanel() {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [selectedUnit, setSelectedUnit] = useState(WORK_UNITS[0]?.id || '');
  const [selectedRA, setSelectedRA] = useState('');
  const [objective, setObjective] = useState('');
  const [blocks, setBlocks] = useState<SessionBlock[]>(DEFAULT_BLOCKS);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  const totalMinutes = blocks.reduce((sum, b) => sum + b.duration, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const addBlock = () => {
    const newBlock: SessionBlock = {
      id: `b${Date.now()}`,
      type: 'desarrollo',
      title: 'Nueva actividad',
      duration: 15,
      description: '',
      resources: '',
    };
    setBlocks(prev => [...prev, newBlock]);
    setExpandedBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const updateBlock = (id: string, field: keyof SessionBlock, value: string | number) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const handleSave = () => {
    toast.success('Planificación de sesión guardada');
  };

  return (
    <div className="space-y-4">
      {/* Session metadata */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Unidad de trabajo</label>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            >
              {WORK_UNITS.map(ut => (
                <option key={ut.id} value={ut.id}>{ut.code} – {ut.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">RA relacionado</label>
            <select
              value={selectedRA}
              onChange={e => setSelectedRA(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Sin especificar</option>
              {LEARNING_OUTCOMES.map(ra => (
                <option key={ra.id} value={ra.id}>{ra.code}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Objetivo de la sesión</label>
          <input
            type="text"
            placeholder="¿Qué aprenderán los alumnos al finalizar esta sesión?"
            value={objective}
            onChange={e => setObjective(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Duration summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Duración total: <span className={`font-semibold ${totalMinutes > 60 ? 'text-danger' : 'text-foreground'}`}>
              {hours > 0 ? `${hours}h ` : ''}{mins > 0 ? `${mins}min` : ''}
              {totalMinutes === 0 ? '0 min' : ''}
            </span>
          </span>
          {totalMinutes > 60 && <span className="text-xs text-danger">(supera 1h)</span>}
        </div>
        <button
          onClick={addBlock}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Plus size={14} />
          Añadir bloque
        </button>
      </div>

      {/* Blocks */}
      <div className="space-y-2">
        {blocks.map((block, idx) => (
          <div key={block.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
            >
              <div className="text-muted-foreground/40 cursor-grab">
                <GripVertical size={16} />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}</span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${BLOCK_TYPES[block.type].color}`}>
                {BLOCK_TYPES[block.type].label}
              </span>
              <span className="flex-1 text-sm font-medium text-foreground">{block.title}</span>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={13} />
                <span className="text-xs font-mono-nums">{block.duration} min</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                className="p-1 rounded hover:bg-danger/10 hover:text-danger text-muted-foreground transition-colors"
              >
                <Trash2 size={13} />
              </button>
              {expandedBlock === block.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </div>

            {expandedBlock === block.id && (
              <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/20 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Tipo</label>
                    <select
                      value={block.type}
                      onChange={e => updateBlock(block.id, 'type', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-md outline-none"
                    >
                      {Object.entries(BLOCK_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Duración (min)</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={block.duration}
                      onChange={e => updateBlock(block.id, 'duration', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-md outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Título</label>
                    <input
                      type="text"
                      value={block.title}
                      onChange={e => updateBlock(block.id, 'title', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-md outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Descripción</label>
                  <textarea
                    value={block.description}
                    onChange={e => updateBlock(block.id, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-md outline-none resize-none"
                    placeholder="Descripción de la actividad..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Recursos / materiales</label>
                  <input
                    type="text"
                    value={block.resources}
                    onChange={e => updateBlock(block.id, 'resources', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-card border border-border rounded-md outline-none"
                    placeholder="Diapositivas, enunciados, herramientas..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No hay bloques. Añade uno para empezar a planificar.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Guardar planificación
        </button>
      </div>
    </div>
  );
}
