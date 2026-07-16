export type GradeValue = number | null;
export type CriterionStatus = 'superado' | 'parcial' | 'no_superado' | 'no_evaluado';

export interface DomainActivity {
  id: string;
  unitId: string | null;
  evaluationId: string;
  ceIds: string[];
  weight?: number;
}

export interface DomainCriterion {
  id: string;
  raId: string;
  difficulty: 'básico' | 'medio' | 'avanzado';
  weight: number;
}

export interface DomainGrade {
  studentId: string;
  activityId: string;
  grade: GradeValue;
}

export interface DomainEvaluation { id: string; weight: number }

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function difficultyPoints(difficulty: DomainCriterion['difficulty']): number {
  return difficulty === 'avanzado' ? 3 : difficulty === 'medio' ? 2 : 1;
}

export function weightedAverage(items: { value: GradeValue; weight: number }[], digits = 2): GradeValue {
  const valid = items.filter((item): item is { value: number; weight: number } =>
    typeof item.value === 'number' && Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0
  );
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return null;
  return round(valid.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight, digits);
}

export function criterionStatus(grade: GradeValue, passing = 5, mastery = 7): CriterionStatus {
  if (grade === null || !Number.isFinite(grade)) return 'no_evaluado';
  if (grade >= mastery) return 'superado';
  if (grade >= passing) return 'parcial';
  return 'no_superado';
}

export function activityGrade(studentId: string, activityId: string, grades: DomainGrade[]): GradeValue {
  return grades.find(item => item.studentId === studentId && item.activityId === activityId)?.grade ?? null;
}

export function activityCriterionWeight(activity: DomainActivity, criteria: DomainCriterion[]): number {
  return activity.ceIds.reduce((sum, criterionId) => {
    const criterion = criteria.find(item => item.id === criterionId);
    return sum + (criterion ? difficultyPoints(criterion.difficulty) : 0);
  }, 0);
}

export function activityValuePercentage(activityId: string, activities: DomainActivity[], criteria: DomainCriterion[]): number {
  const activity = activities.find(item => item.id === activityId);
  if (!activity) return 0;
  const siblings = activities.filter(item => activity.unitId
    ? item.unitId === activity.unitId
    : !item.unitId && item.evaluationId === activity.evaluationId);
  const total = siblings.reduce((sum, item) => sum + activityCriterionWeight(item, criteria), 0);
  return total ? round(activityCriterionWeight(activity, criteria) / total * 100, 1) : 0;
}

export function criterionGrade(studentId: string, criterionId: string, activities: DomainActivity[], criteria: DomainCriterion[], grades: DomainGrade[]): GradeValue {
  return weightedAverage(activities.filter(activity => activity.ceIds.includes(criterionId)).map(activity => ({
    value: activityGrade(studentId, activity.id, grades),
    weight: activityCriterionWeight(activity, criteria) || activity.weight || 1,
  })));
}

export function outcomeGrade(studentId: string, outcomeId: string, activities: DomainActivity[], criteria: DomainCriterion[], grades: DomainGrade[]): GradeValue {
  return weightedAverage(criteria.filter(criterion => criterion.raId === outcomeId).map(criterion => ({
    value: criterionGrade(studentId, criterion.id, activities, criteria, grades),
    weight: criterion.weight || difficultyPoints(criterion.difficulty),
  })));
}

export function unitGrade(studentId: string, unitId: string, activities: DomainActivity[], criteria: DomainCriterion[], grades: DomainGrade[]): GradeValue {
  return weightedAverage(activities.filter(activity => activity.unitId === unitId).map(activity => ({
    value: activityGrade(studentId, activity.id, grades),
    weight: activityCriterionWeight(activity, criteria) || activity.weight || 1,
  })));
}

export function evaluationGrade(studentId: string, evaluationId: string, activities: DomainActivity[], criteria: DomainCriterion[], grades: DomainGrade[]): GradeValue {
  return weightedAverage(activities.filter(activity => activity.evaluationId === evaluationId).map(activity => ({
    value: activityGrade(studentId, activity.id, grades),
    weight: activityCriterionWeight(activity, criteria) || activity.weight || 1,
  })));
}

export function moduleGrade(studentId: string, evaluations: DomainEvaluation[], activities: DomainActivity[], criteria: DomainCriterion[], grades: DomainGrade[]): GradeValue {
  return weightedAverage(evaluations.map(evaluation => ({
    value: evaluationGrade(studentId, evaluation.id, activities, criteria, grades),
    weight: evaluation.weight,
  })));
}

export function validateWeightTotal(weights: number[], expected = 100, tolerance = 0.01) {
  const total = round(weights.filter(Number.isFinite).reduce((sum, weight) => sum + weight, 0));
  return { total, valid: Math.abs(total - expected) <= tolerance };
}
