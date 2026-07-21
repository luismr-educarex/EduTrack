import { round, weightedAverage, type GradeValue } from './calculations';

export type AggregationMode = 'weighted_average' | 'latest' | 'moving_average';
export type ImplicationMode = 'disabled' | 'minimum' | 'inherit';
export type ImplicationLevel = 'H' | 'M' | 'I';
export type EvidenceType = 'direct' | 'implicit';

export interface CriterionGradingConfig {
  academicYear?: string;
  basicWeight: number;
  mediumWeight: number;
  advancedWeight: number;
  passingThreshold: number;
  aggregationMode: AggregationMode;
  recoveryAggregationMode: AggregationMode;
  /** Legacy fallback for implications created before levels H/M/I existed. */
  implicationMode: ImplicationMode;
  cutoffActive: boolean;
  raCutoff: number;
  partialCutoff: number;
  finalCutoff: number;
}

export const DEFAULT_CRITERION_GRADING_CONFIG: CriterionGradingConfig = {
  academicYear: '2025-2026',
  basicWeight: 3,
  mediumWeight: 2,
  advancedWeight: 1,
  passingThreshold: 5,
  aggregationMode: 'moving_average',
  recoveryAggregationMode: 'latest',
  implicationMode: 'minimum',
  cutoffActive: true,
  raCutoff: 4.5,
  partialCutoff: 4.5,
  finalCutoff: 4,
};

export interface GradingCriterion {
  id: string;
  raId: string;
  difficulty: 'básico' | 'medio' | 'avanzado';
  directEvidenceRequired?: boolean;
}

export interface RubricItem {
  id: string;
  activityId: string;
  criterionId: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  label: string;
  score: number;
  descriptor: string;
}

export interface ItemGrade {
  studentId: string;
  itemId: string;
  score: number | null;
  notApplicable: boolean;
  gradedAt: string;
}

export interface CriterionImplication {
  id: string;
  sourceCriterionId: string;
  targetCriterionId: string;
  level?: ImplicationLevel;
  source?: string;
  justification?: string;
}

export interface CriterionEvidence {
  criterionId: string;
  activityId: string;
  value: number;
  weight: number;
  date: string;
  type: EvidenceType;
  sourceCriterionId?: string;
  implicationLevel?: Exclude<ImplicationLevel, 'I'>;
  recovery?: boolean;
}

export interface ConditionalGrade {
  raw: GradeValue;
  grade: GradeValue;
  blockedBy: string[];
  capped: boolean;
  effect?: 'orientative' | 'academic';
}

export interface ExamExercise {
  criterionId: string;
  character: 'integrative' | 'direct';
  covers: string[];
  weight: number;
  accredits: { criterionId: string; level: Exclude<ImplicationLevel, 'I'> }[];
}

export interface ExamComposition {
  pendingCriteria: string[];
  exercises: ExamExercise[];
  traceability: Record<
    string,
    {
      via: 'direct' | 'implicit';
      exercise: number;
      by?: string;
      level?: Exclude<ImplicationLevel, 'I'>;
    }
  >;
}

export interface RecoveryActivity {
  class: 'itinerary' | 'section' | 'reinforcement';
  raId: string | null;
  phases: string[];
  milestone: string | null;
  weight: number;
}

export interface ActivityTemplate {
  id: string;
  criterionId: string;
  roles: ('phase' | 'milestone' | 'reinforcement')[];
  rubricItems: Pick<RubricItem, 'criterionId' | 'levels' | 'description' | 'weight'>[];
  validated: boolean;
  content?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GradingGraphImport {
  modulo: { codigo: string; nombre: string; fuente?: string };
  version: number;
  pesos_tipo: { B: number; M: number; A: number };
  criterios: {
    id: string;
    ra: string;
    tipo: 'B' | 'M' | 'A';
    evidencia_directa_obligatoria?: boolean;
  }[];
  aristas: {
    origen: string;
    destino: string;
    nivel: ImplicationLevel;
    fuente?: string;
    justificacion: string;
  }[];
  rechazadas?: { elemento: string; motivo: string }[];
  [calculated: string]: unknown;
}

export interface ParsedGradingGraph {
  module: GradingGraphImport['modulo'];
  version: number;
  weights: GradingGraphImport['pesos_tipo'];
  criteria: GradingGraphImport['criterios'];
  implications: CriterionImplication[];
  rejections: { element: string; reason: string }[];
}

export function parseGradingGraph(input: unknown): ParsedGradingGraph {
  if (!input || typeof input !== 'object') throw new Error('El grafo debe ser un objeto JSON.');
  const graph = input as Partial<GradingGraphImport>;
  if (
    !graph.modulo?.codigo ||
    !Number.isInteger(graph.version) ||
    !graph.pesos_tipo ||
    !Array.isArray(graph.criterios) ||
    !Array.isArray(graph.aristas)
  ) {
    throw new Error('El contrato del grafo está incompleto.');
  }
  const criterionIds = new Set<string>();
  graph.criterios.forEach((criterion) => {
    if (
      !criterion.id ||
      !criterion.ra ||
      !['B', 'M', 'A'].includes(criterion.tipo) ||
      criterionIds.has(criterion.id)
    ) {
      throw new Error(`Criterio inválido o duplicado: ${criterion.id || '(sin id)'}.`);
    }
    criterionIds.add(criterion.id);
  });
  const implications = new Map<string, CriterionImplication>();
  graph.aristas.forEach((edge, index) => {
    if (
      !criterionIds.has(edge.origen) ||
      !criterionIds.has(edge.destino) ||
      !['H', 'M', 'I'].includes(edge.nivel) ||
      !edge.justificacion?.trim()
    ) {
      throw new Error(`Arista inválida en la posición ${index + 1}.`);
    }
    const id = `${graph.modulo!.codigo}:${edge.origen}:${edge.destino}`;
    implications.set(id, {
      id,
      sourceCriterionId: edge.origen,
      targetCriterionId: edge.destino,
      level: edge.nivel,
      source: edge.fuente,
      justification: edge.justificacion.trim(),
    });
  });
  const active = [...implications.values()];
  if (!topologicalOrder([...criterionIds], active))
    throw new Error('El grafo H/M contiene un ciclo.');
  return {
    module: graph.modulo,
    version: graph.version!,
    weights: graph.pesos_tipo,
    criteria: graph.criterios,
    implications: active,
    rejections: (graph.rechazadas ?? []).map((item) => ({
      element: item.elemento,
      reason: item.motivo,
    })),
  };
}

export function configuredCriterionWeight(
  difficulty: GradingCriterion['difficulty'],
  config: CriterionGradingConfig
): number {
  if (difficulty === 'básico') return config.basicWeight;
  if (difficulty === 'medio') return config.mediumWeight;
  return config.advancedWeight;
}

export function activityWeightFromRubric(
  activityId: string,
  items: RubricItem[],
  criteria: GradingCriterion[],
  config: CriterionGradingConfig
): number {
  return [
    ...new Set(
      items.filter((item) => item.activityId === activityId).map((item) => item.criterionId)
    ),
  ].reduce((sum, criterionId) => {
    const criterion = criteria.find((item) => item.id === criterionId);
    return sum + (criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0);
  }, 0);
}

export function relativeActivityWeights(
  activityIds: string[],
  items: RubricItem[],
  criteria: GradingCriterion[],
  config: CriterionGradingConfig
): Record<string, number> {
  const absolute = Object.fromEntries(
    activityIds.map((id) => [id, activityWeightFromRubric(id, items, criteria, config)])
  );
  const total = Object.values(absolute).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(activityIds.map((id) => [id, total ? absolute[id] / total : 0]));
}

export function rubricActivityGrade(items: RubricItem[], grades: ItemGrade[]): GradeValue {
  return weightedAverage(
    items.map((item) => {
      const grade = grades.find((candidate) => candidate.itemId === item.id);
      return { value: grade && !grade.notApplicable ? grade.score : null, weight: item.weight };
    })
  );
}

export function directEvidenceForActivity(
  activityId: string,
  activityWeight: number,
  items: RubricItem[],
  grades: ItemGrade[],
  recovery = false
): CriterionEvidence[] {
  const activityItems = items.filter((item) => item.activityId === activityId);
  return [...new Set(activityItems.map((item) => item.criterionId))].flatMap((criterionId) => {
    const usable = activityItems
      .filter((item) => item.criterionId === criterionId)
      .flatMap((item) => {
        const grade = grades.find((candidate) => candidate.itemId === item.id);
        return grade && !grade.notApplicable && typeof grade.score === 'number'
          ? [{ value: grade.score, weight: item.weight, date: grade.gradedAt }]
          : [];
      });
    const value = weightedAverage(usable);
    return value === null
      ? []
      : [
          {
            criterionId,
            activityId,
            value,
            weight: activityWeight,
            date:
              usable
                .map((item) => item.date)
                .sort()
                .at(-1) ?? new Date(0).toISOString(),
            type: 'direct' as const,
            recovery,
          },
        ];
  });
}

function activeImplications(implications: CriterionImplication[]): CriterionImplication[] {
  return implications.filter((edge) => edge.level !== 'I');
}

export function implicationClosure(
  sourceCriterionId: string,
  implications: CriterionImplication[]
): string[] {
  const edges = activeImplications(implications);
  const result = new Set<string>();
  const queue = edges
    .filter((edge) => edge.sourceCriterionId === sourceCriterionId)
    .map((edge) => edge.targetCriterionId);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === sourceCriterionId || result.has(current)) continue;
    result.add(current);
    edges
      .filter((edge) => edge.sourceCriterionId === current)
      .forEach((edge) => queue.push(edge.targetCriterionId));
  }
  return [...result];
}

export function implicationClosureWithLevels(
  sourceCriterionId: string,
  implications: CriterionImplication[],
  fallback: ImplicationMode = 'minimum'
): Map<string, Exclude<ImplicationLevel, 'I'>> {
  const result = new Map<string, Exclude<ImplicationLevel, 'I'>>();
  const queue: { id: string; level: Exclude<ImplicationLevel, 'I'> }[] = activeImplications(
    implications
  )
    .filter((edge) => edge.sourceCriterionId === sourceCriterionId)
    .map((edge) => ({
      id: edge.targetCriterionId,
      level: edge.level === 'H' || (!edge.level && fallback === 'inherit') ? 'H' : 'M',
    }));
  while (queue.length) {
    const current = queue.shift()!;
    if (current.id === sourceCriterionId) continue;
    const previous = result.get(current.id);
    const best = previous === 'H' || current.level === 'H' ? 'H' : 'M';
    if (previous === best) continue;
    result.set(current.id, best);
    activeImplications(implications)
      .filter((edge) => edge.sourceCriterionId === current.id)
      .forEach((edge) => {
        const edgeLevel: Exclude<ImplicationLevel, 'I'> =
          edge.level === 'H' || (!edge.level && fallback === 'inherit') ? 'H' : 'M';
        queue.push({
          id: edge.targetCriterionId,
          level: current.level === 'H' && edgeLevel === 'H' ? 'H' : 'M',
        });
      });
  }
  return result;
}

export function topologicalOrder(
  criterionIds: string[],
  implications: CriterionImplication[]
): string[] | null {
  const nodes = [...new Set(criterionIds)].sort();
  const edges = activeImplications(implications).filter(
    (edge) => nodes.includes(edge.sourceCriterionId) && nodes.includes(edge.targetCriterionId)
  );
  const indegree = new Map(nodes.map((id) => [id, 0]));
  edges.forEach((edge) =>
    indegree.set(edge.targetCriterionId, (indegree.get(edge.targetCriterionId) ?? 0) + 1)
  );
  const queue = nodes.filter((id) => indegree.get(id) === 0).sort();
  const order: string[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    order.push(current);
    edges
      .filter((edge) => edge.sourceCriterionId === current)
      .forEach((edge) => {
        indegree.set(edge.targetCriterionId, indegree.get(edge.targetCriterionId)! - 1);
        if (indegree.get(edge.targetCriterionId) === 0) {
          queue.push(edge.targetCriterionId);
          queue.sort();
        }
      });
  }
  return order.length === nodes.length ? order : null;
}

export function wouldCreateImplicationCycle(
  implications: CriterionImplication[],
  sourceCriterionId: string,
  targetCriterionId: string,
  ignoredId?: string,
  level: ImplicationLevel = 'M'
): boolean {
  if (level === 'I') return false;
  if (sourceCriterionId === targetCriterionId) return true;
  const remaining = implications.filter((edge) => edge.id !== ignoredId);
  return implicationClosure(targetCriterionId, remaining).includes(sourceCriterionId);
}

export function directEvidenceRequired(
  criterionIds: string[],
  implications: CriterionImplication[]
): Set<string> {
  const implied = new Set(activeImplications(implications).map((edge) => edge.targetCriterionId));
  return new Set(criterionIds.filter((id) => !implied.has(id)));
}

export function deriveImplicitEvidence(
  directEvidence: CriterionEvidence[],
  previousEvidence: CriterionEvidence[],
  implications: CriterionImplication[],
  config: CriterionGradingConfig
): CriterionEvidence[] {
  if (config.implicationMode === 'disabled') return [];
  const directInActivity = new Set(
    directEvidence.map((item) => `${item.activityId}:${item.criterionId}`)
  );
  const generated = new Map<string, CriterionEvidence>();
  directEvidence.forEach((source) => {
    if (source.value < config.passingThreshold) return;
    implicationClosureWithLevels(source.criterionId, implications, config.implicationMode).forEach(
      (level, targetCriterionId) => {
        if (directInActivity.has(`${source.activityId}:${targetCriterionId}`)) return;
        const bestPrevious = previousEvidence
          .filter((item) => item.criterionId === targetCriterionId && item.date < source.date)
          .reduce((best, item) => Math.max(best, item.value), Number.NEGATIVE_INFINITY);
        const proposed = level === 'H' ? source.value : config.passingThreshold;
        const evidence: CriterionEvidence = {
          criterionId: targetCriterionId,
          activityId: source.activityId,
          value: round(Math.max(proposed, bestPrevious)),
          weight: source.weight,
          date: source.date,
          type: 'implicit',
          sourceCriterionId: source.criterionId,
          implicationLevel: level,
          recovery: source.recovery,
        };
        const key = `${source.activityId}:${targetCriterionId}`;
        const current = generated.get(key);
        if (!current || current.value < evidence.value) generated.set(key, evidence);
      }
    );
  });
  return [...generated.values()];
}

export function aggregateCriterionEvidence(
  evidence: CriterionEvidence[],
  mode: AggregationMode
): GradeValue {
  const ordered = [...evidence].sort((a, b) => a.date.localeCompare(b.date));
  if (!ordered.length) return null;
  if (mode === 'latest') return ordered.at(-1)!.value;
  if (mode === 'moving_average')
    return weightedAverage(
      ordered.map((item, index) => ({ value: item.value, weight: 2 ** index }))
    );
  return weightedAverage(ordered.map((item) => ({ value: item.value, weight: item.weight })));
}

export function aggregateConfiguredEvidence(
  evidence: CriterionEvidence[],
  config: CriterionGradingConfig
): GradeValue {
  const mode = evidence.some((item) => item.recovery)
    ? config.recoveryAggregationMode
    : config.aggregationMode;
  return aggregateCriterionEvidence(evidence, mode);
}

export function conditionalOutcomeGrade(
  criterionIds: string[],
  criteria: GradingCriterion[],
  evidence: CriterionEvidence[],
  config: CriterionGradingConfig
): ConditionalGrade {
  const grades = criterionIds.map((criterionId) => ({
    criterionId,
    value: aggregateConfiguredEvidence(
      evidence.filter((item) => item.criterionId === criterionId),
      config
    ),
  }));
  const raw = weightedAverage(
    grades.map((item) => {
      const criterion = criteria.find((candidate) => candidate.id === item.criterionId);
      return {
        value: item.value,
        weight: criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0,
      };
    })
  );
  const blockedBy = grades.flatMap((item) => {
    const criterion = criteria.find((candidate) => candidate.id === item.criterionId);
    return criterion?.difficulty === 'básico' &&
      item.value !== null &&
      item.value < config.passingThreshold
      ? [item.criterionId]
      : [];
  });
  if (!config.cutoffActive) return { raw, grade: raw, blockedBy, capped: false };
  const grade = raw !== null && blockedBy.length ? Math.min(raw, config.raCutoff) : raw;
  return { raw, grade, blockedBy, capped: grade !== raw };
}

export function applyAggregateCutoff(
  raw: GradeValue,
  blockedBy: string[],
  cutoff: number,
  active = true,
  effect?: ConditionalGrade['effect']
): ConditionalGrade {
  const unique = [...new Set(blockedBy)];
  const grade = active && raw !== null && unique.length ? Math.min(raw, cutoff) : raw;
  return { raw, grade, blockedBy: unique, capped: grade !== raw, effect };
}

export function rubricDiscordance(
  activityGrade: GradeValue,
  evidence: CriterionEvidence[],
  passingThreshold: number
): string[] {
  if (activityGrade === null || activityGrade < passingThreshold) return [];
  return [
    ...new Set(
      evidence
        .filter((item) => item.type === 'direct' && item.value < passingThreshold)
        .map((item) => item.criterionId)
    ),
  ];
}

export function implicationCoverage(
  sourceCriterionIds: string[],
  targetCriterionIds: string[],
  criteria: GradingCriterion[],
  implications: CriterionImplication[],
  config: CriterionGradingConfig
) {
  const reachable = new Set(
    sourceCriterionIds.flatMap((id) => implicationClosure(id, implications))
  );
  const covered = targetCriterionIds.filter((id) => reachable.has(id));
  const complement = targetCriterionIds.filter((id) => !reachable.has(id));
  const weight = (ids: string[]) =>
    ids.reduce((sum, id) => {
      const criterion = criteria.find((item) => item.id === id);
      return sum + (criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0);
    }, 0);
  const total = weight(targetCriterionIds);
  return { covered, complement, percentage: total ? round((weight(covered) / total) * 100, 1) : 0 };
}

export function composeGlobalExam(
  pendingCriterionIds: string[],
  criteria: GradingCriterion[],
  implications: CriterionImplication[],
  config: CriterionGradingConfig
): ExamComposition {
  const pending = new Set(pendingCriterionIds);
  const exercises: ExamExercise[] = [];
  const traceability: ExamComposition['traceability'] = {};
  while (pending.size) {
    const candidates = [...pending]
      .map((criterionId) => {
        const closure = implicationClosureWithLevels(
          criterionId,
          implications,
          config.implicationMode
        );
        const covers = [criterionId, ...[...closure.keys()].filter((id) => pending.has(id))];
        const weight = covers.reduce((sum, id) => {
          const criterion = criteria.find((item) => item.id === id);
          return sum + (criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0);
        }, 0);
        return { criterionId, closure, covers, weight };
      })
      .sort((a, b) => b.weight - a.weight || a.criterionId.localeCompare(b.criterionId));
    const selected = candidates[0];
    const exerciseNumber = exercises.length + 1;
    const covers = selected.covers.filter((id) => pending.has(id));
    const accredits = covers
      .filter((id) => id !== selected.criterionId)
      .map((id) => ({ criterionId: id, level: selected.closure.get(id)! }));
    exercises.push({
      criterionId: selected.criterionId,
      character: accredits.length ? 'integrative' : 'direct',
      covers,
      weight: selected.weight,
      accredits,
    });
    covers.forEach((id) => {
      traceability[id] =
        id === selected.criterionId
          ? { via: 'direct', exercise: exerciseNumber }
          : {
              via: 'implicit',
              by: selected.criterionId,
              exercise: exerciseNumber,
              level: selected.closure.get(id)!,
            };
      pending.delete(id);
    });
  }
  return { pendingCriteria: [...pendingCriterionIds], exercises, traceability };
}

export function generateRecoveryPlan(
  pendingCriterionIds: string[],
  criteria: GradingCriterion[],
  implications: CriterionImplication[],
  config: CriterionGradingConfig,
  maxPhases = 8
): RecoveryActivity[] {
  const pending = [...new Set(pendingCriterionIds)];
  const pendingSet = new Set(pending);
  const edges = activeImplications(implications).filter(
    (edge) => pendingSet.has(edge.sourceCriterionId) && pendingSet.has(edge.targetCriterionId)
  );
  const parent = new Map(pending.map((id) => [id, id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id)!));
  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  };
  edges.forEach((edge) => union(edge.sourceCriterionId, edge.targetCriterionId));
  const components = new Map<string, string[]>();
  pending.forEach((id) => components.set(find(id), [...(components.get(find(id)) ?? []), id]));
  const activities: RecoveryActivity[] = [];
  const reinforcements = new Map<string, string[]>();
  components.forEach((component) => {
    if (component.length === 1) {
      const raId = criteria.find((item) => item.id === component[0])?.raId ?? 'unknown';
      reinforcements.set(raId, [...(reinforcements.get(raId) ?? []), component[0]]);
      return;
    }
    const order = topologicalOrder(component, edges)?.reverse() ?? component;
    if (order.length <= maxPhases) {
      activities.push({
        class: 'itinerary',
        raId: null,
        phases: order,
        milestone: order.at(-1)!,
        weight: planWeight(order, criteria, config),
      });
      return;
    }
    const byRa = new Map<string, string[]>();
    order.forEach((id) => {
      const raId = criteria.find((item) => item.id === id)?.raId ?? 'unknown';
      byRa.set(raId, [...(byRa.get(raId) ?? []), id]);
    });
    byRa.forEach((phases, raId) => {
      for (let index = 0; index < phases.length; index += maxPhases) {
        const section = phases.slice(index, index + maxPhases);
        activities.push({
          class: 'section',
          raId,
          phases: section,
          milestone: section.at(-1)!,
          weight: planWeight(section, criteria, config),
        });
      }
    });
  });
  reinforcements.forEach((phases, raId) =>
    activities.push({
      class: 'reinforcement',
      raId,
      phases,
      milestone: null,
      weight: planWeight(phases, criteria, config),
    })
  );
  return activities;
}

function planWeight(
  ids: string[],
  criteria: GradingCriterion[],
  config: CriterionGradingConfig
): number {
  return ids.reduce((sum, id) => {
    const criterion = criteria.find((item) => item.id === id);
    return sum + (criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0);
  }, 0);
}

export function validateRubricLevels(levels: RubricLevel[]): ValidationResult {
  const errors: string[] = [];
  if (levels.length < 2) errors.push('La escala debe contener al menos dos niveles.');
  if (levels[0]?.score !== 0) errors.push('La escala debe comenzar en 0.');
  if (levels.at(-1)?.score !== 10) errors.push('La escala debe terminar en 10.');
  if (levels.some((level, index) => index > 0 && level.score <= levels[index - 1].score))
    errors.push('Las puntuaciones deben ser estrictamente crecientes.');
  levels.forEach((level, index) => {
    const minimum = index === levels.length - 1 ? 15 : 8;
    if (level.descriptor.trim().length < minimum)
      errors.push(
        `El descriptor de ${level.label || `nivel ${index + 1}`} debe tener al menos ${minimum} caracteres.`
      );
  });
  return { valid: errors.length === 0, errors };
}

export function validateActivityTemplate(
  template: ActivityTemplate,
  criteria: GradingCriterion[],
  implications: CriterionImplication[]
): ValidationResult {
  const errors: string[] = [];
  const target = criteria.find((item) => item.id === template.criterionId);
  if (!target) errors.push('El criterio objetivo no existe.');
  if (!template.rubricItems.some((item) => item.criterionId === template.criterionId))
    errors.push('La rúbrica debe incluir un ítem del criterio objetivo.');
  template.rubricItems.forEach((item) => {
    if (!criteria.some((criterion) => criterion.id === item.criterionId))
      errors.push(`El criterio ${item.criterionId} no existe.`);
    errors.push(
      ...validateRubricLevels(item.levels).errors.map((error) => `${item.criterionId}: ${error}`)
    );
  });
  if (target && template.roles.includes('milestone')) {
    const requiredBasics = implicationClosure(target.id, implications).filter((id) => {
      const criterion = criteria.find((item) => item.id === id);
      return criterion?.difficulty === 'básico' && criterion.raId === target.raId;
    });
    requiredBasics
      .filter((id) => !template.rubricItems.some((item) => item.criterionId === id))
      .forEach((id) => errors.push(`El hito debe desglosar el criterio básico ${id}.`));
  }
  return { valid: errors.length === 0, errors };
}

export function validatedTemplatesOnly(templates: ActivityTemplate[]): ActivityTemplate[] {
  return templates.filter((template) => template.validated);
}
