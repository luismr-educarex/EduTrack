'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  Bot,
  Check,
  CheckSquare,
  ClipboardList,
  Download,
  Edit3,
  FileText,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { getChatCompletion } from '@/lib/ai/chatCompletion';
import { studentService, type Student } from '@/lib/services/edutrackService';
import {
  calculateProjectGrade,
  projectCorrectionService,
  projectDeliveryService,
  projectObservationService,
  type ProjectCall,
  type ProjectCorrection,
  type ProjectDelivery,
  type ProjectObservation,
  type ProjectRubricCriterion,
  type ProjectStatus,
  type RubricLevel,
} from '@/lib/services/projectService';

type View =
  | 'overview'
  | 'deliveries'
  | 'students'
  | 'correction'
  | 'checklist'
  | 'statistics'
  | 'settings';

const LEVELS: { value: RubricLevel; label: string; score: number }[] = [
  { value: 'EX', label: 'Excelente', score: 10 },
  { value: 'NO', label: 'Notable', score: 8 },
  { value: 'AD', label: 'Adecuado', score: 6 },
  { value: 'BA', label: 'Básico', score: 5 },
  { value: 'IN', label: 'Insuficiente', score: 3 },
];

const EMPTY_DELIVERY = {
  title: '',
  subtitle: '',
  learningOutcome: 'RA1',
  weight: 20,
  type: 'Documentación',
  startDate: '',
  endDate: '',
  rubricText: '',
  checklistText: '',
};

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted';

function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function statusLabel(status: ProjectStatus) {
  return {
    pendiente: 'Pendiente',
    entregado: 'Entregado',
    en_revision: 'En revisión',
    corregido: 'Corregido',
  }[status];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function blankCorrection(
  moduleId: string,
  deliveryId: string,
  studentId: string,
  call: ProjectCall
): Omit<ProjectCorrection, 'id'> {
  return {
    moduleId,
    deliveryId,
    studentId,
    call,
    status: 'pendiente',
    grade: null,
    feedback: '',
    correctionMode: 'manual',
    rubricScores: {},
    criterionNotes: {},
    checklistState: {},
    submittedAt: '',
  };
}

export default function ProjectWorkspace() {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get('view') as View | null;
  const view: View = requestedView || 'overview';
  const { activeModule, activeModuleId, students, refreshStudents } = useEduTrack();
  const [call, setCall] = useState<ProjectCall>('ordinaria');
  const [deliveries, setDeliveries] = useState<ProjectDelivery[]>([]);
  const [corrections, setCorrections] = useState<ProjectCorrection[]>([]);
  const [observations, setObservations] = useState<ProjectObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [deliveryForm, setDeliveryForm] = useState(EMPTY_DELIVERY);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [studentForm, setStudentForm] = useState({ nia: '', name: '', email: '' });
  const [observationForm, setObservationForm] = useState({
    type: 'mejora',
    text: '',
    deliveryId: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loadedDeliveries, loadedCorrections, loadedObservations] = await Promise.all([
        projectDeliveryService.getByModule(activeModuleId),
        projectCorrectionService.getByModule(activeModuleId, call),
        projectObservationService.getByModule(activeModuleId),
      ]);
      setDeliveries(loadedDeliveries);
      setCorrections(loadedCorrections);
      setObservations(loadedObservations);
      setSelectedDeliveryId((current) =>
        loadedDeliveries.some((item) => item.id === current)
          ? current
          : loadedDeliveries[0]?.id || ''
      );
      setSelectedStudentId((current) =>
        students.some((item) => item.id === current) ? current : students[0]?.id || ''
      );
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo cargar el proyecto');
    } finally {
      setLoading(false);
    }
  }, [activeModuleId, call, students]);

  useEffect(() => {
    if (activeModule?.deliveryMode === 'intermodular') loadData();
  }, [activeModule?.deliveryMode, loadData]);

  const selectedDelivery = deliveries.find((item) => item.id === selectedDeliveryId);
  const selectedStudent = students.find((item) => item.id === selectedStudentId);
  const selectedCorrection = corrections.find(
    (item) => item.deliveryId === selectedDeliveryId && item.studentId === selectedStudentId
  );
  const [correctionDraft, setCorrectionDraft] = useState<Omit<ProjectCorrection, 'id'> | null>(
    null
  );

  useEffect(() => {
    if (!selectedDeliveryId || !selectedStudentId) {
      setCorrectionDraft(null);
      return;
    }
    setCorrectionDraft(
      selectedCorrection ||
        blankCorrection(activeModuleId, selectedDeliveryId, selectedStudentId, call)
    );
  }, [activeModuleId, call, selectedCorrection, selectedDeliveryId, selectedStudentId]);

  const completed = corrections.filter((item) => item.status === 'corregido').length;
  const expected = deliveries.length * students.length;
  const average =
    corrections.filter((item) => item.grade !== null).reduce((sum, item) => sum + item.grade!, 0) /
    Math.max(1, corrections.filter((item) => item.grade !== null).length);

  const saveCorrection = async (draft = correctionDraft) => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await projectCorrectionService.upsert({
        ...draft,
        id: selectedCorrection?.id,
      });
      setCorrections((current) => [
        ...current.filter(
          (item) =>
            !(
              item.deliveryId === saved.deliveryId &&
              item.studentId === saved.studentId &&
              item.call === saved.call
            )
        ),
        saved,
      ]);
      toast.success('Corrección guardada');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const rubricGrade = (scores: Record<string, RubricLevel>) => {
    if (!selectedDelivery?.rubric.length) return null;
    const assessed = selectedDelivery.rubric.filter((criterion) => scores[criterion.id]);
    const totalWeight = assessed.reduce((sum, criterion) => sum + criterion.weight, 0);
    if (!totalWeight) return null;
    return (
      assessed.reduce((sum, criterion) => {
        const score = LEVELS.find((level) => level.value === scores[criterion.id])?.score || 0;
        return sum + score * criterion.weight;
      }, 0) / totalWeight
    );
  };

  const setRubricLevel = (criterionId: string, level: RubricLevel) => {
    setCorrectionDraft((current) => {
      if (!current) return current;
      const rubricScores = { ...current.rubricScores, [criterionId]: level };
      return { ...current, rubricScores, grade: rubricGrade(rubricScores) };
    });
  };

  const saveDelivery = async () => {
    if (!deliveryForm.title.trim()) return toast.error('Indica el título de la entrega');
    const rubric: ProjectRubricCriterion[] = deliveryForm.rubricText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [description, rawWeight] = line.split('|').map((part) => part.trim());
        return {
          id: editingDeliveryId
            ? deliveries.find((delivery) => delivery.id === editingDeliveryId)?.rubric[index]?.id ||
              crypto.randomUUID()
            : crypto.randomUUID(),
          description,
          weight: Number(rawWeight) || 0,
          levels: { EX: '', NO: '', AD: '', BA: '', IN: '' },
        };
      });
    setSaving(true);
    try {
      await projectDeliveryService.upsert({
        id: editingDeliveryId || undefined,
        moduleId: activeModuleId,
        title: deliveryForm.title.trim(),
        subtitle: deliveryForm.subtitle.trim(),
        learningOutcome: deliveryForm.learningOutcome.trim(),
        weight: Number(deliveryForm.weight),
        type: deliveryForm.type.trim(),
        startDate: deliveryForm.startDate,
        endDate: deliveryForm.endDate,
        rubric,
        checklist: deliveryForm.checklistText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        sortOrder: editingDeliveryId
          ? deliveries.find((item) => item.id === editingDeliveryId)?.sortOrder || 0
          : deliveries.length,
      });
      setDeliveryForm(EMPTY_DELIVERY);
      setEditingDeliveryId(null);
      await loadData();
      toast.success('Entrega guardada');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo guardar la entrega');
    } finally {
      setSaving(false);
    }
  };

  const editDelivery = (delivery: ProjectDelivery) => {
    setEditingDeliveryId(delivery.id);
    setDeliveryForm({
      title: delivery.title,
      subtitle: delivery.subtitle,
      learningOutcome: delivery.learningOutcome,
      weight: delivery.weight,
      type: delivery.type,
      startDate: delivery.startDate,
      endDate: delivery.endDate,
      rubricText: delivery.rubric
        .map((criterion) => `${criterion.description} | ${criterion.weight}`)
        .join('\n'),
      checklistText: delivery.checklist.join('\n'),
    });
  };

  const deleteDelivery = async (delivery: ProjectDelivery) => {
    if (!confirm(`¿Eliminar "${delivery.title}" y todas sus correcciones?`)) return;
    await projectDeliveryService.delete(delivery.id);
    await loadData();
    toast.success('Entrega eliminada');
  };

  const addStudent = async () => {
    if (!studentForm.name.trim()) return toast.error('Indica el nombre del alumno');
    const name = studentForm.name.trim();
    const student: Student = {
      id: `student-${crypto.randomUUID()}`,
      moduleId: activeModuleId,
      nia: studentForm.nia.trim() || crypto.randomUUID().slice(0, 8),
      name,
      avatar: initials(name),
      email:
        studentForm.email.trim() ||
        `${name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '.')}@alumnos.edu`,
      moduleGrade: null,
      eval1Grade: null,
      eval2Grade: null,
      riskLevel: 'none',
      ceSuperado: 0,
      ceParcial: 0,
      ceNoSuperado: 0,
      ceNoEvaluado: 0,
      incidents: 0,
      absences: 0,
    };
    await studentService.upsert(student);
    await refreshStudents();
    setStudentForm({ nia: '', name: '', email: '' });
    toast.success('Alumno añadido');
  };

  const exportGrades = () => {
    const header = ['NIA', 'Alumno', ...deliveries.map((item) => item.title), 'Nota módulo'];
    const rows = students.map((student) => [
      student.nia,
      student.name,
      ...deliveries.map(
        (delivery) =>
          corrections.find(
            (item) => item.studentId === student.id && item.deliveryId === delivery.id
          )?.grade ?? ''
      ),
      calculateProjectGrade(deliveries, corrections, student.id)?.toFixed(2) ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `${activeModule?.code || 'proyecto'}-${call}-notas.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const generateFeedback = async () => {
    if (!selectedDelivery || !selectedStudent || !correctionDraft) return;
    setAiLoading(true);
    try {
      const response: any = await getChatCompletion(
        'OPEN_AI',
        'gpt-4o-mini',
        [
          {
            role: 'system',
            content:
              'Eres docente de Formación Profesional. Redacta feedback breve, concreto, constructivo y en español.',
          },
          {
            role: 'user',
            content: `Alumno: ${selectedStudent.name}. Entrega: ${selectedDelivery.title}. Nota: ${correctionDraft.grade ?? 'sin nota'}. Criterios: ${selectedDelivery.rubric.map((item) => `${item.description}: ${correctionDraft.rubricScores[item.id] || 'sin evaluar'}`).join('; ')}.`,
          },
        ],
        { temperature: 0.3, max_tokens: 350 }
      );
      const feedback =
        response?.choices?.[0]?.message?.content || response?.content?.[0]?.text || response?.text;
      if (!feedback) throw new Error('La IA no devolvió texto');
      setCorrectionDraft((current) =>
        current ? { ...current, feedback, correctionMode: 'ia' } : current
      );
      toast.success('Feedback generado; revísalo antes de guardar');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'No se pudo generar el feedback');
    } finally {
      setAiLoading(false);
    }
  };

  const addObservation = async () => {
    if (!selectedStudentId || !observationForm.text.trim()) {
      return toast.error('Selecciona alumno y escribe la observación');
    }
    const created = await projectObservationService.create({
      moduleId: activeModuleId,
      studentId: selectedStudentId,
      deliveryId: observationForm.deliveryId || null,
      date: new Date().toISOString().slice(0, 10),
      type: observationForm.type,
      text: observationForm.text.trim(),
    });
    setObservations((current) => [created, ...current]);
    setObservationForm({ type: 'mejora', text: '', deliveryId: '' });
    toast.success('Observación guardada');
  };

  if (activeModule?.deliveryMode !== 'intermodular') {
    return (
      <div className="p-8">
        <Panel title="Este módulo no es un proyecto intermodular">
          <p className="text-sm text-muted-foreground">
            Cambia el tipo del módulo en Gestión académica para activar EduProyectosCheck.
          </p>
          <Link href="/course-management" className={`${primaryButton} mt-4`}>
            <Settings size={16} /> Configurar módulo
          </Link>
        </Panel>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" /> Cargando proyecto…
      </div>
    );
  }

  const selectors = (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-xs font-medium">
        Entrega
        <select
          className={`${inputClass} mt-1`}
          value={selectedDeliveryId}
          onChange={(event) => setSelectedDeliveryId(event.target.value)}
        >
          {deliveries.map((delivery) => (
            <option key={delivery.id} value={delivery.id}>
              E{delivery.sortOrder + 1} · {delivery.title}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium">
        Alumno
        <select
          className={`${inputClass} mt-1`}
          value={selectedStudentId}
          onChange={(event) => setSelectedStudentId(event.target.value)}
        >
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-5 md:p-7">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            EduProyectosCheck
          </p>
          <h1 className="mt-1 text-2xl font-bold">{activeModule?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Proyecto intermodular · {activeModule?.cycle} · {activeModule?.course}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-1">
            {(['ordinaria', 'extraordinaria'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setCall(item)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  call === item ? 'bg-card shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {item === 'ordinaria' ? 'ORD' : 'EXT'}
              </button>
            ))}
          </div>
          <button className={secondaryButton} onClick={exportGrades}>
            <Download size={15} /> Exportar
          </button>
        </div>
      </header>

      {view === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Entregas', deliveries.length, <ClipboardList key="d" size={20} />],
              ['Alumnos', students.length, <Users key="s" size={20} />],
              ['Correcciones', `${completed}/${expected}`, <CheckSquare key="c" size={20} />],
              [
                'Nota media',
                Number.isFinite(average) ? average.toFixed(2) : '—',
                <BarChart3 key="a" size={20} />,
              ],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
                  {icon}
                </div>
                <p className="mt-3 font-mono text-3xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <Panel
            title="Progreso de las entregas"
            description="Estado de corrección de la convocatoria seleccionada."
          >
            <div className="space-y-4">
              {deliveries.map((delivery, index) => {
                const corrected = corrections.filter(
                  (item) => item.deliveryId === delivery.id && item.status === 'corregido'
                ).length;
                const percentage = students.length ? (corrected / students.length) * 100 : 0;
                return (
                  <div key={delivery.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">
                        E{index + 1} · {delivery.title}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {corrected}/{students.length} · {delivery.weight}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!deliveries.length && (
                <p className="text-sm text-muted-foreground">Crea la primera entrega.</p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {view === 'deliveries' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Panel
            title="Entregas del proyecto"
            description="Ponderación, calendario, rúbrica y lista de comprobación."
          >
            <div className="space-y-3">
              {deliveries.map((delivery, index) => (
                <div
                  key={delivery.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-mono font-bold text-primary">
                    E{index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{delivery.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {delivery.learningOutcome} · {delivery.weight}% · {delivery.type} ·{' '}
                      {delivery.endDate || 'Sin fecha'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {delivery.rubric.length} criterios · {delivery.checklist.length}{' '}
                      comprobaciones
                    </p>
                  </div>
                  <button className={secondaryButton} onClick={() => editDelivery(delivery)}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    className="rounded-lg p-2 text-danger hover:bg-danger-bg"
                    onClick={() => deleteDelivery(delivery)}
                    aria-label={`Eliminar ${delivery.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {!deliveries.length && (
                <p className="text-sm text-muted-foreground">No hay entregas configuradas.</p>
              )}
            </div>
          </Panel>
          <Panel title={editingDeliveryId ? 'Editar entrega' : 'Nueva entrega'}>
            <div className="space-y-3">
              <input
                className={inputClass}
                placeholder="Título"
                value={deliveryForm.title}
                onChange={(event) =>
                  setDeliveryForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              <input
                className={inputClass}
                placeholder="Subtítulo"
                value={deliveryForm.subtitle}
                onChange={(event) =>
                  setDeliveryForm((current) => ({ ...current, subtitle: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputClass}
                  placeholder="RA"
                  value={deliveryForm.learningOutcome}
                  onChange={(event) =>
                    setDeliveryForm((current) => ({
                      ...current,
                      learningOutcome: event.target.value,
                    }))
                  }
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={inputClass}
                  placeholder="Ponderación"
                  value={deliveryForm.weight}
                  onChange={(event) =>
                    setDeliveryForm((current) => ({
                      ...current,
                      weight: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <input
                className={inputClass}
                placeholder="Tipo"
                value={deliveryForm.type}
                onChange={(event) =>
                  setDeliveryForm((current) => ({ ...current, type: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className={inputClass}
                  value={deliveryForm.startDate}
                  onChange={(event) =>
                    setDeliveryForm((current) => ({
                      ...current,
                      startDate: event.target.value,
                    }))
                  }
                />
                <input
                  type="date"
                  className={inputClass}
                  value={deliveryForm.endDate}
                  onChange={(event) =>
                    setDeliveryForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </div>
              <label className="block text-xs font-medium">
                Rúbrica
                <textarea
                  rows={5}
                  className={`${inputClass} mt-1`}
                  placeholder={'Un criterio por línea: Descripción | Peso\nCalidad técnica | 40'}
                  value={deliveryForm.rubricText}
                  onChange={(event) =>
                    setDeliveryForm((current) => ({
                      ...current,
                      rubricText: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-xs font-medium">
                Checklist
                <textarea
                  rows={4}
                  className={`${inputClass} mt-1`}
                  placeholder="Una comprobación por línea"
                  value={deliveryForm.checklistText}
                  onChange={(event) =>
                    setDeliveryForm((current) => ({
                      ...current,
                      checklistText: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="flex gap-2">
                <button className={primaryButton} disabled={saving} onClick={saveDelivery}>
                  <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
                </button>
                {editingDeliveryId && (
                  <button
                    className={secondaryButton}
                    onClick={() => {
                      setEditingDeliveryId(null);
                      setDeliveryForm(EMPTY_DELIVERY);
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {view === 'students' && (
        <div className="space-y-5">
          <Panel
            title="Añadir alumno"
            description="El alumnado queda matriculado en el módulo activo."
          >
            <div className="grid gap-3 md:grid-cols-4">
              <input
                className={inputClass}
                placeholder="NIA"
                value={studentForm.nia}
                onChange={(event) =>
                  setStudentForm((current) => ({ ...current, nia: event.target.value }))
                }
              />
              <input
                className={inputClass}
                placeholder="Nombre completo"
                value={studentForm.name}
                onChange={(event) =>
                  setStudentForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <input
                className={inputClass}
                placeholder="Correo"
                value={studentForm.email}
                onChange={(event) =>
                  setStudentForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <button className={primaryButton} onClick={addStudent}>
                <Plus size={15} /> Añadir
              </button>
            </div>
          </Panel>
          <Panel
            title={`${students.length} alumnos`}
            description="Seguimiento global del proyecto."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-2">Alumno</th>
                    {deliveries.map((delivery, index) => (
                      <th key={delivery.id} className="p-2 text-center">
                        E{index + 1}
                      </th>
                    ))}
                    <th className="p-2 text-right">Nota módulo</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="p-2">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </td>
                      {deliveries.map((delivery) => {
                        const correction = corrections.find(
                          (item) => item.studentId === student.id && item.deliveryId === delivery.id
                        );
                        return (
                          <td key={delivery.id} className="p-2 text-center font-mono">
                            {correction?.grade?.toFixed(1) ?? '—'}
                          </td>
                        );
                      })}
                      <td className="p-2 text-right font-mono font-bold">
                        {calculateProjectGrade(deliveries, corrections, student.id)?.toFixed(2) ??
                          '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {view === 'correction' && (
        <div className="space-y-5">
          <Panel title="Selección">{selectors}</Panel>
          {!selectedDelivery || !selectedStudent || !correctionDraft ? (
            <Panel title="Sin datos">
              <p className="text-sm text-muted-foreground">
                Crea una entrega y añade alumnado para comenzar a corregir.
              </p>
            </Panel>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <Panel
                title={`Rúbrica · ${selectedDelivery.title}`}
                description={`${selectedStudent.name} · Convocatoria ${call}`}
              >
                <div className="space-y-4">
                  {selectedDelivery.rubric.map((criterion) => (
                    <div key={criterion.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex justify-between gap-3">
                        <p className="text-sm font-semibold">{criterion.description}</p>
                        <span className="font-mono text-xs text-muted-foreground">
                          {criterion.weight}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {LEVELS.map((level) => (
                          <button
                            key={level.value}
                            onClick={() => setRubricLevel(criterion.id, level.value)}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                              correctionDraft.rubricScores[criterion.id] === level.value
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'bg-card hover:bg-muted'
                            }`}
                          >
                            {level.value} · {level.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        rows={2}
                        className={`${inputClass} mt-3`}
                        placeholder="Observación del criterio"
                        value={correctionDraft.criterionNotes[criterion.id] || ''}
                        onChange={(event) =>
                          setCorrectionDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  criterionNotes: {
                                    ...current.criterionNotes,
                                    [criterion.id]: event.target.value,
                                  },
                                }
                              : current
                          )
                        }
                      />
                    </div>
                  ))}
                  {!selectedDelivery.rubric.length && (
                    <p className="text-sm text-muted-foreground">
                      Esta entrega no tiene criterios de rúbrica.
                    </p>
                  )}
                </div>
              </Panel>
              <Panel title="Resultado y feedback">
                <div className="space-y-3">
                  <label className="block text-xs font-medium">
                    Estado
                    <select
                      className={`${inputClass} mt-1`}
                      value={correctionDraft.status}
                      onChange={(event) =>
                        setCorrectionDraft((current) =>
                          current
                            ? { ...current, status: event.target.value as ProjectStatus }
                            : current
                        )
                      }
                    >
                      {(['pendiente', 'entregado', 'en_revision', 'corregido'] as const).map(
                        (status) => (
                          <option key={status} value={status}>
                            {statusLabel(status)}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                  <label className="block text-xs font-medium">
                    Nota
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      className={`${inputClass} mt-1 font-mono text-lg font-bold`}
                      value={correctionDraft.grade ?? ''}
                      onChange={(event) =>
                        setCorrectionDraft((current) =>
                          current
                            ? {
                                ...current,
                                grade:
                                  event.target.value === '' ? null : Number(event.target.value),
                              }
                            : current
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs font-medium">
                    Feedback
                    <textarea
                      rows={10}
                      className={`${inputClass} mt-1`}
                      value={correctionDraft.feedback}
                      onChange={(event) =>
                        setCorrectionDraft((current) =>
                          current ? { ...current, feedback: event.target.value } : current
                        )
                      }
                    />
                  </label>
                  <button
                    className={secondaryButton}
                    disabled={aiLoading}
                    onClick={generateFeedback}
                  >
                    {aiLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Sparkles size={15} />
                    )}
                    Generar feedback con IA
                  </button>
                  <button
                    className={`${primaryButton} w-full`}
                    disabled={saving}
                    onClick={() =>
                      saveCorrection({
                        ...correctionDraft,
                        status:
                          correctionDraft.status === 'pendiente'
                            ? 'corregido'
                            : correctionDraft.status,
                      })
                    }
                  >
                    <Save size={16} /> Guardar corrección
                  </button>
                </div>
              </Panel>
            </div>
          )}
        </div>
      )}

      {view === 'checklist' && (
        <div className="space-y-5">
          <Panel title="Selección">{selectors}</Panel>
          <Panel
            title={`Checklist · ${selectedDelivery?.title || 'Sin entrega'}`}
            description={selectedStudent?.name}
          >
            {!correctionDraft || !selectedDelivery ? (
              <p className="text-sm text-muted-foreground">Selecciona entrega y alumno.</p>
            ) : (
              <div className="space-y-3">
                {selectedDelivery.checklist.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary"
                      checked={Boolean(correctionDraft.checklistState[item])}
                      onChange={(event) =>
                        setCorrectionDraft((current) =>
                          current
                            ? {
                                ...current,
                                checklistState: {
                                  ...current.checklistState,
                                  [item]: event.target.checked,
                                },
                              }
                            : current
                        )
                      }
                    />
                    <span className="text-sm">{item}</span>
                  </label>
                ))}
                {!selectedDelivery.checklist.length && (
                  <p className="text-sm text-muted-foreground">
                    La entrega no tiene checklist configurado.
                  </p>
                )}
                <button
                  className={primaryButton}
                  disabled={saving}
                  onClick={() => saveCorrection()}
                >
                  <Save size={15} /> Guardar checklist
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}

      {view === 'statistics' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Distribución de estados">
            <div className="space-y-3">
              {(['pendiente', 'entregado', 'en_revision', 'corregido'] as const).map((status) => {
                const count = corrections.filter((item) => item.status === status).length;
                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{statusLabel(status)}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${expected ? (count / expected) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Resultados por entrega">
            <div className="space-y-3">
              {deliveries.map((delivery, index) => {
                const grades = corrections
                  .filter((item) => item.deliveryId === delivery.id && item.grade !== null)
                  .map((item) => item.grade!);
                const deliveryAverage =
                  grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
                return (
                  <div key={delivery.id} className="flex items-center rounded-lg border p-3">
                    <span className="flex-1 text-sm font-medium">
                      E{index + 1} · {delivery.title}
                    </span>
                    <span className="font-mono font-bold">
                      {Number.isFinite(deliveryAverage) ? deliveryAverage.toFixed(2) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {view === 'settings' && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel
            title="Configuración académica"
            description="Tipo de módulo, grupos, matrículas y escalas."
          >
            <Link href="/course-management" className={primaryButton}>
              <Settings size={15} /> Abrir gestión académica
            </Link>
            <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
              <p className="font-semibold">Ponderación actual</p>
              <p className="mt-1 text-muted-foreground">
                Las entregas suman {deliveries.reduce((sum, item) => sum + item.weight, 0)}%.
              </p>
              {deliveries.reduce((sum, item) => sum + item.weight, 0) !== 100 && (
                <p className="mt-2 flex items-center gap-2 text-warning">
                  <AlertCircle size={15} /> Ajusta las ponderaciones hasta alcanzar el 100%.
                </p>
              )}
            </div>
          </Panel>
          <Panel
            title="Observaciones del alumno"
            description="Registro de seguimiento vinculado al proyecto."
          >
            {selectors}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <select
                className={inputClass}
                value={observationForm.type}
                onChange={(event) =>
                  setObservationForm((current) => ({ ...current, type: event.target.value }))
                }
              >
                <option value="mejora">Mejora</option>
                <option value="incidencia">Incidencia</option>
                <option value="logro">Logro</option>
                <option value="seguimiento">Seguimiento</option>
              </select>
              <select
                className={inputClass}
                value={observationForm.deliveryId}
                onChange={(event) =>
                  setObservationForm((current) => ({
                    ...current,
                    deliveryId: event.target.value,
                  }))
                }
              >
                <option value="">General</option>
                {deliveries.map((delivery) => (
                  <option key={delivery.id} value={delivery.id}>
                    {delivery.title}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              rows={3}
              className={`${inputClass} mt-3`}
              placeholder="Nueva observación"
              value={observationForm.text}
              onChange={(event) =>
                setObservationForm((current) => ({ ...current, text: event.target.value }))
              }
            />
            <button className={`${primaryButton} mt-3`} onClick={addObservation}>
              <Plus size={15} /> Guardar observación
            </button>
            <div className="mt-5 space-y-2">
              {observations
                .filter((item) => item.studentId === selectedStudentId)
                .map((observation) => (
                  <div key={observation.id} className="flex gap-3 rounded-lg border p-3">
                    <FileText size={16} className="mt-0.5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm">{observation.text}</p>
                      <p className="mt-1 text-[11px] uppercase text-muted-foreground">
                        {observation.date} · {observation.type}
                      </p>
                    </div>
                    <button
                      className="text-danger"
                      onClick={async () => {
                        await projectObservationService.delete(observation.id);
                        setObservations((current) =>
                          current.filter((item) => item.id !== observation.id)
                        );
                      }}
                      aria-label="Eliminar observación"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <LayoutDashboard size={14} />
        Flujo integrado de EduProyectosCheck para módulos de proyecto intermodular.
        {correctionDraft?.correctionMode === 'ia' && (
          <span className="ml-auto inline-flex items-center gap-1 text-primary">
            <Bot size={13} /> Feedback asistido por IA
          </span>
        )}
      </div>
    </div>
  );
}
