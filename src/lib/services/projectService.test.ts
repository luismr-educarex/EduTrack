import { describe, expect, it } from 'vitest';
import {
  calculateProjectGrade,
  type ProjectCorrection,
  type ProjectDelivery,
} from './projectService';

const deliveries: ProjectDelivery[] = [
  {
    id: 'delivery-1',
    moduleId: 'module-1',
    title: 'Memoria',
    subtitle: '',
    learningOutcome: 'RA1',
    weight: 40,
    type: 'Documentación',
    startDate: '',
    endDate: '',
    rubric: [],
    checklist: [],
    sortOrder: 0,
  },
  {
    id: 'delivery-2',
    moduleId: 'module-1',
    title: 'Producto',
    subtitle: '',
    learningOutcome: 'RA2',
    weight: 60,
    type: 'Código',
    startDate: '',
    endDate: '',
    rubric: [],
    checklist: [],
    sortOrder: 1,
  },
];

function correction(
  deliveryId: string,
  studentId: string,
  grade: number | null
): ProjectCorrection {
  return {
    id: `${deliveryId}-${studentId}`,
    moduleId: 'module-1',
    deliveryId,
    studentId,
    call: 'ordinaria',
    status: grade === null ? 'pendiente' : 'corregido',
    grade,
    feedback: '',
    correctionMode: 'manual',
    rubricScores: {},
    criterionNotes: {},
    checklistState: {},
    submittedAt: '',
  };
}

describe('calculateProjectGrade', () => {
  it('calcula la media ponderada de las entregas calificadas', () => {
    expect(
      calculateProjectGrade(
        deliveries,
        [correction('delivery-1', 'student-1', 8), correction('delivery-2', 'student-1', 6)],
        'student-1'
      )
    ).toBeCloseTo(6.8);
  });

  it('renormaliza el peso cuando aún hay entregas sin calificar', () => {
    expect(
      calculateProjectGrade(
        deliveries,
        [correction('delivery-1', 'student-1', 7), correction('delivery-2', 'student-1', null)],
        'student-1'
      )
    ).toBe(7);
  });

  it('devuelve null sin calificaciones', () => {
    expect(calculateProjectGrade(deliveries, [], 'student-1')).toBeNull();
  });
});
