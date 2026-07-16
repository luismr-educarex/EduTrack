'use client';
import React, { useState } from 'react';
import { Plus, Download, ChevronDown, ChevronRight, Edit2, Trash2, CheckCircle2, AlertCircle, BookOpen, Layers, Target, X, Map, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  getDifficultyPoints, CE_COMPATIBILITIES
} from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';


type Tab = 'ra-ce' | 'work-units' | 'coverage-map' | 'evaluations' | 'ce-compat';

interface RAFormData { code: string; description: string; weight: number }
interface CEFormData { code: string; description: string; level: number; weight: number }

export default function PlanningContent() {
  const { learningOutcomes: LEARNING_OUTCOMES, criteria: CRITERIA, workUnits: WORK_UNITS, evaluations: EVALUATIONS, activities: ACTIVITIES, loading, refreshLearningOutcomes, refreshCriteria, refreshWorkUnits } = useEduTrack();
  const [activeTab, setActiveTab] = useState<Tab>('ra-ce');
  const [expandedRA, setExpandedRA] = useState<Set<string>>(new Set(['ra-1', 'ra-2']));
  const [showRAModal, setShowRAModal] = useState(false);
  const [showCEModal, setShowCEModal] = useState<string | null>(null); // raId
  const [raForm, setRAForm] = useState<RAFormData>({ code: '', description: '', weight: 0 });
  const [ceForm, setCEForm] = useState<CEFormData>({ code: '', description: '', level: 1, weight: 0 });

  const toggleRA = (id: string) => {
    setExpandedRA(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getCEForRA = (raId: string) => CRITERIA.filter(c => c.raId === raId);

  const getCEStatus = (ceId: string): 'superado' | 'parcial' | 'no_superado' | 'no_evaluado' => {
    const hasActivity = ACTIVITIES.some(a => a.ceIds.includes(ceId));
    if (!hasActivity) return 'no_evaluado';
    const idx = parseInt(ceId.replace(/\D/g, ''));
    if (idx <= 10) return 'superado';
    if (idx <= 15) return 'parcial';
    return 'no_superado';
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'ra-ce', label: 'RA / CE', icon: <Target size={14} /> },
    { key: 'work-units', label: 'Unidades de Trabajo', icon: <Layers size={14} /> },
    { key: 'coverage-map', label: 'Mapa Curricular', icon: <Map size={14} /> },
    { key: 'evaluations', label: 'Evaluaciones', icon: <BookOpen size={14} /> },
    { key: 'ce-compat', label: 'Compatibilidad CE', icon: <GitBranch size={14} /> },
  ];

  const raWeightSum = LEARNING_OUTCOMES.reduce((s, ra) => s + ra.weight, 0);
  const raWeightValid = Math.abs(raWeightSum - 100) < 0.01;

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Planificación y Currículo"
        subtitle="PSP — DAM 2º · Gestión de RA, CE, Unidades de Trabajo y Evaluaciones"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/curriculum-relations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <GitBranch size={13} /> Ver relaciones
            </Link>
            <button onClick={() => toast.success('Exportación iniciada')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <Download size={13} /> Exportar CSV
            </button>
            {activeTab === 'ra-ce' && (
              <button onClick={() => setShowRAModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all">
                <Plus size={13} /> Nuevo RA
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-5 overflow-x-auto scrollbar-thin">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── RA / CE TAB ── */}
      {activeTab === 'ra-ce' && (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${raWeightValid ? 'bg-green-50 border border-green-200 text-success' : 'bg-red-50 border border-red-200 text-danger'}`}>
            {raWeightValid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span className="font-medium">Suma de pesos RA: {raWeightSum}% — {raWeightValid ? 'válido' : 'inválido'}</span>
            <span className="ml-auto text-muted-foreground">{LEARNING_OUTCOMES.map(ra => `${ra.code}: ${ra.weight}%`).join(' · ')}</span>
          </div>

          {LEARNING_OUTCOMES.map((ra) => {
            const ces = getCEForRA(ra.id);
            const ceWeightSum = ces.reduce((s, c) => s + c.weight, 0);
            const weightValid = Math.abs(ceWeightSum - 100) < 0.01;
            const expanded = expandedRA.has(ra.id);
            const ceSuperado = ces.filter(c => getCEStatus(c.id) === 'superado').length;
            const ceNoEval = ces.filter(c => getCEStatus(c.id) === 'no_evaluado').length;
            const ceParcial = ces.filter(c => getCEStatus(c.id) === 'parcial').length;
            const ceNoSup = ces.filter(c => getCEStatus(c.id) === 'no_superado').length;

            return (
              <div key={ra.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="w-full flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors text-left cursor-pointer">
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5" onClick={() => toggleRA(ra.id)}>
                    {expanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{ra.code}</span>
                  </div>
                  <div className="flex-1 min-w-0" onClick={() => toggleRA(ra.id)}>
                    <p className="text-sm font-medium text-foreground leading-snug">{ra.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">Peso módulo: <strong>{ra.weight}%</strong></span>
                      <span className="text-xs text-muted-foreground">{ces.length} criterios</span>
                      {ceSuperado > 0 && <span className="text-xs text-success">{ceSuperado} superados</span>}
                      {ceParcial > 0 && <span className="text-xs text-warning">{ceParcial} parciales</span>}
                      {ceNoSup > 0 && <span className="text-xs text-danger">{ceNoSup} no superados</span>}
                      {ceNoEval > 0 && <span className="text-xs text-muted-foreground">{ceNoEval} no evaluados</span>}
                      <span className={`text-xs font-medium ${weightValid ? 'text-success' : 'text-danger'}`}>
                        Σ pesos CE: {ceWeightSum}%
                        {weightValid ? <CheckCircle2 size={11} className="inline ml-1" /> : <AlertCircle size={11} className="inline ml-1" />}
                      </span>
                    </div>
                    {/* CE status mini bar */}
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5 mt-2 max-w-xs">
                      {ceSuperado > 0 && <div className="bg-success rounded-sm" style={{ flex: ceSuperado }} />}
                      {ceParcial > 0 && <div className="bg-warning rounded-sm" style={{ flex: ceParcial }} />}
                      {ceNoSup > 0 && <div className="bg-danger rounded-sm" style={{ flex: ceNoSup }} />}
                      {ceNoEval > 0 && <div className="bg-muted rounded-sm" style={{ flex: ceNoEval }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); toast.info(`Editar ${ra.code}`); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); toast.error(`Eliminar ${ra.code} — requiere confirmación`); }} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-2 text-muted-foreground font-medium w-20">Código</th>
                          <th className="text-left px-4 py-2 text-muted-foreground font-medium">Enunciado</th>
                          <th className="text-center px-3 py-2 text-muted-foreground font-medium w-24">Dificultad</th>
                          <th className="text-center px-3 py-2 text-muted-foreground font-medium w-16">Pts</th>
                          <th className="text-center px-3 py-2 text-muted-foreground font-medium w-28">Estado CE</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Actividades</th>
                          <th className="text-center px-3 py-2 text-muted-foreground font-medium w-20">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {ces.map((ce) => {
                          const status = getCEStatus(ce.id);
                          const ceActivities = ACTIVITIES.filter(a => a.ceIds.includes(ce.id));
                          return (
                            <tr key={ce.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5"><span className="font-mono text-[11px] font-semibold text-foreground">{ce.code}</span></td>
                              <td className="px-4 py-2.5 text-foreground leading-relaxed">{ce.description}</td>
                              <td className="px-3 py-2.5 text-center">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{ce.difficulty}</span>
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono-nums font-semibold text-foreground">{getDifficultyPoints(ce.difficulty)}</td>
                              <td className="px-3 py-2.5 text-center"><StatusBadge status={status} size="sm" /></td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {ceActivities.slice(0, 3).map(act => (
                                    <span key={act.id} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[80px]">{act.name.split(':')[0]}</span>
                                  ))}
                                  {ceActivities.length === 0 && <span className="text-[10px] text-muted-foreground italic">Sin actividades</span>}
                                  {ceActivities.length > 3 && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">+{ceActivities.length - 3}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => toast.info(`Editar ${ce.code}`)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={12} /></button>
                                  <button onClick={() => toast.error(`Eliminar ${ce.code}`)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-danger transition-colors"><Trash2 size={12} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="px-4 py-2 flex justify-end">
                      <button onClick={() => { setShowCEModal(ra.id); setCEForm({ code: `${ra.code}.x`, description: '', level: 1, weight: 0 }); }} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus size={12} /> Añadir CE
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── WORK UNITS TAB ── */}
      {activeTab === 'work-units' && (
        <div className="space-y-4">
          {EVALUATIONS.map((ev) => {
            const units = WORK_UNITS.filter(ut => ut.evaluationId === ev.id);
            const totalHours = units.reduce((s, ut) => s + ut.hours, 0);
            const weightSum = units.reduce((s, ut) => s + ut.weight, 0);
            const weightValid = Math.abs(weightSum - 100) < 0.01;

            return (
              <div key={ev.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{ev.name}</span>
                    <span className="text-xs text-muted-foreground">Peso evaluación: {ev.weight}%</span>
                    <span className="text-xs text-muted-foreground">{totalHours}h totales</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${weightValid ? 'text-success' : 'text-danger'}`}>
                      Σ pesos UT: {weightSum}% {weightValid ? '✓' : '⚠'}
                    </span>
                    <button onClick={() => toast.info('Nueva UT')} className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <Plus size={12} /> Nueva UT
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Código</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Nombre</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Horas</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Peso UT</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">% Impartido</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Estado</th>
                        <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">RA asociados</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Actividades</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {units.map((ut) => {
                        const utActivities = ACTIVITIES.filter(a => a.unitId === ut.id);
                        return (
                          <tr key={ut.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3"><span className="font-mono font-semibold text-foreground">{ut.code}</span></td>
                            <td className="px-4 py-3 font-medium text-foreground">{ut.name}</td>
                            <td className="px-3 py-3 text-center font-mono-nums text-foreground">{ut.hours}h</td>
                            <td className="px-3 py-3 text-center font-mono-nums font-semibold text-foreground">{ut.weight}%</td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${ut.taughtPercentage === 100 ? 'bg-success' : ut.taughtPercentage > 50 ? 'bg-primary' : ut.taughtPercentage > 0 ? 'bg-warning' : 'bg-muted-foreground'}`}
                                    style={{ width: `${ut.taughtPercentage}%` }} />
                                </div>
                                <span className="font-mono-nums text-[10px] text-foreground">{ut.taughtPercentage}%</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center"><StatusBadge status={ut.status} size="sm" /></td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {ut.raIds.map(raId => {
                                  const ra = LEARNING_OUTCOMES.find(r => r.id === raId);
                                  return ra ? <span key={raId} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-semibold">{ra.code}</span> : null;
                                })}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs font-semibold text-foreground">{utActivities.length}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">act.</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => toast.info(`Editar ${ut.code}`)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={12} /></button>
                                <button onClick={() => toast.error(`Eliminar ${ut.code}`)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-danger transition-colors"><Trash2 size={12} /></button>
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
        </div>
      )}

      {/* ── COVERAGE MAP TAB ── */}
      {activeTab === 'coverage-map' && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-xs font-semibold text-foreground">Mapa de cobertura curricular — UT × CE</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Trazabilidad entre Unidades de Trabajo y Criterios de Evaluación</p>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="text-[10px] min-w-max">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium sticky left-0 bg-muted/30 min-w-[140px]">UT / CE</th>
                  {CRITERIA.map(ce => (
                    <th key={ce.id} className="text-center px-2 py-2.5 text-muted-foreground font-medium min-w-[50px]">
                      <div className="font-mono text-[9px] font-semibold">{ce.code}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {WORK_UNITS.map(ut => (
                  <tr key={ut.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 sticky left-0 bg-card">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-primary">{ut.code}</span>
                        <span className="text-muted-foreground truncate max-w-[80px]">{ut.name}</span>
                      </div>
                    </td>
                    {CRITERIA.map(ce => {
                      const hasLink = ACTIVITIES.some(a => a.unitId === ut.id && a.ceIds.includes(ce.id));
                      return (
                        <td key={ce.id} className="px-2 py-2 text-center">
                          {hasLink ? (
                            <div className="w-5 h-5 rounded bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto">
                              <CheckCircle2 size={10} className="text-primary" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-muted/30 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-primary/20 border border-primary/40 flex items-center justify-center"><CheckCircle2 size={8} className="text-primary" /></div> CE evaluado en esta UT</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-muted/30" /> Sin cobertura</span>
          </div>
        </div>
      )}

      {/* ── EVALUATIONS TAB ── */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Periodos de evaluación del módulo</p>
            <button onClick={() => toast.info('Nueva evaluación')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={13} /> Nueva evaluación
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {EVALUATIONS.map(ev => {
              const units = WORK_UNITS.filter(ut => ut.evaluationId === ev.id);
              const activities = ACTIVITIES.filter(a => a.evaluationId === ev.id);
              const weightSum = units.reduce((s, ut) => s + ut.weight, 0);
              return (
                <div key={ev.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{ev.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{ev.type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{ev.weight}%</span>
                      <button onClick={() => toast.info(`Editar ${ev.name}`)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={13} /></button>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Inicio</span><span className="font-medium text-foreground">{ev.startDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Fin</span><span className="font-medium text-foreground">{ev.endDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Unidades de trabajo</span><span className="font-semibold text-foreground">{units.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Actividades</span><span className="font-semibold text-foreground">{activities.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Σ pesos UT</span>
                      <span className={`font-semibold ${Math.abs(weightSum - 100) < 0.01 ? 'text-success' : 'text-danger'}`}>{weightSum}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CE COMPATIBILITY TAB ── */}
      {activeTab === 'ce-compat' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Relaciones de compatibilidad entre criterios de evaluación</p>
            <button onClick={() => toast.info('Nueva compatibilidad')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={13} /> Nueva compatibilidad
            </button>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">CE Origen</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-16">→</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">CE Destino</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-24">Nivel</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-20">Factor</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-20">Activo</th>
                  <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Notas</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-20">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CE_COMPATIBILITIES.map(compat => {
                  const origin = CRITERIA.find(c => c.id === compat.originCeId);
                  const dest = CRITERIA.find(c => c.id === compat.destCeId);
                  return (
                    <tr key={compat.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono font-semibold text-primary">{origin?.code}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{origin?.description}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">→</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-mono font-semibold text-primary">{dest?.code}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{dest?.description}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${compat.level === 'full' ? 'bg-green-100 text-green-700' : compat.level === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {compat.level}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono-nums font-semibold text-foreground">{compat.factor}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${compat.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          {compat.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground leading-relaxed max-w-[200px] truncate">{compat.notes}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => toast.info('Editar compatibilidad')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={12} /></button>
                          <button onClick={() => toast.error('Eliminar compatibilidad')} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-danger transition-colors"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-muted/30 rounded-xl border border-border p-4">
            <h4 className="text-xs font-semibold text-foreground mb-2">Tipos de compatibilidad</h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
                <p className="font-semibold text-green-700">Full</p>
                <p className="text-green-600 mt-0.5">Transfiere la nota del CE origen × factor al CE destino.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                <p className="font-semibold text-amber-700">Partial</p>
                <p className="text-amber-600 mt-0.5">Solo transfiere si el CE origen supera el umbral de aprobado.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-semibold text-gray-700">Weak</p>
                <p className="text-gray-600 mt-0.5">Evidencia contextual. No transfiere nota ni valida el CE.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW RA MODAL ── */}
      {showRAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Nuevo Resultado de Aprendizaje</h3>
              <button onClick={() => setShowRAModal(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Código *</label>
                  <input type="text" value={raForm.code} onChange={e => setRAForm(p => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Ej: RA6" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Peso (%)</label>
                  <input type="number" min="0" max="100" value={raForm.weight} onChange={e => setRAForm(p => ({ ...p, weight: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Descripción *</label>
                <textarea value={raForm.description} onChange={e => setRAForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe el resultado de aprendizaje..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRAModal(false)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button onClick={() => { toast.success(`RA ${raForm.code} creado`); setShowRAModal(false); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                  Crear RA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW CE MODAL ── */}
      {showCEModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Nuevo Criterio de Evaluación</h3>
              <button onClick={() => setShowCEModal(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Código *</label>
                  <input type="text" value={ceForm.code} onChange={e => setCEForm(p => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Nivel</label>
                  <select value={ceForm.level} onChange={e => setCEForm(p => ({ ...p, level: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Peso (%)</label>
                  <input type="number" min="0" max="100" value={ceForm.weight} onChange={e => setCEForm(p => ({ ...p, weight: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Enunciado *</label>
                <textarea value={ceForm.description} onChange={e => setCEForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe el criterio de evaluación..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCEModal(null)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button onClick={() => { toast.success(`CE ${ceForm.code} creado`); setShowCEModal(null); }}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                  Crear CE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}