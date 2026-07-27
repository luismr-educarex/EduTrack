import { describe, expect, it } from 'vitest';
import {
  buildAssignmentSummaries,
  buildStudentSubmissions,
  fillRepositoryPath,
} from './moodleSync';
import type { Activity, ActivityGrade, Student } from './services/edutrackService';

const activity: Activity = {
  id: 'activity-1',
  moduleId: 'module-1',
  unitId: null,
  evaluationId: 'evaluation-1',
  name: 'Práctica JDBC',
  type: 'práctica',
  status: 'publicada',
  weight: 20,
  dueDate: '2026-07-30',
  description: '',
  ceIds: [],
  correctionCount: 2,
  reviewedCount: 1,
};

const student: Student = {
  id: 'student-1',
  moduleId: 'module-1',
  nia: '1001',
  name: 'Ana López',
  avatar: 'AL',
  email: 'ana@example.com',
  moduleGrade: 8,
  eval1Grade: 8,
  eval2Grade: null,
  riskLevel: 'none',
  ceSuperado: 2,
  ceParcial: 0,
  ceNoSuperado: 0,
  ceNoEvaluado: 1,
  incidents: 0,
  absences: 0,
};

const grades: ActivityGrade[] = [
  { id: 'grade-1', studentId: student.id, activityId: activity.id, grade: 8 },
];

describe('MoodleSync projections', () => {
  it('resume entregas y revisiones de cada actividad', () => {
    expect(buildAssignmentSummaries([activity], grades, 2)).toEqual([
      expect.objectContaining({
        id: activity.id,
        submissions: 2,
        reviewed: 1,
        files: 6,
        status: 'warning',
      }),
    ]);
  });

  it('construye una entrega navegable para el alumno', () => {
    expect(buildStudentSubmissions(student, [activity], grades)[0]).toEqual(
      expect.objectContaining({
        status: 'graded',
        grade: 8,
        fileName: '1001-practica-jdbc.zip',
      })
    );
  });

  it('resuelve la estructura configurable del repositorio', () => {
    expect(
      fillRepositoryPath('/entregas/{modulo}/{tarea}/{alumno}/', {
        module: '0486',
        assignment: 'jdbc',
        student: 'ana-lopez',
      })
    ).toBe('entregas/0486/jdbc/ana-lopez');
  });
});
