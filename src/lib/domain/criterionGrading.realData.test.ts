import { describe, expect, it } from 'vitest';
import graphFixture from './fixtures/grafo-0485-v2.json';
import templateFixture from './fixtures/banco-plantillas-0485.json';
import {
  DEFAULT_CRITERION_GRADING_CONFIG as config,
  composeGlobalExam,
  directEvidenceRequired,
  generateRecoveryPlan,
  implicationCoverage,
  parseGradingGraph,
  parseTemplateBank,
  topologicalOrder,
  type GradingCriterion,
} from './criterionGrading';

const parsed = parseGradingGraph(graphFixture);
const criteria: GradingCriterion[] = parsed.criteria.map((criterion) => ({
  id: criterion.id,
  raId: criterion.ra,
  difficulty: criterion.tipo === 'B' ? 'básico' : criterion.tipo === 'M' ? 'medio' : 'avanzado',
}));
const idsFor = (...raIds: string[]) =>
  criteria.filter((criterion) => raIds.includes(criterion.raId)).map((criterion) => criterion.id);

describe('real 0485 graph and template bank', () => {
  it('Q-01..Q-03 has the documented catalog, edge levels, direct priorities, and rejections', () => {
    expect(criteria).toHaveLength(79);
    expect(parsed.implications).toHaveLength(137);
    expect(parsed.implications.filter((edge) => edge.level === 'H')).toHaveLength(11);
    expect(parsed.implications.filter((edge) => edge.level === 'M')).toHaveLength(85);
    expect(parsed.implications.filter((edge) => edge.level === 'I')).toHaveLength(41);
    expect(parsed.rejections).toHaveLength(7);
    expect(
      directEvidenceRequired(
        criteria.map((criterion) => criterion.id),
        parsed.implications
      )
    ).toHaveLength(40);
  });

  it('I-01 validates the complete documented topological order', () => {
    expect(
      topologicalOrder(
        criteria.map((criterion) => criterion.id),
        parsed.implications
      )
    ).toHaveLength(79);
  });

  it('Q-04 reproduces the verified emergent RA coverages', () => {
    const cases = [
      ['RA7', 'RA4', 70],
      ['RA4', 'RA2', 60.9],
      ['RA5', 'RA1', 52],
      ['RA3', 'RA1', 32],
      ['RA2', 'RA1', 12],
    ] as const;
    cases.forEach(([from, to, percentage]) =>
      expect(
        implicationCoverage(idsFor(from), idsFor(to), criteria, parsed.implications, config)
          .percentage
      ).toBe(percentage)
    );
  });

  it('L-01..L-02 composes the two reference examinations', () => {
    const partial = composeGlobalExam(
      idsFor('RA1', 'RA2', 'RA3'),
      criteria,
      parsed.implications,
      config
    );
    const complete = composeGlobalExam(
      criteria.map((criterion) => criterion.id),
      criteria,
      parsed.implications,
      config
    );
    expect(partial.exercises).toHaveLength(17);
    expect(complete.exercises).toHaveLength(40);
    expect(complete.exercises[0].criterionId).toBe('7g');
    expect(complete.exercises[0].covers).toHaveLength(17);
  });

  it('M-01..M-02 generates the two reference recovery partitions', () => {
    const partial = generateRecoveryPlan(
      idsFor('RA1', 'RA2', 'RA3'),
      criteria,
      parsed.implications,
      config
    );
    const complete = generateRecoveryPlan(
      criteria.map((criterion) => criterion.id),
      criteria,
      parsed.implications,
      config
    );
    expect([
      partial.length,
      partial.filter((item) => item.class === 'itinerary').length,
      partial.filter((item) => item.class === 'section').length,
      partial.filter((item) => item.class === 'reinforcement').length,
    ]).toEqual([7, 4, 0, 3]);
    expect([
      complete.length,
      complete.filter((item) => item.class === 'itinerary').length,
      complete.filter((item) => item.class === 'section').length,
      complete.filter((item) => item.class === 'reinforcement').length,
    ]).toEqual([19, 3, 9, 7]);
    expect(
      complete
        .filter((item) => item.class === 'section')
        .map((item) => item.milestone)
        .sort()
    ).toEqual(['1h', '2h', '3h', '4i', '5h', '6i', '7g', '8h', '9g']);
  });

  it('N-01..N-04 imports and validates three templates as inactive drafts', () => {
    const templates = parseTemplateBank(templateFixture, criteria, parsed.implications);
    expect(templates).toHaveLength(3);
    expect(templates.every((template) => !template.validated)).toBe(true);
    expect(
      templates
        .find((template) => template.id === '3e-01')
        ?.rubricItems.map((item) => item.criterionId)
    ).toEqual(['3a', '3b', '3e']);
  });

  it('Q-05 keeps exam and recovery coverage consistent for the same state', () => {
    const pending = criteria.map((criterion) => criterion.id);
    const examCoverage = composeGlobalExam(
      pending,
      criteria,
      parsed.implications,
      config
    ).exercises.flatMap((exercise) => exercise.covers);
    const planCoverage = generateRecoveryPlan(
      pending,
      criteria,
      parsed.implications,
      config
    ).flatMap((activity) => activity.phases);
    expect(new Set(examCoverage)).toEqual(new Set(planCoverage));
    expect(examCoverage).toHaveLength(79);
    expect(planCoverage).toHaveLength(79);
  });
});
