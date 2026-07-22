'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Edit2,
  FileJson,
  GitBranch,
  GripVertical,
  Layers,
  Map,
  Plus,
  Save,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { CE_COMPATIBILITIES, getDifficultyPoints } from '@/lib/mockData';
import {
  Criterion,
  LearningOutcome,
  WorkUnit,
  criterionService,
  learningOutcomeService,
  workUnitService,
} from '@/lib/services/edutrackService';
import {
  CURRICULUM_JSON_EXAMPLE,
  WORK_UNIT_JSON_EXAMPLE,
  parseCurriculumJson,
  parseWorkUnitsJson,
} from '../lib/planningJsonImport';

type Tab = 'ra-ce' | 'work-units' | 'coverage-map' | 'evaluations' | 'ce-compat';
type JsonImportKind = 'curriculum' | 'work-units';

interface RAFormData {
  id?: string;
  code: string;
  description: string;
  weight: number;
}

interface CEFormData {
  id?: string;
  raId: string;
  code: string;
  description: string;
  difficulty: Criterion['difficulty'];
  weight: number;
}

interface WorkUnitFormData {
  id?: string;
  evaluationId: string;
  code: string;
  name: string;
  hours: number;
  weight: number;
  taughtPercentage: number;
  status: 'pendiente' | 'en_curso' | 'impartida';
  raIds: string[];
  sortOrder: number;
}

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

function JsonImportModal({
  kind,
  onClose,
  onImport,
}: {
  kind: JsonImportKind;
  onClose: () => void;
  onImport: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const curriculum = kind === 'curriculum';
  const example = curriculum ? CURRICULUM_JSON_EXAMPLE : WORK_UNIT_JSON_EXAMPLE;

  const submit = async () => {
    if (!text.trim()) return toast.error('Carga un archivo o pega el JSON');
    try {
      setBusy(true);
      await onImport(text);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h3 className="text-sm font-semibold">
              {curriculum
                ? 'Importar RA y criterios desde JSON'
                : 'Importar Unidades de Trabajo desde JSON'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Los códigos existentes se actualizan; los códigos nuevos se crean.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar importación"
            className="rounded p-1.5 hover:bg-muted"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <section className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <FileJson size={15} className="text-primary" /> Formato requerido
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed text-foreground">
              {example}
            </pre>
          </section>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-4 text-xs font-medium hover:border-primary/50 hover:bg-muted/25">
            <Upload size={15} /> Cargar archivo .json
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setText(await file.text());
              }}
            />
          </label>
          <textarea
            aria-label="Contenido JSON"
            rows={12}
            className={`${inputClass} resize-y font-mono text-xs`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Pega aquí el JSON…"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              onClick={submit}
            >
              <Upload size={14} /> {busy ? 'Importando…' : 'Validar e importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkUnitModal({
  form,
  evaluations,
  learningOutcomes,
  onChange,
  onClose,
  onSave,
}: {
  form: WorkUnitFormData;
  evaluations: Array<{ id: string; name: string }>;
  learningOutcomes: LearningOutcome[];
  onChange: React.Dispatch<React.SetStateAction<WorkUnitFormData | null>>;
  onClose: () => void;
  onSave: () => Promise<void>;
}) {
  const update = <K extends keyof WorkUnitFormData>(key: K, value: WorkUnitFormData[K]) =>
    onChange((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <header className="flex items-center justify-between border-b border-border p-5">
          <h3 className="text-sm font-semibold">
            {form.id ? `Editar ${form.code}` : 'Nueva Unidad de Trabajo'}
          </h3>
          <button
            type="button"
            aria-label="Cerrar unidad"
            className="rounded p-1.5 hover:bg-muted"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Evaluación
              <select
                className={`${inputClass} mt-1.5`}
                value={form.evaluationId}
                onChange={(event) => update('evaluationId', event.target.value)}
              >
                {evaluations.map((evaluation) => (
                  <option key={evaluation.id} value={evaluation.id}>
                    {evaluation.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Código *
              <input
                className={`${inputClass} mt-1.5`}
                value={form.code}
                onChange={(event) => update('code', event.target.value)}
                placeholder="UT1"
              />
            </label>
          </div>
          <label className="block text-xs font-semibold">
            Nombre *
            <input
              className={`${inputClass} mt-1.5`}
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold">
              Horas
              <input
                type="number"
                min="0"
                className={`${inputClass} mt-1.5`}
                value={form.hours}
                onChange={(event) => update('hours', Number(event.target.value))}
              />
            </label>
            <label className="text-xs font-semibold">
              Peso (%)
              <input
                type="number"
                min="0"
                max="100"
                className={`${inputClass} mt-1.5`}
                value={form.weight}
                onChange={(event) => update('weight', Number(event.target.value))}
              />
            </label>
            <label className="text-xs font-semibold">
              Impartido (%)
              <input
                type="number"
                min="0"
                max="100"
                className={`${inputClass} mt-1.5`}
                value={form.taughtPercentage}
                onChange={(event) => update('taughtPercentage', Number(event.target.value))}
              />
            </label>
            <label className="text-xs font-semibold">
              Estado
              <select
                className={`${inputClass} mt-1.5`}
                value={form.status}
                onChange={(event) =>
                  update('status', event.target.value as WorkUnitFormData['status'])
                }
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En curso</option>
                <option value="impartida">Impartida</option>
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold">RA asociados</legend>
            <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
              {learningOutcomes.map((ra) => (
                <label
                  key={ra.id}
                  className="flex items-start gap-2 rounded-lg p-2 text-xs hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.raIds.includes(ra.id)}
                    onChange={(event) =>
                      update(
                        'raIds',
                        event.target.checked
                          ? [...form.raIds, ra.id]
                          : form.raIds.filter((id) => id !== ra.id)
                      )
                    }
                  />
                  <span>
                    <strong>{ra.code}</strong>
                    <span className="ml-1 text-muted-foreground">{ra.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              onClick={onSave}
            >
              <Save size={14} /> Guardar UT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlanningContent() {
  const {
    activeModule,
    activeModuleId,
    learningOutcomes,
    criteria,
    workUnits,
    evaluations,
    activities,
    loading,
    refreshLearningOutcomes,
    refreshCriteria,
    refreshWorkUnits,
    refreshActivities,
  } = useEduTrack();
  const [activeTab, setActiveTab] = useState<Tab>('ra-ce');
  const [expandedRA, setExpandedRA] = useState<Set<string>>(new Set());
  const [raForm, setRAForm] = useState<RAFormData | null>(null);
  const [ceForm, setCEForm] = useState<CEFormData | null>(null);
  const [utForm, setUTForm] = useState<WorkUnitFormData | null>(null);
  const [jsonImport, setJsonImport] = useState<JsonImportKind | null>(null);
  const [draggingUnitId, setDraggingUnitId] = useState<string | null>(null);

  const raWeightSum = learningOutcomes.reduce((sum, ra) => sum + ra.weight, 0);
  const totalPlannedHours = workUnits.reduce((sum, unit) => sum + unit.hours, 0);
  const criteriaIds = useMemo(() => new Set(criteria.map((criterion) => criterion.id)), [criteria]);
  const coverage = learningOutcomes.map((ra) => {
    const hours = workUnits
      .filter((unit) => unit.raIds.includes(ra.id))
      .reduce((sum, unit) => sum + unit.hours, 0);
    return {
      ...ra,
      coverage: totalPlannedHours ? Math.round((hours / totalPlannedHours) * 100) : 0,
    };
  });
  const validationRows = [
    { label: 'Suma de pesos RA = 100%', valid: Math.abs(raWeightSum - 100) < 0.01 },
    {
      label: 'Todas las UT tienen evaluación',
      valid: workUnits.every((unit) =>
        evaluations.some((evaluation) => evaluation.id === unit.evaluationId)
      ),
    },
    { label: 'Todas las UT tienen RA', valid: workUnits.every((unit) => unit.raIds.length > 0) },
    {
      label: 'Integridad referencial CE',
      valid: activities.every((activity) => activity.ceIds.every((id) => criteriaIds.has(id))),
    },
    {
      label: 'Códigos UT sin duplicados',
      valid:
        new Set(workUnits.map((unit) => unit.code.toLocaleLowerCase('es'))).size ===
        workUnits.length,
    },
  ];

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'ra-ce', label: 'RA / CE', icon: <Target size={14} /> },
    { key: 'work-units', label: 'Unidades de Trabajo', icon: <Layers size={14} /> },
    { key: 'coverage-map', label: 'Mapa Curricular', icon: <Map size={14} /> },
    { key: 'evaluations', label: 'Evaluaciones', icon: <BookOpen size={14} /> },
    { key: 'ce-compat', label: 'Compatibilidad CE', icon: <GitBranch size={14} /> },
  ];

  const toggleRA = (id: string) =>
    setExpandedRA((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const saveRA = async () => {
    if (!raForm?.code.trim() || !raForm.description.trim())
      return toast.error('Código y descripción son obligatorios');
    await learningOutcomeService.upsert({
      id: raForm.id ?? crypto.randomUUID(),
      moduleId: activeModuleId,
      code: raForm.code.trim(),
      description: raForm.description.trim(),
      weight: raForm.weight,
      sortOrder: raForm.id
        ? learningOutcomes.find((ra) => ra.id === raForm.id)?.sortOrder
        : learningOutcomes.length,
    });
    await refreshLearningOutcomes();
    setRAForm(null);
    toast.success(raForm.id ? 'RA actualizado' : 'RA creado');
  };

  const saveCE = async () => {
    if (!ceForm?.code.trim() || !ceForm.description.trim())
      return toast.error('Código y enunciado son obligatorios');
    await criterionService.upsert({
      id: ceForm.id ?? crypto.randomUUID(),
      raId: ceForm.raId,
      code: ceForm.code.trim(),
      description: ceForm.description.trim(),
      difficulty: ceForm.difficulty,
      weight: ceForm.weight,
      sortOrder: ceForm.id
        ? criteria.find((ce) => ce.id === ceForm.id)?.sortOrder
        : criteria.filter((ce) => ce.raId === ceForm.raId).length,
    });
    await refreshCriteria();
    setCEForm(null);
    toast.success(ceForm.id ? 'CE actualizado' : 'CE creado');
  };

  const saveUT = async (): Promise<void> => {
    if (!utForm?.code.trim() || !utForm.name.trim() || !utForm.evaluationId) {
      toast.error('Evaluación, código y nombre son obligatorios');
      return;
    }
    if (
      utForm.hours < 0 ||
      utForm.weight < 0 ||
      utForm.weight > 100 ||
      utForm.taughtPercentage < 0 ||
      utForm.taughtPercentage > 100
    ) {
      toast.error('Revisa horas y porcentajes');
      return;
    }
    await workUnitService.upsert({
      id: utForm.id ?? crypto.randomUUID(),
      moduleId: activeModuleId,
      evaluationId: utForm.evaluationId,
      code: utForm.code.trim(),
      name: utForm.name.trim(),
      hours: utForm.hours,
      weight: utForm.weight,
      taughtPercentage: utForm.taughtPercentage,
      status: utForm.status,
      raIds: utForm.raIds,
      sortOrder: utForm.sortOrder,
    });
    await refreshWorkUnits();
    setUTForm(null);
    toast.success(utForm.id ? 'Unidad actualizada' : 'Unidad creada');
  };

  const deleteRA = async (ra: LearningOutcome) => {
    if (!window.confirm(`¿Eliminar ${ra.code} y sus criterios asociados?`)) return;
    try {
      await learningOutcomeService.delete(ra.id);
      await Promise.all([refreshLearningOutcomes(), refreshCriteria()]);
      toast.success('RA eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el RA');
    }
  };

  const deleteCE = async (criterion: Criterion) => {
    if (!window.confirm(`¿Eliminar el criterio ${criterion.code}?`)) return;
    try {
      await criterionService.delete(criterion.id);
      await refreshCriteria();
      toast.success('CE eliminado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el CE');
    }
  };

  const deleteUT = async (unit: WorkUnit) => {
    if (!window.confirm(`¿Eliminar la unidad ${unit.code}? Las actividades quedarán sin UT.`))
      return;
    await workUnitService.delete(unit.id);
    await Promise.all([refreshWorkUnits(), refreshActivities()]);
    toast.success('Unidad eliminada');
  };

  const moveUnit = async (evaluationId: string) => {
    const unit = workUnits.find((candidate) => candidate.id === draggingUnitId);
    setDraggingUnitId(null);
    if (!unit || unit.evaluationId === evaluationId) return;
    const targetOrder =
      Math.max(
        -1,
        ...workUnits
          .filter((candidate) => candidate.evaluationId === evaluationId)
          .map((candidate) => candidate.sortOrder)
      ) + 1;
    try {
      await workUnitService.moveToEvaluation(unit, evaluationId, targetOrder);
      await Promise.all([refreshWorkUnits(), refreshActivities()]);
      toast.success(
        `${unit.code} movida a ${evaluations.find((evaluation) => evaluation.id === evaluationId)?.name}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo mover la unidad');
    }
  };

  const importCurriculum = async (text: string) => {
    const rows = parseCurriculumJson(text);
    let criteriaCount = 0;
    for (const [raIndex, row] of rows.entries()) {
      const existingRA = learningOutcomes.find(
        (ra) => ra.code.toLocaleLowerCase('es') === row.code.toLocaleLowerCase('es')
      );
      const raId = existingRA?.id ?? crypto.randomUUID();
      await learningOutcomeService.upsert({
        id: raId,
        moduleId: activeModuleId,
        code: row.code,
        description: row.description,
        weight: row.weight,
        sortOrder: existingRA?.sortOrder ?? learningOutcomes.length + raIndex,
      });
      for (const [ceIndex, importedCE] of row.criteria.entries()) {
        const existingCE = criteria.find(
          (ce) => ce.code.toLocaleLowerCase('es') === importedCE.code.toLocaleLowerCase('es')
        );
        await criterionService.upsert({
          id: existingCE?.id ?? crypto.randomUUID(),
          raId,
          code: importedCE.code,
          description: importedCE.description,
          difficulty: importedCE.difficulty,
          weight: importedCE.weight,
          sortOrder: existingCE?.sortOrder ?? ceIndex,
        });
        criteriaCount += 1;
      }
    }
    await Promise.all([refreshLearningOutcomes(), refreshCriteria()]);
    toast.success(`${rows.length} RA y ${criteriaCount} criterios importados`);
  };

  const importWorkUnits = async (text: string) => {
    const rows = parseWorkUnitsJson(text);
    const resolved = rows.map((row) => {
      const evaluation = evaluations.find(
        (item) =>
          item.id === row.evaluation ||
          item.name.toLocaleLowerCase('es') === row.evaluation.toLocaleLowerCase('es')
      );
      if (!evaluation) throw new Error(`No existe la evaluación «${row.evaluation}»`);
      const raIds = row.raCodes.map((code) => {
        const ra = learningOutcomes.find(
          (item) => item.code.toLocaleLowerCase('es') === code.toLocaleLowerCase('es')
        );
        if (!ra) throw new Error(`No existe el RA «${code}» usado por ${row.code}`);
        return ra.id;
      });
      return { row, evaluation, raIds };
    });
    for (const [index, { row, evaluation, raIds }] of resolved.entries()) {
      const existing = workUnits.find(
        (unit) => unit.code.toLocaleLowerCase('es') === row.code.toLocaleLowerCase('es')
      );
      await workUnitService.upsert({
        id: existing?.id ?? crypto.randomUUID(),
        moduleId: activeModuleId,
        evaluationId: evaluation.id,
        code: row.code,
        name: row.name,
        hours: row.hours,
        weight: row.weight,
        taughtPercentage: row.taughtPercentage,
        status: row.status,
        raIds,
        sortOrder: existing?.sortOrder ?? workUnits.length + index,
      });
    }
    await refreshWorkUnits();
    toast.success(`${rows.length} unidades importadas`);
  };

  const openNewUT = (evaluationId: string) =>
    setUTForm({
      evaluationId,
      code: '',
      name: '',
      hours: 0,
      weight: 0,
      taughtPercentage: 0,
      status: 'pendiente',
      raIds: [],
      sortOrder: workUnits.length,
    });

  if (loading)
    return <div className="p-8 text-sm text-muted-foreground">Cargando planificación…</div>;

  return (
    <div className="w-full max-w-screen-2xl px-6 py-6 lg:px-8 xl:px-10 2xl:px-12">
      <PageHeader
        title="Planificación y Currículo"
        subtitle={`${activeModule?.code ?? 'Módulo'} — ${activeModule?.cycle ?? ''} · Gestión de RA, CE, UT y evaluaciones`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/curriculum-relations"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <GitBranch size={13} /> Ver relaciones
            </Link>
            <Link
              href="/import-data"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Download size={13} /> Copia Excel
            </Link>
            {activeTab === 'ra-ce' && (
              <button
                type="button"
                onClick={() => setJsonImport('curriculum')}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Upload size={13} /> Importar RA/CE
              </button>
            )}
            {activeTab === 'ra-ce' && (
              <button
                type="button"
                onClick={() => setRAForm({ code: '', description: '', weight: 0 })}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                <Plus size={13} /> Nuevo RA
              </button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ra-ce' && (
        <div className="space-y-4">
          <section className="grid gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <FileJson size={16} className="text-primary" /> Importación conjunta de RA y CE
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                El JSON debe contener <code>resultadosAprendizaje[]</code> y, dentro de cada RA,{' '}
                <code>criteria[]</code>. Cada elemento requiere código, descripción y peso; cada CE
                añade dificultad.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              onClick={() => setJsonImport('curriculum')}
            >
              Ver formato e importar
            </button>
          </section>
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${Math.abs(raWeightSum - 100) < 0.01 ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
          >
            {Math.abs(raWeightSum - 100) < 0.01 ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            <strong>Suma de pesos RA: {raWeightSum}%</strong>
          </div>
          {learningOutcomes.map((ra) => {
            const raCriteria = criteria.filter((criterion) => criterion.raId === ra.id);
            const expanded = expandedRA.has(ra.id);
            const criteriaWeight = raCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);
            return (
              <section
                key={ra.id}
                className="overflow-hidden rounded-xl border border-border bg-card shadow-card"
              >
                <header className="flex items-start gap-3 p-4">
                  <button
                    type="button"
                    aria-label={`${expanded ? 'Contraer' : 'Expandir'} ${ra.code}`}
                    className="mt-0.5 text-muted-foreground"
                    onClick={() => toggleRA(ra.id)}
                  >
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => toggleRA(ra.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                        {ra.code}
                      </span>
                      <span className="text-xs text-muted-foreground">{ra.weight}% del módulo</span>
                      <span
                        className={`text-xs ${Math.abs(criteriaWeight - 100) < 0.01 ? 'text-success' : 'text-danger'}`}
                      >
                        Σ CE {criteriaWeight}%
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium">{ra.description}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Editar ${ra.code}`}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    onClick={() =>
                      setRAForm({
                        id: ra.id,
                        code: ra.code,
                        description: ra.description,
                        weight: ra.weight,
                      })
                    }
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${ra.code}`}
                    className="rounded p-1.5 text-danger hover:bg-danger/10"
                    onClick={() => deleteRA(ra)}
                  >
                    <Trash2 size={14} />
                  </button>
                </header>
                {expanded && (
                  <div className="border-t border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-xs">
                        <thead className="bg-muted/35 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 text-left">Código</th>
                            <th className="px-4 py-2 text-left">Enunciado</th>
                            <th className="px-3 py-2">Dificultad</th>
                            <th className="px-3 py-2">Peso</th>
                            <th className="px-3 py-2">Pts</th>
                            <th className="px-3 py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {raCriteria.map((criterion) => (
                            <tr key={criterion.id}>
                              <td className="px-4 py-2.5 font-mono font-semibold">
                                {criterion.code}
                              </td>
                              <td className="px-4 py-2.5">{criterion.description}</td>
                              <td className="px-3 py-2.5 text-center">{criterion.difficulty}</td>
                              <td className="px-3 py-2.5 text-center">{criterion.weight}%</td>
                              <td className="px-3 py-2.5 text-center">
                                {getDifficultyPoints(criterion.difficulty)}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex justify-center gap-1">
                                  <button
                                    type="button"
                                    aria-label={`Editar ${criterion.code}`}
                                    className="rounded p-1 hover:bg-muted"
                                    onClick={() =>
                                      setCEForm({
                                        id: criterion.id,
                                        raId: ra.id,
                                        code: criterion.code,
                                        description: criterion.description,
                                        difficulty: criterion.difficulty,
                                        weight: criterion.weight,
                                      })
                                    }
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Eliminar ${criterion.code}`}
                                    className="rounded p-1 text-danger hover:bg-danger/10"
                                    onClick={() => deleteCE(criterion)}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end border-t border-border px-4 py-2">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs text-primary"
                        onClick={() =>
                          setCEForm({
                            raId: ra.id,
                            code: `${ra.code}.`,
                            description: '',
                            difficulty: 'básico',
                            weight: 0,
                          })
                        }
                      >
                        <Plus size={12} /> Añadir CE
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {activeTab === 'work-units' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="space-y-4">
            <p className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-xs text-primary">
              Arrastra una UT y suéltala sobre otra evaluación. Sus actividades se moverán con ella.
            </p>
            {evaluations.map((evaluation) => {
              const units = workUnits.filter((unit) => unit.evaluationId === evaluation.id);
              const weightSum = units.reduce((sum, unit) => sum + unit.weight, 0);
              return (
                <section
                  key={evaluation.id}
                  onDragOver={(event) => {
                    if (draggingUnitId) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    moveUnit(evaluation.id);
                  }}
                  className={`overflow-hidden rounded-xl border bg-card shadow-card transition-colors ${draggingUnitId ? 'border-primary/50' : 'border-border'}`}
                >
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold">{evaluation.name}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {units.reduce((sum, unit) => sum + unit.hours, 0)} h · {units.length}{' '}
                        unidades
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold ${Math.abs(weightSum - 100) < 0.01 ? 'text-success' : 'text-danger'}`}
                      >
                        Σ pesos {weightSum}%
                      </span>
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-medium text-primary"
                        onClick={() => openNewUT(evaluation.id)}
                      >
                        <Plus size={13} /> Nueva UT
                      </button>
                    </div>
                  </header>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="w-9 px-2 py-2.5"></th>
                          <th className="px-3 py-2.5 text-left">Código</th>
                          <th className="px-3 py-2.5 text-left">Nombre</th>
                          <th className="px-3 py-2.5">Horas</th>
                          <th className="px-3 py-2.5">Peso</th>
                          <th className="px-3 py-2.5">Impartido</th>
                          <th className="px-3 py-2.5">Estado</th>
                          <th className="px-3 py-2.5 text-left">RA</th>
                          <th className="px-3 py-2.5">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {units.map((unit) => (
                          <tr
                            key={unit.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = 'move';
                              setDraggingUnitId(unit.id);
                            }}
                            onDragEnd={() => setDraggingUnitId(null)}
                            className={`hover:bg-muted/25 ${draggingUnitId === unit.id ? 'opacity-50' : ''}`}
                          >
                            <td className="cursor-grab px-2 py-3 text-muted-foreground">
                              <GripVertical size={15} />
                            </td>
                            <td className="px-3 py-3 font-mono font-semibold">{unit.code}</td>
                            <td className="px-3 py-3 font-medium">{unit.name}</td>
                            <td className="px-3 py-3 text-center">{unit.hours} h</td>
                            <td className="px-3 py-3 text-center">{unit.weight}%</td>
                            <td className="px-3 py-3 text-center">{unit.taughtPercentage}%</td>
                            <td className="px-3 py-3 text-center">
                              <StatusBadge status={unit.status} size="sm" />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {unit.raIds.map((id) => {
                                  const ra = learningOutcomes.find((item) => item.id === id);
                                  return ra ? (
                                    <span
                                      key={id}
                                      className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary"
                                    >
                                      {ra.code}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-center gap-1">
                                <button
                                  type="button"
                                  aria-label={`Editar ${unit.code}`}
                                  className="rounded p-1.5 hover:bg-muted"
                                  onClick={() =>
                                    setUTForm({
                                      id: unit.id,
                                      evaluationId: unit.evaluationId,
                                      code: unit.code,
                                      name: unit.name,
                                      hours: unit.hours,
                                      weight: unit.weight,
                                      taughtPercentage: unit.taughtPercentage,
                                      status: unit.status as WorkUnitFormData['status'],
                                      raIds: unit.raIds,
                                      sortOrder: unit.sortOrder,
                                    })
                                  }
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Eliminar ${unit.code}`}
                                  className="rounded p-1.5 text-danger hover:bg-danger/10"
                                  onClick={() => deleteUT(unit)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!units.length && (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      Suelta aquí una UT o crea la primera unidad.
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <aside className="space-y-3">
            <section className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Clock3 size={14} /> Carga horaria
              </h3>
              <div className="divide-y divide-border text-xs">
                <div className="flex justify-between py-2">
                  <strong>Planificado total</strong>
                  <strong>{totalPlannedHours} h</strong>
                </div>
                {evaluations.map((evaluation) => {
                  const hours = workUnits
                    .filter((unit) => unit.evaluationId === evaluation.id)
                    .reduce((sum, unit) => sum + unit.hours, 0);
                  return (
                    <div key={evaluation.id} className="flex justify-between py-2">
                      <span>{evaluation.name}</span>
                      <span className="font-semibold">
                        {hours} h ·{' '}
                        {totalPlannedHours ? Math.round((hours / totalPlannedHours) * 100) : 0}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Target size={14} /> Cobertura RA
              </h3>
              <div className="divide-y divide-border text-xs">
                {coverage.map((ra) => (
                  <div key={ra.id} className="flex justify-between py-2">
                    <span className="font-semibold">{ra.code}</span>
                    <span
                      className={
                        ra.coverage < 90
                          ? 'font-semibold text-amber-600'
                          : 'font-semibold text-success'
                      }
                    >
                      {ra.coverage}%
                    </span>
                  </div>
                ))}
              </div>
              {coverage.some((ra) => ra.coverage < 90) && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Revisa los RA por debajo del 90% y amplía las UT o vincula nuevas unidades.
                </p>
              )}
            </section>
            <section className="rounded-xl border border-border bg-card p-4 shadow-card">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck size={14} /> Validaciones
              </h3>
              <div className="divide-y divide-border">
                {validationRows.map((validation) => (
                  <div
                    key={validation.label}
                    className={`flex items-start gap-2 py-2 text-xs ${validation.valid ? 'text-emerald-700' : 'text-danger'}`}
                  >
                    {validation.valid ? (
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                    )}
                    <span>{validation.label}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted"
                onClick={() => setJsonImport('work-units')}
              >
                <Upload size={13} /> Importar UT JSON
              </button>
            </section>
          </aside>
        </div>
      )}

      {activeTab === 'coverage-map' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <header className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Mapa de cobertura curricular — UT × CE</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Un CE aparece cubierto cuando alguna actividad de la UT lo evalúa.
            </p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-max text-[10px]">
              <thead>
                <tr className="bg-muted/30">
                  <th className="sticky left-0 bg-muted px-4 py-2 text-left">UT / CE</th>
                  {criteria.map((ce) => (
                    <th key={ce.id} className="min-w-14 px-2 py-2 font-mono">
                      {ce.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workUnits.map((unit) => (
                  <tr key={unit.id} className="border-t border-border">
                    <td className="sticky left-0 bg-card px-4 py-2 font-mono font-bold text-primary">
                      {unit.code}
                    </td>
                    {criteria.map((ce) => {
                      const linked = activities.some(
                        (activity) => activity.unitId === unit.id && activity.ceIds.includes(ce.id)
                      );
                      return (
                        <td key={ce.id} className="px-2 py-2 text-center">
                          {linked ? (
                            <CheckCircle2 size={13} className="mx-auto text-primary" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'evaluations' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {evaluations.map((evaluation) => {
            const units = workUnits.filter((unit) => unit.evaluationId === evaluation.id);
            const evaluationActivities = activities.filter(
              (activity) => activity.evaluationId === evaluation.id
            );
            return (
              <section
                key={evaluation.id}
                className="rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-sm font-semibold">{evaluation.name}</h2>
                    <p className="text-xs capitalize text-muted-foreground">
                      {evaluation.evalType}
                    </p>
                  </div>
                  <span className="rounded bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                    {evaluation.weight}%
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>Periodo</span>
                    <strong>
                      {evaluation.startDate} — {evaluation.endDate}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Unidades</span>
                    <strong>{units.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Actividades</span>
                    <strong>{evaluationActivities.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas</span>
                    <strong>{units.reduce((sum, unit) => sum + unit.hours, 0)} h</strong>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {activeTab === 'ce-compat' && (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <header className="border-b border-border p-4">
            <h2 className="text-sm font-semibold">Compatibilidad entre criterios</h2>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left">Origen</th>
                  <th className="px-4 py-2 text-left">Destino</th>
                  <th className="px-3 py-2">Nivel</th>
                  <th className="px-3 py-2">Factor</th>
                  <th className="px-4 py-2 text-left">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {CE_COMPATIBILITIES.map((compatibility) => (
                  <tr key={compatibility.id}>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {criteria.find((ce) => ce.id === compatibility.originCeId)?.code ??
                        compatibility.originCeId}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold">
                      {criteria.find((ce) => ce.id === compatibility.destCeId)?.code ??
                        compatibility.destCeId}
                    </td>
                    <td className="px-3 py-3 text-center capitalize">{compatibility.level}</td>
                    <td className="px-3 py-3 text-center">{compatibility.factor}</td>
                    <td className="px-4 py-3 text-muted-foreground">{compatibility.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {raForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-sm font-semibold">{raForm.id ? 'Editar RA' : 'Nuevo RA'}</h3>
              <button type="button" aria-label="Cerrar RA" onClick={() => setRAForm(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Código
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={raForm.code}
                    onChange={(event) => setRAForm({ ...raForm, code: event.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold">
                  Peso (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`${inputClass} mt-1.5`}
                    value={raForm.weight}
                    onChange={(event) =>
                      setRAForm({ ...raForm, weight: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Descripción
                <textarea
                  rows={4}
                  className={`${inputClass} mt-1.5 resize-none`}
                  value={raForm.description}
                  onChange={(event) => setRAForm({ ...raForm, description: event.target.value })}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-xs"
                  onClick={() => setRAForm(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={saveRA}
                >
                  Guardar RA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-sm font-semibold">
                {ceForm.id ? 'Editar criterio' : 'Nuevo criterio'}
              </h3>
              <button type="button" aria-label="Cerrar CE" onClick={() => setCEForm(null)}>
                <X size={16} />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs font-semibold">
                  Código
                  <input
                    className={`${inputClass} mt-1.5`}
                    value={ceForm.code}
                    onChange={(event) => setCEForm({ ...ceForm, code: event.target.value })}
                  />
                </label>
                <label className="text-xs font-semibold">
                  Dificultad
                  <select
                    className={`${inputClass} mt-1.5`}
                    value={ceForm.difficulty}
                    onChange={(event) =>
                      setCEForm({
                        ...ceForm,
                        difficulty: event.target.value as Criterion['difficulty'],
                      })
                    }
                  >
                    <option value="básico">Básico</option>
                    <option value="medio">Medio</option>
                    <option value="avanzado">Avanzado</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Peso (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className={`${inputClass} mt-1.5`}
                    value={ceForm.weight}
                    onChange={(event) =>
                      setCEForm({ ...ceForm, weight: Number(event.target.value) })
                    }
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Enunciado
                <textarea
                  rows={4}
                  className={`${inputClass} mt-1.5 resize-none`}
                  value={ceForm.description}
                  onChange={(event) => setCEForm({ ...ceForm, description: event.target.value })}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border px-4 py-2 text-xs"
                  onClick={() => setCEForm(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  onClick={saveCE}
                >
                  Guardar CE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {utForm && (
        <WorkUnitModal
          form={utForm}
          evaluations={evaluations}
          learningOutcomes={learningOutcomes}
          onChange={setUTForm}
          onClose={() => setUTForm(null)}
          onSave={saveUT}
        />
      )}
      {jsonImport && (
        <JsonImportModal
          kind={jsonImport}
          onClose={() => setJsonImport(null)}
          onImport={jsonImport === 'curriculum' ? importCurriculum : importWorkUnits}
        />
      )}
    </div>
  );
}
