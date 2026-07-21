'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, GitBranch, Plus, Save, Scale, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useEduTrack } from '@/contexts/EduTrackContext';
import {
  criterionGradingConfigService,
  criterionImplicationService,
  rubricItemGradeService,
  rubricItemService,
  type CriterionGradingConfig,
  type RubricItem,
  type RubricLevelDefinition,
} from '@/lib/services/edutrackService';
import {
  aggregateCriterionEvidence,
  applyAggregateCutoff,
  conditionalOutcomeGrade,
  configuredCriterionWeight,
  deriveImplicitEvidence,
  directEvidenceForActivity,
  implicationClosure,
  rubricActivityGrade,
  rubricDiscordance,
  wouldCreateImplicationCycle,
  type CriterionEvidence,
} from '@/lib/domain/criterionGrading';
import { weightedAverage } from '@/lib/domain/calculations';

type Tab = 'config' | 'implications' | 'rubrics' | 'grading';

const DEFAULT_LEVELS: RubricLevelDefinition[] = [
  { label: 'Insuficiente', score: 3, descriptor: 'No alcanza el indicador' },
  { label: 'Suficiente', score: 5, descriptor: 'Alcanza lo esencial' },
  { label: 'Notable', score: 7.5, descriptor: 'Dominio adecuado' },
  { label: 'Sobresaliente', score: 10, descriptor: 'Dominio excelente' },
];

const fieldClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const buttonClass =
  'inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40';

function ConfigPanel() {
  const { criterionGradingConfig, refreshCriterionGrading } = useEduTrack();
  const [form, setForm] = useState(criterionGradingConfig);
  const [message, setMessage] = useState('');
  const numberField = (key: keyof CriterionGradingConfig, label: string) => (
    <label className="space-y-1 text-xs font-medium text-foreground">
      <span>{label}</span>
      <input
        className={fieldClass}
        type="number"
        min="0"
        max="10"
        step="0.1"
        value={form[key] as number}
        onChange={(event) =>
          setForm((current) => ({ ...current, [key]: Number(event.target.value) }))
        }
      />
    </label>
  );
  const save = async () => {
    await criterionGradingConfigService.upsert(form);
    await refreshCriterionGrading();
    setMessage('Configuración guardada. Todas las calificaciones se han recalculado.');
  };
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-info/20 bg-info/5 p-4 text-xs text-foreground">
        Los valores iniciales siguen la recomendación del documento: B=3, M=2, A=1, media móvil,
        implicación mínima y umbral 5.
      </div>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Ponderación y superación</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {numberField('basicWeight', 'Peso criterio básico')}
          {numberField('mediumWeight', 'Peso criterio medio')}
          {numberField('advancedWeight', 'Peso criterio avanzado')}
          {numberField('passingThreshold', 'Umbral de superación')}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Evidencias e implicaciones</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium">
            <span>Agregación de evidencias</span>
            <select
              className={fieldClass}
              value={form.aggregationMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  aggregationMode: event.target.value as CriterionGradingConfig['aggregationMode'],
                }))
              }
            >
              <option value="weighted_average">Media ponderada por actividad</option>
              <option value="latest">Última evidencia</option>
              <option value="moving_average">Media móvil 1, 2, 4, 8…</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">
            <span>Valor de evidencia implícita</span>
            <select
              className={fieldClass}
              value={form.implicationMode}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  implicationMode: event.target.value as CriterionGradingConfig['implicationMode'],
                }))
              }
            >
              <option value="disabled">Desactivada</option>
              <option value="minimum">Evidencia mínima</option>
              <option value="inherit">Heredar nota</option>
            </select>
          </label>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold">Techos cuando falla un básico</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {numberField('raCutoff', 'Resultado de aprendizaje')}
          {numberField('partialCutoff', 'Evaluación parcial')}
          {numberField('finalCutoff', 'Ordinaria / extraordinaria')}
        </div>
      </section>
      <div className="flex items-center gap-3">
        <button className={buttonClass} onClick={save}>
          <Save size={15} />
          Guardar configuración
        </button>
        {message && <span className="text-xs text-success">{message}</span>}
      </div>
    </div>
  );
}

function ImplicationsPanel() {
  const {
    activeModuleId,
    criteria,
    learningOutcomes,
    criterionImplications,
    refreshCriterionGrading,
  } = useEduTrack();
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  const criterionLabel = (id: string) => criteria.find((item) => item.id === id)?.code ?? id;
  const save = async () => {
    setError('');
    if (!source || !target || !justification.trim())
      return setError('Selecciona origen y destino y documenta la cobertura total.');
    if (wouldCreateImplicationCycle(criterionImplications, source, target))
      return setError('Esta arista crearía un ciclo en el grafo.');
    try {
      await criterionImplicationService.upsert({
        moduleId: activeModuleId,
        sourceCriterionId: source,
        targetCriterionId: target,
        justification: justification.trim(),
      });
      await refreshCriterionGrading();
      setSource('');
      setTarget('');
      setJustification('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la implicación.');
    }
  };
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-info/20 bg-info/5 p-4 text-xs">
        Solo declara X → Y cuando superar X exige ejercitar Y íntegramente. La relación entre RA
        emerge de estas aristas; no se duplica.
      </div>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Nueva implicación CE → CE</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className={fieldClass}
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">Criterio implicante…</option>
            {learningOutcomes.map((ra) => (
              <optgroup key={ra.id} label={ra.code}>
                {criteria
                  .filter((ce) => ce.raId === ra.id)
                  .map((ce) => (
                    <option key={ce.id} value={ce.id}>
                      {ce.code} · {ce.description}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <select
            className={fieldClass}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">Criterio acreditado…</option>
            {learningOutcomes.map((ra) => (
              <optgroup key={ra.id} label={ra.code}>
                {criteria
                  .filter((ce) => ce.raId === ra.id && ce.id !== source)
                  .map((ce) => (
                    <option key={ce.id} value={ce.id}>
                      {ce.code} · {ce.description}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <textarea
          className={fieldClass}
          rows={2}
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          placeholder="Justificación de cobertura total…"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <button className={buttonClass} onClick={save}>
          <Plus size={15} />
          Añadir arista
        </button>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Grafo acíclico y cierre transitivo</h2>
        <div className="space-y-2">
          {criterionImplications.map((edge) => (
            <div
              key={edge.id}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              <GitBranch size={15} className="mt-0.5 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {criterionLabel(edge.sourceCriterionId)} →{' '}
                  {criterionLabel(edge.targetCriterionId)}
                </p>
                <p className="text-xs text-muted-foreground">{edge.justification}</p>
                <p className="mt-1 text-[10px] text-primary">
                  Cierre:{' '}
                  {implicationClosure(edge.sourceCriterionId, criterionImplications)
                    .map(criterionLabel)
                    .join(', ') || 'ninguno'}
                </p>
              </div>
              <button
                className="p-2 text-danger"
                aria-label="Eliminar"
                onClick={async () => {
                  await criterionImplicationService.delete(edge.id);
                  await refreshCriterionGrading();
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {criterionImplications.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay implicaciones configuradas.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RubricsPanel() {
  const { activities, criteria, rubricItems, refreshCriterionGrading } = useEduTrack();
  const [activityId, setActivityId] = useState(activities[0]?.id ?? '');
  const [criterionId, setCriterionId] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(1);
  const [levels, setLevels] = useState<RubricLevelDefinition[]>(DEFAULT_LEVELS);
  const [editingId, setEditingId] = useState<string>();
  const activity = activities.find((item) => item.id === activityId);
  const items = rubricItems.filter((item) => item.activityId === activityId);
  const availableCriteria = criteria.filter((item) => activity?.ceIds.includes(item.id));
  const edit = (item: RubricItem) => {
    setEditingId(item.id);
    setCriterionId(item.criterionId);
    setDescription(item.description);
    setWeight(item.weight);
    setLevels(item.levels);
  };
  const save = async () => {
    if (!activityId || !criterionId || !description.trim() || weight <= 0) return;
    await rubricItemService.upsert({
      id: editingId,
      activityId,
      criterionId,
      description: description.trim(),
      weight,
      levels,
      sortOrder: editingId
        ? (items.find((item) => item.id === editingId)?.sortOrder ?? 0)
        : items.length,
    });
    await refreshCriterionGrading();
    setEditingId(undefined);
    setCriterionId('');
    setDescription('');
    setWeight(1);
    setLevels(DEFAULT_LEVELS);
  };
  return (
    <div className="space-y-5">
      <select
        className={fieldClass}
        value={activityId}
        onChange={(event) => {
          setActivityId(event.target.value);
          setEditingId(undefined);
        }}
      >
        {activities.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">
          {editingId ? 'Editar ítem' : 'Añadir ítem'} de rúbrica
        </h2>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_120px]">
          <select
            className={fieldClass}
            value={criterionId}
            onChange={(event) => setCriterionId(event.target.value)}
          >
            <option value="">CE del ítem…</option>
            {availableCriteria.map((ce) => (
              <option key={ce.id} value={ce.id}>
                {ce.code}
              </option>
            ))}
          </select>
          <input
            className={fieldClass}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Indicador de logro observable"
          />
          <input
            className={fieldClass}
            type="number"
            min="0.1"
            step="0.1"
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
            aria-label="Peso"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {levels.map((level, index) => (
            <div
              key={`${level.label}-${index}`}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <input
                className={fieldClass}
                value={level.label}
                aria-label={`Nombre del nivel ${index + 1}`}
                onChange={(event) =>
                  setLevels((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, label: event.target.value } : item
                    )
                  )
                }
              />
              <input
                className={fieldClass}
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={level.score}
                aria-label={`Puntuación del nivel ${index + 1}`}
                onChange={(event) =>
                  setLevels((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, score: Number(event.target.value) } : item
                    )
                  )
                }
              />
              <textarea
                className={fieldClass}
                rows={2}
                value={level.descriptor}
                aria-label={`Descriptor del nivel ${index + 1}`}
                onChange={(event) =>
                  setLevels((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, descriptor: event.target.value } : item
                    )
                  )
                }
              />
            </div>
          ))}
        </div>
        <button className={buttonClass} onClick={save}>
          <Save size={15} />
          {editingId ? 'Guardar ítem' : 'Añadir ítem'}
        </button>
      </section>
      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-left">CE</th>
              <th className="p-3 text-left">Indicador</th>
              <th className="p-3 text-center">Peso</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="p-3 font-mono text-primary">
                  {criteria.find((ce) => ce.id === item.criterionId)?.code}
                </td>
                <td className="p-3">
                  <button className="text-left hover:underline" onClick={() => edit(item)}>
                    {item.description}
                  </button>
                </td>
                <td className="p-3 text-center">{item.weight}</td>
                <td className="p-3 text-right">
                  <button
                    className="text-danger"
                    onClick={async () => {
                      await rubricItemService.delete(item.id);
                      await refreshCriterionGrading();
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Añade al menos un ítem por cada CE observado. La nota antigua seguirá visible hasta
            entonces.
          </p>
        )}
      </section>
    </div>
  );
}

function GradingPanel() {
  const {
    students,
    activities,
    criteria,
    learningOutcomes,
    evaluations,
    rubricItems,
    rubricItemGrades,
    criterionImplications,
    criterionGradingConfig: config,
    refreshCriterionGrading,
  } = useEduTrack();
  const [studentId, setStudentId] = useState(students[0]?.id ?? '');
  const [activityId, setActivityId] = useState(
    activities.find((item) => rubricItems.some((rubric) => rubric.activityId === item.id))?.id ?? ''
  );
  const items = rubricItems.filter((item) => item.activityId === activityId);
  const grades = rubricItemGrades.filter(
    (item) => item.studentId === studentId && items.some((rubric) => rubric.id === item.itemId)
  );
  const activity = activities.find((item) => item.id === activityId);
  const activityWeight =
    activity?.ceIds.reduce((sum, id) => {
      const ce = criteria.find((item) => item.id === id);
      return sum + (ce ? configuredCriterionWeight(ce.difficulty, config) : 0);
    }, 0) ?? 0;
  const allEvidence = useMemo(() => {
    const evidence: CriterionEvidence[] = [];
    [...activities]
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .forEach((current) => {
        const currentItems = rubricItems.filter((item) => item.activityId === current.id);
        const currentWeight = current.ceIds.reduce((sum, id) => {
          const ce = criteria.find((item) => item.id === id);
          return sum + (ce ? configuredCriterionWeight(ce.difficulty, config) : 0);
        }, 0);
        const direct = directEvidenceForActivity(
          current.id,
          currentWeight,
          currentItems,
          rubricItemGrades.filter((item) => item.studentId === studentId)
        );
        evidence.push(
          ...direct,
          ...deriveImplicitEvidence(direct, evidence, criterionImplications, config)
        );
      });
    return evidence;
  }, [
    activities,
    rubricItems,
    rubricItemGrades,
    criteria,
    studentId,
    criterionImplications,
    config,
  ]);
  const direct = allEvidence.filter(
    (item) => item.activityId === activityId && item.type === 'direct'
  );
  const globalGrade = rubricActivityGrade(items, grades);
  const discordant = rubricDiscordance(globalGrade, direct, config.passingThreshold);
  const aggregateSummaries = useMemo(() => {
    const summarize = (raIds: string[], cutoff: number) => {
      const outcomes = raIds.map((raId) => {
        const raCriteria = criteria.filter((criterion) => criterion.raId === raId);
        return {
          raId,
          weight: learningOutcomes.find((ra) => ra.id === raId)?.weight ?? 1,
          result: conditionalOutcomeGrade(
            raCriteria.map((criterion) => criterion.id),
            criteria,
            allEvidence,
            config
          ),
        };
      });
      const raw = weightedAverage(
        outcomes.map((outcome) => ({ value: outcome.result.raw, weight: outcome.weight }))
      );
      return applyAggregateCutoff(
        raw,
        outcomes.flatMap((outcome) => outcome.result.blockedBy),
        cutoff
      );
    };
    const partials = evaluations.map((evaluation) => {
      const ceIds = new Set(
        activities
          .filter((current) => current.evaluationId === evaluation.id)
          .flatMap((current) => current.ceIds)
      );
      const raIds = [
        ...new Set(
          criteria.filter((criterion) => ceIds.has(criterion.id)).map((criterion) => criterion.raId)
        ),
      ];
      return { evaluation, result: summarize(raIds, config.partialCutoff) };
    });
    return {
      partials,
      final: summarize(
        learningOutcomes.map((ra) => ra.id),
        config.finalCutoff
      ),
    };
  }, [activities, allEvidence, config, criteria, evaluations, learningOutcomes]);
  const saveGrade = async (itemId: string, score: number | null, notApplicable: boolean) => {
    await rubricItemGradeService.upsert(studentId, itemId, score, notApplicable);
    await refreshCriterionGrading();
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          className={fieldClass}
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
        >
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={activityId}
          onChange={(event) => setActivityId(event.target.value)}
        >
          <option value="">Actividad con rúbrica…</option>
          {activities
            .filter((item) => rubricItems.some((rubric) => rubric.activityId === item.id))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </div>
      {activity && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Peso derivado</p>
            <p className="text-2xl font-bold">{activityWeight}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Nota global</p>
            <p className="text-2xl font-bold">{globalGrade?.toFixed(2) ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Evidencias CE</p>
            <p className="text-2xl font-bold">{direct.length}</p>
          </div>
        </div>
      )}
      {discordant.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="text-warning" size={18} />
          <div>
            <p className="font-semibold">
              La actividad está superada, pero hay criterios pendientes
            </p>
            <p className="text-xs">
              {discordant
                .map((id) => criteria.find((item) => item.id === id)?.code ?? id)
                .join(', ')}
            </p>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => {
          const grade = grades.find((candidate) => candidate.itemId === item.id);
          return (
            <section
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="rounded bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                  {criteria.find((ce) => ce.id === item.criterionId)?.code}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">Peso {item.weight}</p>
                </div>
                {grade?.notApplicable && (
                  <span className="text-xs text-muted-foreground">No aplicable</span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                {item.levels.map((level) => (
                  <button
                    key={`${item.id}-${level.label}`}
                    onClick={() => saveGrade(item.id, level.score, false)}
                    className={`rounded-lg border p-3 text-left transition-colors ${!grade?.notApplicable && grade?.score === level.score ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'}`}
                  >
                    <span className="block text-xs font-semibold">
                      {level.label} · {level.score}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {level.descriptor}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => saveGrade(item.id, null, true)}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Marcar no aplicable
              </button>
            </section>
          );
        })}
      </div>
      {activity && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Cortes encadenados</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {aggregateSummaries.partials.map(({ evaluation, result }) => (
              <div key={evaluation.id} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{evaluation.name}</p>
                <p className="font-mono text-xl font-bold">{result.grade?.toFixed(2) ?? '—'}</p>
                {result.capped && (
                  <p className="text-[10px] text-danger">
                    Limitada desde {result.raw?.toFixed(2)} por {result.blockedBy.length} básico(s)
                  </p>
                )}
              </div>
            ))}
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Ordinaria / extraordinaria</p>
              <p className="font-mono text-xl font-bold">
                {aggregateSummaries.final.grade?.toFixed(2) ?? '—'}
              </p>
              {aggregateSummaries.final.capped && (
                <p className="text-[10px] text-danger">
                  Limitada desde {aggregateSummaries.final.raw?.toFixed(2)} por{' '}
                  {aggregateSummaries.final.blockedBy.length} básico(s)
                </p>
              )}
            </div>
          </div>
        </section>
      )}
      {activity && (
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Trazabilidad de criterios y cortes</h2>
          <div className="space-y-3">
            {learningOutcomes
              .filter((ra) =>
                criteria.some(
                  (ce) => ce.raId === ra.id && allEvidence.some((e) => e.criterionId === ce.id)
                )
              )
              .map((ra) => {
                const raCriteria = criteria.filter((ce) => ce.raId === ra.id);
                const result = conditionalOutcomeGrade(
                  raCriteria.map((ce) => ce.id),
                  criteria,
                  allEvidence,
                  config
                );
                return (
                  <div key={ra.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{ra.code}</span>
                      <span className="font-mono font-bold">{result.grade?.toFixed(2) ?? '—'}</span>
                      {result.capped && (
                        <span className="rounded bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                          Corte desde {result.raw?.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {raCriteria.map((ce) => {
                        const value = aggregateCriterionEvidence(
                          allEvidence.filter((e) => e.criterionId === ce.id),
                          config.aggregationMode
                        );
                        const implicit = allEvidence.some(
                          (e) => e.criterionId === ce.id && e.type === 'implicit'
                        );
                        return (
                          <span
                            key={ce.id}
                            className={`rounded border px-2 py-1 text-xs ${value !== null && value < config.passingThreshold ? 'border-danger/30 bg-danger/5 text-danger' : 'border-border'}`}
                          >
                            {ce.code}: {value?.toFixed(2) ?? 'sin evaluar'}
                            {implicit ? ' · incluye implícita' : ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function CriterionGradingContent() {
  const { loading, error } = useEduTrack();
  const [tab, setTab] = useState<Tab>('config');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'config', label: 'Configuración' },
    { id: 'implications', label: 'Implicaciones CE' },
    { id: 'rubrics', label: 'Rúbricas' },
    { id: 'grading', label: 'Calificar y evidencias' },
  ];
  if (loading)
    return <div className="p-8 text-sm text-muted-foreground">Cargando sistema criterial…</div>;
  if (error)
    return (
      <div className="m-6 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
        {error}
      </div>
    );
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <PageHeader
        title="Sistema de calificación por criterios"
        subtitle="Rúbrica atómica, evidencias, implicaciones y cortes trazables"
      />
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === item.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab === 'config' && <ConfigPanel />}
        {tab === 'implications' && <ImplicationsPanel />}
        {tab === 'rubrics' && <RubricsPanel />}
        {tab === 'grading' && <GradingPanel />}
      </div>
    </div>
  );
}
