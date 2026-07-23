'use client';

import { createClient } from '@/lib/supabase/client';
import {
  parseGradingGraph,
  parseTemplateBank,
  validateRubricLevels,
  type ImplicationLevel,
} from '@/lib/domain/criterionGrading';

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface Module {
  id: string;
  name: string;
  code: string;
  cycle: string;
  course?: string;
  deliveryMode: 'in_person' | 'online';
  evaluationCount: number;
  totalStudents: number;
}

export interface Evaluation {
  id: string;
  moduleId: string;
  name: string;
  evalType: string;
  weight: number;
  startDate: string;
  endDate: string;
}

export interface LearningOutcome {
  id: string;
  moduleId: string;
  code: string;
  description: string;
  weight: number;
  sortOrder: number;
}

export interface Criterion {
  id: string;
  raId: string;
  code: string;
  description: string;
  difficulty: 'básico' | 'medio' | 'avanzado';
  weight: number;
  sortOrder: number;
}

export interface WorkUnit {
  id: string;
  moduleId: string;
  evaluationId: string;
  code: string;
  name: string;
  hours: number;
  taughtPercentage: number;
  status: string;
  weight: number;
  raIds: string[];
  sortOrder: number;
}

export interface Activity {
  id: string;
  moduleId: string;
  unitId: string | null;
  evaluationId: string;
  name: string;
  type: string;
  status: string;
  weight: number;
  dueDate: string;
  description: string;
  ceIds: string[];
  correctionCount: number;
  reviewedCount: number;
  isRecovery?: boolean;
  isGlobalizing?: boolean;
}

export interface Student {
  id: string;
  moduleId: string;
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

export interface ActivityGrade {
  id: string;
  studentId: string;
  activityId: string;
  grade: number | null;
}

export interface RARelationship {
  id: string;
  moduleId: string;
  raSourceId: string;
  raTargetId: string;
  percentage: number;
  description?: string;
}

export interface Incident {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  type: 'aviso' | 'observación' | 'positivo' | 'falta';
  detail: string;
}

export interface SessionLog {
  id: string;
  moduleId: string;
  unitId: string;
  date: string;
  development: string;
  homework: string;
  notes: string;
}

export interface TutoringAction {
  id: string;
  studentId: string;
  date: string;
  type: 'entrevista' | 'acuerdo' | 'observación' | 'seguimiento';
  content: string;
  followUp?: string;
}

export interface CalendarEvent {
  id: string;
  moduleId: string;
  date: string;
  title: string;
  type: string;
  notes?: string;
}

export interface CalendarEventType {
  id: string;
  moduleId: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface ContentItem {
  id: string;
  moduleId: string;
  unitId: string;
  title: string;
  type: string;
  description: string;
  sortOrder: number;
}

export interface SeatLayout {
  moduleId: string;
  rows: number;
  columns: number;
  assignments: Record<string, string>;
}

export interface ClassGroup {
  id: string;
  moduleId: string;
  name: string;
  tutor: string;
  room: string;
}

export interface GradingScale {
  id: string;
  moduleId: string;
  name: string;
  passingGrade: number;
  latePenalty: number;
}

export type AggregationMode = 'weighted_average' | 'latest' | 'moving_average';
export type ImplicationMode = 'disabled' | 'minimum' | 'inherit';

export interface CriterionGradingConfig {
  moduleId: string;
  academicYear?: string;
  basicWeight: number;
  mediumWeight: number;
  advancedWeight: number;
  passingThreshold: number;
  aggregationMode: AggregationMode;
  recoveryAggregationMode: AggregationMode;
  implicationMode: ImplicationMode;
  cutoffActive: boolean;
  raCutoff: number;
  partialCutoff: number;
  finalCutoff: number;
}

export interface CriterionImplication {
  id: string;
  moduleId: string;
  sourceCriterionId: string;
  targetCriterionId: string;
  level: ImplicationLevel;
  source?: string;
  justification: string;
}

export interface RubricLevelDefinition {
  label: string;
  score: number;
  descriptor: string;
}

export interface RubricItem {
  id: string;
  activityId: string;
  criterionId: string;
  description: string;
  weight: number;
  levels: RubricLevelDefinition[];
  sortOrder: number;
}

export interface RubricItemGrade {
  id: string;
  studentId: string;
  itemId: string;
  score: number | null;
  notApplicable: boolean;
  gradedAt: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isSchemaError(error: any): boolean {
  if (!error) return false;
  if (error.code && typeof error.code === 'string') {
    const cls = error.code.substring(0, 2);
    if (cls === '42' || cls === '08') return true;
    if (cls === '23') return false;
  }
  if (error.message) {
    return /relation.*does not exist|column.*does not exist|function.*does not exist|syntax error/i.test(
      error.message
    );
  }
  return false;
}

function assertRequest(error: any, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message || 'error de base de datos'}`);
}

export const foundationService = {
  async claimLegacyData(): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('claim_legacy_data');
    // The application can still run before the migration is applied locally.
    if (error && /claim_legacy_data|schema cache|function/i.test(error.message || '')) return 0;
    assertRequest(error, 'No se pudieron reclamar los datos existentes');
    return Number(data || 0);
  },
};

// ─── MODULES ──────────────────────────────────────────────────────────────────
export const moduleService = {
  async getAll(): Promise<Module[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('modules').select('*').order('code');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        cycle: r.cycle,
        course: r.course,
        deliveryMode: r.delivery_mode === 'online' ? 'online' : 'in_person',
        evaluationCount: r.evaluation_count,
        totalStudents: r.total_students,
      }));
    } catch (e: any) {
      console.error('moduleService.getAll:', e.message);
      throw e;
    }
  },

  async upsert(module: Module): Promise<Module> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('modules')
      .upsert(
        {
          id: module.id,
          name: module.name,
          code: module.code,
          cycle: module.cycle,
          course: module.course,
          delivery_mode: module.deliveryMode,
          evaluation_count: module.evaluationCount,
          total_students: module.totalStudents,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();
    assertRequest(error, 'No se pudo guardar el módulo');
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      cycle: data.cycle,
      course: data.course,
      deliveryMode: data.delivery_mode === 'online' ? 'online' : 'in_person',
      evaluationCount: data.evaluation_count,
      totalStudents: data.total_students,
    };
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) {
      if (isSchemaError(error)) throw error;
    }
  },
};

// ─── EVALUATIONS ──────────────────────────────────────────────────────────────
export const evaluationService = {
  async getByModule(moduleId: string): Promise<Evaluation[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('module_id', moduleId)
        .order('start_date');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        name: r.name,
        evalType: r.eval_type,
        weight: r.weight,
        startDate: r.start_date,
        endDate: r.end_date,
      }));
    } catch (e: any) {
      console.error('evaluationService.getByModule:', e.message);
      throw e;
    }
  },
};

// ─── LEARNING OUTCOMES ────────────────────────────────────────────────────────
export const learningOutcomeService = {
  async getByModule(moduleId: string): Promise<LearningOutcome[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('learning_outcomes')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        code: r.code,
        description: r.description,
        weight: r.weight,
        sortOrder: r.sort_order,
      }));
    } catch (e: any) {
      console.error('learningOutcomeService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(
    ra: Omit<LearningOutcome, 'sortOrder'> & { sortOrder?: number }
  ): Promise<LearningOutcome | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('learning_outcomes')
        .upsert(
          {
            id: ra.id,
            module_id: ra.moduleId,
            code: ra.code,
            description: ra.description,
            weight: ra.weight,
            sort_order: ra.sortOrder ?? 0,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        code: data.code,
        description: data.description,
        weight: data.weight,
        sortOrder: data.sort_order,
      };
    } catch (e: any) {
      console.error('learningOutcomeService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('learning_outcomes').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('learningOutcomeService.delete:', e.message);
      throw e;
    }
  },
};

// ─── CRITERIA ─────────────────────────────────────────────────────────────────
export const criterionService = {
  async getByModule(moduleId: string): Promise<Criterion[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('criteria')
        .select('*, learning_outcomes!inner(module_id)')
        .eq('learning_outcomes.module_id', moduleId)
        .order('sort_order');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        raId: r.ra_id,
        code: r.code,
        description: r.description,
        difficulty: r.difficulty,
        weight: r.weight,
        sortOrder: r.sort_order,
      }));
    } catch (e: any) {
      console.error('criterionService.getByModule:', e.message);
      throw e;
    }
  },

  async getByRA(raId: string): Promise<Criterion[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('ra_id', raId)
        .order('sort_order');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        raId: r.ra_id,
        code: r.code,
        description: r.description,
        difficulty: r.difficulty,
        weight: r.weight,
        sortOrder: r.sort_order,
      }));
    } catch (e: any) {
      console.error('criterionService.getByRA:', e.message);
      throw e;
    }
  },

  async upsert(
    ce: Omit<Criterion, 'sortOrder'> & { sortOrder?: number }
  ): Promise<Criterion | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('criteria')
        .upsert(
          {
            id: ce.id,
            ra_id: ce.raId,
            code: ce.code,
            description: ce.description,
            difficulty: ce.difficulty,
            weight: ce.weight,
            sort_order: ce.sortOrder ?? 0,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        raId: data.ra_id,
        code: data.code,
        description: data.description,
        difficulty: data.difficulty,
        weight: data.weight,
        sortOrder: data.sort_order,
      };
    } catch (e: any) {
      console.error('criterionService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('criteria').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('criterionService.delete:', e.message);
      throw e;
    }
  },
};

// ─── WORK UNITS ───────────────────────────────────────────────────────────────
export const workUnitService = {
  async getByModule(moduleId: string): Promise<WorkUnit[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('work_units')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        evaluationId: r.evaluation_id,
        code: r.code,
        name: r.name,
        hours: r.hours,
        taughtPercentage: r.taught_percentage,
        status: r.unit_status,
        weight: r.weight,
        raIds: r.ra_ids || [],
        sortOrder: r.sort_order,
      }));
    } catch (e: any) {
      console.error('workUnitService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(ut: WorkUnit): Promise<WorkUnit | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('work_units')
        .upsert(
          {
            id: ut.id,
            module_id: ut.moduleId,
            evaluation_id: ut.evaluationId,
            code: ut.code,
            name: ut.name,
            hours: ut.hours,
            taught_percentage: ut.taughtPercentage,
            unit_status: ut.status,
            weight: ut.weight,
            ra_ids: ut.raIds,
            sort_order: ut.sortOrder,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        evaluationId: data.evaluation_id,
        code: data.code,
        name: data.name,
        hours: data.hours,
        taughtPercentage: data.taught_percentage,
        status: data.unit_status,
        weight: data.weight,
        raIds: data.ra_ids || [],
        sortOrder: data.sort_order,
      };
    } catch (e: any) {
      console.error('workUnitService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('work_units').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('workUnitService.delete:', e.message);
      throw e;
    }
  },

  async moveToEvaluation(ut: WorkUnit, evaluationId: string, sortOrder: number): Promise<void> {
    const supabase = createClient();
    const previousEvaluationId = ut.evaluationId;
    const { error: unitError } = await supabase
      .from('work_units')
      .update({ evaluation_id: evaluationId, sort_order: sortOrder })
      .eq('id', ut.id);
    if (unitError) throw unitError;

    const { error: activityError } = await supabase
      .from('activities')
      .update({ evaluation_id: evaluationId })
      .eq('unit_id', ut.id);
    if (activityError) {
      await supabase
        .from('work_units')
        .update({ evaluation_id: previousEvaluationId, sort_order: ut.sortOrder })
        .eq('id', ut.id);
      throw activityError;
    }
  },
};

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export const activityService = {
  async getByModule(moduleId: string): Promise<Activity[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('module_id', moduleId)
        .order('due_date');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        unitId: r.unit_id,
        evaluationId: r.evaluation_id,
        name: r.name,
        type: r.activity_type,
        status: r.activity_status,
        weight: r.weight,
        dueDate: r.due_date,
        description: r.description,
        ceIds: r.ce_ids || [],
        correctionCount: r.correction_count,
        reviewedCount: r.reviewed_count,
        isRecovery: r.is_recovery ?? false,
        isGlobalizing: r.is_globalizing ?? false,
      }));
    } catch (e: any) {
      console.error('activityService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(act: Activity): Promise<Activity | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('activities')
        .upsert(
          {
            id: act.id,
            module_id: act.moduleId,
            unit_id: act.unitId,
            evaluation_id: act.evaluationId,
            name: act.name,
            activity_type: act.type,
            activity_status: act.status,
            weight: act.weight,
            due_date: act.dueDate,
            description: act.description,
            ce_ids: act.ceIds,
            correction_count: act.correctionCount,
            reviewed_count: act.reviewedCount,
            is_recovery: act.isRecovery ?? false,
            is_globalizing: act.isGlobalizing ?? false,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        unitId: data.unit_id,
        evaluationId: data.evaluation_id,
        name: data.name,
        type: data.activity_type,
        status: data.activity_status,
        weight: data.weight,
        dueDate: data.due_date,
        description: data.description,
        ceIds: data.ce_ids || [],
        correctionCount: data.correction_count,
        reviewedCount: data.reviewed_count,
        isRecovery: data.is_recovery ?? false,
        isGlobalizing: data.is_globalizing ?? false,
      };
    } catch (e: any) {
      console.error('activityService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('activityService.delete:', e.message);
      throw e;
    }
  },
};

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export const studentService = {
  async getByModule(moduleId: string): Promise<Student[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('module_id', moduleId)
        .order('name');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        nia: r.nia,
        name: r.name,
        avatar: r.avatar,
        email: r.email,
        githubUrl: r.github_url,
        moduleGrade: r.module_grade,
        eval1Grade: r.eval1_grade,
        eval2Grade: r.eval2_grade,
        riskLevel: r.risk_level,
        ceSuperado: r.ce_superado,
        ceParcial: r.ce_parcial,
        ceNoSuperado: r.ce_no_superado,
        ceNoEvaluado: r.ce_no_evaluado,
        incidents: r.incidents,
        absences: r.absences,
      }));
    } catch (e: any) {
      console.error('studentService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(student: Student): Promise<Student | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('students')
        .upsert(
          {
            id: student.id,
            module_id: student.moduleId,
            nia: student.nia,
            name: student.name,
            avatar: student.avatar,
            email: student.email,
            github_url: student.githubUrl,
            module_grade: student.moduleGrade,
            eval1_grade: student.eval1Grade,
            eval2_grade: student.eval2Grade,
            risk_level: student.riskLevel,
            ce_superado: student.ceSuperado,
            ce_parcial: student.ceParcial,
            ce_no_superado: student.ceNoSuperado,
            ce_no_evaluado: student.ceNoEvaluado,
            incidents: student.incidents,
            absences: student.absences,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        nia: data.nia,
        name: data.name,
        avatar: data.avatar,
        email: data.email,
        githubUrl: data.github_url,
        moduleGrade: data.module_grade,
        eval1Grade: data.eval1_grade,
        eval2Grade: data.eval2_grade,
        riskLevel: data.risk_level,
        ceSuperado: data.ce_superado,
        ceParcial: data.ce_parcial,
        ceNoSuperado: data.ce_no_superado,
        ceNoEvaluado: data.ce_no_evaluado,
        incidents: data.incidents,
        absences: data.absences,
      };
    } catch (e: any) {
      console.error('studentService.upsert:', e.message);
      throw e;
    }
  },
};

// ─── ACTIVITY GRADES ──────────────────────────────────────────────────────────
export const gradeService = {
  async getByModule(moduleId: string): Promise<ActivityGrade[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('activity_grades')
        .select('*, activities!inner(module_id)')
        .eq('activities.module_id', moduleId);
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        studentId: r.student_id,
        activityId: r.activity_id,
        grade: r.grade,
      }));
    } catch (e: any) {
      console.error('gradeService.getByModule:', e.message);
      throw e;
    }
  },

  async upsertGrade(studentId: string, activityId: string, grade: number | null): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('activity_grades').upsert(
        {
          student_id: studentId,
          activity_id: activityId,
          grade,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,activity_id' }
      );
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('gradeService.upsertGrade:', e.message);
      throw e;
    }
  },
};

// ─── RA RELATIONSHIPS ─────────────────────────────────────────────────────────
export const raRelationshipService = {
  async getByModule(moduleId: string): Promise<RARelationship[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('ra_relationships')
        .select('*')
        .eq('module_id', moduleId);
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        raSourceId: r.ra_source_id,
        raTargetId: r.ra_target_id,
        percentage: r.percentage,
        description: r.description,
      }));
    } catch (e: any) {
      console.error('raRelationshipService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(rel: RARelationship): Promise<RARelationship | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('ra_relationships')
        .upsert(
          {
            id: rel.id,
            module_id: rel.moduleId,
            ra_source_id: rel.raSourceId,
            ra_target_id: rel.raTargetId,
            percentage: rel.percentage,
            description: rel.description,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        raSourceId: data.ra_source_id,
        raTargetId: data.ra_target_id,
        percentage: data.percentage,
        description: data.description,
      };
    } catch (e: any) {
      console.error('raRelationshipService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('ra_relationships').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('raRelationshipService.delete:', e.message);
      throw e;
    }
  },
};

// ─── CRITERION-BASED GRADING ─────────────────────────────────────────────────
export const criterionGradingConfigService = {
  async getByModule(moduleId: string): Promise<CriterionGradingConfig | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('criterion_grading_configs')
      .select('*')
      .eq('module_id', moduleId)
      .order('academic_year', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data
      ? {
          moduleId: data.module_id,
          basicWeight: Number(data.basic_weight),
          mediumWeight: Number(data.medium_weight),
          advancedWeight: Number(data.advanced_weight),
          passingThreshold: Number(data.passing_threshold),
          academicYear: data.academic_year ?? '2025-2026',
          aggregationMode: data.aggregation_mode,
          recoveryAggregationMode: data.recovery_aggregation_mode ?? 'latest',
          implicationMode: data.implication_mode,
          cutoffActive: data.cutoff_active ?? true,
          raCutoff: Number(data.ra_cutoff),
          partialCutoff: Number(data.partial_cutoff),
          finalCutoff: Number(data.final_cutoff),
        }
      : null;
  },

  async upsert(config: CriterionGradingConfig): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('criterion_grading_configs').upsert(
      {
        module_id: config.moduleId,
        academic_year: config.academicYear ?? '2025-2026',
        basic_weight: config.basicWeight,
        medium_weight: config.mediumWeight,
        advanced_weight: config.advancedWeight,
        passing_threshold: config.passingThreshold,
        aggregation_mode: config.aggregationMode,
        recovery_aggregation_mode: config.recoveryAggregationMode,
        implication_mode: config.implicationMode,
        cutoff_active: config.cutoffActive,
        ra_cutoff: config.raCutoff,
        partial_cutoff: config.partialCutoff,
        final_cutoff: config.finalCutoff,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module_id,academic_year' }
    );
    if (error) throw error;
  },
};

export const criterionImplicationService = {
  async getByModule(moduleId: string): Promise<CriterionImplication[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('criterion_implications')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at');
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      sourceCriterionId: row.source_criterion_id,
      targetCriterionId: row.target_criterion_id,
      level: row.level ?? 'M',
      source: row.source ?? undefined,
      justification: row.justification,
    }));
  },

  async upsert(implication: Omit<CriterionImplication, 'id'> & { id?: string }): Promise<void> {
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      module_id: implication.moduleId,
      source_criterion_id: implication.sourceCriterionId,
      target_criterion_id: implication.targetCriterionId,
      level: implication.level,
      source: implication.source ?? null,
      justification: implication.justification,
    };
    if (implication.id) payload.id = implication.id;
    const { error } = await supabase
      .from('criterion_implications')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('criterion_implications').delete().eq('id', id);
    if (error) throw error;
  },
};

export const criterionGraphImportService = {
  async import(
    moduleId: string,
    input: unknown
  ): Promise<{ criteria: number; implications: number; rejections: number }> {
    const graph = parseGradingGraph(input);
    const supabase = createClient();
    const { data: outcomes, error: outcomesError } = await supabase
      .from('learning_outcomes')
      .select('id,code')
      .eq('module_id', moduleId);
    if (outcomesError) throw outcomesError;
    const outcomeByCode = new Map((outcomes ?? []).map((row) => [row.code, row.id]));
    const criteriaPayload = graph.criteria.map((criterion, index) => {
      const raId = outcomeByCode.get(criterion.ra);
      if (!raId) throw new Error(`No existe ${criterion.ra} en el módulo seleccionado.`);
      return {
        id: criterion.id,
        ra_id: raId,
        code: criterion.id,
        description: criterion.id,
        difficulty:
          criterion.tipo === 'B' ? 'básico' : criterion.tipo === 'M' ? 'medio' : 'avanzado',
        direct_evidence_required: criterion.evidencia_directa_obligatoria ?? true,
        sort_order: index,
      };
    });
    const { error: criteriaError } = await supabase
      .from('criteria')
      .upsert(criteriaPayload, { onConflict: 'id' });
    if (criteriaError) throw criteriaError;
    const implicationPayload = graph.implications.map((edge) => ({
      module_id: moduleId,
      source_criterion_id: edge.sourceCriterionId,
      target_criterion_id: edge.targetCriterionId,
      level: edge.level,
      source: edge.source ?? null,
      justification: edge.justification,
    }));
    if (implicationPayload.length) {
      const { error } = await supabase.from('criterion_implications').upsert(implicationPayload, {
        onConflict: 'module_id,source_criterion_id,target_criterion_id',
      });
      if (error) throw error;
    }
    if (graph.rejections.length) {
      const { error } = await supabase.from('grading_graph_rejections').upsert(
        graph.rejections.map((item) => ({
          module_id: moduleId,
          payload: { elemento: item.element },
          reason: item.reason,
        })),
        { onConflict: 'module_id,payload' }
      );
      if (error) throw error;
    }
    return {
      criteria: graph.criteria.length,
      implications: graph.implications.length,
      rejections: graph.rejections.length,
    };
  },
};

export const activityTemplateService = {
  async importBank(moduleId: string, input: unknown): Promise<number> {
    const [criteria, implications] = await Promise.all([
      criterionService.getByModule(moduleId),
      criterionImplicationService.getByModule(moduleId),
    ]);
    const templates = parseTemplateBank(input, criteria, implications);
    if (!templates.length) return 0;
    const supabase = createClient();
    const { error } = await supabase.from('activity_templates').upsert(
      templates.map((template) => ({
        id: template.id,
        module_id: moduleId,
        criterion_id: template.criterionId,
        name: String(template.content?.titulo ?? template.id),
        roles: template.roles,
        rubric_items: template.rubricItems,
        content: template.content ?? {},
        validated: false,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    );
    if (error) throw error;
    return templates.length;
  },

  async setValidated(id: string, validated: boolean): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('activity_templates')
      .update({
        validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },
};

export const rubricItemService = {
  async getByModule(moduleId: string): Promise<RubricItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rubric_items')
      .select('*, activities!inner(module_id)')
      .eq('activities.module_id', moduleId)
      .order('sort_order');
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      activityId: row.activity_id,
      criterionId: row.criterion_id,
      description: row.description,
      weight: Number(row.item_weight),
      levels: row.levels || [],
      sortOrder: row.sort_order,
    }));
  },

  async upsert(item: Omit<RubricItem, 'id'> & { id?: string }): Promise<void> {
    const validation = validateRubricLevels(item.levels);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      activity_id: item.activityId,
      criterion_id: item.criterionId,
      description: item.description,
      item_weight: item.weight,
      levels: item.levels,
      sort_order: item.sortOrder,
      updated_at: new Date().toISOString(),
    };
    if (item.id) payload.id = item.id;
    const { error } = await supabase.from('rubric_items').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('rubric_items').delete().eq('id', id);
    if (error) throw error;
  },
};

export const rubricItemGradeService = {
  async getByModule(moduleId: string): Promise<RubricItemGrade[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('rubric_item_grades')
      .select('*, rubric_items!inner(activities!inner(module_id))')
      .eq('rubric_items.activities.module_id', moduleId);
    if (error) return [];
    return (data || []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      itemId: row.item_id,
      score: row.score === null ? null : Number(row.score),
      notApplicable: row.not_applicable,
      gradedAt: row.graded_at,
    }));
  },

  async upsert(
    studentId: string,
    itemId: string,
    score: number | null,
    notApplicable: boolean
  ): Promise<void> {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from('rubric_item_grades').upsert(
      {
        student_id: studentId,
        item_id: itemId,
        score: notApplicable ? null : score,
        not_applicable: notApplicable,
        graded_at: now,
        updated_at: now,
      },
      { onConflict: 'student_id,item_id' }
    );
    if (error) throw error;
  },
};

// ─── INCIDENTS ────────────────────────────────────────────────────────────────
export const incidentService = {
  async getAll(): Promise<Incident[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .order('incident_date', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        date: r.incident_date,
        type: r.incident_type,
        detail: r.detail,
      }));
    } catch (e: any) {
      console.error('incidentService.getAll:', e.message);
      throw e;
    }
  },

  async upsert(inc: Incident): Promise<Incident | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('incidents')
        .upsert(
          {
            id: inc.id,
            student_id: inc.studentId,
            student_name: inc.studentName,
            incident_date: inc.date,
            incident_type: inc.type,
            detail: inc.detail,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        studentId: data.student_id,
        studentName: data.student_name,
        date: data.incident_date,
        type: data.incident_type,
        detail: data.detail,
      };
    } catch (e: any) {
      console.error('incidentService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('incidentService.delete:', e.message);
      throw e;
    }
  },
};

// ─── SESSION LOGS ─────────────────────────────────────────────────────────────
export const sessionLogService = {
  async getByModule(moduleId: string): Promise<SessionLog[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('session_logs')
        .select('*')
        .eq('module_id', moduleId)
        .order('log_date', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        unitId: r.unit_id,
        date: r.log_date,
        development: r.development,
        homework: r.homework,
        notes: r.notes,
      }));
    } catch (e: any) {
      console.error('sessionLogService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(log: SessionLog): Promise<SessionLog | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('session_logs')
        .upsert(
          {
            id: log.id,
            module_id: log.moduleId,
            unit_id: log.unitId,
            log_date: log.date,
            development: log.development,
            homework: log.homework,
            notes: log.notes,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        unitId: data.unit_id,
        date: data.log_date,
        development: data.development,
        homework: data.homework,
        notes: data.notes,
      };
    } catch (e: any) {
      console.error('sessionLogService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('session_logs').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('sessionLogService.delete:', e.message);
      throw e;
    }
  },
};

// ─── TUTORING ACTIONS ─────────────────────────────────────────────────────────
export const tutoringService = {
  async getAll(): Promise<TutoringAction[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tutoring_actions')
        .select('*')
        .order('action_date', { ascending: false });
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        studentId: r.student_id,
        date: r.action_date,
        type: r.tutoring_type,
        content: r.content,
        followUp: r.follow_up,
      }));
    } catch (e: any) {
      console.error('tutoringService.getAll:', e.message);
      throw e;
    }
  },

  async upsert(action: TutoringAction): Promise<TutoringAction | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('tutoring_actions')
        .upsert(
          {
            id: action.id,
            student_id: action.studentId,
            action_date: action.date,
            tutoring_type: action.type,
            content: action.content,
            follow_up: action.followUp,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        studentId: data.student_id,
        date: data.action_date,
        type: data.tutoring_type,
        content: data.content,
        followUp: data.follow_up,
      };
    } catch (e: any) {
      console.error('tutoringService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('tutoring_actions').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('tutoringService.delete:', e.message);
      throw e;
    }
  },
};

// ─── CALENDAR EVENTS ──────────────────────────────────────────────────────────
export const calendarEventService = {
  async getByModule(moduleId: string): Promise<CalendarEvent[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('module_id', moduleId)
        .order('event_date');
      if (error) {
        if (isSchemaError(error)) throw error;
        return [];
      }
      return (data || []).map((r) => ({
        id: r.id,
        moduleId: r.module_id,
        date: r.event_date,
        title: r.title,
        type: r.event_type,
        notes: r.notes,
      }));
    } catch (e: any) {
      console.error('calendarEventService.getByModule:', e.message);
      throw e;
    }
  },

  async upsert(ev: CalendarEvent): Promise<CalendarEvent | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .upsert(
          {
            id: ev.id,
            module_id: ev.moduleId,
            event_date: ev.date,
            title: ev.title,
            event_type: ev.type,
            notes: ev.notes,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (error) {
        if (isSchemaError(error)) throw error;
        return null;
      }
      return {
        id: data.id,
        moduleId: data.module_id,
        date: data.event_date,
        title: data.title,
        type: data.event_type,
        notes: data.notes,
      };
    } catch (e: any) {
      console.error('calendarEventService.upsert:', e.message);
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) {
        if (isSchemaError(error)) throw error;
      }
    } catch (e: any) {
      console.error('calendarEventService.delete:', e.message);
      throw e;
    }
  },
};

const DEFAULT_CALENDAR_EVENT_TYPES: Omit<CalendarEventType, 'id' | 'moduleId'>[] = [
  { code: 'entrega', name: 'Entrega', color: '#2563eb', sortOrder: 10 },
  { code: 'examen', name: 'Examen', color: '#dc2626', sortOrder: 20 },
  { code: 'tutoría', name: 'Tutoría', color: '#0891b2', sortOrder: 30 },
  { code: 'festivo', name: 'Festivo oficial', color: '#e11d48', sortOrder: 40 },
  { code: 'reunión', name: 'Claustro / reunión', color: '#d97706', sortOrder: 50 },
  { code: 'otro', name: 'Actividad lectiva', color: '#64748b', sortOrder: 60 },
];

// ─── CALENDAR EVENT TYPES ────────────────────────────────────────────────────
export const calendarEventTypeService = {
  async getByModule(moduleId: string): Promise<CalendarEventType[]> {
    const supabase = createClient();
    const read = async () =>
      supabase
        .from('calendar_event_types')
        .select('*')
        .eq('module_id', moduleId)
        .order('sort_order');

    let { data, error } = await read();
    if (error) {
      if (isSchemaError(error)) throw error;
      return [];
    }
    if (!data?.length) {
      const defaults = DEFAULT_CALENDAR_EVENT_TYPES.map((type) => ({
        id: `${moduleId}-calendar-type-${type.code}`,
        module_id: moduleId,
        code: type.code,
        name: type.name,
        color: type.color,
        sort_order: type.sortOrder,
      }));
      const seeded = await supabase.from('calendar_event_types').upsert(defaults).select('*');
      if (seeded.error) throw seeded.error;
      data = seeded.data;
    }
    return (data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      code: row.code,
      name: row.name,
      color: row.color,
      sortOrder: row.sort_order,
    }));
  },

  async upsert(type: CalendarEventType): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('calendar_event_types').upsert({
      id: type.id,
      module_id: type.moduleId,
      code: type.code,
      name: type.name,
      color: type.color,
      sort_order: type.sortOrder,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  },

  async delete(type: CalendarEventType): Promise<void> {
    const supabase = createClient();
    const { error: eventError } = await supabase
      .from('calendar_events')
      .update({ event_type: 'otro' })
      .eq('module_id', type.moduleId)
      .eq('event_type', type.code);
    if (eventError) throw eventError;
    const { error } = await supabase.from('calendar_event_types').delete().eq('id', type.id);
    if (error) throw error;
  },
};

// ─── PERSISTED PHASE 1 CAPABILITIES ──────────────────────────────────────────
export const contentService = {
  async getByModule(moduleId: string): Promise<ContentItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contents')
      .select('*')
      .eq('module_id', moduleId)
      .order('sort_order');
    assertRequest(error, 'No se pudieron cargar los contenidos');
    return (data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      unitId: row.unit_id,
      title: row.title,
      type: row.content_type,
      description: row.description,
      sortOrder: row.sort_order,
    }));
  },

  async upsert(item: ContentItem): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('contents').upsert(
      {
        id: item.id,
        module_id: item.moduleId,
        unit_id: item.unitId,
        title: item.title,
        content_type: item.type,
        description: item.description,
        sort_order: item.sortOrder,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    assertRequest(error, 'No se pudo guardar el contenido');
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('contents').delete().eq('id', id);
    assertRequest(error, 'No se pudo eliminar el contenido');
  },
};

export const seatLayoutService = {
  async get(moduleId: string): Promise<SeatLayout> {
    const supabase = createClient();
    const [{ data: layout, error: layoutError }, { data: assignments, error: assignmentError }] =
      await Promise.all([
        supabase.from('seat_layouts').select('*').eq('module_id', moduleId).maybeSingle(),
        supabase.from('seat_assignments').select('seat_id,student_id').eq('module_id', moduleId),
      ]);
    assertRequest(layoutError, 'No se pudo cargar el plano del aula');
    assertRequest(assignmentError, 'No se pudieron cargar los puestos');
    return {
      moduleId,
      rows: layout?.rows ?? 3,
      columns: layout?.columns ?? 5,
      assignments: Object.fromEntries(
        (assignments || []).map((row) => [row.seat_id, row.student_id])
      ),
    };
  },

  async save(layout: SeatLayout): Promise<void> {
    const supabase = createClient();
    const { error: layoutError } = await supabase.from('seat_layouts').upsert(
      {
        module_id: layout.moduleId,
        rows: layout.rows,
        columns: layout.columns,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'module_id' }
    );
    assertRequest(layoutError, 'No se pudo guardar el plano del aula');

    const { error: deleteError } = await supabase
      .from('seat_assignments')
      .delete()
      .eq('module_id', layout.moduleId);
    assertRequest(deleteError, 'No se pudieron actualizar los puestos');
    const rows = Object.entries(layout.assignments).map(([seatId, studentId]) => ({
      module_id: layout.moduleId,
      student_id: studentId,
      seat_id: seatId,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) {
      const { error: insertError } = await supabase.from('seat_assignments').insert(rows);
      assertRequest(insertError, 'No se pudieron guardar los puestos');
    }
  },
};

export const classGroupService = {
  async getByModule(moduleId: string): Promise<ClassGroup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('class_groups')
      .select('*')
      .eq('module_id', moduleId)
      .order('name');
    assertRequest(error, 'No se pudieron cargar los grupos');
    return (data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      name: row.name,
      tutor: row.tutor,
      room: row.room,
    }));
  },
  async upsert(group: ClassGroup): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('class_groups').upsert(
      {
        id: group.id,
        module_id: group.moduleId,
        name: group.name,
        tutor: group.tutor,
        room: group.room,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    assertRequest(error, 'No se pudo guardar el grupo');
  },
  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('class_groups').delete().eq('id', id);
    assertRequest(error, 'No se pudo eliminar el grupo');
  },
};

export const gradingScaleService = {
  async getByModule(moduleId: string): Promise<GradingScale[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('grading_scales')
      .select('*')
      .eq('module_id', moduleId)
      .order('name');
    assertRequest(error, 'No se pudieron cargar las escalas');
    return (data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      name: row.name,
      passingGrade: Number(row.passing_grade),
      latePenalty: Number(row.late_penalty),
    }));
  },
  async upsert(scale: GradingScale): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('grading_scales').upsert(
      {
        id: scale.id,
        module_id: scale.moduleId,
        name: scale.name,
        passing_grade: scale.passingGrade,
        late_penalty: scale.latePenalty,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    assertRequest(error, 'No se pudo guardar la escala');
  },
  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('grading_scales').delete().eq('id', id);
    assertRequest(error, 'No se pudo eliminar la escala');
  },
};
