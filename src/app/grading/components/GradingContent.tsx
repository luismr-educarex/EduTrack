'use client';
import React, { useState, useMemo } from 'react';
import { Download, Search, RefreshCw, ChevronDown, X, Check, Info, GitBranch, Map as MapIcon, ChevronRight, Square, CheckSquare, Edit3, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  getActivityGrade, getRAGrade, getCEGrade, getCEStatus, getCEStatusColor, getCEStatusLabel,
  getGradeLabel, getGradeColor, getRiskBadge, getRiskLabel, getGradeQualitative, generateCSV,
  buildStudentGradeMap, getActivityCEWeight, getActivityValuePct, getDifficultyPoints,
  getEffectiveRAGrade, getRARelationshipsToTarget, RA_RELATIONSHIPS as MOCK_RA_RELATIONSHIPS
} from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { gradeService } from '@/lib/services/edutrackService';
import type { Student } from '@/lib/services/edutrackService';

type GradeTab = 'evaluacion' | 'actividad' | 'ut' | 'ra' | 'mapa';

interface EditingCell { studentId: string; activityId: string; currentGrade: number | null }
interface BulkSelection { studentId: string; activityId: string }
interface BulkPreviewRow {
  studentId: string;
  studentName: string;
  activityId: string;
  activityName: string;
  currentGrade: number | null;
  newGrade: number | null;
}

function GradeCell({ grade, onClick, selected, onSelect }: { grade: number | null; onClick?: () => void; selected?: boolean; onSelect?: () => void }) {
  if (grade === null) return (
    <div className="flex items-center justify-center gap-1">
      {onSelect && (
        <button onClick={e => { e.stopPropagation(); onSelect(); }} className={`flex-shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          {selected ? <CheckSquare size={12} /> : <Square size={12} />}
        </button>
      )}
      <span className="text-muted-foreground text-[11px]">—</span>
    </div>
  );
  const color = grade >= 7 ? 'text-success' : grade >= 5 ? 'text-warning' : 'text-danger';
  return (
    <div className="flex items-center justify-center gap-1">
      {onSelect && (
        <button onClick={e => { e.stopPropagation(); onSelect(); }} className={`flex-shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          {selected ? <CheckSquare size={12} /> : <Square size={12} />}
        </button>
      )}
      <button
        onClick={onClick}
        className={`font-mono-nums text-xs font-semibold px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${color} ${selected ? 'ring-1 ring-primary' : ''}`}
      >
        {grade.toFixed(2)}
      </button>
    </div>
  );
}

function GradeDistributionBar({ students, gradeKey }: { students: Student[]; gradeKey: 'moduleGrade' | 'eval1Grade' | 'eval2Grade' }) {
  const bars = [
    { label: 'Insuf.', range: [0, 5], color: 'bg-danger' },
    { label: 'Suf.', range: [5, 6], color: 'bg-amber-400' },
    { label: 'Bien', range: [6, 7], color: 'bg-yellow-400' },
    { label: 'Notable', range: [7, 9], color: 'bg-info' },
    { label: 'Sobres.', range: [9, 10.1], color: 'bg-success' },
  ];
  const total = students.filter(s => s[gradeKey] !== null).length;
  return (
    <div className="flex items-end gap-1.5 h-12">
      {bars.map(bar => {
        const count = students.filter(s => {
          const g = s[gradeKey] ?? 0;
          return g >= bar.range[0] && g < bar.range[1];
        }).length;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={bar.label} className="flex flex-col items-center gap-0.5 flex-1">
            <span className="text-[9px] font-mono-nums font-semibold text-foreground">{count}</span>
            <div className="w-full flex items-end justify-center" style={{ height: '28px' }}>
              <div className={`w-full rounded-t-sm ${bar.color}`} style={{ height: `${Math.max(pct, count > 0 ? 8 : 0)}%` }} />
            </div>
            <span className="text-[8px] text-muted-foreground">{bar.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── GRADE MAP VIEW ──────────────────────────────────────────────────────────────
function StudentGradeMapView({ student }: { student: Student }) {
  const gradeMap = useMemo(() => buildStudentGradeMap(student.id), [student.id]);
  const [expandedUnits, setExpandedUnits] = useState<string[]>([]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
  };

  return (
    <div className="space-y-4">
      {gradeMap.evaluations.map(ev => (
        <div key={ev.evaluationId} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          {/* Evaluation header */}
          <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">{ev.evaluationName}</span>
              <span className="text-xs text-muted-foreground">Peso: {ev.weight}%</span>
            </div>
            <div className="flex items-center gap-2">
              {ev.grade !== null ? (
                <span className={`font-mono-nums text-sm font-bold ${getGradeColor(ev.grade)}`}>{ev.grade.toFixed(2)}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Sin calificar</span>
              )}
              <span className="text-[10px] text-muted-foreground">{getGradeQualitative(ev.grade)}</span>
            </div>
          </div>

          {/* Units */}
          {ev.units.map(ut => (
            <div key={ut.unitId} className="border-b border-border last:border-0">
              <button
                onClick={() => toggleUnit(ut.unitId)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {expandedUnits.includes(ut.unitId) ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                  <span className="text-[10px] font-bold font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">{ut.unitCode}</span>
                  <span className="text-xs font-medium text-foreground">{ut.unitName}</span>
                  <span className="text-[10px] text-muted-foreground">{ut.activities.length} actividades</span>
                </div>
                <div className="flex items-center gap-2">
                  {ut.grade !== null ? (
                    <span className={`font-mono-nums text-xs font-bold ${getGradeColor(ut.grade)}`}>{ut.grade.toFixed(2)}</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              </button>

              {expandedUnits.includes(ut.unitId) && (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-[10px] min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        <th className="text-left px-4 py-2 text-muted-foreground font-medium">Actividad</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium w-20">Peso CE</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium w-20">% Valor UT</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium w-20">Nota</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium w-28">Contribución pond.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {ut.activities.map(act => (
                        <tr key={act.activityId} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2"><span className="font-medium text-foreground">{act.activityName}</span></td>
                          <td className="px-3 py-2 text-center font-mono-nums font-semibold text-foreground">{act.ceWeight}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-mono-nums font-semibold ${act.valuePct >= 30 ? 'text-primary' : act.valuePct >= 15 ? 'text-warning' : 'text-muted-foreground'}`}>{act.valuePct}%</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {act.grade !== null ? <span className={`font-mono-nums font-bold ${getGradeColor(act.grade)}`}>{act.grade.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {act.weightedContribution !== null ? <span className={`font-mono-nums font-semibold ${getGradeColor(act.weightedContribution * 10)}`}>{act.weightedContribution.toFixed(3)}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-muted/20">
                        <td className="px-4 py-2 font-semibold text-foreground">Nota UT</td>
                        <td className="px-3 py-2 text-center font-mono-nums text-muted-foreground">{ut.activities.reduce((s, a) => s + a.ceWeight, 0)}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">100%</td>
                        <td className="px-3 py-2 text-center">
                          {ut.grade !== null ? <span className={`font-mono-nums font-bold ${getGradeColor(ut.grade)}`}>{ut.grade.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}

          {/* Direct activities */}
          {ev.directActivities.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-2 bg-muted/10">
                <span className="text-[10px] font-medium text-muted-foreground">Actividades directas (sin UT)</span>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[10px] min-w-[700px]">
                  <tbody className="divide-y divide-border/50">
                    {ev.directActivities.map(act => (
                      <tr key={act.activityId} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2"><span className="font-medium text-foreground">{act.activityName}</span></td>
                        <td className="px-3 py-2 text-center font-mono-nums font-semibold text-foreground w-20">{act.ceWeight}</td>
                        <td className="px-3 py-2 text-center w-20"><span className="font-mono-nums font-semibold text-primary">{act.valuePct}%</span></td>
                        <td className="px-3 py-2 text-center w-20">
                          {act.grade !== null ? <span className={`font-mono-nums font-bold ${getGradeColor(act.grade)}`}>{act.grade.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center w-28">
                          {act.weightedContribution !== null ? <span className="font-mono-nums font-semibold text-muted-foreground">{act.weightedContribution.toFixed(3)}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Evaluation footer */}
          <div className="px-4 py-2.5 bg-primary/5 border-t border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Nota evaluación (ponderada por CE)</span>
            {ev.grade !== null ? (
              <span className={`font-mono-nums text-sm font-bold ${getGradeColor(ev.grade)}`}>{ev.grade.toFixed(2)} — {getGradeQualitative(ev.grade)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Sin datos suficientes</span>
            )}
          </div>
        </div>
      ))}

      {/* Module grade */}
      <div className="bg-card rounded-xl border border-border shadow-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Nota final del módulo</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Media ponderada de evaluaciones</p>
        </div>
        {gradeMap.moduleGrade !== null ? (
          <div className="text-right">
            <p className={`text-2xl font-bold font-mono-nums ${getGradeColor(gradeMap.moduleGrade)}`}>{gradeMap.moduleGrade.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{getGradeQualitative(gradeMap.moduleGrade)}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sin calificar</span>
        )}
      </div>
    </div>
  );
}

export default function GradingContent() {
  const { students: dbStudents, activities: dbActivities, evaluations: dbEvaluations, workUnits: dbWorkUnits, learningOutcomes: dbLearningOutcomes, criteria: dbCriteria, grades: dbGrades, raRelationships: dbRARelationships, loading, refreshGrades } = useEduTrack();

  const STUDENTS = dbStudents;
  const ACTIVITIES = dbActivities;
  const EVALUATIONS = dbEvaluations;
  const WORK_UNITS = dbWorkUnits;
  const LEARNING_OUTCOMES = dbLearningOutcomes;
  const CRITERIA = dbCriteria;
  const RA_RELATIONSHIPS = dbRARelationships;

  // Build grade lookup from Supabase grades
  const gradeMap = useMemo(() => {
    const map = new globalThis.Map<string, number | null>();
    dbGrades.forEach(g => map.set(`${g.studentId}:${g.activityId}`, g.grade));
    return map;
  }, [dbGrades]);

  const getActivityGradeFromDB = (studentId: string, activityId: string): number | null => {
    const key = `${studentId}:${activityId}`;
    return gradeMap.has(key) ? gradeMap.get(key) ?? null : null;
  };

    const [tab, setTab] = useState<GradeTab>('evaluacion');
  const [search, setSearch] = useState('');
  const [filterEval, setFilterEval] = useState('all');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelections, setBulkSelections] = useState<BulkSelection[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEditType, setBulkEditType] = useState<'fixed' | 'offset'>('fixed');
  const [bulkValue, setBulkValue] = useState('');
    const [bulkPreview, setBulkPreview] = useState<BulkPreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedMapStudent, setSelectedMapStudent] = useState<Student>(STUDENTS[0]);

  const filteredStudents = useMemo(() =>
    STUDENTS.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.nia.toLowerCase().includes(search.toLowerCase())
    ), [STUDENTS, search]);

  const evaluatedActivities = useMemo(() =>
    ACTIVITIES.filter(a => a.status !== 'borrador' && a.status !== 'publicada'), [ACTIVITIES]);

  const filteredActivities = useMemo(() =>
    filterEval === 'all' ? evaluatedActivities : evaluatedActivities.filter(a => a.evaluationId === filterEval),
    [filterEval, evaluatedActivities]);

  const getGrade = (studentId: string, activityId: string): number | null => {
    return getActivityGradeFromDB(studentId, activityId);
  };

  const openEdit = (studentId: string, activityId: string) => {
    if (bulkMode) return;
    const g = getGrade(studentId, activityId);
    setEditingCell({ studentId, activityId, currentGrade: g });
    setEditValue(g !== null ? g.toFixed(2) : '');
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0 || val > 10) {
      toast.error('Introduce una nota entre 0 y 10');
      return;
    }
    try {
      await gradeService.upsertGrade(editingCell.studentId, editingCell.activityId, parseFloat(val.toFixed(2)));
      await refreshGrades();
      setEditingCell(null);
      toast.success('Nota actualizada correctamente');
    } catch {
      toast.error('Error al guardar la nota');
    }
  };

  // Bulk edit helpers
  const toggleBulkSelection = (studentId: string, activityId: string) => {
    setBulkSelections(prev => {
      const exists = prev.find(s => s.studentId === studentId && s.activityId === activityId);
      if (exists) return prev.filter(s => !(s.studentId === studentId && s.activityId === activityId));
      return [...prev, { studentId, activityId }];
    });
  };

  const isSelected = (studentId: string, activityId: string) =>
    bulkSelections.some(s => s.studentId === studentId && s.activityId === activityId);

  const selectAllVisible = () => {
    const newSels: BulkSelection[] = [];
    for (const student of filteredStudents) {
      for (const act of filteredActivities) {
        newSels.push({ studentId: student.id, activityId: act.id });
      }
    }
    setBulkSelections(newSels);
  };

  const clearSelections = () => setBulkSelections([]);

  const computePreview = () => {
    const val = parseFloat(bulkValue);
    if (isNaN(val)) { toast.error('Introduce un valor válido'); return; }
    if (bulkEditType === 'fixed' && (val < 0 || val > 10)) { toast.error('La nota debe estar entre 0 y 10'); return; }

    const rows: BulkPreviewRow[] = bulkSelections.map(sel => {
      const student = STUDENTS.find(s => s.id === sel.studentId);
      const activity = ACTIVITIES.find(a => a.id === sel.activityId);
      const currentGrade = getGrade(sel.studentId, sel.activityId);
      let newGrade: number | null;
      if (bulkEditType === 'fixed') {
        newGrade = val;
      } else {
        newGrade = currentGrade !== null ? Math.min(10, Math.max(0, parseFloat((currentGrade + val).toFixed(2)))) : null;
      }
      return { studentId: sel.studentId, studentName: student?.name ?? '?', activityId: sel.activityId, activityName: activity?.name ?? '?', currentGrade, newGrade };
    });
        setBulkPreview(rows);
    setShowPreview(true);
  };

  const commitBulkEdit = async () => {
    try {
      await Promise.all(bulkPreview.map(row => gradeService.upsertGrade(row.studentId, row.activityId, row.newGrade)));
      await refreshGrades();
      setShowBulkModal(false);
      setShowPreview(false);
      setBulkSelections([]);
      setBulkMode(false);
      setBulkValue('');
      toast.success(`${bulkPreview.length} notas actualizadas correctamente`);
    } catch {
      toast.error('Error al guardar las notas');
    }
  };

  // Export helpers
  const handleExportCSV = () => {
    const headers = ['NIA', 'Alumno', ...EVALUATIONS.map(e => e.name), 'Nota Módulo', 'Estado'];
    const rows = STUDENTS.map(s => [
      s.nia, s.name,
      s.eval1Grade ?? '', s.eval2Grade ?? '',
      s.moduleGrade ?? '', getRiskLabel(s.riskLevel)
    ]);
    const csv = generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'acta_calificaciones.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Acta CSV descargada');
  };

  const handleExportDetailedCSV = () => {
    // Build detailed export: RA base grades, effective grades, module impact
    const raHeaders = LEARNING_OUTCOMES.flatMap(ra => {
      const hasIncoming = getRARelationshipsToTarget(ra.id).length > 0;
      return hasIncoming
        ? [`${ra.code} Base`, `${ra.code} Efectiva`, `${ra.code} Δ`]
        : [`${ra.code} Base`];
    });
    const headers = ['NIA', 'Alumno', ...raHeaders, 'Nota Módulo', 'Calificación'];

    const rows = STUDENTS.map(s => {
      const raData = LEARNING_OUTCOMES.flatMap(ra => {
        const base = getRAGrade(s.id, ra.id);
        const hasIncoming = getRARelationshipsToTarget(ra.id).length > 0;
        if (hasIncoming) {
          const effective = getEffectiveRAGrade(s.id, ra.id, base);
          const delta = base !== null && effective !== null ? (effective - base).toFixed(2) : '';
          return [base ?? '', effective ?? '', delta];
        }
        return [base ?? ''];
      });
      return [s.nia, s.name, ...raData, s.moduleGrade ?? '', getGradeQualitative(s.moduleGrade)];
    });

    const csv = generateCSV(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calificaciones_detalladas_ra.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV detallado con notas RA descargado');
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    // Build HTML content for PDF print
    const raHeaders = LEARNING_OUTCOMES.map(ra => {
      const hasIncoming = getRARelationshipsToTarget(ra.id).length > 0;
      return `<th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;background:#f8fafc">${ra.code}${hasIncoming ? ' (E)' : ''}</th>`;
    }).join('');

    const rows = STUDENTS.map(s => {
      const raCells = LEARNING_OUTCOMES.map(ra => {
        const base = getRAGrade(s.id, ra.id);
        const hasIncoming = getRARelationshipsToTarget(ra.id).length > 0;
        const effective = hasIncoming ? getEffectiveRAGrade(s.id, ra.id, base) : null;
        const display = effective !== null && effective !== base
          ? `<span style="color:#64748b;text-decoration:line-through;font-size:9px">${base?.toFixed(2) ?? '—'}</span><br/><strong style="color:#2563eb">${effective.toFixed(2)}</strong>`
          : `<span>${base?.toFixed(2) ?? '—'}</span>`;
        return `<td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-size:10px">${display}</td>`;
      }).join('');

      const moduleColor = (s.moduleGrade ?? 0) >= 5 ? '#16a34a' : '#dc2626';
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px">${s.nia}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;font-size:10px;font-weight:500">${s.name}</td>
        ${raCells}
        <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:bold;color:${moduleColor}">${s.moduleGrade?.toFixed(2) ?? '—'}</td>
        <td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-size:10px">${getGradeQualitative(s.moduleGrade)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><title>Acta de Calificaciones — PSP DAM 2º</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px}h1{font-size:16px;margin-bottom:4px}p{font-size:11px;color:#64748b;margin-bottom:16px}table{border-collapse:collapse;width:100%}@media print{body{padding:10px}}</style>
    </head><body>
    <h1>Acta de Calificaciones — PSP DAM 2º</h1>
    <p>Módulo: Programación de Servicios y Procesos · Curso 2025–2026 · ${STUDENTS.length} alumnos · (E) = Nota Efectiva con cascada</p>
    <table>
      <thead><tr>
        <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;background:#f8fafc;text-align:left">NIA</th>
        <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;background:#f8fafc;text-align:left">Alumno</th>
        ${raHeaders}
        <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;background:#f8fafc">Módulo</th>
        <th style="padding:6px 8px;border:1px solid #e2e8f0;font-size:10px;background:#f8fafc">Calificación</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload=()=&gt;window.print()</script>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success('PDF preparado para imprimir');
    setShowExportModal(false);
  };

  const handleExportJSON = () => {
    const data = {
      module: 'PSP', course: '2025-2026', exportedAt: new Date().toISOString(),
      students: STUDENTS.map(s => ({
        nia: s.nia, name: s.name,
        eval1: s.eval1Grade, eval2: s.eval2Grade, module: s.moduleGrade,
        risk: s.riskLevel
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calificaciones.json'; a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON exportado');
  };

  const tabs: { key: GradeTab; label: string }[] = [
    { key: 'evaluacion', label: 'Por Evaluación' },
    { key: 'actividad', label: 'Por Actividad' },
    { key: 'ut', label: 'Por UT' },
    { key: 'ra', label: 'Por RA / CE' },
    { key: 'mapa', label: 'Mapa de Calificaciones' },
  ];

  const passCount = filteredStudents.filter(s => (s.moduleGrade ?? 0) >= 5).length;
  const avgGrade = filteredStudents.reduce((s, st) => s + (st.moduleGrade ?? 0), 0) / (filteredStudents.length || 1);

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Calificaciones"
        subtitle={`PSP — DAM 2º · ${STUDENTS.length} alumnos · ${passCount} aprobados · Media: ${avgGrade.toFixed(2)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/curriculum-relations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <GitBranch size={13} /> Ver relaciones
            </Link>
            <button onClick={() => toast.success('Recalculando notas...')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <RefreshCw size={13} /> Recalcular
            </button>
            {tab === 'actividad' && (
              <button
                onClick={() => { setBulkMode(m => !m); if (bulkMode) clearSelections(); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${bulkMode ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
              >
                <Edit3 size={13} /> {bulkMode ? `Edición masiva (${bulkSelections.length})` : 'Edición masiva'}
              </button>
            )}
            <button onClick={() => setShowExportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all">
              <Download size={13} /> Exportar
            </button>
          </div>
        }
      />

      {/* Bulk mode toolbar */}
      {bulkMode && tab === 'actividad' && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl flex-wrap">
          <Edit3 size={14} className="text-primary flex-shrink-0" />
          <span className="text-xs font-semibold text-primary">{bulkSelections.length} celdas seleccionadas</span>
          <button onClick={selectAllVisible} className="text-xs text-primary hover:underline">Seleccionar todo</button>
          <button onClick={clearSelections} className="text-xs text-muted-foreground hover:underline">Limpiar selección</button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { if (bulkSelections.length === 0) { toast.error('Selecciona al menos una celda'); return; } setShowBulkModal(true); setShowPreview(false); setBulkValue(''); }}
              disabled={bulkSelections.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={13} /> Aplicar a selección
            </button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Aprobados', value: `${passCount}/${filteredStudents.length}`, color: 'text-success' },
          { label: 'Suspensos', value: `${filteredStudents.length - passCount}`, color: filteredStudents.length - passCount > 0 ? 'text-danger' : 'text-muted-foreground' },
          { label: 'Nota media', value: avgGrade.toFixed(2), color: getGradeColor(avgGrade) },
          { label: 'Tasa aprobado', value: `${Math.round((passCount / (filteredStudents.length || 1)) * 100)}%`, color: 'text-foreground' },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border shadow-card p-3 text-center">
            <p className={`text-xl font-bold font-mono-nums ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-5 overflow-x-auto scrollbar-thin">
        {tabs.map(t => (
          <button key={`gtab-${t.key}`} onClick={() => { setTab(t.key); if (t.key !== 'actividad') { setBulkMode(false); clearSelections(); } }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex items-center gap-1.5 ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t.key === 'mapa' && <MapIcon size={13} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters (not for mapa tab) */}
      {tab !== 'mapa' && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar alumno o NIA..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          {(tab === 'actividad' || tab === 'ut') && (
            <div className="relative">
              <select value={filterEval} onChange={e => setFilterEval(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">Todas las evaluaciones</option>
                {EVALUATIONS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filteredStudents.length} alumnos</span>
        </div>
      )}

      {/* ── BY EVALUATION ── */}
      {tab === 'evaluacion' && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-foreground">Distribución de calificaciones (módulo)</h3>
              <span className="text-xs text-muted-foreground">{filteredStudents.length} alumnos</span>
            </div>
            <GradeDistributionBar students={filteredStudents} gradeKey="moduleGrade" />
          </div>

          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium sticky left-0 bg-muted/30 min-w-[220px]">Alumno / NIA</th>
                    {EVALUATIONS.map(ev => (
                      <th key={ev.id} className="text-center px-4 py-3 text-muted-foreground font-medium min-w-[120px]">
                        <div>{ev.name}</div>
                        <div className="text-[10px] font-normal">Peso: {ev.weight}%</div>
                      </th>
                    ))}
                    <th className="text-center px-4 py-3 text-muted-foreground font-medium min-w-[120px] bg-primary/5">Nota Módulo</th>
                    <th className="text-center px-4 py-3 text-muted-foreground font-medium min-w-[100px]">Calificación</th>
                    <th className="text-center px-4 py-3 text-muted-foreground font-medium min-w-[100px]">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className={`hover:bg-muted/30 transition-colors ${student.riskLevel === 'high' ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 sticky left-0 bg-card">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${student.riskLevel === 'high' ? 'bg-red-100 text-danger' : student.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-muted text-muted-foreground'}`}>
                            {student.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{student.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{student.nia}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono-nums text-xs font-semibold ${getGradeColor(student.eval1Grade)}`}>{getGradeLabel(student.eval1Grade)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono-nums text-xs font-semibold ${getGradeColor(student.eval2Grade)}`}>{getGradeLabel(student.eval2Grade)}</span>
                      </td>
                      <td className="px-4 py-3 text-center bg-primary/5">
                        <span className={`font-mono-nums text-sm font-bold ${getGradeColor(student.moduleGrade)}`}>{getGradeLabel(student.moduleGrade)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] text-muted-foreground">{getGradeQualitative(student.moduleGrade)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getRiskBadge(student.riskLevel)}`}>{getRiskLabel(student.riskLevel)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40">
                    <td className="px-4 py-3 text-xs font-semibold text-foreground sticky left-0 bg-muted/40">Media del grupo</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono-nums text-xs font-bold text-foreground">
                        {(STUDENTS.reduce((s, st) => s + (st.eval1Grade ?? 0), 0) / STUDENTS.length).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono-nums text-xs font-bold text-foreground">
                        {(STUDENTS.filter(st => st.eval2Grade !== null).reduce((s, st) => s + (st.eval2Grade ?? 0), 0) / Math.max(1, STUDENTS.filter(st => st.eval2Grade !== null).length)).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center bg-primary/5">
                      <span className={`font-mono-nums text-xs font-bold ${getGradeColor(avgGrade)}`}>{avgGrade.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">{getGradeQualitative(avgGrade)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-muted-foreground">{passCount}/{filteredStudents.length} aprobados</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BY ACTIVITY ── */}
      {tab === 'actividad' && (
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium sticky left-0 bg-muted/30 min-w-[200px]">Alumno</th>
                  {filteredActivities.map(act => (
                    <th key={act.id} className="text-center px-2 py-3 text-muted-foreground font-medium min-w-[90px]">
                      <div className="truncate max-w-[80px] mx-auto text-[10px]" title={act.name}>{act.name.split(':')[0]}</div>
                      <div className="text-[9px] text-muted-foreground">CE:{getActivityCEWeight(act.id)} · {getActivityValuePct(act.id)}%</div>
                      <StatusBadge status={act.status} size="sm" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 sticky left-0 bg-card">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{student.avatar}</div>
                        <span className="font-medium text-foreground truncate max-w-[150px]">{student.name}</span>
                      </div>
                    </td>
                    {filteredActivities.map((act) => {
                      const grade = getGrade(student.id, act.id);
                      const sel = isSelected(student.id, act.id);
                      return (
                        <td key={`${student.id}-${act.id}`} className={`px-2 py-2.5 text-center ${sel ? 'bg-primary/5' : ''}`}>
                          <GradeCell
                            grade={grade}
                            onClick={() => openEdit(student.id, act.id)}
                            selected={bulkMode ? sel : undefined}
                            onSelect={bulkMode ? () => toggleBulkSelection(student.id, act.id) : undefined}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td className="px-4 py-2.5 text-xs font-semibold text-foreground sticky left-0 bg-muted/40">Media</td>
                  {filteredActivities.map(act => {
                    const grades = filteredStudents.map(s => getGrade(s.id, act.id)).filter(g => g !== null) as number[];
                    const avg = grades.length > 0 ? grades.reduce((s, g) => s + g, 0) / grades.length : null;
                    return (
                      <td key={`avg-${act.id}`} className="px-2 py-2.5 text-center">
                        {avg !== null ? <span className={`font-mono-nums text-xs font-bold ${getGradeColor(avg)}`}>{avg.toFixed(2)}</span> : <span className="text-muted-foreground text-[11px]">—</span>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── BY UT ── */}
      {tab === 'ut' && (
        <div className="space-y-4">
          {EVALUATIONS.filter(ev => filterEval === 'all' || ev.id === filterEval).map(ev => {
            const units = WORK_UNITS.filter(ut => ut.evaluationId === ev.id);
            return (
              <div key={ev.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{ev.name}</span>
                  <span className="text-xs text-muted-foreground">Peso: {ev.weight}%</span>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium sticky left-0 bg-card min-w-[200px]">Alumno</th>
                        {units.map(ut => (
                          <th key={ut.id} className="text-center px-3 py-2.5 text-muted-foreground font-medium min-w-[100px]">
                            <div className="font-mono text-[10px]">{ut.code}</div>
                            <div className="text-[10px] font-normal truncate max-w-[90px]">{ut.name}</div>
                            <div className="text-[9px] text-muted-foreground">{ut.taughtPercentage}% impartido</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 sticky left-0 bg-card">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{student.avatar}</div>
                              <span className="font-medium text-foreground truncate max-w-[150px]">{student.name}</span>
                            </div>
                          </td>
                          {units.map(ut => {
                            const utActivities = ACTIVITIES.filter(a => a.unitId === ut.id);
                            const grades = utActivities.map(a => getGrade(student.id, a.id)).filter(g => g !== null) as number[];
                            const avg = grades.length > 0 ? parseFloat((grades.reduce((s, g) => s + g, 0) / grades.length).toFixed(2)) : null;
                            return (
                              <td key={ut.id} className="px-3 py-2.5 text-center">
                                {avg !== null ? <span className={`font-mono-nums text-xs font-semibold ${getGradeColor(avg)}`}>{avg.toFixed(2)}</span> : <span className="text-muted-foreground text-[11px]">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BY RA / CE ── */}
      {tab === 'ra' && (
        <div className="space-y-4">
          {/* Propagation info banner */}
          {RA_RELATIONSHIPS.length > 0 && (
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <GitBranch size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
              <div>
                <span className="font-semibold">Propagación de notas activa:</span>{' '}
                {RA_RELATIONSHIPS.map((rel, i) => {
                  const src = LEARNING_OUTCOMES.find(r => r.id === rel.raSourceId);
                  const tgt = LEARNING_OUTCOMES.find(r => r.id === rel.raTargetId);
                  return (
                    <span key={rel.id}>
                      {src?.code} → {tgt?.code} ({rel.percentage}%)
                      {i < RA_RELATIONSHIPS.length - 1 ? ' · ' : ''}
                    </span>
                  );
                })}
                {'. '}
                La columna <span className="font-semibold">Nota Efectiva</span> muestra la nota resultante tras aplicar las relaciones de propagación.
              </div>
            </div>
          )}

          {LEARNING_OUTCOMES.map(ra => {
            const ces = CRITERIA.filter(c => c.raId === ra.id);
            const incomingRels = getRARelationshipsToTarget(ra.id);
            const hasIncoming = incomingRels.length > 0;

            const raGrades = filteredStudents.map(s => getRAGrade(s.id, ra.id)).filter(g => g !== null) as number[];
            const raAvg = raGrades.length > 0 ? raGrades.reduce((s, g) => s + g, 0) / raGrades.length : null;
            const raPassed = raGrades.filter(g => g >= 5).length;

            const effectiveGrades = filteredStudents.map(s => getEffectiveRAGrade(s.id, ra.id, getRAGrade(s.id, ra.id))).filter(g => g !== null) as number[];
            const effectiveAvg = effectiveGrades.length > 0 ? effectiveGrades.reduce((s, g) => s + g, 0) / effectiveGrades.length : null;
            const effectivePassed = effectiveGrades.filter(g => g >= 5).length;

            return (
              <div key={ra.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{ra.code}</span>
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{ra.description}</span>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">Peso: {ra.weight}%</span>
                    {raAvg !== null && <span className={`font-mono-nums text-xs font-bold ${getGradeColor(raAvg)}`}>Media: {raAvg.toFixed(2)}</span>}
                    {hasIncoming && effectiveAvg !== null && effectiveAvg !== raAvg && (
                      <span className={`font-mono-nums text-xs font-bold text-blue-600`}>Efectiva: {effectiveAvg.toFixed(2)}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {hasIncoming ? `${effectivePassed}` : `${raPassed}`}/{raGrades.length} superan
                    </span>
                    {hasIncoming && (
                      <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                        <GitBranch size={9} />
                        {incomingRels.map(r => {
                          const src = LEARNING_OUTCOMES.find(lo => lo.id === r.raSourceId);
                          return `${src?.code} ${r.percentage}%`;
                        }).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium sticky left-0 bg-card min-w-[200px]">Alumno</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium min-w-[90px] bg-primary/5">Nota RA</th>
                        {hasIncoming && (
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium min-w-[100px] bg-blue-50">
                            <div className="flex items-center justify-center gap-1">
                              <GitBranch size={10} className="text-blue-600" />
                              <span>Nota Efectiva</span>
                            </div>
                          </th>
                        )}
                        {ces.map(ce => (
                          <th key={ce.id} className="text-center px-2 py-2.5 text-muted-foreground font-medium min-w-[80px]">
                            <div className="font-mono text-[10px] font-semibold">{ce.code}</div>
                            <div className={`text-[9px] font-semibold px-1 py-0.5 rounded ${ce.difficulty === 'básico' ? 'text-green-700' : ce.difficulty === 'medio' ? 'text-amber-700' : 'text-red-700'}`}>{getDifficultyPoints(ce.difficulty)}pt</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStudents.map(student => {
                        const raGrade = getRAGrade(student.id, ra.id);
                        const effectiveGrade = hasIncoming ? getEffectiveRAGrade(student.id, ra.id, raGrade) : null;
                        const gradeChanged = effectiveGrade !== null && raGrade !== null && Math.abs(effectiveGrade - raGrade) > 0.005;
                        const gradeUnlocked = effectiveGrade !== null && raGrade === null;

                        return (
                          <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 sticky left-0 bg-card">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{student.avatar}</div>
                                <span className="font-medium text-foreground truncate max-w-[150px]">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center bg-primary/5">
                              {raGrade !== null ? (
                                <span className={`font-mono-nums text-xs font-bold ${getGradeColor(raGrade)}`}>{raGrade.toFixed(2)}</span>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
                            </td>
                            {hasIncoming && (
                              <td className="px-3 py-2.5 text-center bg-blue-50/60">
                                {effectiveGrade !== null ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`font-mono-nums text-xs font-bold ${getGradeColor(effectiveGrade)}`}>
                                      {effectiveGrade.toFixed(2)}
                                    </span>
                                    {gradeChanged && (
                                      <span className={`text-[8px] font-medium px-1 py-0.5 rounded-full ${effectiveGrade > (raGrade ?? 0) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {effectiveGrade > (raGrade ?? 0) ? '▲' : '▼'} {Math.abs(effectiveGrade - (raGrade ?? 0)).toFixed(2)}
                                      </span>
                                    )}
                                    {gradeUnlocked && (
                                      <span className="text-[8px] font-medium px-1 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                        por propagación
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                              </td>
                            )}
                            {ces.map(ce => {
                              const ceGrade = getCEGrade(student.id, ce.id);
                              const ceStatus = getCEStatus(ceGrade);
                              return (
                                <td key={ce.id} className="px-2 py-2.5 text-center">
                                  <div className="flex flex-col items-center gap-0.5">
                                    {ceGrade !== null ? <span className={`font-mono-nums text-[10px] font-semibold ${getGradeColor(ceGrade)}`}>{ceGrade.toFixed(2)}</span> : <span className="text-muted-foreground text-[10px]">—</span>}
                                    <span className={`text-[8px] px-1 py-0.5 rounded-full font-medium ${getCEStatusColor(ceStatus)}`}>{getCEStatusLabel(ceStatus).slice(0, 4)}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/40">
                        <td className="px-4 py-2.5 text-xs font-semibold text-foreground sticky left-0 bg-muted/40">Media</td>
                        <td className="px-3 py-2.5 text-center bg-primary/5">
                          {raAvg !== null ? <span className={`font-mono-nums text-xs font-bold ${getGradeColor(raAvg)}`}>{raAvg.toFixed(2)}</span> : <span className="text-muted-foreground text-[11px]">—</span>}
                        </td>
                        {hasIncoming && (
                          <td className="px-3 py-2.5 text-center bg-blue-50/60">
                            {effectiveAvg !== null ? (
                              <span className={`font-mono-nums text-xs font-bold ${getGradeColor(effectiveAvg)}`}>{effectiveAvg.toFixed(2)}</span>
                            ) : <span className="text-muted-foreground text-[11px]">—</span>}
                          </td>
                        )}
                        {ces.map(ce => {
                          const ceGrades = filteredStudents.map(s => getCEGrade(s.id, ce.id)).filter(g => g !== null) as number[];
                          const ceAvg = ceGrades.length > 0 ? ceGrades.reduce((s, g) => s + g, 0) / ceGrades.length : null;
                          return (
                            <td key={ce.id} className="px-2 py-2.5 text-center">
                              {ceAvg !== null ? <span className={`font-mono-nums text-[10px] font-bold ${getGradeColor(ceAvg)}`}>{ceAvg.toFixed(2)}</span> : <span className="text-muted-foreground text-[10px]">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── GRADE MAP ── */}
      {tab === 'mapa' && (
        <div className="flex gap-5">
          {/* Student selector */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="px-3 py-2.5 border-b border-border bg-muted/30">
                <p className="text-xs font-semibold text-foreground">Seleccionar alumno</p>
              </div>
              <div className="overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
                {STUDENTS.map(s => (
                  <button key={s.id} onClick={() => setSelectedMapStudent(s)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-left ${selectedMapStudent.id === s.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${s.riskLevel === 'high' ? 'bg-red-100 text-danger' : s.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      {s.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{s.nia}</p>
                    </div>
                    <span className={`text-[10px] font-bold font-mono-nums ${getGradeColor(s.moduleGrade)}`}>{getGradeLabel(s.moduleGrade)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grade map */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${selectedMapStudent.riskLevel === 'high' ? 'bg-red-100 text-danger' : selectedMapStudent.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-primary/10 text-primary'}`}>
                {selectedMapStudent.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedMapStudent.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMapStudent.nia} · Mapa de calificaciones por actividad → UT → Evaluación</p>
              </div>
            </div>
            <StudentGradeMapView student={selectedMapStudent} />
          </div>
        </div>
      )}

      {/* ── EDIT GRADE MODAL ── */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Editar nota manualmente</h3>
              <button onClick={() => setEditingCell(null)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="mb-4 p-3 bg-muted/40 rounded-lg">
              <p className="text-xs text-muted-foreground">Alumno</p>
              <p className="text-sm font-medium text-foreground">{STUDENTS.find(s => s.id === editingCell.studentId)?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Actividad</p>
              <p className="text-sm font-medium text-foreground">{ACTIVITIES.find(a => a.id === editingCell.activityId)?.name}</p>
              {editingCell.currentGrade !== null && (
                <p className="text-xs text-muted-foreground mt-1">Nota actual: <span className={`font-semibold ${getGradeColor(editingCell.currentGrade)}`}>{editingCell.currentGrade.toFixed(2)}</span></p>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Nueva nota (0–10)</label>
              <input
                type="number" min="0" max="10" step="0.01"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono-nums"
                autoFocus
              />
              <div className="flex items-center gap-1 mt-1.5">
                <Info size={11} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">La nota manual sobreescribe la nota automática de IA.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingCell(null)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <Check size={13} /> Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK EDIT MODAL ── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Edición masiva de notas</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{bulkSelections.length} celdas seleccionadas</p>
              </div>
              <button onClick={() => { setShowBulkModal(false); setShowPreview(false); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>

            {!showPreview ? (
              <>
                {/* Edit type selector */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Tipo de edición</p>
                  <div className="flex gap-2">
                    {[
                      { key: 'fixed', label: 'Nota fija', desc: 'Asignar la misma nota a todas las celdas' },
                      { key: 'offset', label: 'Desplazamiento', desc: 'Sumar o restar un valor a las notas actuales' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setBulkEditType(opt.key as 'fixed' | 'offset')}
                        className={`flex-1 p-3 rounded-lg border text-left transition-colors ${bulkEditType === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                      >
                        <p className={`text-xs font-semibold ${bulkEditType === opt.key ? 'text-primary' : 'text-foreground'}`}>{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {bulkEditType === 'fixed' ? 'Nota a asignar (0–10)' : 'Desplazamiento (ej: +1.5 o -0.5)'}
                  </label>
                  <input
                    type="number"
                    min={bulkEditType === 'fixed' ? 0 : -10}
                    max={bulkEditType === 'fixed' ? 10 : 10}
                    step="0.01"
                    value={bulkValue}
                    onChange={e => setBulkValue(e.target.value)}
                    placeholder={bulkEditType === 'fixed' ? 'Ej: 7.50' : 'Ej: 1.00 o -0.50'}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono-nums"
                    autoFocus
                  />
                  {bulkEditType === 'offset' && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Info size={11} className="text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">Las notas resultantes se limitarán al rango 0–10. Las celdas sin nota no se modificarán.</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => { setShowBulkModal(false); setShowPreview(false); }} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
                  <button onClick={computePreview} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    <AlertCircle size={13} /> Vista previa
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">Revisa los cambios antes de confirmar. Esta acción actualizará {bulkPreview.filter(r => r.newGrade !== null).length} notas.</p>
                </div>

                <div className="overflow-x-auto scrollbar-thin mb-4 max-h-64 overflow-y-auto border border-border rounded-lg">
                  <table className="w-full text-[10px]">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Alumno</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-medium">Actividad</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium">Nota actual</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium">Nueva nota</th>
                        <th className="text-center px-3 py-2 text-muted-foreground font-medium">Δ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {bulkPreview.map((row, idx) => {
                        const delta = row.currentGrade !== null && row.newGrade !== null ? row.newGrade - row.currentGrade : null;
                        return (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="px-3 py-1.5 font-medium text-foreground">{row.studentName}</td>
                            <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[150px]">{row.activityName.split(':')[0]}</td>
                            <td className="px-3 py-1.5 text-center">
                              {row.currentGrade !== null ? <span className={`font-mono-nums font-semibold ${getGradeColor(row.currentGrade)}`}>{row.currentGrade.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {row.newGrade !== null ? <span className={`font-mono-nums font-bold ${getGradeColor(row.newGrade)}`}>{row.newGrade.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {delta !== null ? (
                                <span className={`font-mono-nums font-bold text-[9px] px-1 py-0.5 rounded-full ${Math.abs(delta) < 0.01 ? 'text-muted-foreground' : delta > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setShowPreview(false)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">← Volver</button>
                  <button onClick={commitBulkEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                    <Check size={13} /> Confirmar cambios
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── EXPORT MODAL ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Exportar calificaciones</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Elige el formato y tipo de exportación</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>

            <div className="space-y-3 mb-5">
              {[
                {
                  icon: <Download size={16} className="text-primary" />,
                  title: 'CSV — Acta básica',
                  desc: 'NIA, nombre, notas por evaluación y nota módulo',
                  action: () => { handleExportCSV(); setShowExportModal(false); },
                  badge: 'CSV',
                  badgeColor: 'bg-green-100 text-green-700',
                },
                {
                  icon: <GitBranch size={16} className="text-blue-600" />,
                  title: 'CSV — Detallado con RA y cascadas',
                  desc: 'Nota base RA, nota efectiva tras cascada, delta por RA, nota módulo',
                  action: handleExportDetailedCSV,
                  badge: 'CSV',
                  badgeColor: 'bg-blue-100 text-blue-700',
                },
                {
                  icon: <FileText size={16} className="text-red-600" />,
                  title: 'PDF — Acta con notas RA y cascadas',
                  desc: 'Tabla completa con notas base y efectivas, lista para imprimir',
                  action: handleExportPDF,
                  badge: 'PDF',
                  badgeColor: 'bg-red-100 text-red-700',
                },
                {
                  icon: <Download size={16} className="text-muted-foreground" />,
                  title: 'JSON — Datos completos',
                  desc: 'Exportación estructurada para integración con otros sistemas',
                  action: () => { handleExportJSON(); setShowExportModal(false); },
                  badge: 'JSON',
                  badgeColor: 'bg-gray-100 text-gray-600',
                },
              ].map(opt => (
                <button
                  key={opt.title}
                  onClick={opt.action}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 hover:border-primary/30 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">{opt.title}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${opt.badgeColor}`}>{opt.badge}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-1 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>

            <button onClick={() => setShowExportModal(false)} className="w-full px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
