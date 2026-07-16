'use client';

import { createClient } from '@/lib/supabase/client';

// ─── TYPES ────────────────────────────────────────────────────────────────────
export interface Module {
  id: string;
  name: string;
  code: string;
  cycle: string;
  course?: string;
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
  type: 'entrega' | 'examen' | 'tutoría' | 'festivo' | 'reunión' | 'otro';
  notes?: string;
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
    return /relation.*does not exist|column.*does not exist|function.*does not exist|syntax error/i.test(error.message);
  }
  return false;
}

// ─── MODULES ──────────────────────────────────────────────────────────────────
export const moduleService = {
  async getAll(): Promise<Module[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('modules').select('*').order('code');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, name: r.name, code: r.code, cycle: r.cycle, course: r.course,
        evaluationCount: r.evaluation_count, totalStudents: r.total_students,
      }));
    } catch (e: any) { console.error('moduleService.getAll:', e.message); throw e; }
  },

  async upsert(module: Module): Promise<Module | null> {
    const supabase = createClient();
    const { data, error } = await supabase.from('modules').upsert({
      id: module.id, name: module.name, code: module.code, cycle: module.cycle,
      course: module.course, evaluation_count: module.evaluationCount,
      total_students: module.totalStudents,
    }, { onConflict: 'id' }).select().single();
    if (error) { if (isSchemaError(error)) throw error; return null; }
    return {
      id: data.id, name: data.name, code: data.code, cycle: data.cycle,
      course: data.course, evaluationCount: data.evaluation_count,
      totalStudents: data.total_students,
    };
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) { if (isSchemaError(error)) throw error; }
  },
};

// ─── EVALUATIONS ──────────────────────────────────────────────────────────────
export const evaluationService = {
  async getByModule(moduleId: string): Promise<Evaluation[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('evaluations').select('*').eq('module_id', moduleId).order('start_date');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, name: r.name, evalType: r.eval_type,
        weight: r.weight, startDate: r.start_date, endDate: r.end_date,
      }));
    } catch (e: any) { console.error('evaluationService.getByModule:', e.message); throw e; }
  },
};

// ─── LEARNING OUTCOMES ────────────────────────────────────────────────────────
export const learningOutcomeService = {
  async getByModule(moduleId: string): Promise<LearningOutcome[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('learning_outcomes').select('*').eq('module_id', moduleId).order('sort_order');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, code: r.code, description: r.description,
        weight: r.weight, sortOrder: r.sort_order,
      }));
    } catch (e: any) { console.error('learningOutcomeService.getByModule:', e.message); throw e; }
  },

  async upsert(ra: Omit<LearningOutcome, 'sortOrder'> & { sortOrder?: number }): Promise<LearningOutcome | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('learning_outcomes').upsert({
        id: ra.id, module_id: ra.moduleId, code: ra.code, description: ra.description,
        weight: ra.weight, sort_order: ra.sortOrder ?? 0,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, code: data.code, description: data.description, weight: data.weight, sortOrder: data.sort_order };
    } catch (e: any) { console.error('learningOutcomeService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('learning_outcomes').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('learningOutcomeService.delete:', e.message); throw e; }
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
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, raId: r.ra_id, code: r.code, description: r.description,
        difficulty: r.difficulty, weight: r.weight, sortOrder: r.sort_order,
      }));
    } catch (e: any) { console.error('criterionService.getByModule:', e.message); throw e; }
  },

  async getByRA(raId: string): Promise<Criterion[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('criteria').select('*').eq('ra_id', raId).order('sort_order');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, raId: r.ra_id, code: r.code, description: r.description,
        difficulty: r.difficulty, weight: r.weight, sortOrder: r.sort_order,
      }));
    } catch (e: any) { console.error('criterionService.getByRA:', e.message); throw e; }
  },

  async upsert(ce: Omit<Criterion, 'sortOrder'> & { sortOrder?: number }): Promise<Criterion | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('criteria').upsert({
        id: ce.id, ra_id: ce.raId, code: ce.code, description: ce.description,
        difficulty: ce.difficulty, weight: ce.weight, sort_order: ce.sortOrder ?? 0,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, raId: data.ra_id, code: data.code, description: data.description, difficulty: data.difficulty, weight: data.weight, sortOrder: data.sort_order };
    } catch (e: any) { console.error('criterionService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('criteria').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('criterionService.delete:', e.message); throw e; }
  },
};

// ─── WORK UNITS ───────────────────────────────────────────────────────────────
export const workUnitService = {
  async getByModule(moduleId: string): Promise<WorkUnit[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('work_units').select('*').eq('module_id', moduleId).order('sort_order');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, evaluationId: r.evaluation_id, code: r.code,
        name: r.name, hours: r.hours, taughtPercentage: r.taught_percentage,
        status: r.unit_status, weight: r.weight, raIds: r.ra_ids || [], sortOrder: r.sort_order,
      }));
    } catch (e: any) { console.error('workUnitService.getByModule:', e.message); throw e; }
  },

  async upsert(ut: WorkUnit): Promise<WorkUnit | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('work_units').upsert({
        id: ut.id, module_id: ut.moduleId, evaluation_id: ut.evaluationId, code: ut.code,
        name: ut.name, hours: ut.hours, taught_percentage: ut.taughtPercentage,
        unit_status: ut.status, weight: ut.weight, ra_ids: ut.raIds, sort_order: ut.sortOrder,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, evaluationId: data.evaluation_id, code: data.code, name: data.name, hours: data.hours, taughtPercentage: data.taught_percentage, status: data.unit_status, weight: data.weight, raIds: data.ra_ids || [], sortOrder: data.sort_order };
    } catch (e: any) { console.error('workUnitService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('work_units').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('workUnitService.delete:', e.message); throw e; }
  },
};

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────
export const activityService = {
  async getByModule(moduleId: string): Promise<Activity[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('activities').select('*').eq('module_id', moduleId).order('due_date');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, unitId: r.unit_id, evaluationId: r.evaluation_id,
        name: r.name, type: r.activity_type, status: r.activity_status, weight: r.weight,
        dueDate: r.due_date, description: r.description, ceIds: r.ce_ids || [],
        correctionCount: r.correction_count, reviewedCount: r.reviewed_count,
      }));
    } catch (e: any) { console.error('activityService.getByModule:', e.message); throw e; }
  },

  async upsert(act: Activity): Promise<Activity | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('activities').upsert({
        id: act.id, module_id: act.moduleId, unit_id: act.unitId, evaluation_id: act.evaluationId,
        name: act.name, activity_type: act.type, activity_status: act.status, weight: act.weight,
        due_date: act.dueDate, description: act.description, ce_ids: act.ceIds,
        correction_count: act.correctionCount, reviewed_count: act.reviewedCount,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, unitId: data.unit_id, evaluationId: data.evaluation_id, name: data.name, type: data.activity_type, status: data.activity_status, weight: data.weight, dueDate: data.due_date, description: data.description, ceIds: data.ce_ids || [], correctionCount: data.correction_count, reviewedCount: data.reviewed_count };
    } catch (e: any) { console.error('activityService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('activityService.delete:', e.message); throw e; }
  },
};

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export const studentService = {
  async getByModule(moduleId: string): Promise<Student[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('students').select('*').eq('module_id', moduleId).order('name');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, nia: r.nia, name: r.name, avatar: r.avatar,
        email: r.email, githubUrl: r.github_url, moduleGrade: r.module_grade,
        eval1Grade: r.eval1_grade, eval2Grade: r.eval2_grade, riskLevel: r.risk_level,
        ceSuperado: r.ce_superado, ceParcial: r.ce_parcial, ceNoSuperado: r.ce_no_superado,
        ceNoEvaluado: r.ce_no_evaluado, incidents: r.incidents, absences: r.absences,
      }));
    } catch (e: any) { console.error('studentService.getByModule:', e.message); throw e; }
  },

  async upsert(student: Student): Promise<Student | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('students').upsert({
        id: student.id, module_id: student.moduleId, nia: student.nia, name: student.name,
        avatar: student.avatar, email: student.email, github_url: student.githubUrl,
        module_grade: student.moduleGrade, eval1_grade: student.eval1Grade, eval2_grade: student.eval2Grade,
        risk_level: student.riskLevel, ce_superado: student.ceSuperado, ce_parcial: student.ceParcial,
        ce_no_superado: student.ceNoSuperado, ce_no_evaluado: student.ceNoEvaluado,
        incidents: student.incidents, absences: student.absences,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, nia: data.nia, name: data.name, avatar: data.avatar, email: data.email, githubUrl: data.github_url, moduleGrade: data.module_grade, eval1Grade: data.eval1_grade, eval2Grade: data.eval2_grade, riskLevel: data.risk_level, ceSuperado: data.ce_superado, ceParcial: data.ce_parcial, ceNoSuperado: data.ce_no_superado, ceNoEvaluado: data.ce_no_evaluado, incidents: data.incidents, absences: data.absences };
    } catch (e: any) { console.error('studentService.upsert:', e.message); throw e; }
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
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, studentId: r.student_id, activityId: r.activity_id, grade: r.grade,
      }));
    } catch (e: any) { console.error('gradeService.getByModule:', e.message); throw e; }
  },

  async upsertGrade(studentId: string, activityId: string, grade: number | null): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('activity_grades').upsert(
        { student_id: studentId, activity_id: activityId, grade, updated_at: new Date().toISOString() },
        { onConflict: 'student_id,activity_id' }
      );
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('gradeService.upsertGrade:', e.message); throw e; }
  },
};

// ─── RA RELATIONSHIPS ─────────────────────────────────────────────────────────
export const raRelationshipService = {
  async getByModule(moduleId: string): Promise<RARelationship[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('ra_relationships').select('*').eq('module_id', moduleId);
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, raSourceId: r.ra_source_id, raTargetId: r.ra_target_id,
        percentage: r.percentage, description: r.description,
      }));
    } catch (e: any) { console.error('raRelationshipService.getByModule:', e.message); throw e; }
  },

  async upsert(rel: RARelationship): Promise<RARelationship | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('ra_relationships').upsert({
        id: rel.id, module_id: rel.moduleId, ra_source_id: rel.raSourceId,
        ra_target_id: rel.raTargetId, percentage: rel.percentage, description: rel.description,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, raSourceId: data.ra_source_id, raTargetId: data.ra_target_id, percentage: data.percentage, description: data.description };
    } catch (e: any) { console.error('raRelationshipService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('ra_relationships').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('raRelationshipService.delete:', e.message); throw e; }
  },
};

// ─── INCIDENTS ────────────────────────────────────────────────────────────────
export const incidentService = {
  async getAll(): Promise<Incident[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('incidents').select('*').order('incident_date', { ascending: false });
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, studentId: r.student_id, studentName: r.student_name,
        date: r.incident_date, type: r.incident_type, detail: r.detail,
      }));
    } catch (e: any) { console.error('incidentService.getAll:', e.message); throw e; }
  },

  async upsert(inc: Incident): Promise<Incident | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('incidents').upsert({
        id: inc.id, student_id: inc.studentId, student_name: inc.studentName,
        incident_date: inc.date, incident_type: inc.type, detail: inc.detail,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, studentId: data.student_id, studentName: data.student_name, date: data.incident_date, type: data.incident_type, detail: data.detail };
    } catch (e: any) { console.error('incidentService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('incidents').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('incidentService.delete:', e.message); throw e; }
  },
};

// ─── SESSION LOGS ─────────────────────────────────────────────────────────────
export const sessionLogService = {
  async getByModule(moduleId: string): Promise<SessionLog[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('session_logs').select('*').eq('module_id', moduleId).order('log_date', { ascending: false });
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, unitId: r.unit_id, date: r.log_date,
        development: r.development, homework: r.homework, notes: r.notes,
      }));
    } catch (e: any) { console.error('sessionLogService.getByModule:', e.message); throw e; }
  },

  async upsert(log: SessionLog): Promise<SessionLog | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('session_logs').upsert({
        id: log.id, module_id: log.moduleId, unit_id: log.unitId, log_date: log.date,
        development: log.development, homework: log.homework, notes: log.notes,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, unitId: data.unit_id, date: data.log_date, development: data.development, homework: data.homework, notes: data.notes };
    } catch (e: any) { console.error('sessionLogService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('session_logs').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('sessionLogService.delete:', e.message); throw e; }
  },
};

// ─── TUTORING ACTIONS ─────────────────────────────────────────────────────────
export const tutoringService = {
  async getAll(): Promise<TutoringAction[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('tutoring_actions').select('*').order('action_date', { ascending: false });
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, studentId: r.student_id, date: r.action_date,
        type: r.tutoring_type, content: r.content, followUp: r.follow_up,
      }));
    } catch (e: any) { console.error('tutoringService.getAll:', e.message); throw e; }
  },

  async upsert(action: TutoringAction): Promise<TutoringAction | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('tutoring_actions').upsert({
        id: action.id, student_id: action.studentId, action_date: action.date,
        tutoring_type: action.type, content: action.content, follow_up: action.followUp,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, studentId: data.student_id, date: data.action_date, type: data.tutoring_type, content: data.content, followUp: data.follow_up };
    } catch (e: any) { console.error('tutoringService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('tutoring_actions').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('tutoringService.delete:', e.message); throw e; }
  },
};

// ─── CALENDAR EVENTS ──────────────────────────────────────────────────────────
export const calendarEventService = {
  async getByModule(moduleId: string): Promise<CalendarEvent[]> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('calendar_events').select('*').eq('module_id', moduleId).order('event_date');
      if (error) { if (isSchemaError(error)) throw error; return []; }
      return (data || []).map(r => ({
        id: r.id, moduleId: r.module_id, date: r.event_date, title: r.title,
        type: r.event_type, notes: r.notes,
      }));
    } catch (e: any) { console.error('calendarEventService.getByModule:', e.message); throw e; }
  },

  async upsert(ev: CalendarEvent): Promise<CalendarEvent | null> {
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('calendar_events').upsert({
        id: ev.id, module_id: ev.moduleId, event_date: ev.date, title: ev.title,
        event_type: ev.type, notes: ev.notes,
      }, { onConflict: 'id' }).select().single();
      if (error) { if (isSchemaError(error)) throw error; return null; }
      return { id: data.id, moduleId: data.module_id, date: data.event_date, title: data.title, type: data.event_type, notes: data.notes };
    } catch (e: any) { console.error('calendarEventService.upsert:', e.message); throw e; }
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id);
      if (error) { if (isSchemaError(error)) throw error; }
    } catch (e: any) { console.error('calendarEventService.delete:', e.message); throw e; }
  },
};
