'use client';

import { createClient } from '../supabase/client';

export type ProjectCall = 'ordinaria' | 'extraordinaria';
export type ProjectStatus = 'pendiente' | 'entregado' | 'en_revision' | 'corregido';
export type RubricLevel = 'EX' | 'NO' | 'AD' | 'BA' | 'IN';

export interface ProjectRubricCriterion {
  id: string;
  description: string;
  weight: number;
  levels: Record<RubricLevel, string>;
}

export interface ProjectDelivery {
  id: string;
  moduleId: string;
  title: string;
  subtitle: string;
  learningOutcome: string;
  weight: number;
  type: string;
  startDate: string;
  endDate: string;
  rubric: ProjectRubricCriterion[];
  checklist: string[];
  sortOrder: number;
}

export interface ProjectCorrection {
  id: string;
  moduleId: string;
  deliveryId: string;
  studentId: string;
  call: ProjectCall;
  status: ProjectStatus;
  grade: number | null;
  feedback: string;
  correctionMode: 'manual' | 'ia';
  rubricScores: Record<string, RubricLevel>;
  criterionNotes: Record<string, string>;
  checklistState: Record<string, boolean>;
  submittedAt: string;
}

export interface ProjectObservation {
  id: string;
  moduleId: string;
  studentId: string;
  deliveryId: string | null;
  date: string;
  type: string;
  text: string;
}

function assertRequest(error: { message?: string } | null, operation: string) {
  if (error) throw new Error(`${operation}: ${error.message || 'error de base de datos'}`);
}

function mapDelivery(row: any): ProjectDelivery {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    subtitle: row.subtitle || '',
    learningOutcome: row.learning_outcome || '',
    weight: Number(row.weight || 0),
    type: row.delivery_type,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    rubric: Array.isArray(row.rubric) ? row.rubric : [],
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    sortOrder: row.sort_order || 0,
  };
}

function mapCorrection(row: any): ProjectCorrection {
  return {
    id: row.id,
    moduleId: row.module_id,
    deliveryId: row.delivery_id,
    studentId: row.student_id,
    call: row.call,
    status: row.status,
    grade: row.grade === null ? null : Number(row.grade),
    feedback: row.feedback || '',
    correctionMode: row.correction_mode,
    rubricScores: row.rubric_scores || {},
    criterionNotes: row.criterion_notes || {},
    checklistState: row.checklist_state || {},
    submittedAt: row.submitted_at || '',
  };
}

export const projectDeliveryService = {
  async getByModule(moduleId: string): Promise<ProjectDelivery[]> {
    const { data, error } = await createClient()
      .from('project_deliveries')
      .select('*')
      .eq('module_id', moduleId)
      .order('sort_order');
    assertRequest(error, 'No se pudieron cargar las entregas');
    return (data || []).map(mapDelivery);
  },

  async upsert(delivery: Omit<ProjectDelivery, 'id'> & { id?: string }): Promise<ProjectDelivery> {
    const payload = {
      ...(delivery.id ? { id: delivery.id } : {}),
      module_id: delivery.moduleId,
      title: delivery.title,
      subtitle: delivery.subtitle,
      learning_outcome: delivery.learningOutcome,
      weight: delivery.weight,
      delivery_type: delivery.type,
      start_date: delivery.startDate || null,
      end_date: delivery.endDate || null,
      rubric: delivery.rubric,
      checklist: delivery.checklist,
      sort_order: delivery.sortOrder,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await createClient()
      .from('project_deliveries')
      .upsert(payload)
      .select()
      .single();
    assertRequest(error, 'No se pudo guardar la entrega');
    return mapDelivery(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await createClient().from('project_deliveries').delete().eq('id', id);
    assertRequest(error, 'No se pudo eliminar la entrega');
  },
};

export const projectCorrectionService = {
  async getByModule(moduleId: string, call: ProjectCall): Promise<ProjectCorrection[]> {
    const { data, error } = await createClient()
      .from('project_corrections')
      .select('*')
      .eq('module_id', moduleId)
      .eq('call', call);
    assertRequest(error, 'No se pudieron cargar las correcciones');
    return (data || []).map(mapCorrection);
  },

  async upsert(
    correction: Omit<ProjectCorrection, 'id'> & { id?: string }
  ): Promise<ProjectCorrection> {
    const { data, error } = await createClient()
      .from('project_corrections')
      .upsert(
        {
          ...(correction.id ? { id: correction.id } : {}),
          module_id: correction.moduleId,
          delivery_id: correction.deliveryId,
          student_id: correction.studentId,
          call: correction.call,
          status: correction.status,
          grade: correction.grade,
          feedback: correction.feedback,
          correction_mode: correction.correctionMode,
          rubric_scores: correction.rubricScores,
          criterion_notes: correction.criterionNotes,
          checklist_state: correction.checklistState,
          submitted_at: correction.submittedAt || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'delivery_id,student_id,call' }
      )
      .select()
      .single();
    assertRequest(error, 'No se pudo guardar la corrección');
    return mapCorrection(data);
  },
};

export const projectObservationService = {
  async getByModule(moduleId: string): Promise<ProjectObservation[]> {
    const { data, error } = await createClient()
      .from('project_observations')
      .select('*')
      .eq('module_id', moduleId)
      .order('observation_date', { ascending: false });
    assertRequest(error, 'No se pudieron cargar las observaciones');
    return (data || []).map((row) => ({
      id: row.id,
      moduleId: row.module_id,
      studentId: row.student_id,
      deliveryId: row.delivery_id,
      date: row.observation_date,
      type: row.observation_type,
      text: row.text,
    }));
  },

  async create(observation: Omit<ProjectObservation, 'id'>): Promise<ProjectObservation> {
    const { data, error } = await createClient()
      .from('project_observations')
      .insert({
        module_id: observation.moduleId,
        student_id: observation.studentId,
        delivery_id: observation.deliveryId,
        observation_date: observation.date,
        observation_type: observation.type,
        text: observation.text,
      })
      .select()
      .single();
    assertRequest(error, 'No se pudo guardar la observación');
    return {
      id: data.id,
      moduleId: data.module_id,
      studentId: data.student_id,
      deliveryId: data.delivery_id,
      date: data.observation_date,
      type: data.observation_type,
      text: data.text,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await createClient().from('project_observations').delete().eq('id', id);
    assertRequest(error, 'No se pudo eliminar la observación');
  },
};

export function calculateProjectGrade(
  deliveries: ProjectDelivery[],
  corrections: ProjectCorrection[],
  studentId: string
): number | null {
  const graded = deliveries
    .map((delivery) => ({
      delivery,
      correction: corrections.find(
        (item) => item.deliveryId === delivery.id && item.studentId === studentId
      ),
    }))
    .filter((item) => item.correction?.grade !== null && item.correction?.grade !== undefined);
  if (!graded.length) return null;
  const totalWeight = graded.reduce((sum, item) => sum + item.delivery.weight, 0);
  if (!totalWeight) return null;
  return (
    graded.reduce((sum, item) => sum + Number(item.correction!.grade) * item.delivery.weight, 0) /
    totalWeight
  );
}
