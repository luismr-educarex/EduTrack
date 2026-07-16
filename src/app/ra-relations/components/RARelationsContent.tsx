'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { GitBranch, Plus, Trash2, ArrowRight, Info, AlertTriangle, Edit2, X, Save, ChevronDown, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { raRelationshipService } from '@/lib/services/edutrackService';
import type { RARelationship, LearningOutcome } from '@/lib/services/edutrackService';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function detectCycle(relations: RARelationship[], sourceId: string, targetId: string): boolean {
  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    relations.filter(r => r.raSourceId === current).forEach(r => queue.push(r.raTargetId));
  }
  return false;
}

// ─── RELATION FORM ────────────────────────────────────────────────────────────
interface RelationFormProps {
  existing: RARelationship[];
  editingRel?: RARelationship | null;
  learningOutcomes: LearningOutcome[];
  onSave: (rel: Omit<RARelationship, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function RelationForm({ existing, editingRel, learningOutcomes, onSave, onCancel }: RelationFormProps) {
  const [sourceId, setSourceId] = useState(editingRel?.raSourceId ?? '');
  const [targetId, setTargetId] = useState(editingRel?.raTargetId ?? '');
  const [percentage, setPercentage] = useState<number>(editingRel?.percentage ?? 25);
  const [description, setDescription] = useState(editingRel?.description ?? '');

  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!sourceId) errs.push('Selecciona el RA origen.');
    if (!targetId) errs.push('Selecciona el RA destino.');
    if (sourceId && targetId && sourceId === targetId) errs.push('El RA origen y destino no pueden ser el mismo.');
    if (sourceId && targetId && sourceId !== targetId) {
      const hasCycle = detectCycle(existing.filter(r => r.id !== editingRel?.id), sourceId, targetId);
      if (hasCycle) errs.push('Esta relación crearía un ciclo entre RAs.');
      const duplicate = existing.find(r => r.id !== editingRel?.id && r.raSourceId === sourceId && r.raTargetId === targetId);
      if (duplicate) errs.push('Ya existe una relación entre estos dos RAs.');
    }
    if (percentage <= 0 || percentage > 100) errs.push('El porcentaje debe estar entre 1 y 100.');
    return errs;
  }, [sourceId, targetId, percentage, existing, editingRel]);

  const usedPercentage = useMemo(() => existing.filter(r => r.raSourceId === sourceId && r.id !== editingRel?.id).reduce((sum, r) => sum + r.percentage, 0), [sourceId, existing, editingRel]);
  const remainingPercentage = 100 - usedPercentage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (errors.length > 0) return;
    onSave({ id: editingRel?.id, raSourceId: sourceId, raTargetId: targetId, percentage, description: description.trim() || undefined, moduleId: 'module-ruslvg5ye' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <GitBranch size={15} className="text-primary" />
        {editingRel ? 'Editar relación entre RAs' : 'Nueva relación entre RAs'}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">RA Origen <span className="text-danger">*</span></label>
          <select value={sourceId} onChange={e => setSourceId(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Seleccionar RA origen…</option>
            {learningOutcomes.map(ra => <option key={ra.id} value={ra.id}>{ra.code} – {ra.description.slice(0, 55)}…</option>)}
          </select>
          {sourceId && <p className="text-[10px] text-muted-foreground mt-1">Asignado: <strong>{usedPercentage}%</strong> · Disponible: <strong className={remainingPercentage < percentage ? 'text-warning' : 'text-success'}>{remainingPercentage}%</strong></p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">RA Destino <span className="text-danger">*</span></label>
          <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Seleccionar RA destino…</option>
            {learningOutcomes.filter(ra => ra.id !== sourceId).map(ra => <option key={ra.id} value={ra.id}>{ra.code} – {ra.description.slice(0, 55)}…</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Porcentaje de contribución <span className="text-danger">*</span></label>
        <div className="flex items-center gap-3">
          <input type="range" min={1} max={100} value={percentage} onChange={e => setPercentage(Number(e.target.value))} className="flex-1 accent-primary" />
          <div className="flex items-center gap-1">
            <input type="number" min={1} max={100} value={percentage} onChange={e => setPercentage(Math.min(100, Math.max(1, Number(e.target.value))))} className="w-16 text-sm border border-border rounded-lg px-2 py-1.5 bg-background text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Ej: nota 8 en RA origen → contribuye <strong>{((8 * percentage) / 100).toFixed(2)} pts</strong> al RA destino.</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Descripción <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Explica por qué superar este RA contribuye al otro…" className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>
      {errors.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/5 border border-danger/20">
          <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-0.5" />
          <ul className="space-y-0.5">{errors.map((err, i) => <li key={i} className="text-xs text-danger">{err}</li>)}</ul>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={errors.length > 0} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <Save size={14} />{editingRel ? 'Guardar cambios' : 'Añadir relación'}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">
          <X size={14} />Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── RA NODE CARD ─────────────────────────────────────────────────────────────
function RANodeCard({ ra, relations, onEdit, onDelete }: { ra: LearningOutcome; relations: RARelationship[]; onEdit: (rel: RARelationship) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(true);
  const outgoing = relations.filter(r => r.raSourceId === ra.id);
  const incoming = relations.filter(r => r.raTargetId === ra.id);
  const getRaById = (id: string, los: LearningOutcome[]) => los.find(r => r.id === id);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{ra.code.replace('RA', '')}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-primary">{ra.code}</span>
            <span className="text-[10px] text-muted-foreground">Peso: {ra.weight}%</span>
            {outgoing.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">{outgoing.length} saliente{outgoing.length > 1 ? 's' : ''}</span>}
            {incoming.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold border border-purple-200">{incoming.length} entrante{incoming.length > 1 ? 's' : ''}</span>}
          </div>
          <p className="text-xs text-foreground mt-0.5 line-clamp-1">{ra.description}</p>
        </div>
        {expanded ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="p-4 space-y-3">
          {outgoing.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><ArrowRight size={10} className="text-blue-500" />Al superar este RA, contribuye a:</p>
              <div className="space-y-2">
                {outgoing.map(rel => {
                  const target = relations.find(r => r.id === rel.id);
                  return (
                    <div key={rel.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-blue-700">{rel.raTargetId}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-bold">{rel.percentage}%</span>
                        </div>
                        {rel.description && <p className="text-[10px] text-blue-600 mt-1 italic">{rel.description}</p>}
                        <p className="text-[10px] text-blue-500 mt-1">Ej: nota 8 → contribuye <strong>{((8 * rel.percentage) / 100).toFixed(2)} pts</strong></p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => onEdit(rel)} className="p-1.5 rounded-md hover:bg-blue-200 text-blue-600 transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => onDelete(rel.id)} className="p-1.5 rounded-md hover:bg-red-100 text-danger transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {incoming.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Recibe contribución de:</p>
              <div className="space-y-2">
                {incoming.map(rel => (
                  <div key={rel.id} className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-purple-700">{rel.raSourceId}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">{rel.percentage}%</span>
                      </div>
                      {rel.description && <p className="text-[10px] text-purple-600 mt-1 italic">{rel.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {outgoing.length === 0 && incoming.length === 0 && <p className="text-xs text-muted-foreground italic">Sin relaciones configuradas para este RA.</p>}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RARelationsContent() {
  const { raRelationships: dbRelationships, learningOutcomes, loading, refreshRARelationships } = useEduTrack();
  const [relations, setRelations] = useState<RARelationship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRel, setEditingRel] = useState<RARelationship | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setRelations(dbRelationships); }, [dbRelationships]);

  const handleSave = async (data: Omit<RARelationship, 'id'> & { id?: string }) => {
    setSaving(true);
    try {
      const rel: RARelationship = { ...data, id: data.id ?? `rel-${Date.now()}`, moduleId: 'module-ruslvg5ye' };
      await raRelationshipService.upsert(rel);
      await refreshRARelationships();
      setShowForm(false);
      setEditingRel(null);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rel: RARelationship) => { setEditingRel(rel); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleDelete = async (id: string) => {
    try {
      await raRelationshipService.delete(id);
      await refreshRARelationships();
    } catch { /* silent */ }
  };

  const rasWithRelations = new Set([...relations.map(r => r.raSourceId), ...relations.map(r => r.raTargetId)]).size;

  if (loading) return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Cargando relaciones…</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHeader
        title="Relaciones entre RAs"
        subtitle="Configura cómo la superación de un RA contribuye proporcionalmente a la nota de otros RAs"
        actions={!showForm ? (
          <button onClick={() => { setEditingRel(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <Plus size={15} />Nueva relación
          </button>
        ) : undefined}
      />
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-info/5 border border-info/20">
          <Info size={16} className="text-info flex-shrink-0 mt-0.5" />
          <div className="text-xs text-foreground space-y-1">
            <p className="font-semibold text-info">¿Cómo funcionan las relaciones entre RAs?</p>
            <p>Cuando un alumno supera un <strong>RA origen</strong>, su calificación contribuye proporcionalmente a la nota del <strong>RA destino</strong>.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-primary">{relations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Relaciones configuradas</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{rasWithRelations}</p>
            <p className="text-xs text-muted-foreground mt-1">RAs con relaciones</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{learningOutcomes.length - rasWithRelations}</p>
            <p className="text-xs text-muted-foreground mt-1">RAs sin relaciones</p>
          </div>
        </div>
        {showForm && (
          <RelationForm existing={relations} editingRel={editingRel} learningOutcomes={learningOutcomes} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingRel(null); }} />
        )}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><GitBranch size={14} className="text-primary" />Resultados de Aprendizaje</h2>
          {learningOutcomes.map(ra => (
            <RANodeCard key={ra.id} ra={ra} relations={relations} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
        {relations.length === 0 && !showForm && (
          <div className="text-center py-12 text-muted-foreground">
            <GitBranch size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No hay relaciones configuradas</p>
            <p className="text-xs mt-1">Pulsa "Nueva relación" para configurar cómo los RAs se influyen entre sí.</p>
          </div>
        )}
      </div>
    </div>
  );
}
