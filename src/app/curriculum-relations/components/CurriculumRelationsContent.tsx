'use client';
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Target, Layers, Zap, ClipboardList, BookOpen, GitBranch, ChevronRight, ChevronDown, ArrowRight, Search, CheckCircle2, AlertCircle, Clock, XCircle, ExternalLink, BarChart2, Users, Link2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

import { LEARNING_OUTCOMES as MOCK_LO, CRITERIA as MOCK_CRITERIA, WORK_UNITS as MOCK_WU, EVALUATIONS as MOCK_EVALS, ACTIVITIES as MOCK_ACTS } from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';

// Module-level references updated by the main component via context
let LEARNING_OUTCOMES = MOCK_LO;
let CRITERIA = MOCK_CRITERIA;
let WORK_UNITS = MOCK_WU;
let EVALUATIONS = MOCK_EVALS;
let ACTIVITIES = MOCK_ACTS;

type ViewMode = 'ra-tree' | 'ut-tree' | 'activity-map' | 'matrix' | 'eval-tree';

const STATUS_ICON: Record<string, React.ReactNode> = {
  superado: <CheckCircle2 size={12} className="text-success" />,
  parcial: <AlertCircle size={12} className="text-warning" />,
  no_superado: <XCircle size={12} className="text-danger" />,
  no_evaluado: <Clock size={12} className="text-muted-foreground" />,
};

function RelBadge({ label, color, href }: { label: string; color: string; href?: string }) {
  const cls = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${color}`;
  if (href) {
    return <Link href={href} className={cls + ' hover:opacity-80 transition-opacity'}>{label}</Link>;
  }
  return <span className={cls}>{label}</span>;
}

function SectionCard({ title, icon, children, accent = 'border-primary/30' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
}) {
  return (
    <div className={`bg-card border ${accent} rounded-xl p-4 shadow-sm`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── RA TREE VIEW ─────────────────────────────────────────────────────────────
function RATreeView({ search }: { search: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['ra-1']));

  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredRAs = LEARNING_OUTCOMES.filter(ra =>
    ra.code.toLowerCase().includes(search.toLowerCase()) ||
    ra.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {filteredRAs.map(ra => {
        const ces = CRITERIA.filter(c => c.raId === ra.id);
        const uts = WORK_UNITS.filter(ut => ut.raIds?.includes(ra.id));
        const acts = ACTIVITIES.filter(a => ces.some(ce => a.ceIds.includes(ce.id)));
        const isOpen = expanded.has(ra.id);

        return (
          <div key={ra.id} className="border border-border rounded-xl overflow-hidden">
            {/* RA Header */}
            <button
              onClick={() => toggle(ra.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {ra.code.replace('RA', '')}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-primary">{ra.code}</span>
                  <span className="text-[10px] text-muted-foreground">Peso: {ra.weight}%</span>
                  <RelBadge label={`${ces.length} CE`} color="border-blue-200 bg-blue-50 text-blue-700" />
                  <RelBadge label={`${uts.length} UT`} color="border-purple-200 bg-purple-50 text-purple-700" />
                  <RelBadge label={`${acts.length} Act.`} color="border-amber-200 bg-amber-50 text-amber-700" />
                </div>
                <p className="text-xs text-foreground mt-0.5 line-clamp-1">{ra.description}</p>
              </div>
              {isOpen ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="p-4 space-y-4 bg-card">
                {/* CE list */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <Target size={10} /> Criterios de Evaluación
                  </p>
                  <div className="space-y-1.5">
                    {ces.map(ce => {
                      const ceActs = ACTIVITIES.filter(a => a.ceIds.includes(ce.id));
                      return (
                        <div key={ce.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
                          <span className="flex-shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5">{ce.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground line-clamp-2">{ce.description}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{ce.difficulty}</span>
                              {ceActs.map(a => (
                                <RelBadge key={a.id} label={a.name.substring(0, 20) + (a.name.length > 20 ? '…' : '')}
                                  color="border-amber-200 bg-amber-50 text-amber-700"
                                  href="/activities" />
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* UT links */}
                {uts.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <Layers size={10} /> Unidades de Trabajo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {uts.map(ut => (
                        <Link key={ut.id} href="/planning-curriculum"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors">
                          <span className="text-[10px] font-bold text-purple-700">{ut.code}</span>
                          <span className="text-[10px] text-purple-600">{ut.name}</span>
                          <ExternalLink size={9} className="text-purple-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {acts.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                      <Zap size={10} /> Actividades vinculadas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {acts.map(a => (
                        <Link key={a.id} href="/activities"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                          <span className="text-[10px] font-semibold text-amber-700">{a.name.substring(0, 25)}{a.name.length > 25 ? '…' : ''}</span>
                          <ExternalLink size={9} className="text-amber-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── UT TREE VIEW ─────────────────────────────────────────────────────────────
function UTTreeView({ search }: { search: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['ut-1']));
  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filteredUTs = WORK_UNITS.filter(ut =>
    ut.code.toLowerCase().includes(search.toLowerCase()) ||
    ut.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {filteredUTs.map(ut => {
        const ev = EVALUATIONS.find(e => e.id === ut.evaluationId);
        const ras = LEARNING_OUTCOMES.filter(ra => ut.raIds?.includes(ra.id));
        const ces = CRITERIA.filter(c => ras.some(ra => ra.id === c.raId));
        const acts = ACTIVITIES.filter(a => a.unitId === ut.id);
        const isOpen = expanded.has(ut.id);

        const statusColor: Record<string, string> = {
          impartida: 'bg-success/10 border-success/30',
          en_curso: 'bg-info/10 border-info/30',
          pendiente: 'bg-muted border-border',
        };

        return (
          <div key={ut.id} className={`border rounded-xl overflow-hidden ${statusColor[ut.status] || 'border-border'}`}>
            <button
              onClick={() => toggle(ut.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors text-left"
            >
              <span className="flex-shrink-0 text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{ut.code}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{ut.name}</span>
                  {ev && <RelBadge label={ev.name} color="border-blue-200 bg-blue-50 text-blue-700" />}
                  <RelBadge label={`${ut.hours}h`} color="border-gray-200 bg-gray-50 text-gray-600" />
                  <RelBadge label={`${ras.length} RA`} color="border-primary/30 bg-primary/5 text-primary" />
                  <RelBadge label={`${ces.length} CE`} color="border-blue-200 bg-blue-50 text-blue-700" />
                  <RelBadge label={`${acts.length} Act.`} color="border-amber-200 bg-amber-50 text-amber-700" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 bg-border rounded-full h-1.5 max-w-[120px]">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${ut.taughtPercentage}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{ut.taughtPercentage}% impartida</span>
                </div>
              </div>
              {isOpen ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 bg-card/80">
                {/* RA links */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Target size={10} /> Resultados de Aprendizaje
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ras.map(ra => (
                      <Link key={ra.id} href="/planning-curriculum"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                        <span className="text-[10px] font-bold text-primary">{ra.code}</span>
                        <ExternalLink size={9} className="text-primary/50" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* CE list */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Target size={10} /> Criterios de Evaluación
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ces.map(ce => (
                      <span key={ce.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700">{ce.code}</span>
                    ))}
                  </div>
                </div>

                {/* Activities */}
                {acts.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Zap size={10} /> Actividades
                    </p>
                    <div className="space-y-1">
                      {acts.map(a => (
                        <Link key={a.id} href="/activities"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                          <Zap size={10} className="text-amber-600 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-amber-700 flex-1">{a.name}</span>
                          <span className="text-[10px] text-amber-500">{a.type}</span>
                          <ExternalLink size={9} className="text-amber-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ACTIVITY MAP VIEW ────────────────────────────────────────────────────────
function ActivityMapView({ search }: { search: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['act-1']));
  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const filtered = ACTIVITIES.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_COLORS: Record<string, string> = {
    borrador: 'border-gray-200 bg-gray-50',
    publicada: 'border-blue-200 bg-blue-50',
    en_correccion: 'border-amber-200 bg-amber-50',
    pendiente_revision: 'border-orange-200 bg-orange-50',
    revisada_docente: 'border-purple-200 bg-purple-50',
    cerrada: 'border-green-200 bg-green-50',
  };

  return (
    <div className="space-y-2">
      {filtered.map(act => {
        const ces = CRITERIA.filter(c => act.ceIds.includes(c.id));
        const ras = LEARNING_OUTCOMES.filter(ra => ces.some(c => c.raId === ra.id));
        const ut = WORK_UNITS.find(u => u.id === act.unitId);
        const ev = EVALUATIONS.find(e => e.id === act.evaluationId);
        const isOpen = expanded.has(act.id);

        return (
          <div key={act.id} className={`border rounded-xl overflow-hidden ${STATUS_COLORS[act.status] || 'border-border'}`}>
            <button
              onClick={() => toggle(act.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors text-left"
            >
              <Zap size={14} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{act.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 border border-current text-muted-foreground">{act.type}</span>
                  {ut && <RelBadge label={ut.code} color="border-purple-200 bg-purple-50 text-purple-700" />}
                  {ev && <RelBadge label={ev.name} color="border-blue-200 bg-blue-50 text-blue-700" />}
                  <RelBadge label={`${ces.length} CE`} color="border-blue-200 bg-blue-50 text-blue-700" />
                  <RelBadge label={`${ras.length} RA`} color="border-primary/30 bg-primary/5 text-primary" />
                  <RelBadge label={`Peso: ${act.weight}%`} color="border-gray-200 bg-gray-50 text-gray-600" />
                </div>
              </div>
              {isOpen ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 bg-card/80">
                {/* Chain: RA → CE → Activity */}
                <div className="flex items-start gap-2 flex-wrap">
                  {ras.map(ra => (
                    <div key={ra.id} className="flex flex-col gap-1">
                      <Link href="/planning-curriculum"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
                        <Target size={10} className="text-primary" />
                        <span className="text-[10px] font-bold text-primary">{ra.code}</span>
                        <ExternalLink size={9} className="text-primary/50" />
                      </Link>
                      <div className="pl-2 space-y-1">
                        {ces.filter(c => c.raId === ra.id).map(ce => (
                          <div key={ce.id} className="flex items-center gap-1">
                            <ArrowRight size={8} className="text-muted-foreground" />
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">{ce.code}</span>
                            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">{ce.description.substring(0, 50)}…</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grading link */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <ClipboardList size={12} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Calificaciones:</span>
                  <Link href="/grading" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                    Ver notas de esta actividad <ExternalLink size={9} />
                  </Link>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {act.reviewedCount}/{act.correctionCount} corregidas
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── EVAL TREE VIEW ───────────────────────────────────────────────────────────
function EvalTreeView({ search }: { search: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['eval-1']));
  const toggle = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  return (
    <div className="space-y-4">
      {EVALUATIONS.map(ev => {
        const uts = WORK_UNITS.filter(ut => ut.evaluationId === ev.id);
        const acts = ACTIVITIES.filter(a => a.evaluationId === ev.id);
        const ces = CRITERIA.filter(c => acts.some(a => a.ceIds.includes(c.id)));
        const ras = LEARNING_OUTCOMES.filter(ra => ces.some(c => c.raId === ra.id));
        const isOpen = expanded.has(ev.id);

        return (
          <div key={ev.id} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(ev.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
            >
              <BookOpen size={16} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-blue-700">{ev.name}</span>
                  <RelBadge label={`Peso: ${ev.weight}%`} color="border-blue-200 bg-white text-blue-700" />
                  <RelBadge label={`${uts.length} UT`} color="border-purple-200 bg-purple-50 text-purple-700" />
                  <RelBadge label={`${acts.length} Act.`} color="border-amber-200 bg-amber-50 text-amber-700" />
                  <RelBadge label={`${ras.length} RA`} color="border-primary/30 bg-primary/5 text-primary" />
                  <RelBadge label={`${ces.length} CE`} color="border-blue-200 bg-blue-50 text-blue-700" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ev.startDate} → {ev.endDate}</p>
              </div>
              {isOpen ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="p-4 space-y-4 bg-card">
                {/* UTs */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <Layers size={10} /> Unidades de Trabajo
                  </p>
                  <div className="space-y-2">
                    {uts.map(ut => {
                      const utActs = acts.filter(a => a.unitId === ut.id);
                      return (
                        <div key={ut.id} className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">{ut.code}</span>
                            <span className="text-xs font-medium text-foreground">{ut.name}</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{ut.hours}h · {ut.taughtPercentage}%</span>
                          </div>
                          {utActs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pl-2">
                              {utActs.map(a => (
                                <Link key={a.id} href="/activities"
                                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors">
                                  <Zap size={8} className="text-amber-600" />
                                  <span className="text-[10px] text-amber-700">{a.name.substring(0, 22)}{a.name.length > 22 ? '…' : ''}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RA/CE summary */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <Target size={10} /> RA y CE evaluados
                  </p>
                  <div className="space-y-1.5">
                    {ras.map(ra => {
                      const raCes = ces.filter(c => c.raId === ra.id);
                      return (
                        <div key={ra.id} className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">{ra.code}</span>
                          <div className="flex flex-wrap gap-1">
                            {raCes.map(ce => (
                              <span key={ce.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">{ce.code}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MATRIX VIEW ──────────────────────────────────────────────────────────────
function MatrixView() {
  const [rowType, setRowType] = useState<'ut' | 'activity'>('ut');

  const rows = rowType === 'ut' ? WORK_UNITS : ACTIVITIES;
  const cols = LEARNING_OUTCOMES;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">Filas:</span>
        <button
          onClick={() => setRowType('ut')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${rowType === 'ut' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Unidades de Trabajo
        </button>
        <button
          onClick={() => setRowType('activity')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${rowType === 'activity' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          Actividades
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-semibold text-foreground border-b border-r border-border min-w-[160px] sticky left-0 bg-muted/50 z-10">
                {rowType === 'ut' ? 'Unidad de Trabajo' : 'Actividad'}
              </th>
              {cols.map(ra => (
                <th key={ra.id} className="px-2 py-2 font-bold text-primary border-b border-r border-border text-center min-w-[60px]">
                  {ra.code}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isUT = rowType === 'ut';
              const utRow = isUT ? (row as typeof WORK_UNITS[0]) : null;
              const actRow = !isUT ? (row as typeof ACTIVITIES[0]) : null;

              return (
                <tr key={row.id} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}>
                  <td className={`px-3 py-2 border-r border-border font-medium text-foreground sticky left-0 z-10 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                    <div className="flex items-center gap-1.5">
                      {isUT ? (
                        <>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded">{utRow!.code}</span>
                          <span className="truncate max-w-[110px]">{utRow!.name}</span>
                        </>
                      ) : (
                        <>
                          <Zap size={10} className="text-amber-600 flex-shrink-0" />
                          <span className="truncate max-w-[130px]">{actRow!.name}</span>
                        </>
                      )}
                    </div>
                  </td>
                  {cols.map(ra => {
                    let hasRelation = false;
                    let strength: 'full' | 'partial' | 'none' = 'none';

                    if (isUT && utRow) {
                      hasRelation = utRow.raIds?.includes(ra.id) ?? false;
                      strength = hasRelation ? 'full' : 'none';
                    } else if (actRow) {
                      const raCes = CRITERIA.filter(c => c.raId === ra.id);
                      const matchingCEs = actRow.ceIds.filter(ceId => raCes.some(c => c.id === ceId));
                      if (matchingCEs.length === raCes.length && raCes.length > 0) strength = 'full';
                      else if (matchingCEs.length > 0) strength = 'partial';
                      hasRelation = matchingCEs.length > 0;
                    }

                    return (
                      <td key={ra.id} className="px-2 py-2 border-r border-border text-center">
                        {strength === 'full' && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">✓</span>
                        )}
                        {strength === 'partial' && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-warning/20 text-warning text-[9px] font-bold">~</span>
                        )}
                        {strength === 'none' && (
                          <span className="text-muted-foreground/30 text-[10px]">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">✓</span>
          Relación completa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-warning/20 text-warning text-[8px] font-bold">~</span>
          Relación parcial
        </span>
        <span className="flex items-center gap-1">
          <span className="text-muted-foreground/30">·</span>
          Sin relación
        </span>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CurriculumRelationsContent() {
  const { learningOutcomes: dbLO, criteria: dbCriteria, workUnits: dbWU, evaluations: dbEvals, activities: dbActs } = useEduTrack();

  // Update module-level references for sub-components
  LEARNING_OUTCOMES = dbLO;
  CRITERIA = dbCriteria;
  WORK_UNITS = dbWU;
  EVALUATIONS = dbEvals.map(evaluation => ({ ...evaluation, type: evaluation.evalType }));
  ACTIVITIES = dbActs;

  const [viewMode, setViewMode] = useState<ViewMode>('ra-tree');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const totalCE = CRITERIA.length;
    const ceCovered = CRITERIA.filter(c => ACTIVITIES.some(a => a.ceIds.includes(c.id))).length;
    const totalActs = ACTIVITIES.length;
    const actsWithCE = ACTIVITIES.filter(a => a.ceIds.length > 0).length;
    const totalUTs = WORK_UNITS.length;
    const utsWithRA = WORK_UNITS.filter(ut => ut.raIds && ut.raIds.length > 0).length;
    return { totalCE, ceCovered, totalActs, actsWithCE, totalUTs, utsWithRA };
  }, []);

  const views: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    { key: 'ra-tree', label: 'Por RA', icon: <Target size={14} /> },
    { key: 'ut-tree', label: 'Por UT', icon: <Layers size={14} /> },
    { key: 'activity-map', label: 'Por Actividad', icon: <Zap size={14} /> },
    { key: 'eval-tree', label: 'Por Evaluación', icon: <BookOpen size={14} /> },
    { key: 'matrix', label: 'Matriz', icon: <BarChart2 size={14} /> },
  ];

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Relaciones Curriculares"
        subtitle="PSP — DAM 2º · Mapa de relaciones entre RA, CE, UT, Actividades y Calificaciones"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/planning-curriculum"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <BookOpen size={13} /> Planificación
            </Link>
            <Link href="/activities"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <Zap size={13} /> Actividades
            </Link>
            <Link href="/grading"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <ClipboardList size={13} /> Calificaciones
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Resultados de Aprendizaje', value: LEARNING_OUTCOMES.length, icon: <Target size={14} />, color: 'text-primary bg-primary/10' },
          { label: 'Criterios de Evaluación', value: CRITERIA.length, icon: <GitBranch size={14} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'CE con actividad', value: `${stats.ceCovered}/${stats.totalCE}`, icon: <CheckCircle2 size={14} />, color: 'text-success bg-success/10' },
          { label: 'Unidades de Trabajo', value: WORK_UNITS.length, icon: <Layers size={14} />, color: 'text-purple-600 bg-purple-50' },
          { label: 'Actividades', value: ACTIVITIES.length, icon: <Zap size={14} />, color: 'text-amber-600 bg-amber-50' },
          { label: 'Evaluaciones', value: EVALUATIONS.length, icon: <BookOpen size={14} />, color: 'text-indigo-600 bg-indigo-50' },
        ].map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</span>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* View selector + search */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => setViewMode(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === v.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        {viewMode !== 'matrix' && (
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}
      </div>

      {/* Quick navigation links */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-muted/40 rounded-xl border border-border flex-wrap">
        <Link2 size={13} className="text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Acceso rápido:</span>
        <Link href="/planning-curriculum" className="flex items-center gap-1 text-[11px] text-primary hover:underline">
          <BookOpen size={10} /> Planificación
        </Link>
        <ChevronRight size={10} className="text-muted-foreground" />
        <Link href="/activities" className="flex items-center gap-1 text-[11px] text-amber-600 hover:underline">
          <Zap size={10} /> Actividades
        </Link>
        <ChevronRight size={10} className="text-muted-foreground" />
        <Link href="/grading" className="flex items-center gap-1 text-[11px] text-success hover:underline">
          <ClipboardList size={10} /> Calificaciones
        </Link>
        <ChevronRight size={10} className="text-muted-foreground" />
        <Link href="/reports" className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline">
          <BarChart2 size={10} /> Informes
        </Link>
        <ChevronRight size={10} className="text-muted-foreground" />
        <Link href="/students-tutoring" className="flex items-center gap-1 text-[11px] text-purple-600 hover:underline">
          <Users size={10} /> Alumnado
        </Link>
      </div>

      {/* Content */}
      <div>
        {viewMode === 'ra-tree' && <RATreeView search={search} />}
        {viewMode === 'ut-tree' && <UTTreeView search={search} />}
        {viewMode === 'activity-map' && <ActivityMapView search={search} />}
        {viewMode === 'eval-tree' && <EvalTreeView search={search} />}
        {viewMode === 'matrix' && <MatrixView />}
      </div>
    </div>
  );
}
