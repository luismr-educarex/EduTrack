import { round, weightedAverage, type GradeValue } from './calculations';

export type AggregationMode = 'weighted_average' | 'latest' | 'moving_average';
export type ImplicationMode = 'disabled' | 'minimum' | 'inherit';
export type EvidenceType = 'direct' | 'implicit';

export interface CriterionGradingConfig {
  basicWeight: number;
  mediumWeight: number;
  advancedWeight: number;
  passingThreshold: number;
  aggregationMode: AggregationMode;
  implicationMode: ImplicationMode;
  raCutoff: number;
  partialCutoff: number;
  finalCutoff: number;
}

export const DEFAULT_CRITERION_GRADING_CONFIG: CriterionGradingConfig = {
  basicWeight: 3,
  mediumWeight: 2,
  advancedWeight: 1,
  passingThreshold: 5,
  aggregationMode: 'moving_average',
  implicationMode: 'minimum',
  raCutoff: 4.5,
  partialCutoff: 4.5,
  finalCutoff: 4,
};

export interface GradingCriterion {
  id: string;
  raId: string;
  difficulty: 'básico' | 'medio' | 'avanzado';
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
}

export interface ConditionalGrade {
  raw: GradeValue;
  grade: GradeValue;
  blockedBy: string[];
  capped: boolean;
}

export function configuredCriterionWeight(
  difficulty: GradingCriterion['difficulty'],
  config: CriterionGradingConfig
): number {
  if (difficulty === 'básico') return config.basicWeight;
  if (difficulty === 'medio') return config.mediumWeight;
  return config.advancedWeight;
}

export function rubricActivityGrade(items: RubricItem[], grades: ItemGrade[]): GradeValue {
  return weightedAverage(
    items.map((item) => {
      const grade = grades.find((candidate) => candidate.itemId === item.id);
      return {
        value: grade && !grade.notApplicable ? grade.score : null,
        weight: item.weight,
      };
    })
  );
}

export function directEvidenceForActivity(
  activityId: string,
  activityWeight: number,
  items: RubricItem[],
  grades: ItemGrade[]
): CriterionEvidence[] {
  const activityItems = items.filter((item) => item.activityId === activityId);
  const criterionIds = [...new Set(activityItems.map((item) => item.criterionId))];
  return criterionIds.flatMap((criterionId) => {
    const criterionItems = activityItems.filter((item) => item.criterionId === criterionId);
    const usable = criterionItems.flatMap((item) => {
      const grade = grades.find((candidate) => candidate.itemId === item.id);
      return grade && !grade.notApplicable && typeof grade.score === 'number'
        ? [{ value: grade.score, weight: item.weight, date: grade.gradedAt }]
        : [];
    });
    const value = weightedAverage(usable);
    if (value === null) return [];
    return [
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
      },
    ];
  });
}

export function implicationClosure(
  sourceCriterionId: string,
  implications: CriterionImplication[]
): string[] {
  const result = new Set<string>();
  const queue = implications
    .filter((edge) => edge.sourceCriterionId === sourceCriterionId)
    .map((edge) => edge.targetCriterionId);
  while (queue.length) {
    const current = queue.shift()!;
    if (current === sourceCriterionId || result.has(current)) continue;
    result.add(current);
    implications
      .filter((edge) => edge.sourceCriterionId === current)
      .forEach((edge) => queue.push(edge.targetCriterionId));
  }
  return [...result];
}

export function wouldCreateImplicationCycle(
  implications: CriterionImplication[],
  sourceCriterionId: string,
  targetCriterionId: string,
  ignoredId?: string
): boolean {
  if (sourceCriterionId === targetCriterionId) return true;
  const remaining = implications.filter((edge) => edge.id !== ignoredId);
  return implicationClosure(targetCriterionId, remaining).includes(sourceCriterionId);
}

export function deriveImplicitEvidence(
  directEvidence: CriterionEvidence[],
  previousEvidence: CriterionEvidence[],
  implications: CriterionImplication[],
  config: CriterionGradingConfig
): CriterionEvidence[] {
  if (config.implicationMode === 'disabled') return [];
  const directInActivity = new Set(
    directEvidence.map((evidence) => `${evidence.activityId}:${evidence.criterionId}`)
  );
  const generated = new Map<string, CriterionEvidence>();

  directEvidence.forEach((source) => {
    if (source.value < config.passingThreshold) return;
    implicationClosure(source.criterionId, implications).forEach((targetCriterionId) => {
      if (directInActivity.has(`${source.activityId}:${targetCriterionId}`)) return;
      const bestPrevious = previousEvidence
        .filter((evidence) => evidence.criterionId === targetCriterionId)
        .reduce((best, evidence) => Math.max(best, evidence.value), 0);
      const configuredValue =
        config.implicationMode === 'inherit' ? source.value : config.passingThreshold;
      const evidence: CriterionEvidence = {
        criterionId: targetCriterionId,
        activityId: source.activityId,
        value: round(Math.max(configuredValue, bestPrevious)),
        weight: source.weight,
        date: source.date,
        type: 'implicit',
        sourceCriterionId: source.criterionId,
      };
      const key = `${source.activityId}:${targetCriterionId}`;
      const current = generated.get(key);
      if (!current || current.value < evidence.value) generated.set(key, evidence);
    });
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
  if (mode === 'moving_average') {
    return weightedAverage(
      ordered.map((item, index) => ({ value: item.value, weight: 2 ** index }))
    );
  }
  return weightedAverage(ordered.map((item) => ({ value: item.value, weight: item.weight })));
}

export function conditionalOutcomeGrade(
  criterionIds: string[],
  criteria: GradingCriterion[],
  evidence: CriterionEvidence[],
  config: CriterionGradingConfig
): ConditionalGrade {
  const grades = criterionIds.map((criterionId) => ({
    criterionId,
    value: aggregateCriterionEvidence(
      evidence.filter((item) => item.criterionId === criterionId),
      config.aggregationMode
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
  const grade = raw !== null && blockedBy.length ? Math.min(raw, config.raCutoff) : raw;
  return { raw, grade, blockedBy, capped: grade !== raw };
}

export function applyAggregateCutoff(
  raw: GradeValue,
  blockedBy: string[],
  cutoff: number
): ConditionalGrade {
  const grade = raw !== null && blockedBy.length ? Math.min(raw, cutoff) : raw;
  return { raw, grade, blockedBy: [...new Set(blockedBy)], capped: grade !== raw };
}

export function rubricDiscordance(
  activityGrade: GradeValue,
  evidence: CriterionEvidence[],
  passingThreshold: number
): string[] {
  if (activityGrade === null || activityGrade < passingThreshold) return [];
  return evidence
    .filter((item) => item.type === 'direct' && item.value < passingThreshold)
    .map((item) => item.criterionId);
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
  const totalWeight = targetCriterionIds.reduce((sum, id) => {
    const criterion = criteria.find((item) => item.id === id);
    return sum + (criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0);
  }, 0);
  const coveredWeight = covered.reduce((sum, id) => {
    const criterion = criteria.find((item) => item.id === id);
    return sum + (criterion ? configuredCriterionWeight(criterion.difficulty, config) : 0);
  }, 0);
  return {
    covered,
    complement,
    percentage: totalWeight ? round((coveredWeight / totalWeight) * 100, 1) : 0,
  };
}
