'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, ChevronDown, Zap, X, ArrowRight, CheckCircle2, RefreshCw, GitBranch, Info, BarChart2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { RUBRICS, getDifficultyPoints } from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { activityService, type Activity } from '@/lib/services/edutrackService';
import ActivityGeneratorModal from './ActivityGeneratorModal';


type FilterStatus = 'all' | 'borrador' | 'publicada' | 'en_correccion' | 'pendiente_revision' | 'revisada_docente' | 'cerrada';

interface ActivityFormData {
  name: string;
  unitId: string;
  evaluationId: string;
  type: string;
  dueDate: string;
  description: string;
  ceIds: string[];
}

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  borrador: { next: 'publicada', label: 'Publicar', color: 'bg-blue-100 text-blue-700' },
  publicada: { next: 'en_correccion', label: 'Iniciar corrección', color: 'bg-amber-100 text-amber-700' },
  en_correccion: { next: 'pendiente_revision', label: 'Marcar revisión', color: 'bg-orange-100 text-orange-700' },
  pendiente_revision: { next: 'revisada_docente', label: 'Revisar docente', color: 'bg-purple-100 text-purple-700' },
  revisada_docente: { next: 'cerrada', label: 'Cerrar actividad', color: 'bg-green-100 text-green-700' },
};

const ACTIVITY_TYPES = ['práctica', 'examen', 'proyecto', 'exposición', 'cuestionario', 'trabajo'];

export default function ActivitiesContent() {
  const { activeModuleId, activities: dbActivities, evaluations: EVALUATIONS, workUnits: WORK_UNITS, criteria: CRITERIA, learningOutcomes: LEARNING_OUTCOMES, loading, refreshActivities } = useEduTrack();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterEval, setFilterEval] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [formData, setFormData] = useState<ActivityFormData>({
    name: '', unitId: '', evaluationId: 'eval-1', type: 'práctica', dueDate: '', description: '', ceIds: []
  });
  const [ceSearch, setCeSearch] = useState('');
  const [expandedRA, setExpandedRA] = useState<string[]>(['ra-1']);

  // Sync from context
  React.useEffect(() => {
    setActivities(dbActivities);
  }, [dbActivities]);

  const filtered = activities.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchEval = filterEval === 'all' || a.evaluationId === filterEval;
    return matchSearch && matchStatus && matchEval;
  });

  const groupedByEval = EVALUATIONS.map(ev => ({
    evaluation: ev,
    units: WORK_UNITS.filter(ut => ut.evaluationId === ev.id).map(ut => ({
      unit: ut,
      activities: filtered.filter(a => a.unitId === ut.id),
    })).filter(g => g.activities.length > 0),
    directActivities: filtered.filter(a => a.evaluationId === ev.id && !a.unitId),
  })).filter(g => g.units.length > 0 || g.directActivities.length > 0);

  // Computed weight from CE difficulty points sum
  const computedCEWeight = useMemo(() => {
    return formData.ceIds.reduce((sum, ceId) => {
      const ce = CRITERIA.find(c => c.id === ceId);
      return sum + (ce ? getDifficultyPoints(ce.difficulty) : 0);
    }, 0);
  }, [formData.ceIds]);

  const toggleCE = (ceId: string) => {
    setFormData(prev => ({
      ...prev,
      ceIds: prev.ceIds.includes(ceId)
        ? prev.ceIds.filter(id => id !== ceId)
        : [...prev.ceIds, ceId],
    }));
  };

  const filteredCriteria = useMemo(() => {
    if (!ceSearch) return CRITERIA;
    const q = ceSearch.toLowerCase();
    return CRITERIA.filter(c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [ceSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setIsSubmitting(true);
    try {
      const actData: Activity = {
        id: selectedActivity?.id ?? `act-${Date.now()}`,
        moduleId: activeModuleId,
        name: formData.name,
        unitId: formData.unitId || null,
        evaluationId: formData.evaluationId,
        type: formData.type,
        status: selectedActivity?.status ?? 'borrador',
        weight: computedCEWeight > 0 ? computedCEWeight : 30,
        dueDate: formData.dueDate,
        description: formData.description,
        ceIds: formData.ceIds,
        correctionCount: selectedActivity?.correctionCount ?? 0,
        reviewedCount: selectedActivity?.reviewedCount ?? 0,
      };
      await activityService.upsert(actData);
      await refreshActivities();
      toast.success(selectedActivity ? 'Actividad actualizada' : 'Actividad creada correctamente');
    } catch {
      toast.error('Error al guardar la actividad');
    } finally {
      setIsSubmitting(false);
      setShowModal(false);
      setSelectedActivity(null);
      setFormData({ name: '', unitId: '', evaluationId: 'eval-1', type: 'práctica', dueDate: '', description: '', ceIds: [] });
      setCeSearch('');
    }
  };

  const handleDelete = (act: Activity) => {
    toast.error(`¿Eliminar "${act.name}"?`, {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await activityService.delete(act.id);
            await refreshActivities();
            toast.success('Actividad eliminada');
          } catch {
            toast.error('Error al eliminar la actividad');
          }
        }
      }
    });
  };

  const handleAdvanceStatus = async (act: Activity) => {
    const flow = STATUS_FLOW[act.status];
    if (!flow) return;
    try {
      await activityService.upsert({ ...act, status: flow.next });
      await refreshActivities();
      toast.success(`Estado actualizado a: ${flow.next.replace(/_/g, ' ')}`);
    } catch {
      toast.error('Error al actualizar el estado');
    }
  };

  const openEdit = (act: Activity) => {
    setSelectedActivity(act);
    setFormData({
      name: act.name, unitId: act.unitId ?? '', evaluationId: act.evaluationId,
      type: act.type, dueDate: act.dueDate, description: act.description, ceIds: [...act.ceIds]
    });
    setShowModal(true);
  };

  const handleGeneratorAccept = async (activityData: Omit<Activity, 'id' | 'moduleId' | 'correctionCount' | 'reviewedCount'>, _generatedRubric: unknown[]) => {
    try {
      const newAct: Activity = {
        id: `act-${Date.now()}`,
        moduleId: activeModuleId,
        ...activityData,
        correctionCount: 0,
        reviewedCount: 0,
      };
      await activityService.upsert(newAct);
      await refreshActivities();
    } catch {
      toast.error('Error al guardar la actividad generada');
    }
  };

  const rubric = detailActivity ? RUBRICS.find(r => r.activityId === detailActivity.id) : null;

  const getActivityCEWeight = (actId: string): number => {
    const act = activities.find(a => a.id === actId);
    if (!act) return 0;
    return act.ceIds.reduce((sum, ceId) => {
      const ce = CRITERIA.find(c => c.id === ceId);
      return sum + (ce ? getDifficultyPoints(ce.difficulty) : 0);
    }, 0);
  };

  const getActivityValuePct = (actId: string): number => {
    const act = activities.find(a => a.id === actId);
    if (!act) return 0;
    const containerActivities = act.unitId
      ? activities.filter(a => a.unitId === act.unitId)
      : activities.filter(a => a.evaluationId === act.evaluationId && !a.unitId);
    const totalWeight = containerActivities.reduce((sum, a) => sum + getActivityCEWeight(a.id), 0);
    if (totalWeight === 0) return 0;
    return Math.round((getActivityCEWeight(actId) / totalWeight) * 100);
  };

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Actividades"
        subtitle={`PSP — DAM 2º · ${activities.length} actividades · ${activities.filter(a => a.status === 'cerrada').length} cerradas`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/curriculum-relations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <GitBranch size={13} /> Ver relaciones
            </Link>
            <button onClick={() => setShowGenerator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary text-primary text-xs font-medium hover:bg-primary/5 active:scale-95 transition-all">
              <Sparkles size={13} /> Generar con IA
            </button>
            <button onClick={() => { setSelectedActivity(null); setFormData({ name: '', unitId: '', evaluationId: 'eval-1', type: 'práctica', dueDate: '', description: '', ceIds: [] }); setCeSearch(''); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={13} /> Nueva actividad
            </button>
          </div>
        }
      />

      {/* Status summary chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { status: 'all', label: `Todas (${activities.length})` },
          { status: 'cerrada', label: `Cerradas (${activities.filter(a => a.status === 'cerrada').length})` },
          { status: 'revisada_docente', label: `Revisadas (${activities.filter(a => a.status === 'revisada_docente').length})` },
          { status: 'pendiente_revision', label: `Pend. revisión (${activities.filter(a => a.status === 'pendiente_revision').length})` },
          { status: 'en_correccion', label: `En corrección (${activities.filter(a => a.status === 'en_correccion').length})` },
          { status: 'borrador', label: `Borrador (${activities.filter(a => a.status === 'borrador').length})` },
        ].map(chip => (
          <button key={chip.status} onClick={() => setFilterStatus(chip.status as FilterStatus)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterStatus === chip.status ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search + eval filter */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar actividad o tipo..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="relative">
          <select value={filterEval} onChange={e => setFilterEval(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">Todas las evaluaciones</option>
            {EVALUATIONS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} resultados</span>
      </div>

      {/* Activities grouped */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Zap size={24} />} title="Sin actividades" description="No hay actividades que coincidan con los filtros."
          action={<button onClick={() => { setFilterStatus('all'); setSearch(''); setFilterEval('all'); }} className="text-xs text-primary hover:underline">Limpiar filtros</button>} />
      ) : (
        <div className="space-y-5">
          {groupedByEval.map(({ evaluation, units, directActivities }) => (
            <div key={evaluation.id}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-foreground">{evaluation.name}</h2>
                <span className="text-xs text-muted-foreground">Peso: {evaluation.weight}%</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {units.map(({ unit, activities: unitActivities }) => {
                const totalUnitCEWeight = unitActivities.reduce((sum, a) => sum + getActivityCEWeight(a.id), 0);
                return (
                  <div key={unit.id} className="mb-3 bg-card rounded-xl border border-border shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{unit.code}</span>
                        <span className="text-sm font-medium text-foreground">{unit.name}</span>
                        <span className="text-xs text-muted-foreground">{unit.hours}h · Peso UT: {unit.weight}%</span>
                        <span className="text-xs text-muted-foreground">· Peso CE total: {totalUnitCEWeight}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={unit.status} size="sm" />
                        <span className="text-xs text-muted-foreground">{unit.taughtPercentage}% impartido</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-xs min-w-[1000px]">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Nombre</th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">Tipo</th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-32">Estado</th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">
                              <div>Puntos CE</div>
                              <div className="text-[9px] font-normal text-muted-foreground/70">suma niveles</div>
                            </th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">
                              <div>% Valor UT</div>
                              <div className="text-[9px] font-normal text-muted-foreground/70">en contenedor</div>
                            </th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">Entrega</th>
                            <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">CE asociados</th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-32">Correcciones</th>
                            <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-32">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {unitActivities.map((act) => {
                            const corrPct = act.correctionCount > 0 ? Math.round((act.reviewedCount / act.correctionCount) * 100) : 0;
                            const flow = STATUS_FLOW[act.status];
                            const ceWeight = getActivityCEWeight(act.id);
                            const valuePct = getActivityValuePct(act.id);
                            return (
                              <tr key={act.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-4 py-3">
                                  <div>
                                    <p className="font-medium text-foreground">{act.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[250px]">{act.description}</p>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium capitalize">{act.type}</span>
                                </td>
                                <td className="px-3 py-3 text-center"><StatusBadge status={act.status} size="sm" /></td>
                                <td className="px-3 py-3 text-center">
                                  <span className="font-mono-nums font-semibold text-foreground">{ceWeight}</span>
                                  <div className="text-[9px] text-muted-foreground">{act.ceIds.length} CE</div>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className={`font-mono-nums font-semibold text-sm ${valuePct >= 30 ? 'text-primary' : valuePct >= 15 ? 'text-warning' : 'text-muted-foreground'}`}>{valuePct}%</span>
                                </td>
                                <td className="px-3 py-3 text-center font-mono text-muted-foreground text-[11px]">{act.dueDate}</td>
                                <td className="px-3 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {act.ceIds.slice(0, 4).map(ceId => {
                                      const ce = CRITERIA.find(c => c.id === ceId);
                                      if (!ce) return null;
                                      const pts = getDifficultyPoints(ce.difficulty);
                                      const diffColor = ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                                      return (
                                        <span key={ceId} title={`${ce.description} · ${ce.difficulty} (${pts}pt)`}
                                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold cursor-help flex items-center gap-0.5 ${diffColor}`}>
                                          {ce.code}
                                          <span className="font-normal opacity-70">{pts}p</span>
                                        </span>
                                      );
                                    })}
                                    {act.ceIds.length > 4 && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">+{act.ceIds.length - 4}</span>}
                                    {act.ceIds.length === 0 && <span className="text-[10px] text-muted-foreground italic">Sin CE</span>}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  {act.correctionCount > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                          <div className="h-full bg-primary rounded-full" style={{ width: `${corrPct}%` }} />
                                        </div>
                                        <span className="font-mono-nums text-[10px] font-semibold text-foreground w-8 text-right">{corrPct}%</span>
                                      </div>
                                      <span className="text-[10px] text-muted-foreground">{act.reviewedCount}/{act.correctionCount} revisadas</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">Sin entregas</span>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => setDetailActivity(act)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ver detalle">
                                      <Eye size={13} />
                                    </button>
                                    <button onClick={() => openEdit(act)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                                      <Edit2 size={13} />
                                    </button>
                                    {flow && (
                                      <button onClick={() => handleAdvanceStatus(act)} className={`p-1.5 rounded text-[10px] font-medium transition-colors ${flow.color}`} title={flow.label}>
                                        <ArrowRight size={13} />
                                      </button>
                                    )}
                                    <button onClick={() => handleDelete(act)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-danger transition-colors" title="Eliminar">
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {directActivities.length > 0 && (
                <div className="mb-3 bg-card rounded-xl border border-border shadow-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/20 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground">Actividades directas de evaluación (sin UT)</span>
                  </div>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-xs min-w-[700px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Nombre</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">Tipo</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-32">Estado</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">Puntos CE</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">% Valor Ev.</th>
                          <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">CE asociados</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-32">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {directActivities.map(act => {
                          const ceWeight = getActivityCEWeight(act.id);
                          const valuePct = getActivityValuePct(act.id);
                          const flow = STATUS_FLOW[act.status];
                          return (
                            <tr key={act.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground">{act.name}</p>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-medium capitalize">{act.type}</span>
                              </td>
                              <td className="px-3 py-3 text-center"><StatusBadge status={act.status} size="sm" /></td>
                              <td className="px-3 py-3 text-center font-mono-nums font-semibold">{ceWeight}</td>
                              <td className="px-3 py-3 text-center font-mono-nums font-semibold text-primary">{valuePct}%</td>
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {act.ceIds.slice(0, 4).map(ceId => {
                                    const ce = CRITERIA.find(c => c.id === ceId);
                                    if (!ce) return null;
                                    const pts = getDifficultyPoints(ce.difficulty);
                                    const diffColor = ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                                    return (
                                      <span key={ceId} title={`${ce.description} · ${ce.difficulty} (${pts}pt)`}
                                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${diffColor}`}>
                                        {ce.code} <span className="font-normal opacity-70">{pts}p</span>
                                      </span>
                                    );
                                  })}
                                  {act.ceIds.length > 4 && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">+{act.ceIds.length - 4}</span>}
                                  {act.ceIds.length === 0 && <span className="text-[10px] text-muted-foreground italic">Sin CE</span>}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => setDetailActivity(act)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ver detalle">
                                    <Eye size={13} />
                                  </button>
                                  <button onClick={() => openEdit(act)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                                    <Edit2 size={13} />
                                  </button>
                                  {flow && (
                                    <button onClick={() => handleAdvanceStatus(act)} className={`p-1.5 rounded text-[10px] font-medium transition-colors ${flow.color}`} title={flow.label}>
                                      <ArrowRight size={13} />
                                    </button>
                                  )}
                                  <button onClick={() => handleDelete(act)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-danger transition-colors" title="Eliminar">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ACTIVITY DETAIL MODAL ── */}
      {detailActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{detailActivity.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ficha de actividad</p>
              </div>
              <button onClick={() => setDetailActivity(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Tipo', value: detailActivity.type },
                  { label: 'Estado', value: <StatusBadge status={detailActivity.status} size="sm" /> },
                  { label: 'Peso CE (suma)', value: <span className="font-mono-nums font-bold text-primary">{getActivityCEWeight(detailActivity.id)}</span> },
                  { label: 'Entrega', value: detailActivity.dueDate },
                ].map(item => (
                  <div key={item.label} className="bg-muted/40 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <div className="text-xs font-semibold text-foreground mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Weight info */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                <BarChart2 size={14} className="text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Peso y valor en el contenedor</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Puntos CE: <span className="font-semibold text-foreground">{getActivityCEWeight(detailActivity.id)}</span> ·
                    % Valor en {detailActivity.unitId ? 'UT' : 'Evaluación'}: <span className="font-semibold text-primary">{getActivityValuePct(detailActivity.id)}%</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">El peso se calcula como suma de los puntos de nivel de los CE asignados (básico=1, medio=2, avanzado=3). El % de valor es proporcional al total de puntos de todas las actividades del mismo contenedor.</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-1.5">Enunciado</p>
                <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3">{detailActivity.description || 'Sin descripción.'}</p>
              </div>

              {/* CE */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Criterios de evaluación ({detailActivity.ceIds.length}) — auto-poblados en rúbrica IA</p>
                {detailActivity.ceIds.length > 0 ? (
                  <div className="space-y-1.5">
                    {detailActivity.ceIds.map(ceId => {
                      const ce = CRITERIA.find(c => c.id === ceId);
                      if (!ce) return null;
                      const pts = getDifficultyPoints(ce.difficulty);
                      const diffColor = ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                      return (
                        <div key={ceId} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">{ce.code}</span>
                          <span className="text-xs text-foreground leading-relaxed flex-1">{ce.description}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${diffColor}`}>{ce.difficulty} · {pts}pt</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No hay CE asignados a esta actividad.</p>
                )}
              </div>

              {/* Correction progress */}
              {detailActivity.correctionCount > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Progreso de correcciones</p>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{detailActivity.reviewedCount}/{detailActivity.correctionCount} revisadas</span>
                        <span className="text-xs font-semibold text-foreground">{Math.round((detailActivity.reviewedCount / detailActivity.correctionCount) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(detailActivity.reviewedCount / detailActivity.correctionCount) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rubric preview */}
              {rubric && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-foreground">Rúbrica: {rubric.title} <span className="text-muted-foreground font-normal">v{rubric.version}</span></p>
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Auto-poblada desde CE</span>
                  </div>
                  <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
                    <table className="w-full text-[10px] min-w-[500px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">CE</th>
                          <th className="text-center px-2 py-2 text-muted-foreground font-medium w-12">Peso</th>
                          {rubric.levels.map(lv => (
                            <th key={lv.id} className="text-center px-2 py-2 text-muted-foreground font-medium">{lv.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rubric.rows.map(row => {
                          const ce = CRITERIA.find(c => c.id === row.ceId);
                          return (
                            <tr key={row.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <span className="font-mono font-semibold text-primary">{ce?.code ?? row.ceId}</span>
                              </td>
                              <td className="px-2 py-2 text-center font-mono-nums text-muted-foreground">{row.weight}</td>
                              {rubric.levels.map(lv => (
                                <td key={lv.id} className="px-2 py-2 text-muted-foreground leading-relaxed max-w-[150px]">
                                  {row.descriptors[lv.id] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Workflow */}
              {STATUS_FLOW[detailActivity.status] && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <ArrowRight size={14} className="text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">Siguiente paso en el flujo</p>
                    <p className="text-[10px] text-muted-foreground">{STATUS_FLOW[detailActivity.status].label}</p>
                  </div>
                  <button onClick={() => { handleAdvanceStatus(detailActivity); setDetailActivity(null); }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    {STATUS_FLOW[detailActivity.status].label}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE/EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="text-sm font-semibold text-foreground">{selectedActivity ? 'Editar actividad' : 'Nueva actividad'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nombre *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ej: Práctica 5: Socket TCP" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Tipo</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Fecha de entrega</label>
                  <input type="date" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Evaluación</label>
                  <select value={formData.evaluationId} onChange={e => setFormData(p => ({ ...p, evaluationId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {EVALUATIONS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Unidad de trabajo</label>
                  <select value={formData.unitId} onChange={e => setFormData(p => ({ ...p, unitId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Sin UT (directa a evaluación)</option>
                    {WORK_UNITS.map(ut => <option key={ut.id} value={ut.id}>{ut.code} — {ut.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Descripción / Enunciado</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe el enunciado de la actividad..." />
              </div>

              {/* CE Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground">Criterios de evaluación (CE)</label>
                  <div className="flex items-center gap-2">
                    {formData.ceIds.length > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {formData.ceIds.length} CE · Peso total: <span className="font-bold">{computedCEWeight}</span>
                      </span>
                    )}
                    {formData.ceIds.length > 0 && (
                      <button type="button" onClick={() => setFormData(p => ({ ...p, ceIds: [] }))}
                        className="text-[10px] text-muted-foreground hover:text-danger transition-colors">Limpiar</button>
                    )}
                  </div>
                </div>

                {/* Weight info banner */}
                {formData.ceIds.length > 0 && (
                  <div className="mb-2 p-2 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-2">
                    <Info size={12} className="text-primary flex-shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      El peso de la actividad se calcula como la suma de los puntos de nivel de los CE seleccionados (Básico=1, Medio=2, Avanzado=3): <span className="font-semibold text-foreground">{computedCEWeight} pts</span>. Los CE se auto-poblarán en la rúbrica de corrección IA.
                    </p>
                  </div>
                )}

                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Buscar CE por código o descripción..." value={ceSearch} onChange={e => setCeSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                <div className="border border-border rounded-lg overflow-hidden max-h-52 overflow-y-auto scrollbar-thin">
                  {LEARNING_OUTCOMES.map(ra => {
                    const raCriteria = filteredCriteria.filter(c => c.raId === ra.id);
                    if (raCriteria.length === 0) return null;
                    const isExpanded = expandedRA.includes(ra.id);
                    const selectedInRA = raCriteria.filter(c => formData.ceIds.includes(c.id)).length;
                    return (
                      <div key={ra.id}>
                        <button type="button"
                          onClick={() => setExpandedRA(prev => isExpanded ? prev.filter(id => id !== ra.id) : [...prev, ra.id])}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border text-left">
                          <ChevronDown size={12} className={`text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <span className="text-[10px] font-bold text-primary font-mono">{ra.code}</span>
                          <span className="text-[10px] text-muted-foreground flex-1 truncate">{ra.description.slice(0, 60)}...</span>
                          {selectedInRA > 0 && (
                            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">{selectedInRA}</span>
                          )}
                        </button>
                        {isExpanded && raCriteria.map(ce => (
                          <label key={ce.id}
                            className={`flex items-start gap-2.5 px-4 py-2 cursor-pointer hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0 ${formData.ceIds.includes(ce.id) ? 'bg-primary/5' : ''}`}>
                            <input type="checkbox" checked={formData.ceIds.includes(ce.id)} onChange={() => toggleCE(ce.id)}
                              className="mt-0.5 flex-shrink-0 accent-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-primary font-mono">{ce.code}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {ce.difficulty} · {getDifficultyPoints(ce.difficulty)}pt
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{ce.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {isSubmitting ? <><RefreshCw size={12} className="animate-spin" /> Guardando...</> : <><CheckCircle2 size={12} /> {selectedActivity ? 'Actualizar' : 'Crear actividad'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenerator && (
        <ActivityGeneratorModal
          onClose={() => setShowGenerator(false)}
          onAccept={handleGeneratorAccept}
        />
      )}
    </div>
  );
}
