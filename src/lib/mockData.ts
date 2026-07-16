// Demo fixtures. Runtime calculations are bound to Supabase data by EduTrackContext.
import {
  activityCriterionWeight as domainActivityCriterionWeight,
  activityGrade as domainActivityGrade,
  activityValuePercentage as domainActivityValuePercentage,
  criterionGrade as domainCriterionGrade,
  criterionStatus as domainCriterionStatus,
  evaluationGrade as domainEvaluationGrade,
  outcomeGrade as domainOutcomeGrade,
  unitGrade as domainUnitGrade,
  weightedAverage as domainWeightedAverage,
} from './domain/calculations';

export const ACTIVE_MODULE = {
  id: 'module-ruslvg5ye',
  name: 'Programación de Servicios y Procesos',
  code: 'PSP',
  cycle: 'DAM 2º',
  course: '2025–2026',
  evaluationCount: 2,
  totalStudents: 22,
};

export const MODULES = [
  { id: 'module-ruslvg5ye', name: 'Programación de Servicios y Procesos', code: 'PSP', cycle: 'DAM 2º' },
  { id: 'module-abc123', name: 'Acceso a Datos', code: 'AD', cycle: 'DAM 2º' },
  { id: 'module-def456', name: 'Desarrollo de Interfaces', code: 'DI', cycle: 'DAM 2º' },
];

export const EVALUATIONS = [
  { id: 'eval-1', name: '1ª Evaluación', type: 'parcial', weight: 40, startDate: '2025-09-15', endDate: '2025-12-20' },
  { id: 'eval-2', name: '2ª Evaluación', type: 'parcial', weight: 60, startDate: '2026-01-08', endDate: '2026-05-30' },
];

export interface LearningOutcome {
  id: string;
  code: string;
  description: string;
  weight: number;
}

export const LEARNING_OUTCOMES: LearningOutcome[] = [
  { id: 'ra-1', code: 'RA1', description: 'Desarrolla aplicaciones multiproceso, identificando y aplicando mecanismos de gestión de procesos del sistema operativo.', weight: 20 },
  { id: 'ra-2', code: 'RA2', description: 'Desarrolla aplicaciones compuestas por varios hilos de ejecución analizando y aplicando librerías específicas del lenguaje utilizado.', weight: 25 },
  { id: 'ra-3', code: 'RA3', description: 'Programa mecanismos de comunicación en red empleando sockets y analizando el escenario de ejecución.', weight: 25 },
  { id: 'ra-4', code: 'RA4', description: 'Desarrolla aplicaciones que ofrecen servicios en red, utilizando librerías de clases y aplicando criterios de eficiencia y disponibilidad.', weight: 20 },
  { id: 'ra-5', code: 'RA5', description: 'Protege las aplicaciones y los datos definiendo y aplicando criterios de seguridad en el acceso, almacenamiento y transmisión de la información.', weight: 10 },
];

// ─── RA RELATIONSHIPS ─────────────────────────────────────────────────────────

/**
 * Defines a relationship where supering a "source" RA (raSourceId) contributes
 * a percentage (percentage) of the source RA's grade to the "target" RA (raTargetId).
 * Example: Supering RA1 at 8.0 with a 50% relation to RA2 means RA2 gets +4.0 contribution.
 */
export interface RARelationship {
  id: string;
  raSourceId: string;   // RA that when surpassed, affects the target
  raTargetId: string;   // RA that receives the grade contribution
  percentage: number;   // % of source RA grade that contributes to target RA (0-100)
  description?: string; // Optional explanation of the relationship
}

export let RA_RELATIONSHIPS: RARelationship[] = [
  {
    id: 'rel-1',
    raSourceId: 'ra-1',
    raTargetId: 'ra-2',
    percentage: 30,
    description: 'Dominar la gestión de procesos facilita la comprensión de hilos de ejecución.',
  },
  {
    id: 'rel-2',
    raSourceId: 'ra-2',
    raTargetId: 'ra-3',
    percentage: 25,
    description: 'La programación multihilo es base para la comunicación en red concurrente.',
  },
  {
    id: 'rel-3',
    raSourceId: 'ra-3',
    raTargetId: 'ra-4',
    percentage: 40,
    description: 'Los sockets son la base de los servicios en red.',
  },
];

// ─── RA RELATIONSHIP HELPERS ──────────────────────────────────────────────────

/** Returns all relationships where the given RA is the source */
export function getRARelationshipsFromSource(raId: string): RARelationship[] {
  return RA_RELATIONSHIPS.filter(r => r.raSourceId === raId);
}

/** Returns all relationships where the given RA is the target */
export function getRARelationshipsToTarget(raId: string): RARelationship[] {
  return RA_RELATIONSHIPS.filter(r => r.raTargetId === raId);
}

/**
 * Calculates the effective grade of a target RA considering contributions
 * from source RAs via relationships.
 * Returns the base grade if no relationships apply, or the weighted combination.
 */
export function getEffectiveRAGrade(
  studentId: string,
  raId: string,
  baseGrade: number | null
): number | null {
  const incomingRelations = getRARelationshipsToTarget(raId);
  if (incomingRelations.length === 0) return baseGrade;

  let totalContribution = 0;
  let totalWeight = 0;

  for (const rel of incomingRelations) {
    const sourceGrade = getRAGrade(studentId, rel.raSourceId);
    if (sourceGrade !== null) {
      const contribution = sourceGrade * (rel.percentage / 100);
      totalContribution += contribution;
      totalWeight += rel.percentage / 100;
    }
  }

  if (totalWeight === 0) return baseGrade;

  // Blend: base grade (if exists) + contributions from source RAs
  if (baseGrade !== null) {
    const remainingWeight = Math.max(0, 1 - totalWeight);
    const blended = baseGrade * remainingWeight + totalContribution;
    return parseFloat(Math.min(10, Math.max(0, blended)).toFixed(2));
  }

  // No base grade: use only contributions
  const avgContribution = totalContribution / totalWeight;
  return parseFloat(Math.min(10, Math.max(0, avgContribution)).toFixed(2));
}

export interface Criterion {
  id: string;
  raId: string;
  code: string;
  description: string;
  difficulty: 'básico' | 'medio' | 'avanzado';
  weight: number;
  status?: 'superado' | 'parcial' | 'no_superado' | 'no_evaluado';
  avgGrade?: number;
}

// ─── CE LEVEL HELPERS ─────────────────────────────────────────────────────────

/** Returns the display label for a CE difficulty level */
export function getCELevelLabel(level: number): string {
  if (level === 1) return 'Básico';
  if (level === 2) return 'Medio';
  if (level === 3) return 'Avanzado';
  return `Nivel ${level}`;
}

/** Returns the points associated with a CE difficulty level: básico=1, medio=2, avanzado=3 */
export function getCELevelPoints(level: number): number {
  if (level === 1) return 1;
  if (level === 2) return 2;
  if (level === 3) return 3;
  return level;
}

/** Returns the point value for a CE difficulty level: básico=1, medio=2, avanzado=3 */
export function getDifficultyPoints(difficulty: 'básico' | 'medio' | 'avanzado'): number {
  if (difficulty === 'básico') return 1;
  if (difficulty === 'medio') return 2;
  return 3;
}

export const CRITERIA: Criterion[] = [
  { id: 'ce-1a', raId: 'ra-1', code: 'RA1.a', description: 'Se han identificado los estados de un proceso y las transiciones entre ellos.', difficulty: 'básico', weight: 15 },
  { id: 'ce-1b', raId: 'ra-1', code: 'RA1.b', description: 'Se han utilizado clases para programar aplicaciones que crean subprocesos.', difficulty: 'medio', weight: 20 },
  { id: 'ce-1c', raId: 'ra-1', code: 'RA1.c', description: 'Se han utilizado mecanismos para sincronizar y obtener el valor retornado por los subprocesos iniciados.', difficulty: 'medio', weight: 20 },
  { id: 'ce-1d', raId: 'ra-1', code: 'RA1.d', description: 'Se han utilizado clases que permiten gestionar la información entre procesos.', difficulty: 'medio', weight: 20 },
  { id: 'ce-1e', raId: 'ra-1', code: 'RA1.e', description: 'Se han desarrollado aplicaciones que ejecutan órdenes del sistema operativo.', difficulty: 'avanzado', weight: 25 },
  { id: 'ce-2a', raId: 'ra-2', code: 'RA2.a', description: 'Se han identificado situaciones en las que resulta útil la utilización de varios hilos en un programa.', difficulty: 'básico', weight: 10 },
  { id: 'ce-2b', raId: 'ra-2', code: 'RA2.b', description: 'Se han utilizado clases para programar aplicaciones que crean hilos.', difficulty: 'medio', weight: 20 },
  { id: 'ce-2c', raId: 'ra-2', code: 'RA2.c', description: 'Se han compartido objetos y datos entre los hilos de un mismo proceso.', difficulty: 'medio', weight: 20 },
  { id: 'ce-2d', raId: 'ra-2', code: 'RA2.d', description: 'Se han utilizado mecanismos para evitar problemas de concurrencia.', difficulty: 'avanzado', weight: 25 },
  { id: 'ce-2e', raId: 'ra-2', code: 'RA2.e', description: 'Se han depurado y documentado las aplicaciones desarrolladas.', difficulty: 'medio', weight: 25 },
  { id: 'ce-3a', raId: 'ra-3', code: 'RA3.a', description: 'Se han identificado las características y campos de aplicación de los sockets.', difficulty: 'básico', weight: 15 },
  { id: 'ce-3b', raId: 'ra-3', code: 'RA3.b', description: 'Se han utilizado sockets para programar una aplicación cliente que se comunica con un servidor.', difficulty: 'medio', weight: 25 },
  { id: 'ce-3c', raId: 'ra-3', code: 'RA3.c', description: 'Se ha desarrollado una aplicación servidora que admite conexiones de múltiples clientes.', difficulty: 'avanzado', weight: 30 },
  { id: 'ce-3d', raId: 'ra-3', code: 'RA3.d', description: 'Se han utilizado hilos para implementar los procedimientos de las aplicaciones.', difficulty: 'medio', weight: 15 },
  { id: 'ce-3e', raId: 'ra-3', code: 'RA3.e', description: 'Se han utilizado sockets UDP en la realización de aplicaciones que transmiten texto o archivos.', difficulty: 'medio', weight: 15 },
  { id: 'ce-4a', raId: 'ra-4', code: 'RA4.a', description: 'Se han identificado las características propias de los servicios web y su papel en la arquitectura cliente-servidor.', difficulty: 'básico', weight: 15 },
  { id: 'ce-4b', raId: 'ra-4', code: 'RA4.b', description: 'Se han utilizado servicios REST para intercambiar información entre aplicaciones.', difficulty: 'avanzado', weight: 30 },
  { id: 'ce-4c', raId: 'ra-4', code: 'RA4.c', description: 'Se ha programado un servicio REST sencillo con autenticación básica.', difficulty: 'avanzado', weight: 30 },
  { id: 'ce-4d', raId: 'ra-4', code: 'RA4.d', description: 'Se han documentado los servicios web desarrollados.', difficulty: 'medio', weight: 25 },
  { id: 'ce-5a', raId: 'ra-5', code: 'RA5.a', description: 'Se han identificado y aplicado mecanismos de autenticación y autorización.', difficulty: 'medio', weight: 40 },
  { id: 'ce-5b', raId: 'ra-5', code: 'RA5.b', description: 'Se han utilizado protocolos seguros en la transmisión de datos entre aplicaciones.', difficulty: 'avanzado', weight: 35 },
  { id: 'ce-5c', raId: 'ra-5', code: 'RA5.c', description: 'Se han aplicado técnicas de cifrado en el almacenamiento y transmisión de información sensible.', difficulty: 'avanzado', weight: 25 },
];

export const WORK_UNITS = [
  { id: 'ut-1', code: 'UT1', name: 'Gestión de Procesos', evaluationId: 'eval-1', hours: 18, taughtPercentage: 100, status: 'impartida', weight: 35, raIds: ['ra-1'] },
  { id: 'ut-2', code: 'UT2', name: 'Programación Multihilo', evaluationId: 'eval-1', hours: 22, taughtPercentage: 100, status: 'impartida', weight: 65, raIds: ['ra-2'] },
  { id: 'ut-3', code: 'UT3', name: 'Comunicación en Red con Sockets', evaluationId: 'eval-2', hours: 24, taughtPercentage: 75, status: 'en_curso', weight: 40, raIds: ['ra-3'] },
  { id: 'ut-4', code: 'UT4', name: 'Servicios Web REST', evaluationId: 'eval-2', hours: 20, taughtPercentage: 30, status: 'pendiente', weight: 40, raIds: ['ra-4'] },
  { id: 'ut-5', code: 'UT5', name: 'Seguridad en Aplicaciones', evaluationId: 'eval-2', hours: 12, taughtPercentage: 0, status: 'pendiente', weight: 20, raIds: ['ra-5'] },
];

export interface Activity {
  id: string;
  name: string;
  unitId: string | null;
  evaluationId: string;
  type: string;
  status: string;
  weight: number;
  dueDate: string;
  description: string;
  ceIds: string[];
  correctionCount: number;
  reviewedCount: number;
}

export const ACTIVITIES: Activity[] = [
  { id: 'act-1', name: 'Práctica 1: Fork y exec()', unitId: 'ut-1', evaluationId: 'eval-1', type: 'práctica', status: 'cerrada', weight: 30, dueDate: '2025-10-15', description: 'Implementar un programa que crea procesos hijo usando fork() y exec().', ceIds: ['ce-1a','ce-1b','ce-1c'], correctionCount: 22, reviewedCount: 22 },
  { id: 'act-2', name: 'Práctica 2: Comunicación IPC', unitId: 'ut-1', evaluationId: 'eval-1', type: 'práctica', status: 'cerrada', weight: 40, dueDate: '2025-11-01', description: 'Usar pipes y memoria compartida para comunicar procesos.', ceIds: ['ce-1d','ce-1e'], correctionCount: 22, reviewedCount: 22 },
  { id: 'act-3', name: 'Examen UT1: Procesos', unitId: 'ut-1', evaluationId: 'eval-1', type: 'examen', status: 'cerrada', weight: 30, dueDate: '2025-11-15', description: 'Examen teórico-práctico sobre gestión de procesos.', ceIds: ['ce-1a','ce-1b','ce-1c','ce-1d','ce-1e'], correctionCount: 22, reviewedCount: 22 },
  { id: 'act-4', name: 'Práctica 3: Hilos con ExecutorService', unitId: 'ut-2', evaluationId: 'eval-1', type: 'práctica', status: 'revisada_docente', weight: 35, dueDate: '2025-11-30', description: 'Crear un pool de hilos para procesar tareas concurrentes.', ceIds: ['ce-2a','ce-2b','ce-2c'], correctionCount: 22, reviewedCount: 18 },
  { id: 'act-5', name: 'Práctica 4: Sincronización y locks', unitId: 'ut-2', evaluationId: 'eval-1', type: 'práctica', status: 'pendiente_revision', weight: 35, dueDate: '2025-12-10', description: 'Implementar soluciones al problema del productor-consumidor.', ceIds: ['ce-2d','ce-2e'], correctionCount: 22, reviewedCount: 10 },
  { id: 'act-6', name: 'Examen UT2: Multihilo', unitId: 'ut-2', evaluationId: 'eval-1', type: 'examen', status: 'en_correccion', weight: 30, dueDate: '2025-12-18', description: 'Examen teórico-práctico sobre programación multihilo.', ceIds: ['ce-2a','ce-2b','ce-2c','ce-2d','ce-2e'], correctionCount: 15, reviewedCount: 0 },
  { id: 'act-7', name: 'Práctica 5: Socket TCP cliente/servidor', unitId: 'ut-3', evaluationId: 'eval-2', type: 'práctica', status: 'en_correccion', weight: 40, dueDate: '2026-02-20', description: 'Desarrollar una aplicación chat usando sockets TCP.', ceIds: ['ce-3a','ce-3b','ce-3c'], correctionCount: 14, reviewedCount: 5 },
  { id: 'act-8', name: 'Práctica 6: Socket UDP y multihilo', unitId: 'ut-3', evaluationId: 'eval-2', type: 'práctica', status: 'borrador', weight: 35, dueDate: '2026-03-10', description: 'Implementar transferencia de archivos con sockets UDP.', ceIds: ['ce-3d','ce-3e'], correctionCount: 0, reviewedCount: 0 },
  { id: 'act-9', name: 'Práctica 7: API REST con Spring Boot', unitId: 'ut-4', evaluationId: 'eval-2', type: 'práctica', status: 'borrador', weight: 50, dueDate: '2026-04-05', description: 'Crear una API REST con autenticación JWT.', ceIds: ['ce-4a','ce-4b','ce-4c','ce-4d'], correctionCount: 0, reviewedCount: 0 },
  { id: 'act-10', name: 'Práctica 8: Seguridad TLS y cifrado', unitId: 'ut-5', evaluationId: 'eval-2', type: 'práctica', status: 'borrador', weight: 60, dueDate: '2026-05-10', description: 'Implementar comunicación segura con TLS y cifrado AES.', ceIds: ['ce-5a','ce-5b','ce-5c'], correctionCount: 0, reviewedCount: 0 },
];

export interface Student {
  id: string;
  nia: string;
  name: string;
  avatar: string;
  email: string;
  githubUrl?: string;
  moduleGrade: number | null;
  eval1Grade: number | null;
  eval2Grade: number | null;
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  ceSuperado: number;
  ceParcial: number;
  ceNoSuperado: number;
  ceNoEvaluado: number;
  incidents: number;
  absences: number;
}

export const STUDENTS: Student[] = [
  { id: 'stu-1', nia: '22DAM001', name: 'Alejandro Martínez García', avatar: 'AM', email: 'alejandro.martinez@edu.es', githubUrl: 'https://github.com/alejandro-martinez-psp', moduleGrade: 7.85, eval1Grade: 8.20, eval2Grade: 7.40, riskLevel: 'none', ceSuperado: 18, ceParcial: 4, ceNoSuperado: 0, ceNoEvaluado: 24, incidents: 0, absences: 2 },
  { id: 'stu-2', nia: '22DAM002', name: 'Sara Rodríguez López', avatar: 'SR', email: 'sara.rodriguez@edu.es', githubUrl: 'https://github.com/sara-rodriguez-dam', moduleGrade: 9.10, eval1Grade: 9.30, eval2Grade: 8.80, riskLevel: 'none', ceSuperado: 22, ceParcial: 0, ceNoSuperado: 0, ceNoEvaluado: 24, incidents: 0, absences: 0 },
  { id: 'stu-3', nia: '22DAM003', name: 'Carlos Fernández Ruiz', avatar: 'CF', email: 'carlos.fernandez@edu.es', moduleGrade: 4.30, eval1Grade: 4.80, eval2Grade: 3.60, riskLevel: 'high', ceSuperado: 5, ceParcial: 6, ceNoSuperado: 11, ceNoEvaluado: 24, incidents: 3, absences: 8 },
  { id: 'stu-4', nia: '22DAM004', name: 'María González Pérez', avatar: 'MG', email: 'maria.gonzalez@edu.es', githubUrl: 'https://github.com/mgonzalez-psp2025', moduleGrade: 6.45, eval1Grade: 7.10, eval2Grade: 5.60, riskLevel: 'low', ceSuperado: 14, ceParcial: 5, ceNoSuperado: 3, ceNoEvaluado: 24, incidents: 1, absences: 3 },
  { id: 'stu-5', nia: '22DAM005', name: 'David Sánchez Torres', avatar: 'DS', email: 'david.sanchez@edu.es', moduleGrade: 3.90, eval1Grade: 4.20, eval2Grade: 3.50, riskLevel: 'high', ceSuperado: 3, ceParcial: 4, ceNoSuperado: 15, ceNoEvaluado: 24, incidents: 5, absences: 12 },
  { id: 'stu-6', nia: '22DAM006', name: 'Laura Jiménez Castro', avatar: 'LJ', email: 'laura.jimenez@edu.es', githubUrl: 'https://github.com/laura-jimenez-dev', moduleGrade: 8.60, eval1Grade: 8.90, eval2Grade: 8.20, riskLevel: 'none', ceSuperado: 20, ceParcial: 2, ceNoSuperado: 0, ceNoEvaluado: 24, incidents: 0, absences: 1 },
  { id: 'stu-7', nia: '22DAM007', name: 'Pablo Moreno Díaz', avatar: 'PM', email: 'pablo.moreno@edu.es', moduleGrade: 5.70, eval1Grade: 6.10, eval2Grade: 5.20, riskLevel: 'low', ceSuperado: 11, ceParcial: 6, ceNoSuperado: 5, ceNoEvaluado: 24, incidents: 1, absences: 4 },
  { id: 'stu-8', nia: '22DAM008', name: 'Ana Romero Vega', avatar: 'AR', email: 'ana.romero@edu.es', githubUrl: 'https://github.com/ana-romero-psp', moduleGrade: 7.20, eval1Grade: 7.50, eval2Grade: 6.80, riskLevel: 'none', ceSuperado: 16, ceParcial: 4, ceNoSuperado: 2, ceNoEvaluado: 24, incidents: 0, absences: 2 },
  { id: 'stu-9', nia: '22DAM009', name: 'Jorge Álvarez Núñez', avatar: 'JA', email: 'jorge.alvarez@edu.es', moduleGrade: 4.80, eval1Grade: 5.10, eval2Grade: 4.40, riskLevel: 'medium', ceSuperado: 8, ceParcial: 5, ceNoSuperado: 9, ceNoEvaluado: 24, incidents: 2, absences: 6 },
  { id: 'stu-10', nia: '22DAM010', name: 'Elena Domínguez Gil', avatar: 'ED', email: 'elena.dominguez@edu.es', githubUrl: 'https://github.com/elena-dominguez-dam2', moduleGrade: 8.95, eval1Grade: 9.10, eval2Grade: 8.70, riskLevel: 'none', ceSuperado: 21, ceParcial: 1, ceNoSuperado: 0, ceNoEvaluado: 24, incidents: 0, absences: 0 },
  { id: 'stu-11', nia: '22DAM011', name: 'Miguel Herrera Blanco', avatar: 'MH', email: 'miguel.herrera@edu.es', moduleGrade: 6.10, eval1Grade: 6.40, eval2Grade: 5.70, riskLevel: 'low', ceSuperado: 12, ceParcial: 5, ceNoSuperado: 5, ceNoEvaluado: 24, incidents: 1, absences: 3 },
  { id: 'stu-12', nia: '22DAM012', name: 'Cristina Muñoz Serrano', avatar: 'CM', email: 'cristina.munoz@edu.es', githubUrl: 'https://github.com/cristina-munoz-psp', moduleGrade: 7.55, eval1Grade: 7.80, eval2Grade: 7.20, riskLevel: 'none', ceSuperado: 17, ceParcial: 3, ceNoSuperado: 2, ceNoEvaluado: 24, incidents: 0, absences: 1 },
  { id: 'stu-13', nia: '22DAM013', name: 'Andrés Ortega Fuentes', avatar: 'AO', email: 'andres.ortega@edu.es', moduleGrade: 3.40, eval1Grade: 3.70, eval2Grade: 3.00, riskLevel: 'high', ceSuperado: 2, ceParcial: 3, ceNoSuperado: 17, ceNoEvaluado: 24, incidents: 4, absences: 15 },
  { id: 'stu-14', nia: '22DAM014', name: 'Natalia Vargas Pinto', avatar: 'NV', email: 'natalia.vargas@edu.es', githubUrl: 'https://github.com/natalia-vargas-2025', moduleGrade: 8.30, eval1Grade: 8.60, eval2Grade: 7.90, riskLevel: 'none', ceSuperado: 19, ceParcial: 3, ceNoSuperado: 0, ceNoEvaluado: 24, incidents: 0, absences: 2 },
  { id: 'stu-15', nia: '22DAM015', name: 'Iván Molina Ríos', avatar: 'IM', email: 'ivan.molina@edu.es', moduleGrade: 5.20, eval1Grade: 5.50, eval2Grade: 4.80, riskLevel: 'medium', ceSuperado: 9, ceParcial: 6, ceNoSuperado: 7, ceNoEvaluado: 24, incidents: 2, absences: 5 },
  { id: 'stu-16', nia: '22DAM016', name: 'Beatriz Reyes Cabrera', avatar: 'BR', email: 'beatriz.reyes@edu.es', githubUrl: 'https://github.com/breyes-psp-dam', moduleGrade: 6.85, eval1Grade: 7.20, eval2Grade: 6.40, riskLevel: 'none', ceSuperado: 14, ceParcial: 5, ceNoSuperado: 3, ceNoEvaluado: 24, incidents: 0, absences: 2 },
  { id: 'stu-17', nia: '22DAM017', name: 'Fernando Castillo Mora', avatar: 'FC', email: 'fernando.castillo@edu.es', githubUrl: 'https://github.com/fcastillo-dam2', moduleGrade: 7.40, eval1Grade: 7.60, eval2Grade: 7.10, riskLevel: 'none', ceSuperado: 16, ceParcial: 4, ceNoSuperado: 2, ceNoEvaluado: 24, incidents: 0, absences: 3 },
  { id: 'stu-18', nia: '22DAM018', name: 'Silvia Navarro Espejo', avatar: 'SN', email: 'silvia.navarro@edu.es', moduleGrade: 4.60, eval1Grade: 5.00, eval2Grade: 4.10, riskLevel: 'medium', ceSuperado: 7, ceParcial: 5, ceNoSuperado: 10, ceNoEvaluado: 24, incidents: 2, absences: 7 },
  { id: 'stu-19', nia: '22DAM019', name: 'Roberto Iglesias Vidal', avatar: 'RI', email: 'roberto.iglesias@edu.es', githubUrl: 'https://github.com/roberto-iglesias-psp', moduleGrade: 9.40, eval1Grade: 9.50, eval2Grade: 9.20, riskLevel: 'none', ceSuperado: 22, ceParcial: 0, ceNoSuperado: 0, ceNoEvaluado: 24, incidents: 0, absences: 0 },
  { id: 'stu-20', nia: '22DAM020', name: 'Verónica Peña Solano', avatar: 'VP', email: 'veronica.pena@edu.es', moduleGrade: 6.20, eval1Grade: 6.50, eval2Grade: 5.80, riskLevel: 'low', ceSuperado: 12, ceParcial: 6, ceNoSuperado: 4, ceNoEvaluado: 24, incidents: 1, absences: 4 },
  { id: 'stu-21', nia: '22DAM021', name: 'Hugo Aguilar Méndez', avatar: 'HA', email: 'hugo.aguilar@edu.es', moduleGrade: 5.90, eval1Grade: 6.20, eval2Grade: 5.50, riskLevel: 'low', ceSuperado: 11, ceParcial: 5, ceNoSuperado: 6, ceNoEvaluado: 24, incidents: 1, absences: 3 },
  { id: 'stu-22', nia: '22DAM022', name: 'Lucía Campos Rubio', avatar: 'LC', email: 'lucia.campos@edu.es', githubUrl: 'https://github.com/lucia-campos-dam2', moduleGrade: 7.10, eval1Grade: 7.30, eval2Grade: 6.80, riskLevel: 'none', ceSuperado: 15, ceParcial: 5, ceNoSuperado: 2, ceNoEvaluado: 24, incidents: 0, absences: 2 },
];

type RuntimeAcademicData = {
  activities: Activity[];
  criteria: Criterion[];
  grades: { studentId: string; activityId: string; grade: number | null }[];
  evaluations: { id: string; name: string; weight: number }[];
  workUnits: { id: string; code: string; name: string; evaluationId: string }[];
};

let runtimeAcademicData: RuntimeAcademicData | null = null;

export function configureAcademicCalculations(data: RuntimeAcademicData) {
  runtimeAcademicData = data;
}

// ─── GRADES MATRIX ────────────────────────────────────────────────────────────
// Deterministic grade per student × activity (simulated)
export function getActivityGrade(studentId: string, activityId: string): number | null {
  if (runtimeAcademicData) return domainActivityGrade(studentId, activityId, runtimeAcademicData.grades);
  const sIdx = STUDENTS.findIndex(s => s.id === studentId);
  const aIdx = ACTIVITIES.findIndex(a => a.id === activityId);
  const act = ACTIVITIES[aIdx];
  if (!act || act.status === 'borrador' || act.status === 'publicada') return null;
  if (act.status === 'en_correccion') {
    const corrected = (sIdx * 7 + aIdx * 3) % STUDENTS.length < act.correctionCount;
    if (!corrected) return null;
  }
  const base = ((sIdx * 31 + aIdx * 17) % 60) / 10 + 4;
  return Math.min(10, Math.max(0, parseFloat(base.toFixed(2))));
}

// Grade per CE for a student (weighted average across activities that evaluate that CE)
export function getCEGrade(studentId: string, ceId: string): number | null {
  if (runtimeAcademicData) return domainCriterionGrade(studentId, ceId, runtimeAcademicData.activities, runtimeAcademicData.criteria, runtimeAcademicData.grades);
  const activitiesWithCE = ACTIVITIES.filter(a => a.ceIds.includes(ceId));
  const grades: number[] = [];
  for (const act of activitiesWithCE) {
    const g = getActivityGrade(studentId, act.id);
    if (g !== null) grades.push(g);
  }
  if (grades.length === 0) return null;
  return parseFloat((grades.reduce((s, g) => s + g, 0) / grades.length).toFixed(2));
}

// CE status from grade
export function getCEStatus(grade: number | null): 'superado' | 'parcial' | 'no_superado' | 'no_evaluado' {
  return domainCriterionStatus(grade);
}

// RA grade for a student (weighted avg of CE grades by difficulty points)
export function getRAGrade(studentId: string, raId: string): number | null {
  if (runtimeAcademicData) return domainOutcomeGrade(studentId, raId, runtimeAcademicData.activities, runtimeAcademicData.criteria, runtimeAcademicData.grades);
  const ces = CRITERIA.filter(c => c.raId === raId);
  let totalWeight = 0;
  let weightedSum = 0;
  for (const ce of ces) {
    const g = getCEGrade(studentId, ce.id);
    if (g !== null) {
      const w = getDifficultyPoints(ce.difficulty);
      weightedSum += g * w;
      totalWeight += w;
    }
  }
  if (totalWeight === 0) return null;
  return parseFloat((weightedSum / totalWeight).toFixed(2));
}

// ─── WEIGHT CALCULATION FUNCTIONS ─────────────────────────────────────────────

/**
 * Returns the sum of difficulty points of all CE assigned to an activity.
 * básico=1pt, medio=2pt, avanzado=3pt. This is the "peso" of the activity.
 */
export function getActivityCEWeight(activityId: string): number {
  const activities = runtimeAcademicData?.activities ?? ACTIVITIES;
  const criteria = runtimeAcademicData?.criteria ?? CRITERIA;
  const act = activities.find(a => a.id === activityId);
  if (!act || act.ceIds.length === 0) return 0;
  return domainActivityCriterionWeight(act, criteria);
}

/**
 * Returns the % value of an activity within its container (UT or Evaluation).
 * Container = unitId if present, else evaluationId.
 * % = activityCEWeight / sum(CEWeights of all activities in same container) * 100
 */
export function getActivityValuePct(activityId: string): number {
  return domainActivityValuePercentage(activityId, runtimeAcademicData?.activities ?? ACTIVITIES, runtimeAcademicData?.criteria ?? CRITERIA);
}

/**
 * Returns the weighted contribution of a student's grade in an activity
 * to its container (UT or Evaluation). grade × (activityPct/100)
 */
export function getActivityWeightedGrade(studentId: string, activityId: string): number | null {
  const grade = getActivityGrade(studentId, activityId);
  if (grade === null) return null;
  const pct = getActivityValuePct(activityId);
  return parseFloat((grade * (pct / 100)).toFixed(3));
}

/**
 * Returns the weighted average grade for a student in a UT,
 * based on activity CE weights.
 */
export function getUTWeightedGrade(studentId: string, unitId: string): number | null {
  if (runtimeAcademicData) return domainUnitGrade(studentId, unitId, runtimeAcademicData.activities, runtimeAcademicData.criteria, runtimeAcademicData.grades);
  const acts = ACTIVITIES.filter(a => a.unitId === unitId);
  if (acts.length === 0) return null;
  const totalCEWeight = acts.reduce((sum, a) => sum + getActivityCEWeight(a.id), 0);
  if (totalCEWeight === 0) return null;
  let weightedSum = 0;
  let evaluatedWeight = 0;
  for (const act of acts) {
    const grade = getActivityGrade(studentId, act.id);
    if (grade !== null) {
      const w = getActivityCEWeight(act.id);
      weightedSum += grade * w;
      evaluatedWeight += w;
    }
  }
  if (evaluatedWeight === 0) return null;
  return parseFloat((weightedSum / evaluatedWeight).toFixed(2));
}

/**
 * Returns the weighted average grade for a student in an evaluation,
 * considering both UT-based and direct activities.
 */
export function getEvalWeightedGrade(studentId: string, evalId: string): number | null {
  if (runtimeAcademicData) return domainEvaluationGrade(studentId, evalId, runtimeAcademicData.activities, runtimeAcademicData.criteria, runtimeAcademicData.grades);
  const acts = ACTIVITIES.filter(a => a.evaluationId === evalId);
  if (acts.length === 0) return null;
  const totalCEWeight = acts.reduce((sum, a) => sum + getActivityCEWeight(a.id), 0);
  if (totalCEWeight === 0) return null;
  let weightedSum = 0;
  let evaluatedWeight = 0;
  for (const act of acts) {
    const grade = getActivityGrade(studentId, act.id);
    if (grade !== null) {
      const w = getActivityCEWeight(act.id);
      weightedSum += grade * w;
      evaluatedWeight += w;
    }
  }
  if (evaluatedWeight === 0) return null;
  return parseFloat((weightedSum / evaluatedWeight).toFixed(2));
}

export interface ActivityGradeEntry {
  activityId: string;
  activityName: string;
  unitId: string | null;
  evaluationId: string;
  grade: number | null;
  ceWeight: number;
  valuePct: number;
  weightedContribution: number | null;
}

export interface UTGradeEntry {
  unitId: string;
  unitCode: string;
  unitName: string;
  evaluationId: string;
  grade: number | null;
  activities: ActivityGradeEntry[];
}

export interface EvalGradeEntry {
  evaluationId: string;
  evaluationName: string;
  weight: number;
  grade: number | null;
  units: UTGradeEntry[];
  directActivities: ActivityGradeEntry[];
}

export interface StudentGradeMap {
  studentId: string;
  evaluations: EvalGradeEntry[];
  moduleGrade: number | null;
}

export function buildStudentGradeMap(studentId: string): StudentGradeMap {
  const sourceEvaluations = runtimeAcademicData?.evaluations ?? EVALUATIONS;
  const sourceWorkUnits = runtimeAcademicData?.workUnits ?? WORK_UNITS;
  const sourceActivities = runtimeAcademicData?.activities ?? ACTIVITIES;
  const evaluations: EvalGradeEntry[] = sourceEvaluations.map(ev => {
    const units: UTGradeEntry[] = sourceWorkUnits.filter(ut => ut.evaluationId === ev.id).map(ut => {
      const acts = sourceActivities.filter(a => a.unitId === ut.id);
      const activities: ActivityGradeEntry[] = acts.map(act => ({
        activityId: act.id,
        activityName: act.name,
        unitId: act.unitId,
        evaluationId: act.evaluationId,
        grade: getActivityGrade(studentId, act.id),
        ceWeight: getActivityCEWeight(act.id),
        valuePct: getActivityValuePct(act.id),
        weightedContribution: getActivityWeightedGrade(studentId, act.id),
      }));
      return {
        unitId: ut.id,
        unitCode: ut.code,
        unitName: ut.name,
        evaluationId: ev.id,
        grade: getUTWeightedGrade(studentId, ut.id),
        activities,
      };
    });

    const directActs = sourceActivities.filter(a => a.evaluationId === ev.id && !a.unitId);
    const directActivities: ActivityGradeEntry[] = directActs.map(act => ({
      activityId: act.id,
      activityName: act.name,
      unitId: null,
      evaluationId: act.evaluationId,
      grade: getActivityGrade(studentId, act.id),
      ceWeight: getActivityCEWeight(act.id),
      valuePct: getActivityValuePct(act.id),
      weightedContribution: getActivityWeightedGrade(studentId, act.id),
    }));

    return {
      evaluationId: ev.id,
      evaluationName: ev.name,
      weight: ev.weight,
      grade: getEvalWeightedGrade(studentId, ev.id),
      units,
      directActivities,
    };
  });

  // Module grade: weighted avg of evaluations
  const evalGrades = evaluations.map((e, i) => ({
    value: e.grade,
    weight: sourceEvaluations[i]?.weight ?? 50,
  }));
  const moduleGrade = weightedAverage(evalGrades);

  return { studentId, evaluations, moduleGrade };
}

// ─── CE PERFORMANCE ────────────────────────────────────────────────────────────
export const CE_PERFORMANCE = [
  { ce: 'RA1.a', avg: 7.8, superado: 16, parcial: 4, noSuperado: 2, noEvaluado: 0 },
  { ce: 'RA1.b', avg: 7.2, superado: 14, parcial: 5, noSuperado: 3, noEvaluado: 0 },
  { ce: 'RA1.c', avg: 6.9, superado: 13, parcial: 6, noSuperado: 3, noEvaluado: 0 },
  { ce: 'RA1.d', avg: 6.5, superado: 12, parcial: 5, noSuperado: 5, noEvaluado: 0 },
  { ce: 'RA1.e', avg: 7.1, superado: 14, parcial: 4, noSuperado: 4, noEvaluado: 0 },
  { ce: 'RA2.a', avg: 7.5, superado: 15, parcial: 5, noSuperado: 2, noEvaluado: 0 },
  { ce: 'RA2.b', avg: 6.8, superado: 13, parcial: 5, noSuperado: 4, noEvaluado: 0 },
  { ce: 'RA2.c', avg: 5.9, superado: 10, parcial: 6, noSuperado: 6, noEvaluado: 0 },
  { ce: 'RA2.d', avg: 5.4, superado: 8, parcial: 7, noSuperado: 7, noEvaluado: 0 },
  { ce: 'RA2.e', avg: 6.1, superado: 11, parcial: 6, noSuperado: 5, noEvaluado: 0 },
  { ce: 'RA3.a', avg: 4.8, superado: 6, parcial: 8, noSuperado: 8, noEvaluado: 0 },
  { ce: 'RA3.b', avg: 4.2, superado: 4, parcial: 7, noSuperado: 11, noEvaluado: 0 },
  { ce: 'RA3.c', avg: 3.9, superado: 3, parcial: 6, noSuperado: 13, noEvaluado: 0 },
  { ce: 'RA3.d', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA3.e', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA4.a', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA4.b', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA4.c', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA4.d', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA5.a', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA5.b', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
  { ce: 'RA5.c', avg: null, superado: 0, parcial: 0, noSuperado: 0, noEvaluado: 22 },
];

export const GRADE_TREND = [
  { label: '1ª Ev.', avg: 6.82, min: 3.40, max: 9.50 },
  { label: '2ª Ev.', avg: 5.95, min: 3.00, max: 9.20 },
];

// ─── INCIDENTS ────────────────────────────────────────────────────────────────
export interface Incident {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  type: 'aviso' | 'observación' | 'positivo' | 'falta';
  detail: string;
}

export const INCIDENTS: Incident[] = [
  { id: 'inc-1', studentId: 'stu-3', studentName: 'Carlos Fernández Ruiz', date: '2026-07-10', type: 'aviso', detail: 'No entregó la práctica 5 en plazo. Tercera vez que ocurre.' },
  { id: 'inc-2', studentId: 'stu-5', studentName: 'David Sánchez Torres', date: '2026-07-09', type: 'falta', detail: 'Faltó a clase sin justificación. Acumuladas 12 faltas.' },
  { id: 'inc-3', studentId: 'stu-13', studentName: 'Andrés Ortega Fuentes', date: '2026-07-08', type: 'aviso', detail: 'No asistió al examen parcial. Pendiente de recuperación.' },
  { id: 'inc-4', studentId: 'stu-9', studentName: 'Jorge Álvarez Núñez', date: '2026-07-07', type: 'observación', detail: 'Muestra dificultades con la concurrencia. Se recomienda tutoría.' },
  { id: 'inc-5', studentId: 'stu-2', studentName: 'Sara Rodríguez López', date: '2026-07-05', type: 'positivo', detail: 'Excelente presentación del proyecto de hilos. Propuesta para exposición.' },
  { id: 'inc-6', studentId: 'stu-18', studentName: 'Silvia Navarro Espejo', date: '2026-07-03', type: 'observación', detail: 'Dificultades con el manejo de excepciones en sockets. Necesita refuerzo.' },
  { id: 'inc-7', studentId: 'stu-15', studentName: 'Iván Molina Ríos', date: '2026-07-01', type: 'aviso', detail: 'Entrega incompleta de la práctica 5. Falta la parte de sincronización.' },
  { id: 'inc-8', studentId: 'stu-1', studentName: 'Alejandro Martínez García', date: '2026-06-28', type: 'positivo', detail: 'Ayudó a compañeros con la depuración de hilos. Actitud colaborativa.' },
];

// ─── SESSION LOGS ─────────────────────────────────────────────────────────────
export interface SessionLog {
  id: string;
  date: string;
  unitId: string;
  development: string;
  homework: string;
  notes: string;
}

export const SESSION_LOGS: SessionLog[] = [
  { id: 'sl-1', date: '2026-07-14', unitId: 'ut-3', development: 'Introducción a sockets UDP. Ejercicios de envío/recepción básico.', homework: 'Leer capítulo 8 del manual de redes.', notes: 'Buen ritmo general. Varios alumnos con dudas sobre el modelo cliente-servidor.' },
  { id: 'sl-2', date: '2026-07-11', unitId: 'ut-3', development: 'Práctica guiada: Socket TCP echo server con múltiples clientes.', homework: 'Completar práctica 5 para el lunes.', notes: 'David y Carlos no estuvieron en clase. Ana terminó antes y ayudó a compañeros.' },
  { id: 'sl-3', date: '2026-07-10', unitId: 'ut-3', development: 'Revisión de correcciones Práctica 4. Resolución de errores comunes.', homework: 'Revisar feedback individual en EduTrack.', notes: '8 alumnos pendientes de revisar su feedback. Recordar en próxima sesión.' },
  { id: 'sl-4', date: '2026-07-07', unitId: 'ut-3', development: 'Teoría: Modelo OSI y capa de transporte. Diferencias TCP/UDP.', homework: 'Ejercicios de teoría del libro, pág. 145-150.', notes: 'Clase muy participativa. Sara y Roberto destacaron con preguntas avanzadas.' },
  { id: 'sl-5', date: '2026-07-04', unitId: 'ut-2', development: 'Cierre UT2: Repaso general de concurrencia y patrones de diseño.', homework: 'Preparar examen UT2 para el jueves.', notes: 'Varios alumnos con dudas sobre ReentrantLock vs synchronized.' },
];

// ─── TUTORING ACTIONS ─────────────────────────────────────────────────────────
export interface TutoringAction {
  id: string;
  studentId: string;
  date: string;
  type: 'entrevista' | 'acuerdo' | 'observación' | 'seguimiento';
  content: string;
  followUp?: string;
}

export const TUTORING_ACTIONS: TutoringAction[] = [
  { id: 'ta-1', studentId: 'stu-3', date: '2026-07-10', type: 'entrevista', content: 'Entrevista individual. Carlos reconoce dificultades con la gestión del tiempo. Se acuerda plan de recuperación.', followUp: 'Revisión en 2 semanas' },
  { id: 'ta-2', studentId: 'stu-5', date: '2026-07-09', type: 'acuerdo', content: 'Acuerdo de asistencia: David se compromete a asistir a todas las clases restantes. Se notifica a familia.', followUp: 'Control semanal de asistencia' },
  { id: 'ta-3', studentId: 'stu-13', date: '2026-07-08', type: 'seguimiento', content: 'Seguimiento de Andrés. Situación familiar complicada. Se deriva a orientación.', followUp: 'Coordinación con orientador' },
  { id: 'ta-4', studentId: 'stu-9', date: '2026-07-05', type: 'observación', content: 'Jorge muestra mejora en las últimas semanas. Sigue necesitando apoyo en concurrencia.', followUp: 'Tutoría de refuerzo' },
  { id: 'ta-5', studentId: 'stu-15', date: '2026-06-28', type: 'entrevista', content: 'Iván solicita tutoría voluntaria. Quiere mejorar nota final. Se le proporciona material adicional.', followUp: 'Entrega de ejercicios extra' },
];

// ─── CALENDAR EVENTS ──────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'entrega' | 'examen' | 'tutoría' | 'festivo' | 'reunión' | 'otro';
  notes?: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'ev-1', date: '2026-07-14', title: 'Sesión: Sockets UDP', type: 'otro', notes: 'Introducción práctica' },
  { id: 'ev-2', date: '2026-07-18', title: 'Entrega Práctica 6', type: 'entrega', notes: 'Socket UDP y multihilo' },
  { id: 'ev-3', date: '2026-07-20', title: 'Examen UT3', type: 'examen', notes: 'Examen teórico-práctico de sockets' },
  { id: 'ev-4', date: '2026-07-25', title: 'Tutoría grupal', type: 'tutoría', notes: 'Revisión de progreso 2ª evaluación' },
  { id: 'ev-5', date: '2026-08-01', title: 'Inicio UT4: REST', type: 'otro', notes: 'Servicios Web REST con Spring Boot' },
  { id: 'ev-6', date: '2026-08-15', title: 'Festivo', type: 'festivo' },
  { id: 'ev-7', date: '2026-09-05', title: 'Entrega Práctica 7', type: 'entrega', notes: 'API REST con autenticación JWT' },
  { id: 'ev-8', date: '2026-09-15', title: 'Reunión departamento', type: 'reunión', notes: 'Coordinación evaluación final' },
];

// ─── RUBRICS ──────────────────────────────────────────────────────────────────
export interface RubricLevel {
  id: string;
  label: string;
  minPct: number;
  maxPct: number;
  color: string;
}

export interface RubricRow {
  id: string;
  ceId: string;
  weight: number;
  descriptors: Record<string, string>; // levelId → descriptor
}

export interface Rubric {
  id: string;
  activityId: string;
  title: string;
  version: number;
  levels: RubricLevel[];
  rows: RubricRow[];
}

export const RUBRICS: Rubric[] = [
  {
    id: 'rub-1',
    activityId: 'act-1',
    title: 'Rúbrica Práctica 1: Fork y exec()',
    version: 2,
    levels: [
      { id: 'lv-1', label: 'Insuficiente', minPct: 0, maxPct: 49, color: 'bg-red-100 text-red-700' },
      { id: 'lv-2', label: 'Suficiente', minPct: 50, maxPct: 69, color: 'bg-amber-100 text-amber-700' },
      { id: 'lv-3', label: 'Notable', minPct: 70, maxPct: 89, color: 'bg-blue-100 text-blue-700' },
      { id: 'lv-4', label: 'Sobresaliente', minPct: 90, maxPct: 100, color: 'bg-green-100 text-green-700' },
    ],
    rows: [
      { id: 'row-1', ceId: 'ce-1a', weight: 15, descriptors: { 'lv-1': 'No identifica los estados del proceso.', 'lv-2': 'Identifica algunos estados básicos.', 'lv-3': 'Identifica y describe todos los estados.', 'lv-4': 'Explica transiciones con ejemplos propios.' } },
      { id: 'row-2', ceId: 'ce-1b', weight: 20, descriptors: { 'lv-1': 'No implementa fork/exec correctamente.', 'lv-2': 'Implementa fork básico sin manejo de errores.', 'lv-3': 'Implementa fork/exec con manejo de errores.', 'lv-4': 'Implementación robusta con casos edge.' } },
      { id: 'row-3', ceId: 'ce-1c', weight: 20, descriptors: { 'lv-1': 'No sincroniza procesos.', 'lv-2': 'Sincronización básica con wait().', 'lv-3': 'Sincronización correcta y obtiene valor retornado.', 'lv-4': 'Manejo avanzado de señales y sincronización.' } },
    ],
  },
  {
    id: 'rub-2',
    activityId: 'act-4',
    title: 'Rúbrica Práctica 3: ExecutorService',
    version: 1,
    levels: [
      { id: 'lv-1', label: 'Insuficiente', minPct: 0, maxPct: 49, color: 'bg-red-100 text-red-700' },
      { id: 'lv-2', label: 'Suficiente', minPct: 50, maxPct: 69, color: 'bg-amber-100 text-amber-700' },
      { id: 'lv-3', label: 'Notable', minPct: 70, maxPct: 89, color: 'bg-blue-100 text-blue-700' },
      { id: 'lv-4', label: 'Sobresaliente', minPct: 90, maxPct: 100, color: 'bg-green-100 text-green-700' },
    ],
    rows: [
      { id: 'row-4', ceId: 'ce-2a', weight: 10, descriptors: { 'lv-1': 'No identifica casos de uso de hilos.', 'lv-2': 'Identifica casos básicos.', 'lv-3': 'Justifica el uso de hilos con criterio.', 'lv-4': 'Análisis completo con comparativa de alternativas.' } },
      { id: 'row-5', ceId: 'ce-2b', weight: 20, descriptors: { 'lv-1': 'No crea hilos correctamente.', 'lv-2': 'Crea hilos básicos con Thread.', 'lv-3': 'Usa ExecutorService correctamente.', 'lv-4': 'Pool de hilos optimizado con métricas.' } },
      { id: 'row-6', ceId: 'ce-2c', weight: 20, descriptors: { 'lv-1': 'No comparte datos entre hilos.', 'lv-2': 'Comparte datos sin sincronización.', 'lv-3': 'Comparte datos con sincronización básica.', 'lv-4': 'Uso de estructuras concurrentes avanzadas.' } },
    ],
  },
];

// ─── CE COMPATIBILITY ─────────────────────────────────────────────────────────
export interface CECompatibility {
  id: string;
  originCeId: string;
  destCeId: string;
  level: 'full' | 'partial' | 'weak';
  factor: number;
  active: boolean;
  notes: string;
}

export const CE_COMPATIBILITIES: CECompatibility[] = [
  { id: 'compat-1', originCeId: 'ce-1c', destCeId: 'ce-2d', level: 'partial', factor: 0.7, active: true, notes: 'La sincronización de procesos es evidencia parcial de sincronización de hilos.' },
  { id: 'compat-2', originCeId: 'ce-2b', destCeId: 'ce-3d', level: 'full', factor: 0.9, active: true, notes: 'Crear hilos es evidencia directa de usarlos en aplicaciones de red.' },
  { id: 'compat-3', originCeId: 'ce-3b', destCeId: 'ce-4b', level: 'weak', factor: 0.4, active: false, notes: 'Sockets TCP como contexto débil para servicios REST.' },
];

// ─── CORRECTIONS ──────────────────────────────────────────────────────────────
export interface Correction {
  id: string;
  studentId: string;
  activityId: string;
  status: 'pendiente' | 'en_proceso' | 'pendiente_revision' | 'revisada_docente' | 'cerrada';
  aiScore: number | null;
  teacherScore: number | null;
  feedback: string;
  date: string;
  provider?: string;
}

export const CORRECTIONS: Correction[] = [
  { id: 'cor-1', studentId: 'stu-1', activityId: 'act-7', status: 'revisada_docente', aiScore: 7.8, teacherScore: 8.0, feedback: 'Buena implementación del servidor TCP. Falta manejo de desconexiones abruptas.', date: '2026-07-10', provider: 'OpenAI GPT-4o' },
  { id: 'cor-2', studentId: 'stu-2', activityId: 'act-7', status: 'revisada_docente', aiScore: 9.2, teacherScore: 9.5, feedback: 'Excelente. Implementación completa con manejo de errores y logging.', date: '2026-07-10', provider: 'OpenAI GPT-4o' },
  { id: 'cor-3', studentId: 'stu-3', activityId: 'act-7', status: 'pendiente_revision', aiScore: 4.1, teacherScore: null, feedback: 'El servidor no acepta múltiples conexiones simultáneas. Revisar uso de hilos.', date: '2026-07-11', provider: 'OpenAI GPT-4o' },
  { id: 'cor-4', studentId: 'stu-4', activityId: 'act-7', status: 'pendiente_revision', aiScore: 6.5, teacherScore: null, feedback: 'Implementación funcional pero sin manejo de excepciones.', date: '2026-07-11', provider: 'OpenAI GPT-4o' },
  { id: 'cor-5', studentId: 'stu-6', activityId: 'act-7', status: 'revisada_docente', aiScore: 8.8, teacherScore: 8.5, feedback: 'Muy buena implementación. Código limpio y bien documentado.', date: '2026-07-09', provider: 'OpenAI GPT-4o' },
];

// ─── AI PROVIDERS ─────────────────────────────────────────────────────────────
export interface AIProvider {
  id: string;
  code: string;
  name: string;
  model: string;
  enabled: boolean;
  usage: string;
}

export const AI_PROVIDERS: AIProvider[] = [
  { id: 'ai-1', code: 'openai', name: 'OpenAI', model: 'gpt-4o', enabled: true, usage: 'Corrección automática de prácticas y generación de feedback detallado.' },
  { id: 'ai-2', code: 'anthropic', name: 'Anthropic', model: 'claude-3-5-sonnet', enabled: false, usage: 'Análisis de código y detección de patrones de error.' },
  { id: 'ai-3', code: 'deepseek', name: 'DeepSeek', model: 'deepseek-coder', enabled: false, usage: 'Especializado en corrección de código Java y Python.' },
];

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
export function getGradeColor(grade: number | null): string {
  if (grade === null || grade === undefined) return 'text-muted-foreground';
  if (grade >= 9) return 'grade-sobresaliente';
  if (grade >= 7) return 'grade-notable';
  if (grade >= 5) return 'grade-aprobado';
  return 'grade-suspenso';
}

export function getGradeLabel(grade: number | null): string {
  if (grade === null || grade === undefined) return '—';
  return grade.toFixed(2);
}

export function getGradeQualitative(grade: number | null): string {
  if (grade === null) return 'No evaluado';
  if (grade >= 9) return 'Sobresaliente';
  if (grade >= 7) return 'Notable';
  if (grade >= 6) return 'Bien';
  if (grade >= 5) return 'Suficiente';
  return 'Insuficiente';
}

export function getRiskBadge(risk: string): string {
  switch (risk) {
    case 'high': return 'bg-red-100 text-red-700 border border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'low': return 'bg-blue-100 text-blue-700 border border-blue-200';
    default: return 'bg-green-100 text-green-700 border border-green-200';
  }
}

export function getRiskLabel(risk: string): string {
  switch (risk) {
    case 'high': return 'En riesgo';
    case 'medium': return 'Atención';
    case 'low': return 'Seguimiento';
    default: return 'Correcto';
  }
}

export function getCEStatusColor(status: string): string {
  switch (status) {
    case 'superado': return 'bg-green-100 text-green-700 border border-green-200';
    case 'parcial': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'no_superado': return 'bg-red-100 text-red-700 border border-red-200';
    default: return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
}

export function getCEStatusLabel(status: string): string {
  switch (status) {
    case 'superado': return 'Superado';
    case 'parcial': return 'Parcial';
    case 'no_superado': return 'No superado';
    default: return 'No evaluado';
  }
}

export function getIncidentTypeColor(type: string): string {
  switch (type) {
    case 'positivo': return 'bg-green-100 text-green-700';
    case 'aviso': return 'bg-amber-100 text-amber-700';
    case 'falta': return 'bg-red-100 text-red-700';
    default: return 'bg-blue-100 text-blue-700';
  }
}

export function getIncidentTypeLabel(type: string): string {
  switch (type) {
    case 'positivo': return 'Positivo';
    case 'aviso': return 'Aviso';
    case 'falta': return 'Falta';
    default: return 'Observación';
  }
}

// Weighted average ignoring nulls
export function weightedAverage(items: { value: number | null; weight: number }[]): number | null {
  return domainWeightedAverage(items);
}

// Export CSV helper
export function generateCSV(headers: string[], rows: (string | number | null)[][]): string {
  const escape = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');
}
function buildStudentMasteryTimeline(...args: any[]): any {
  // eslint-disable-next-line no-console
  console.warn('Placeholder: buildStudentMasteryTimeline is not implemented yet.', args);
  return null;
}

export { buildStudentMasteryTimeline };
