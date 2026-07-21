import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CRITERION_GRADING_CONFIG as config,
  aggregateCriterionEvidence,
  applyAggregateCutoff,
  conditionalOutcomeGrade,
  deriveImplicitEvidence,
  directEvidenceForActivity,
  implicationClosure,
  implicationCoverage,
  rubricActivityGrade,
  rubricDiscordance,
  wouldCreateImplicationCycle,
  type CriterionEvidence,
  type CriterionImplication,
  type GradingCriterion,
  type ItemGrade,
  type RubricItem,
} from './criterionGrading';

const items: RubricItem[] = [
  { id: 'i1', activityId: 'a1', criterionId: 'basic', description: '', weight: 1, levels: [] },
  { id: 'i2', activityId: 'a1', criterionId: 'medium', description: '', weight: 2, levels: [] },
  { id: 'i3', activityId: 'a1', criterionId: 'medium', description: '', weight: 2, levels: [] },
  { id: 'i4', activityId: 'a1', criterionId: 'advanced', description: '', weight: 1, levels: [] },
];
const grades: ItemGrade[] = [
  { studentId: 's1', itemId: 'i1', score: 4, notApplicable: false, gradedAt: '2026-01-01' },
  { studentId: 's1', itemId: 'i2', score: 5, notApplicable: false, gradedAt: '2026-01-01' },
  { studentId: 's1', itemId: 'i3', score: 4, notApplicable: false, gradedAt: '2026-01-01' },
  { studentId: 's1', itemId: 'i4', score: 3, notApplicable: false, gradedAt: '2026-01-01' },
];
const criteria: GradingCriterion[] = [
  { id: 'basic', raId: 'ra1', difficulty: 'básico' },
  { id: 'medium', raId: 'ra1', difficulty: 'medio' },
  { id: 'advanced', raId: 'ra1', difficulty: 'avanzado' },
];
const implications: CriterionImplication[] = [
  { id: 'e1', sourceCriterionId: 'advanced', targetCriterionId: 'medium' },
  { id: 'e2', sourceCriterionId: 'medium', targetCriterionId: 'basic' },
];

describe('criterion grading system', () => {
  it('derives the activity and CE evidence independently from rubric items', () => {
    expect(rubricActivityGrade(items, grades)).toBe(4.17);
    expect(directEvidenceForActivity('a1', 8, items, grades).map((item) => item.value)).toEqual([
      4, 4.5, 3,
    ]);
  });

  it('excludes not-applicable items instead of treating them as zero', () => {
    expect(
      rubricActivityGrade(
        items,
        grades.map((item) => (item.itemId === 'i4' ? { ...item, notApplicable: true } : item))
      )
    ).toBe(4.4);
  });

  it('supports all aggregation modes in chronological order', () => {
    const evidence: CriterionEvidence[] = [3, 5, 8].map((value, index) => ({
      criterionId: 'basic',
      activityId: `a${index}`,
      value,
      weight: index + 1,
      date: `2026-0${index + 1}-01`,
      type: 'direct',
    }));
    expect(aggregateCriterionEvidence(evidence, 'weighted_average')).toBe(6.17);
    expect(aggregateCriterionEvidence(evidence, 'latest')).toBe(8);
    expect(aggregateCriterionEvidence(evidence, 'moving_average')).toBe(6.43);
  });

  it('calculates a transitive implication closure and rejects cycles', () => {
    expect(implicationClosure('advanced', implications)).toEqual(['medium', 'basic']);
    expect(wouldCreateImplicationCycle(implications, 'basic', 'advanced')).toBe(true);
  });

  it('creates minimum implicit evidence only from success and never replaces direct evidence', () => {
    const source: CriterionEvidence = {
      criterionId: 'advanced',
      activityId: 'a2',
      value: 9,
      weight: 1,
      date: '2026-02-01',
      type: 'direct',
    };
    expect(
      deriveImplicitEvidence([source], [], implications, config).map((item) => [
        item.criterionId,
        item.value,
      ])
    ).toEqual([
      ['medium', 5],
      ['basic', 5],
    ]);
    expect(deriveImplicitEvidence([{ ...source, value: 4 }], [], implications, config)).toEqual([]);
    expect(
      deriveImplicitEvidence(
        [source, { ...source, criterionId: 'medium', value: 7 }],
        [],
        implications,
        config
      ).filter((item) => item.criterionId === 'medium')
    ).toEqual([]);
  });

  it('applies the basic-criterion cutoff while preserving the raw grade', () => {
    const evidence = directEvidenceForActivity('a1', 8, items, grades);
    expect(
      conditionalOutcomeGrade(
        criteria.map((item) => item.id),
        criteria,
        evidence,
        config
      )
    ).toEqual({
      raw: 4,
      grade: 4,
      blockedBy: ['basic'],
      capped: false,
    });
    const highOthers = evidence.map((item) =>
      item.criterionId === 'basic' ? item : { ...item, value: 10 }
    );
    expect(
      conditionalOutcomeGrade(
        criteria.map((item) => item.id),
        criteria,
        highOthers,
        config
      )
    ).toEqual({
      raw: 7,
      grade: 4.5,
      blockedBy: ['basic'],
      capped: true,
    });
    expect(applyAggregateCutoff(8, ['basic', 'basic'], 4)).toEqual({
      raw: 8,
      grade: 4,
      blockedBy: ['basic'],
      capped: true,
    });
  });

  it('reports activity discordance and global-exam coverage/complement', () => {
    const evidence = directEvidenceForActivity('a1', 8, items, grades);
    expect(rubricDiscordance(6, evidence, 5)).toEqual(['basic', 'medium', 'advanced']);
    expect(
      implicationCoverage(['advanced'], ['basic', 'medium'], criteria, implications, config)
    ).toEqual({ covered: ['basic', 'medium'], complement: [], percentage: 100 });
  });
});
