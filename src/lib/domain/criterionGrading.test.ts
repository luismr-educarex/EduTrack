import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CRITERION_GRADING_CONFIG as config,
  activityWeightFromRubric,
  aggregateConfiguredEvidence,
  aggregateCriterionEvidence,
  applyAggregateCutoff,
  conditionalOutcomeGrade,
  composeGlobalExam,
  deriveImplicitEvidence,
  directEvidenceRequired,
  directEvidenceForActivity,
  generateRecoveryPlan,
  implicationClosure,
  implicationClosureWithLevels,
  implicationCoverage,
  parseGradingGraph,
  relativeActivityWeights,
  rubricActivityGrade,
  rubricDiscordance,
  topologicalOrder,
  validateActivityTemplate,
  validateRubricLevels,
  validatedTemplatesOnly,
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

const fixtureCriteria: GradingCriterion[] = [
  ['a', 'básico'],
  ['b', 'básico'],
  ['c', 'básico'],
  ['d', 'medio'],
  ['e', 'medio'],
  ['f', 'avanzado'],
  ['g', 'avanzado'],
].map(([id, difficulty]) => ({
  id,
  raId: 'RA4',
  difficulty: difficulty as GradingCriterion['difficulty'],
}));
const activityDefinition: Record<string, [string, number][]> = {
  A1: [
    ['a', 2],
    ['b', 1],
  ],
  A2: [
    ['b', 1],
    ['c', 2],
    ['c', 2],
    ['d', 1],
  ],
  A3: [
    ['c', 1],
    ['d', 1],
    ['f', 2],
    ['f', 2],
  ],
  A4: [
    ['d', 1],
    ['e', 2],
    ['f', 2],
    ['g', 3],
    ['g', 2],
  ],
};
const fixtureItems: RubricItem[] = Object.entries(activityDefinition).flatMap(
  ([activityId, definition]) =>
    definition.map(([criterionId, weight], index) => ({
      id: `${activityId}-${index}`,
      activityId,
      criterionId,
      weight,
      description: `Indicador ${criterionId}`,
      levels: [],
    }))
);
const fixtureEdges: CriterionImplication[] = [
  ['d', 'c', 'M'],
  ['e', 'b', 'M'],
  ['f', 'c', 'H'],
  ['f', 'd', 'M'],
  ['g', 'f', 'H'],
].map(([sourceCriterionId, targetCriterionId, level], index) => ({
  id: `edge-${index}`,
  sourceCriterionId,
  targetCriterionId,
  level: level as 'H' | 'M',
  justification: 'Cobertura completa verificable',
}));
const validLevels = [
  { label: 'Inicial', score: 0, descriptor: 'No demuestra todavía el desempeño' },
  { label: 'Medio', score: 5, descriptor: 'Demuestra el desempeño esencial' },
  { label: 'Máximo', score: 10, descriptor: 'Demuestra el desempeño completo con autonomía' },
];

describe('exhaustive grading checklist fixtures', () => {
  it('B-01..B-04 calculates distinct-criterion activity weights and normalized relatives', () => {
    expect(
      Object.keys(activityDefinition).map((id) =>
        activityWeightFromRubric(id, fixtureItems, fixtureCriteria, config)
      )
    ).toEqual([6, 8, 6, 6]);
    const relative = relativeActivityWeights(
      Object.keys(activityDefinition),
      fixtureItems,
      fixtureCriteria,
      config
    );
    expect(Object.values(relative).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    const withoutA4 = relativeActivityWeights(
      ['A1', 'A2', 'A3'],
      fixtureItems,
      fixtureCriteria,
      config
    );
    expect(Object.values(withoutA4).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    expect(withoutA4.A2).toBeCloseTo(8 / 20, 12);
  });

  it('A-03/N-03 validates a strictly increasing 0→10 scale and observable descriptors', () => {
    expect(validateRubricLevels(validLevels)).toEqual({ valid: true, errors: [] });
    expect(
      validateRubricLevels([
        { label: 'X', score: 1, descriptor: 'corto' },
        { label: 'Y', score: 9, descriptor: 'también corto' },
      ]).valid
    ).toBe(false);
    expect(
      validateRubricLevels([{ ...validLevels[0] }, { ...validLevels[1], score: 0 }, validLevels[2]])
        .valid
    ).toBe(false);
  });

  it('C-01..C-04 aggregates A2 and carries its full activity weight to each CE', () => {
    const a2Items = fixtureItems.filter((item) => item.activityId === 'A2');
    const scores = [4, 5, 4, 3].map((score, index) => ({
      studentId: 's',
      itemId: `A2-${index}`,
      score,
      notApplicable: false,
      gradedAt: '2026-11-16',
    }));
    expect(rubricActivityGrade(a2Items, scores)).toBe(4.17);
    const evidence = directEvidenceForActivity('A2', 8, fixtureItems, scores);
    expect(evidence.find((item) => item.criterionId === 'c')?.value).toBe(4.5);
    expect(evidence.every((item) => item.weight === 8)).toBe(true);
    const withoutOneC = scores.map((grade) =>
      grade.itemId === 'A2-2' ? { ...grade, score: null, notApplicable: true } : grade
    );
    expect(
      directEvidenceForActivity('A2', 8, fixtureItems, withoutOneC).find(
        (item) => item.criterionId === 'c'
      )?.value
    ).toBe(5);
  });

  it('G-01..G-04 applies H/M transitively, excludes I, and derives direct-evidence roots', () => {
    const withIndication = [
      ...fixtureEdges,
      { id: 'I', sourceCriterionId: 'g', targetCriterionId: 'a', level: 'I' as const },
    ];
    expect(new Set(implicationClosure('g', withIndication))).toEqual(new Set(['f', 'c', 'd']));
    expect([...implicationClosureWithLevels('g', withIndication).entries()]).toEqual([
      ['f', 'H'],
      ['c', 'H'],
      ['d', 'M'],
    ]);
    expect(
      directEvidenceRequired(
        fixtureCriteria.map((item) => item.id),
        withIndication
      )
    ).toEqual(new Set(['a', 'e', 'g']));
    expect(wouldCreateImplicationCycle(withIndication, 'a', 'g', undefined, 'I')).toBe(false);
  });

  it('G-05/H-01..H-02 keeps one maximum implicit evidence and never degrades prior evidence', () => {
    const direct: CriterionEvidence[] = [
      {
        criterionId: 'f',
        activityId: 'A4',
        value: 6,
        weight: 6,
        date: '2027-03-10',
        type: 'direct',
      },
      {
        criterionId: 'g',
        activityId: 'A4',
        value: 9,
        weight: 6,
        date: '2027-03-10',
        type: 'direct',
      },
    ];
    const prior: CriterionEvidence[] = [
      {
        criterionId: 'c',
        activityId: 'P1',
        value: 9,
        weight: 3,
        date: '2026-10-10',
        type: 'direct',
      },
    ];
    const implicit = deriveImplicitEvidence(direct, prior, fixtureEdges, config).filter(
      (item) => item.criterionId === 'c'
    );
    expect(implicit).toHaveLength(1);
    expect(implicit[0].value).toBe(9);
    expect(
      ['weighted_average', 'latest', 'moving_average'].map((mode) =>
        aggregateCriterionEvidence([...prior, ...implicit], mode as typeof config.aggregationMode)
      )
    ).toEqual([9, 9, 9]);
  });

  it('D/E/F/O-05 uses exact temporal formulas and a separate recovery mode', () => {
    const series: CriterionEvidence[] = [
      {
        criterionId: 'c',
        activityId: 'P1',
        value: 3,
        weight: 3,
        date: '2026-10-10',
        type: 'direct',
      },
      {
        criterionId: 'c',
        activityId: 'P2',
        value: 5,
        weight: 1,
        date: '2027-01-20',
        type: 'implicit',
        recovery: true,
      },
    ];
    expect(aggregateCriterionEvidence(series, 'weighted_average')).toBe(3.5);
    expect(aggregateCriterionEvidence(series, 'latest')).toBe(5);
    expect(aggregateCriterionEvidence(series, 'moving_average')).toBe(4.33);
    expect(
      aggregateConfiguredEvidence(series, {
        ...config,
        aggregationMode: 'moving_average',
        recoveryAggregationMode: 'latest',
      })
    ).toBe(5);
  });

  it('I-01..I-03 validates H/M acyclicity while terminating defensively on forced cycles', () => {
    expect(
      topologicalOrder(
        fixtureCriteria.map((item) => item.id),
        fixtureEdges
      )
    ).toHaveLength(7);
    expect(wouldCreateImplicationCycle(fixtureEdges, 'c', 'g')).toBe(true);
    const forced = [
      ...fixtureEdges,
      { id: 'cycle', sourceCriterionId: 'c', targetCriterionId: 'g', level: 'M' as const },
    ];
    expect(
      topologicalOrder(
        fixtureCriteria.map((item) => item.id),
        forced
      )
    ).toBeNull();
    expect(implicationClosure('g', forced)).toEqual(expect.arrayContaining(['f', 'c', 'd']));
  });

  it('J-01..J-05 exposes blockers, configurable cutoff, and academic effect', () => {
    const result = applyAggregateCutoff(6.25, ['a'], 4.5, true, 'orientative');
    expect(result).toEqual({
      raw: 6.25,
      grade: 4.5,
      blockedBy: ['a'],
      capped: true,
      effect: 'orientative',
    });
    expect(applyAggregateCutoff(6.25, ['a'], 4.5, false).grade).toBe(6.25);
    expect(applyAggregateCutoff(8, ['a'], 4, true, 'academic').effect).toBe('academic');
  });

  it('K-01..K-05 reports only approved-global discordance and names retained criteria', () => {
    const a2Items = fixtureItems.filter((item) => item.activityId === 'A2');
    const make = (values: number[]) =>
      values.map((score, index) => ({
        studentId: 's',
        itemId: `A2-${index}`,
        score,
        notApplicable: false,
        gradedAt: '2026-11-16',
      }));
    const mixed = directEvidenceForActivity('A2', 8, fixtureItems, make([8, 8, 8, 3]));
    expect(rubricActivityGrade(a2Items, make([8, 8, 8, 3]))).toBe(7.17);
    expect(rubricDiscordance(7.17, mixed, 5)).toEqual(['d']);
    expect(
      rubricDiscordance(8, directEvidenceForActivity('A2', 8, fixtureItems, make([8, 8, 8, 8])), 5)
    ).toEqual([]);
    expect(
      rubricDiscordance(3, directEvidenceForActivity('A2', 8, fixtureItems, make([3, 3, 3, 3])), 5)
    ).toEqual([]);
  });

  it('L-03..L-05 composes a greedy exam with complete unique traceability', () => {
    const pending = fixtureCriteria.map((item) => item.id);
    const exam = composeGlobalExam(pending, fixtureCriteria, fixtureEdges, config);
    const covered = exam.exercises.flatMap((exercise) => exercise.covers);
    expect(new Set(covered)).toEqual(new Set(pending));
    expect(covered).toHaveLength(pending.length);
    expect(exam.exercises.every((exercise) => pending.includes(exercise.criterionId))).toBe(true);
    expect(Object.keys(exam.traceability).sort()).toEqual([...pending].sort());
    expect(
      Object.values(exam.traceability).every(
        (entry) => entry.via === 'direct' || entry.level === 'H' || entry.level === 'M'
      )
    ).toBe(true);
  });

  it('M-03..M-06 creates inverse-topological plans without gaps or singleton itineraries', () => {
    const pending = fixtureCriteria.map((item) => item.id);
    const plan = generateRecoveryPlan(pending, fixtureCriteria, fixtureEdges, config, 3);
    const phases = plan.flatMap((activity) => activity.phases);
    expect(new Set(phases)).toEqual(new Set(pending));
    expect(phases).toHaveLength(pending.length);
    expect(
      plan
        .filter((activity) => activity.class === 'itinerary')
        .every((activity) => activity.phases.length > 1 && activity.phases.length <= 3)
    ).toBe(true);
    expect(
      plan
        .filter((activity) => activity.class === 'reinforcement')
        .flatMap((activity) => activity.phases)
    ).toEqual(['a']);
    plan.forEach((activity) =>
      fixtureEdges.forEach((edge) => {
        const source = activity.phases.indexOf(edge.sourceCriterionId);
        const target = activity.phases.indexOf(edge.targetCriterionId);
        if (source >= 0 && target >= 0) expect(target).toBeLessThan(source);
      })
    );
  });

  it('N-01..N-04 validates milestones and filters unapproved templates', () => {
    const template = {
      id: 't',
      criterionId: 'f',
      roles: ['milestone' as const],
      validated: true,
      rubricItems: ['f'].map((criterionId) => ({
        criterionId,
        levels: validLevels,
        description: `Indicador observable ${criterionId}`,
        weight: 1,
      })),
    };
    expect(validateActivityTemplate(template, fixtureCriteria, fixtureEdges).errors).toContain(
      'El hito debe desglosar el criterio básico c.'
    );
    const complete = {
      ...template,
      rubricItems: [
        ...template.rubricItems,
        { criterionId: 'c', levels: validLevels, description: 'Indicador observable c', weight: 1 },
      ],
    };
    expect(validateActivityTemplate(complete, fixtureCriteria, fixtureEdges).valid).toBe(true);
    expect(
      validatedTemplatesOnly([complete, { ...complete, id: 'draft', validated: false }])
    ).toEqual([complete]);
  });

  it('O-01..O-07 handles null, zero, ten, and configurable implicit valuation', () => {
    expect(rubricActivityGrade(items, [])).toBeNull();
    const all = (score: number) => grades.map((grade) => ({ ...grade, score }));
    expect(rubricActivityGrade(items, all(0))).toBe(0);
    expect(rubricActivityGrade(items, all(10))).toBe(10);
    const source: CriterionEvidence = {
      criterionId: 'f',
      activityId: 'x',
      value: 8,
      weight: 1,
      date: '2027-01-01',
      type: 'direct',
    };
    expect(
      deriveImplicitEvidence([source], [], fixtureEdges, {
        ...config,
        implicationMode: 'minimum',
      }).find((item) => item.criterionId === 'd')?.value
    ).toBe(5);
    expect(
      deriveImplicitEvidence([source], [], fixtureEdges, {
        ...config,
        implicationMode: 'inherit',
      }).find((item) => item.criterionId === 'c')?.value
    ).toBe(8);
  });

  it('parses the official graph contract idempotently and ignores calculated snapshots', () => {
    const graph = {
      modulo: { codigo: '0485', nombre: 'Programación', fuente: 'RD 405/2023' },
      version: 2,
      pesos_tipo: { B: 3, M: 2, A: 1 },
      criterios: [
        { id: 'a', ra: 'RA4', tipo: 'B' as const },
        { id: 'g', ra: 'RA4', tipo: 'A' as const },
      ],
      aristas: [
        {
          origen: 'g',
          destino: 'a',
          nivel: 'M' as const,
          fuente: 'v2',
          justificacion: 'Cobertura total demostrada',
        },
      ],
      rechazadas: [{ elemento: 'a → g', motivo: 'Crearía un ciclo' }],
      orden_topologico: ['g', 'a'],
      cobertura_ra: [{ de: 'RA4', a: 'RA1', pct: 1 }],
    };
    expect(parseGradingGraph(graph)).toEqual(parseGradingGraph(graph));
    expect(parseGradingGraph(graph).implications[0].id).toBe('0485:g:a');
    expect(parseGradingGraph(graph).rejections).toEqual([
      { element: 'a → g', reason: 'Crearía un ciclo' },
    ]);
    expect(() =>
      parseGradingGraph({
        ...graph,
        aristas: [
          ...graph.aristas,
          { origen: 'a', destino: 'g', nivel: 'M', justificacion: 'Cobertura inversa completa' },
        ],
      })
    ).toThrow(/ciclo/);
  });

  it('P-05 processes a 30×79 synthetic exam batch within a bounded unit-test budget', () => {
    const synthetic = Array.from({ length: 79 }, (_, index) => ({
      id: `ce${index}`,
      raId: `RA${index % 9}`,
      difficulty:
        index % 3 === 0
          ? ('básico' as const)
          : index % 3 === 1
            ? ('medio' as const)
            : ('avanzado' as const),
    }));
    const started = performance.now();
    Array.from({ length: 30 }, () =>
      composeGlobalExam(
        synthetic.map((item) => item.id),
        synthetic,
        [],
        config
      )
    );
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
