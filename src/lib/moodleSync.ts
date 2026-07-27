import type { Activity, ActivityGrade, Student } from '@/lib/services/edutrackService';

export type MoodleSyncStatus = 'ready' | 'pending' | 'synced' | 'warning';

export interface MoodleAssignmentSummary {
  id: string;
  name: string;
  dueDate: string;
  status: MoodleSyncStatus;
  submissions: number;
  reviewed: number;
  files: number;
}

export interface MoodleStudentSubmission {
  activityId: string;
  activityName: string;
  grade: number | null;
  status: 'not-submitted' | 'submitted' | 'graded';
  fileName: string;
}

export interface MoodleSyncConfig {
  moodleUrl: string;
  username: string;
  repositoryUrl: string;
  branch: string;
  basePath: string;
  transformPackages: boolean;
  normalizePaths: boolean;
}

export const DEFAULT_MOODLE_SYNC_CONFIG: MoodleSyncConfig = {
  moodleUrl: '',
  username: '',
  repositoryUrl: '',
  branch: 'main',
  basePath: 'entregas/{modulo}/{tarea}/{alumno}',
  transformPackages: true,
  normalizePaths: true,
};

export function buildAssignmentSummaries(
  activities: Activity[],
  grades: ActivityGrade[],
  studentCount: number
): MoodleAssignmentSummary[] {
  return activities.map((activity) => {
    const activityGrades = grades.filter((grade) => grade.activityId === activity.id);
    const reviewed = activityGrades.filter((grade) => grade.grade !== null).length;
    const submissions = Math.max(activity.correctionCount, activityGrades.length);
    const pending = Math.max(0, submissions - reviewed);

    return {
      id: activity.id,
      name: activity.name,
      dueDate: activity.dueDate,
      status:
        submissions === 0
          ? 'pending'
          : pending > 0
            ? 'warning'
            : submissions >= studentCount && studentCount > 0
              ? 'synced'
              : 'ready',
      submissions,
      reviewed,
      files: submissions * 3,
    };
  });
}

export function buildStudentSubmissions(
  student: Student,
  activities: Activity[],
  grades: ActivityGrade[]
): MoodleStudentSubmission[] {
  return activities.map((activity) => {
    const grade = grades.find(
      (item) => item.studentId === student.id && item.activityId === activity.id
    );
    const status = grade ? (grade.grade === null ? 'submitted' : 'graded') : 'not-submitted';
    const safeName = activity.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    return {
      activityId: activity.id,
      activityName: activity.name,
      grade: grade?.grade ?? null,
      status,
      fileName: `${student.nia}-${safeName || 'entrega'}.zip`,
    };
  });
}

export function fillRepositoryPath(
  pattern: string,
  values: { module: string; assignment: string; student: string }
) {
  return pattern
    .replaceAll('{modulo}', values.module)
    .replaceAll('{tarea}', values.assignment)
    .replaceAll('{alumno}', values.student)
    .replaceAll(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');
}
