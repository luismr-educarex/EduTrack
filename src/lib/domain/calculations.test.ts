import { describe, expect, it } from 'vitest';
import {
  activityCriterionWeight, activityValuePercentage, criterionGrade, criterionStatus,
  evaluationGrade, moduleGrade, outcomeGrade, unitGrade, validateWeightTotal, weightedAverage,
} from './calculations';

const criteria = [
  { id: 'ce-1', raId: 'ra-1', difficulty: 'básico' as const, weight: 40 },
  { id: 'ce-2', raId: 'ra-1', difficulty: 'avanzado' as const, weight: 60 },
];
const activities = [
  { id: 'a-1', unitId: 'u-1', evaluationId: 'e-1', ceIds: ['ce-1'] },
  { id: 'a-2', unitId: 'u-1', evaluationId: 'e-1', ceIds: ['ce-2'] },
  { id: 'a-3', unitId: null, evaluationId: 'e-2', ceIds: ['ce-1', 'ce-2'] },
];
const grades = [
  { studentId: 's-1', activityId: 'a-1', grade: 5 },
  { studentId: 's-1', activityId: 'a-2', grade: 9 },
  { studentId: 's-1', activityId: 'a-3', grade: 7 },
];

describe('academic calculation engine', () => {
  it('ignores missing and invalid values in weighted averages', () => {
    expect(weightedAverage([{ value: 8, weight: 1 }, { value: null, weight: 9 }])).toBe(8);
    expect(weightedAverage([{ value: Number.NaN, weight: 1 }])).toBeNull();
  });

  it('derives activity weight and normalized value from criteria', () => {
    expect(activityCriterionWeight(activities[0], criteria)).toBe(1);
    expect(activityCriterionWeight(activities[1], criteria)).toBe(3);
    expect(activityValuePercentage('a-1', activities, criteria)).toBe(25);
    expect(activityValuePercentage('a-2', activities, criteria)).toBe(75);
  });

  it('calculates criterion, outcome, unit, evaluation and module grades consistently', () => {
    expect(criterionGrade('s-1', 'ce-1', activities, criteria, grades)).toBe(6.6);
    expect(outcomeGrade('s-1', 'ra-1', activities, criteria, grades)).toBe(7.36);
    expect(unitGrade('s-1', 'u-1', activities, criteria, grades)).toBe(8);
    expect(evaluationGrade('s-1', 'e-1', activities, criteria, grades)).toBe(8);
    expect(moduleGrade('s-1', [{ id: 'e-1', weight: 40 }, { id: 'e-2', weight: 60 }], activities, criteria, grades)).toBe(7.4);
  });

  it('classifies criterion states and validates weight totals', () => {
    expect(criterionStatus(null)).toBe('no_evaluado');
    expect(criterionStatus(4.99)).toBe('no_superado');
    expect(criterionStatus(5)).toBe('parcial');
    expect(criterionStatus(7)).toBe('superado');
    expect(validateWeightTotal([20, 30, 50])).toEqual({ total: 100, valid: true });
  });
});
