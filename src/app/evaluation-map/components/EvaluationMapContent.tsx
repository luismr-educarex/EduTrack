'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { RefreshCw, Info, ChevronDown, ChevronRight, Save, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import { useEduTrack } from '@/contexts/EduTrackContext';
import {
  LEARNING_OUTCOMES as MOCK_LO, CRITERIA as MOCK_CRITERIA, WORK_UNITS as MOCK_WU, EVALUATIONS as MOCK_EVALS, ACTIVITIES as MOCK_ACTS,
  getDifficultyPoints, getActivityCEWeight,
} from '@/lib/mockData';

// Module-level references updated by the main component via context
let LEARNING_OUTCOMES = MOCK_LO;
let CRITERIA = MOCK_CRITERIA;
let WORK_UNITS = MOCK_WU;
let EVALUATIONS = MOCK_EVALS;
let ACTIVITIES = MOCK_ACTS;

// ─── TYPES ────────────────────────────────────────────────────────────────────

type MomentKey =
  | 'eval1' |'module_after_eval1' |'eval2' |'module_after_eval2' |'eval3' |'module_after_eval3' |'ordinary' |'extraordinary';

interface EvalMoment {
  key: MomentKey;
  label: string;
  shortLabel: string;
  type: 'parcial' | 'modulo' | 'final';
  description: string;
}

const EVAL_MOMENTS: EvalMoment[] = [
  { key: 'eval1', label: '1ª Evaluación', shortLabel: 'Eval 1', type: 'parcial', description: 'Calificación parcial al finalizar el primer trimestre' },
  { key: 'module_after_eval1', label: 'Módulo (tras 1ª Eval)', shortLabel: 'Módulo E1', type: 'modulo', description: 'Nota del módulo acumulada al finalizar la 1ª evaluación' },
  { key: 'eval2', label: '2ª Evaluación', shortLabel: 'Eval 2', type: 'parcial', description: 'Calificación parcial al finalizar el segundo trimestre' },
  { key: 'module_after_eval2', label: 'Módulo (tras 2ª Eval)', shortLabel: 'Módulo E2', type: 'modulo', description: 'Nota del módulo acumulada al finalizar la 2ª evaluación' },
  { key: 'eval3', label: '3ª Evaluación', shortLabel: 'Eval 3', type: 'parcial', description: 'Calificación parcial al finalizar el tercer trimestre' },
  { key: 'module_after_eval3', label: 'Módulo (tras 3ª Eval)', shortLabel: 'Módulo E3', type: 'modulo', description: 'Nota del módulo acumulada al finalizar la 3ª evaluación' },
  { key: 'ordinary', label: 'Ordinaria', shortLabel: 'Ordinaria', type: 'final', description: 'Convocatoria ordinaria — puede incluir actividades directas sin UT' },
  { key: 'extraordinary', label: 'Extraordinaria', shortLabel: 'Extraord.', type: 'final', description: 'Convocatoria extraordinaria — recuperación del módulo' },
];

// Weight entry: value 0–100 per UT/RA in each moment
type WeightMap = Record<MomentKey, number>;

interface UTWeightEntry {
  utId: string;
  weights: WeightMap;
}

interface RAWeightEntry {
  raId: string;
  weights: WeightMap;
}

// ─── DEFAULT WEIGHTS ──────────────────────────────────────────────────────────

function buildDefaultUTWeights(): UTWeightEntry[] {
  return WORK_UNITS.map(ut => {
    const evalId = ut.evaluationId;
    const isEval1 = evalId === 'eval-1';
    const isEval2 = evalId === 'eval-2';
    return {
      utId: ut.id,
      weights: {
        eval1: isEval1 ? ut.weight : 0,
        module_after_eval1: isEval1 ? ut.weight : 0,
        eval2: isEval2 ? ut.weight : 0,
        module_after_eval2: isEval2 ? ut.weight : 0,
        eval3: 0,
        module_after_eval3: 0,
        ordinary: isEval1 ? Math.round(ut.weight * 0.4) : isEval2 ? Math.round(ut.weight * 0.6) : 0,
        extraordinary: isEval1 ? Math.round(ut.weight * 0.4) : isEval2 ? Math.round(ut.weight * 0.6) : 0,
      },
    };
  });
}

function buildDefaultRAWeights(): RAWeightEntry[] {
  return LEARNING_OUTCOMES.map(ra => ({
    raId: ra.id,
    weights: {
      eval1: ra.weight,
      module_after_eval1: ra.weight,
      eval2: ra.weight,
      module_after_eval2: ra.weight,
      eval3: ra.weight,
      module_after_eval3: ra.weight,
      ordinary: ra.weight,
      extraordinary: ra.weight,
    },
  }));
}

// ─── RECALCULATE WEIGHTS FROM CE/UT ──────────────────────────────────────────

function recalcUTWeightsFromCE(momentKey: MomentKey): Record<string, number> {
  // For each UT, sum CE difficulty points of activities in that UT
  const utTotals: Record<string, number> = {};
  for (const ut of WORK_UNITS) {
    const acts = ACTIVITIES.filter(a => a.unitId === ut.id);
    const total = acts.reduce((sum, a) => sum + getActivityCEWeight(a.id), 0);
    utTotals[ut.id] = total;
  }
  const grandTotal = Object.values(utTotals).reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return {};
  const result: Record<string, number> = {};
  for (const ut of WORK_UNITS) {
    result[ut.id] = parseFloat(((utTotals[ut.id] / grandTotal) * 100).toFixed(1));
  }
  return result;
}

function recalcRAWeightsFromCE(momentKey: MomentKey): Record<string, number> {
  // For each RA, sum CE difficulty points of all its criteria
  const raTotals: Record<string, number> = {};
  for (const ra of LEARNING_OUTCOMES) {
    const ces = CRITERIA.filter(c => c.raId === ra.id);
    raTotals[ra.id] = ces.reduce((sum, ce) => sum + getDifficultyPoints(ce.difficulty), 0);
  }
  const grandTotal = Object.values(raTotals).reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return {};
  const result: Record<string, number> = {};
  for (const ra of LEARNING_OUTCOMES) {
    result[ra.id] = parseFloat(((raTotals[ra.id] / grandTotal) * 100).toFixed(1));
  }
  return result;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function momentTypeColor(type: EvalMoment['type']) {
  if (type === 'parcial') return 'bg-info/10 text-info border-info/20';
  if (type === 'modulo') return 'bg-primary/10 text-primary border-primary/20';
  return 'bg-success/10 text-success border-success/20';
}

function momentTypeDot(type: EvalMoment['type']) {
  if (type === 'parcial') return 'bg-info';
  if (type === 'modulo') return 'bg-primary';
  return 'bg-success';
}

function sumWeights(entries: { weights: WeightMap }[], momentKey: MomentKey): number {
  return parseFloat(entries.reduce((s, e) => s + (e.weights[momentKey] ?? 0), 0).toFixed(1));
}

function WeightInput({
  value,
  onChange,
  highlight,
}: {
  value: number;
  onChange: (v: number) => void;
  highlight?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');

  const colorClass =
    value === 0
      ? 'text-muted-foreground bg-muted/30'
      : value >= 30
      ? 'text-success bg-success/10' :'text-foreground bg-card';

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(raw);
          if (!isNaN(parsed)) onChange(Math.min(100, Math.max(0, parsed)));
          setEditing(false);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            const parsed = parseFloat(raw);
            if (!isNaN(parsed)) onChange(Math.min(100, Math.max(0, parsed)));
            setEditing(false);
          }
        }}
        className="w-14 text-center text-xs font-mono-nums border border-primary rounded px-1 py-0.5 outline-none bg-card"
      />
    );
  }

  return (
    <button
      onClick={() => { setRaw(String(value)); setEditing(true); }}
      className={`w-14 text-center text-xs font-mono-nums rounded px-1.5 py-1 transition-colors hover:ring-1 hover:ring-primary/40 ${colorClass} ${highlight ? 'ring-1 ring-primary/30' : ''}`}
    >
      {value > 0 ? `${value}%` : '—'}
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function EvaluationMapContent() {
  const { learningOutcomes: dbLO, criteria: dbCriteria, workUnits: dbWU, evaluations: dbEvals, activities: dbActs } = useEduTrack();

  // Update module-level references for sub-functions
  if (dbLO.length > 0) LEARNING_OUTCOMES = dbLO;
  if (dbCriteria.length > 0) CRITERIA = dbCriteria;
  if (dbWU.length > 0) WORK_UNITS = dbWU;
  if (dbEvals.length > 0) EVALUATIONS = dbEvals;
  if (dbActs.length > 0) ACTIVITIES = dbActs;

    const [utWeights, setUTWeights] = useState<UTWeightEntry[]>(buildDefaultUTWeights);
  const [raWeights, setRAWeights] = useState<RAWeightEntry[]>(buildDefaultRAWeights);
  const [activeView, setActiveView] = useState<'ut' | 'ra'>('ut');
  const [expandedMoments, setExpandedMoments] = useState<Set<MomentKey>>(new Set(['eval1', 'module_after_eval1']));
  const [selectedMoment, setSelectedMoment] = useState<MomentKey>('eval1');
  const [expandedRAs, setExpandedRAs] = useState<Set<string>>(new Set());
  const [showInfo, setShowInfo] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateUTWeight = useCallback((utId: string, momentKey: MomentKey, value: number) => {
    setUTWeights(prev =>
      prev.map(e => e.utId === utId ? { ...e, weights: { ...e.weights, [momentKey]: value } } : e)
    );
  }, []);

  const updateRAWeight = useCallback((raId: string, momentKey: MomentKey, value: number) => {
    setRAWeights(prev =>
      prev.map(e => e.raId === raId ? { ...e, weights: { ...e.weights, [momentKey]: value } } : e)
    );
  }, []);

  const recalcUT = useCallback((momentKey: MomentKey) => {
    const newWeights = recalcUTWeightsFromCE(momentKey);
    setUTWeights(prev =>
      prev.map(e => ({
        ...e,
        weights: { ...e.weights, [momentKey]: newWeights[e.utId] ?? 0 },
      }))
    );
    toast.success(`Pesos de UT recalculados para ${EVAL_MOMENTS.find(m => m.key === momentKey)?.label}`);
  }, []);

  const recalcRA = useCallback((momentKey: MomentKey) => {
    const newWeights = recalcRAWeightsFromCE(momentKey);
    setRAWeights(prev =>
      prev.map(e => ({
        ...e,
        weights: { ...e.weights, [momentKey]: newWeights[e.raId] ?? 0 },
      }))
    );
    toast.success(`Pesos de RA recalculados para ${EVAL_MOMENTS.find(m => m.key === momentKey)?.label}`);
  }, []);

  const recalcAll = useCallback(() => {
    for (const m of EVAL_MOMENTS) {
      const newUT = recalcUTWeightsFromCE(m.key);
      const newRA = recalcRAWeightsFromCE(m.key);
      setUTWeights(prev =>
        prev.map(e => ({ ...e, weights: { ...e.weights, [m.key]: newUT[e.utId] ?? 0 } }))
      );
      setRAWeights(prev =>
        prev.map(e => ({ ...e, weights: { ...e.weights, [m.key]: newRA[e.raId] ?? 0 } }))
      );
    }
    toast.success('Todos los pesos recalculados desde CE y UT');
  }, []);

  const resetAll = useCallback(() => {
        setUTWeights(buildDefaultUTWeights());
    setRAWeights(buildDefaultRAWeights());
    toast.success('Mapa de evaluación restaurado a valores por defecto');
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const utSums = useMemo(() =>
    Object.fromEntries(EVAL_MOMENTS.map(m => [m.key, sumWeights(utWeights, m.key)])),
    [utWeights]
  );

  const raSums = useMemo(() =>
    Object.fromEntries(EVAL_MOMENTS.map(m => [m.key, sumWeights(raWeights, m.key)])),
    [raWeights]
  );

  const toggleMoment = (key: MomentKey) => {
    setExpandedMoments(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleRA = (raId: string) => {
    setExpandedRAs(prev => {
      const next = new Set(prev);
      next.has(raId) ? next.delete(raId) : next.add(raId);
      return next;
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Mapa de Evaluación"
        subtitle="PSP — DAM 2º · Pesos de UT y RA en cada momento de evaluación"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              <Info size={13} /> Ayuda
            </button>
            <button
              onClick={recalcAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              <RefreshCw size={13} /> Recalcular todo
            </button>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              <RotateCcw size={13} /> Restaurar
            </button>
            <button
              onClick={() => toast.success('Mapa de evaluación guardado')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Save size={13} /> Guardar
            </button>
          </div>
        }
      />

      {/* Info banner */}
      {showInfo && (
        <div className="mb-5 p-4 rounded-xl bg-info/5 border border-info/20 text-sm text-foreground space-y-1.5">
          <p className="font-semibold text-info flex items-center gap-1.5"><Info size={14} /> ¿Cómo funciona el Mapa de Evaluación?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cada <strong>momento de evaluación</strong> (evaluaciones parciales, módulo acumulado, ordinaria y extraordinaria) tiene un peso asignado a cada <strong>Unidad de Trabajo (UT)</strong> y a cada <strong>Resultado de Aprendizaje (RA)</strong>.
            Estos pesos determinan cuánto vale cada UT/RA en la nota final de ese momento.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            El botón <strong>Recalcular</strong> redistribuye automáticamente los pesos en función de los <strong>Criterios de Evaluación (CE)</strong> y sus puntos de dificultad (Básico=1, Medio=2, Avanzado=3) asignados a las actividades de cada UT/RA.
          </p>
          <p className="text-xs text-muted-foreground">
            Los momentos <span className="text-info font-medium">azules</span> son evaluaciones parciales, los <span className="text-primary font-medium">morados</span> son notas de módulo acumuladas y los <span className="text-success font-medium">verdes</span> son convocatorias finales.
          </p>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-5 bg-muted/40 rounded-lg p-1 w-fit">
        {(['ut', 'ra'] as const).map(v => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeView === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {v === 'ut' ? 'Unidades de Trabajo (UT)' : 'Resultados de Aprendizaje (RA)'}
          </button>
        ))}
      </div>

      {/* ── MATRIX VIEW ─────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
        {/* Header row: moment columns */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-foreground w-52 sticky left-0 bg-muted/30 z-10">
                  {activeView === 'ut' ? 'Unidad de Trabajo' : 'Resultado de Aprendizaje'}
                </th>
                {EVAL_MOMENTS.map(m => (
                  <th key={m.key} className="px-2 py-2 text-center min-w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${momentTypeColor(m.type)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${momentTypeDot(m.type)}`} />
                        {m.shortLabel}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeView === 'ut' ? (
                <>
                  {WORK_UNITS.map((ut, idx) => {
                    const entry = utWeights.find(e => e.utId === ut.id)!;
                    const evalName = EVALUATIONS.find(e => e.id === ut.evaluationId)?.name ?? '';
                    const acts = ACTIVITIES.filter(a => a.unitId === ut.id);
                    const totalCEPts = acts.reduce((s, a) => s + getActivityCEWeight(a.id), 0);
                    return (
                      <tr key={ut.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                        <td className="px-4 py-2.5 sticky left-0 bg-card z-10 border-r border-border/30">
                          <div className="flex items-start gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">{ut.code}</span>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{evalName}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate max-w-[170px]">{ut.name}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{totalCEPts} pts CE · {acts.length} act.</p>
                            </div>
                          </div>
                        </td>
                        {EVAL_MOMENTS.map(m => (
                          <td key={m.key} className="px-2 py-2 text-center">
                            <WeightInput
                              value={entry.weights[m.key]}
                              onChange={v => updateUTWeight(ut.id, m.key, v)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Sum row */}
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="px-4 py-2.5 sticky left-0 bg-muted/20 z-10 border-r border-border/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Σ Total</span>
                        <span className="text-[10px] text-muted-foreground">(debe sumar 100%)</span>
                      </div>
                    </td>
                    {EVAL_MOMENTS.map(m => {
                      const s = utSums[m.key];
                      const ok = Math.abs(s - 100) < 1;
                      return (
                        <td key={m.key} className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${ok ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                            {ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {s}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Recalc row */}
                  <tr className="border-t border-border/30 bg-muted/10">
                    <td className="px-4 py-2 sticky left-0 bg-muted/10 z-10 border-r border-border/30">
                      <span className="text-[10px] text-muted-foreground">Recalcular desde CE →</span>
                    </td>
                    {EVAL_MOMENTS.map(m => (
                      <td key={m.key} className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => recalcUT(m.key)}
                          title={`Recalcular pesos de UT para ${m.label}`}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border/50 hover:border-primary/30"
                        >
                          <RefreshCw size={9} /> Auto
                        </button>
                      </td>
                    ))}
                  </tr>
                </>
              ) : (
                <>
                  {LEARNING_OUTCOMES.map((ra, idx) => {
                    const entry = raWeights.find(e => e.raId === ra.id)!;
                    const ces = CRITERIA.filter(c => c.raId === ra.id);
                    const totalCEPts = ces.reduce((s, ce) => s + getDifficultyPoints(ce.difficulty), 0);
                    const isExpanded = expandedRAs.has(ra.id);
                    return (
                      <React.Fragment key={ra.id}>
                        <tr className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                          <td className="px-4 py-2.5 sticky left-0 bg-card z-10 border-r border-border/30">
                            <div className="flex items-start gap-2">
                              <button
                                onClick={() => toggleRA(ra.id)}
                                className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                              >
                                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                              </button>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">{ra.code}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{totalCEPts} pts</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{ra.description.substring(0, 55)}…</p>
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{ces.length} CE</p>
                              </div>
                            </div>
                          </td>
                          {EVAL_MOMENTS.map(m => (
                            <td key={m.key} className="px-2 py-2 text-center">
                              <WeightInput
                                value={entry.weights[m.key]}
                                onChange={v => updateRAWeight(ra.id, m.key, v)}
                              />
                            </td>
                          ))}
                        </tr>
                        {/* CE breakdown rows */}
                        {isExpanded && ces.map(ce => {
                          const pts = getDifficultyPoints(ce.difficulty);
                          const diffColor = ce.difficulty === 'básico' ? 'text-success' : ce.difficulty === 'medio' ? 'text-warning' : 'text-danger';
                          const diffLabel = ce.difficulty === 'básico' ? 'B' : ce.difficulty === 'medio' ? 'M' : 'A';
                          // CE weight in each moment = (ce pts / ra total pts) * ra weight
                          return (
                            <tr key={ce.id} className="border-b border-border/30 bg-muted/5">
                              <td className="pl-10 pr-4 py-1.5 sticky left-0 bg-muted/5 z-10 border-r border-border/30">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold w-4 text-center ${diffColor}`}>{diffLabel}</span>
                                  <span className="text-[10px] font-medium text-foreground">{ce.code}</span>
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{ce.description.substring(0, 45)}…</span>
                                </div>
                              </td>
                              {EVAL_MOMENTS.map(m => {
                                const raEntry = raWeights.find(e => e.raId === ra.id)!;
                                const raW = raEntry.weights[m.key];
                                const ceContrib = totalCEPts > 0 ? parseFloat(((pts / totalCEPts) * raW).toFixed(1)) : 0;
                                return (
                                  <td key={m.key} className="px-2 py-1.5 text-center">
                                    <span className="text-[10px] font-mono-nums text-muted-foreground">
                                      {ceContrib > 0 ? `${ceContrib}%` : '—'}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {/* Sum row */}
                  <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                    <td className="px-4 py-2.5 sticky left-0 bg-muted/20 z-10 border-r border-border/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Σ Total</span>
                        <span className="text-[10px] text-muted-foreground">(debe sumar 100%)</span>
                      </div>
                    </td>
                    {EVAL_MOMENTS.map(m => {
                      const s = raSums[m.key];
                      const ok = Math.abs(s - 100) < 1;
                      return (
                        <td key={m.key} className="px-2 py-2 text-center">
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${ok ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                            {ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {s}%
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Recalc row */}
                  <tr className="border-t border-border/30 bg-muted/10">
                    <td className="px-4 py-2 sticky left-0 bg-muted/10 z-10 border-r border-border/30">
                      <span className="text-[10px] text-muted-foreground">Recalcular desde CE →</span>
                    </td>
                    {EVAL_MOMENTS.map(m => (
                      <td key={m.key} className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => recalcRA(m.key)}
                          title={`Recalcular pesos de RA para ${m.label}`}
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border/50 hover:border-primary/30"
                        >
                          <RefreshCw size={9} /> Auto
                        </button>
                      </td>
                    ))}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOMENT DETAIL CARDS ──────────────────────────────────────────────── */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Detalle por momento de evaluación</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {EVAL_MOMENTS.map(m => {
            const utSum = utSums[m.key];
            const raSum = raSums[m.key];
            const utOk = Math.abs(utSum - 100) < 1;
            const raOk = Math.abs(raSum - 100) < 1;
            const isExpanded = expandedMoments.has(m.key);
            const topUTs = [...utWeights]
              .sort((a, b) => b.weights[m.key] - a.weights[m.key])
              .filter(e => e.weights[m.key] > 0)
              .slice(0, 3);
            const topRAs = [...raWeights]
              .sort((a, b) => b.weights[m.key] - a.weights[m.key])
              .filter(e => e.weights[m.key] > 0)
              .slice(0, 3);

            return (
              <div key={m.key} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <button
                  onClick={() => toggleMoment(m.key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${momentTypeDot(m.type)}`} />
                    <span className="text-sm font-semibold text-foreground">{m.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${utOk && raOk ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                      {utOk && raOk ? '✓ OK' : '⚠ Revisar'}
                    </span>
                    {isExpanded ? <ChevronDown size={13} className="text-muted-foreground" /> : <ChevronRight size={13} className="text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                    <p className="text-[11px] text-muted-foreground mt-2">{m.description}</p>

                    {/* UT summary */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unidades de Trabajo</span>
                        <span className={`text-[10px] font-bold ${utOk ? 'text-success' : 'text-danger'}`}>Σ {utSum}%</span>
                      </div>
                      <div className="space-y-1">
                        {topUTs.map(e => {
                          const ut = WORK_UNITS.find(u => u.id === e.utId)!;
                          const pct = e.weights[m.key];
                          return (
                            <div key={e.utId} className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-foreground w-8 flex-shrink-0">{ut.code}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono-nums text-muted-foreground w-8 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                        {utWeights.filter(e => e.weights[m.key] > 0).length > 3 && (
                          <p className="text-[10px] text-muted-foreground">+{utWeights.filter(e => e.weights[m.key] > 0).length - 3} más…</p>
                        )}
                      </div>
                    </div>

                    {/* RA summary */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resultados de Aprendizaje</span>
                        <span className={`text-[10px] font-bold ${raOk ? 'text-success' : 'text-danger'}`}>Σ {raSum}%</span>
                      </div>
                      <div className="space-y-1">
                        {topRAs.map(e => {
                          const ra = LEARNING_OUTCOMES.find(r => r.id === e.raId)!;
                          const pct = e.weights[m.key];
                          return (
                            <div key={e.raId} className="flex items-center gap-2">
                              <span className="text-[10px] font-medium text-foreground w-8 flex-shrink-0">{ra.code}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-info rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono-nums text-muted-foreground w-8 text-right">{pct}%</span>
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
      </div>

      {/* ── LEGEND ──────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-info" />
          <span>Evaluación parcial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Nota módulo acumulada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>Convocatoria final</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={11} className="text-success" />
          <span>Suma = 100% (correcto)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle size={11} className="text-danger" />
          <span>Suma ≠ 100% (revisar)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={11} />
          <span>Auto: recalcula desde puntos CE</span>
        </div>
      </div>
    </div>
  );
}
