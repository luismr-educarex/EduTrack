'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, FileJson, FileCode, Printer, ChevronDown, CheckSquare, Square, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import PageHeader from '@/components/ui/PageHeader';

import { useEduTrack } from '@/contexts/EduTrackContext';
import { getGradeLabel, getGradeColor, getRiskLabel, getGradeQualitative, getCEGrade, getCEStatus, getRAGrade, generateCSV } from '@/lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

type ReportScope = 'module' | 'evaluation' | 'ra' | 'ce';
type ExportFormat = 'csv' | 'json' | 'html' | 'pdf';

export default function ReportsContent() {
  const { students: dbStudents, evaluations: dbEvaluations, learningOutcomes: dbLearningOutcomes, criteria: dbCriteria, loading } = useEduTrack();

  const STUDENTS = dbStudents;
  const EVALUATIONS = dbEvaluations;
  const LEARNING_OUTCOMES = dbLearningOutcomes;
  const CRITERIA = dbCriteria;

  const [scope, setScope] = useState<ReportScope>('module');
  const [selectedEval, setSelectedEval] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [searchStudent, setSearchStudent] = useState('');

  React.useEffect(() => {
    if (STUDENTS.length > 0) setSelectedStudents(new Set(STUDENTS.map(s => s.id)));
  }, [dbStudents]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStudents.size === STUDENTS.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(STUDENTS.map(s => s.id)));
  };

  const previewStudents = useMemo(() => STUDENTS.filter(s => selectedStudents.has(s.id)), [selectedStudents]);
  const passCount = previewStudents.filter(s => (s.moduleGrade ?? 0) >= 5).length;
  const failCount = previewStudents.length - passCount;
  const avgGrade = previewStudents.length > 0 ? previewStudents.reduce((s, st) => s + (st.moduleGrade ?? 0), 0) / previewStudents.length : 0;

  const distributionData = [
    { name: 'Insuf.', count: previewStudents.filter(s => (s.moduleGrade ?? 0) < 5).length, color: '#ef4444' },
    { name: 'Suf.', count: previewStudents.filter(s => { const g = s.moduleGrade ?? 0; return g >= 5 && g < 6; }).length, color: '#f59e0b' },
    { name: 'Bien', count: previewStudents.filter(s => { const g = s.moduleGrade ?? 0; return g >= 6 && g < 7; }).length, color: '#eab308' },
    { name: 'Notable', count: previewStudents.filter(s => { const g = s.moduleGrade ?? 0; return g >= 7 && g < 9; }).length, color: '#3b82f6' },
    { name: 'Sobres.', count: previewStudents.filter(s => (s.moduleGrade ?? 0) >= 9).length, color: '#22c55e' },
  ];

  const riskData = [
    { name: 'En riesgo', value: STUDENTS.filter(s => s.riskLevel === 'high').length, color: '#ef4444' },
    { name: 'Atención', value: STUDENTS.filter(s => s.riskLevel === 'medium').length, color: '#f59e0b' },
    { name: 'Seguimiento', value: STUDENTS.filter(s => s.riskLevel === 'low').length, color: '#3b82f6' },
    { name: 'Correcto', value: STUDENTS.filter(s => s.riskLevel === 'none').length, color: '#22c55e' },
  ];

  const handleExport = async (format: ExportFormat) => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 800));
    setIsGenerating(false);

    if (format === 'csv') {
      const headers = ['NIA', 'Alumno', ...EVALUATIONS.map(e => e.name), 'Nota Módulo', 'Calificación', 'Estado'];
      const rows = previewStudents.map(s => [
        s.nia, s.name, s.eval1Grade ?? '', s.eval2Grade ?? '',
        s.moduleGrade ?? '', getGradeQualitative(s.moduleGrade), getRiskLabel(s.riskLevel)
      ]);
      const csv = generateCSV(headers, rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'informe_calificaciones.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Acta CSV descargada');
    } else if (format === 'json') {
      const data = {
        module: 'PSP', course: '2025-2026', scope, exportedAt: new Date().toISOString(),
        summary: { total: previewStudents.length, passed: passCount, failed: failCount, average: avgGrade.toFixed(2) },
        students: previewStudents.map(s => ({
          nia: s.nia, name: s.name, eval1: s.eval1Grade, eval2: s.eval2Grade,
          module: s.moduleGrade, qualitative: getGradeQualitative(s.moduleGrade), risk: s.riskLevel
        }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'informe_calificaciones.json'; a.click();
      URL.revokeObjectURL(url);
      toast.success('JSON exportado');
    } else if (format === 'html') {
      const rows = previewStudents.map(s =>
        `<tr><td>${s.nia}</td><td>${s.name}</td><td>${s.eval1Grade ?? '—'}</td><td>${s.eval2Grade ?? '—'}</td><td><strong>${s.moduleGrade ?? '—'}</strong></td><td>${getGradeQualitative(s.moduleGrade)}</td></tr>`
      ).join('');
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Acta PSP 2025-2026</title><style>body{font-family:Arial,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}h1{color:#333}</style></head><body><h1>Acta de Calificaciones — PSP DAM 2º 2025-2026</h1><p>Generado: ${new Date().toLocaleDateString('es-ES')}</p><table><thead><tr><th>NIA</th><th>Alumno</th><th>1ª Ev.</th><th>2ª Ev.</th><th>Módulo</th><th>Calificación</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'acta_psp.html'; a.click();
      URL.revokeObjectURL(url);
      toast.success('HTML generado y descargado');
    } else if (format === 'pdf') {
      toast.info('Usa el diálogo de impresión del navegador para guardar como PDF');
      setTimeout(() => window.print(), 500);
    }
  };

  const scopeOptions: { key: ReportScope; label: string; desc: string }[] = [
    { key: 'module', label: 'Módulo completo', desc: 'Nota final ponderada de todas las evaluaciones' },
    { key: 'evaluation', label: 'Por evaluación', desc: 'Notas desglosadas por periodo de evaluación' },
    { key: 'ra', label: 'Por RA', desc: 'Estado de superación por resultado de aprendizaje' },
    { key: 'ce', label: 'Seguimiento CE', desc: 'Trazabilidad por criterio de evaluación' },
  ];

  const filteredStudentList = STUDENTS.filter(s => s.name.toLowerCase().includes(searchStudent.toLowerCase()) || s.nia.includes(searchStudent));

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Informes y Exportación"
        subtitle="PSP — DAM 2º · Genera actas, informes de progreso y exportaciones"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
              <FileText size={13} /> {showPreview ? 'Ocultar' : 'Mostrar'} vista previa
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Config panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Scope */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Alcance del informe</h3>
            <div className="space-y-2">
              {scopeOptions.map(opt => (
                <button key={opt.key} onClick={() => setScope(opt.key)}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-lg border transition-colors text-left ${scope === opt.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${scope === opt.key ? 'border-primary bg-primary' : 'border-border'}`}>
                    {scope === opt.key && <div className="w-2 h-2 rounded-full bg-white mx-auto mt-0.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {scope === 'evaluation' && (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-foreground mb-1">Evaluación</label>
                <div className="relative">
                  <select value={selectedEval} onChange={e => setSelectedEval(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="all">Todas las evaluaciones</option>
                    {EVALUATIONS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Student selection */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-foreground">Alumnado incluido</h3>
              <button onClick={toggleAll} className="text-[10px] text-primary hover:underline">
                {selectedStudents.size === STUDENTS.length ? 'Deseleccionar' : 'Seleccionar todos'}
              </button>
            </div>
            <input type="text" placeholder="Buscar..." value={searchStudent} onChange={e => setSearchStudent(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
            <div className="space-y-0.5 max-h-56 overflow-y-auto scrollbar-thin">
              {filteredStudentList.map(student => (
                <button key={student.id} onClick={() => toggleStudent(student.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 transition-colors text-left">
                  {selectedStudents.has(student.id) ? <CheckSquare size={13} className="text-primary flex-shrink-0" /> : <Square size={13} className="text-muted-foreground flex-shrink-0" />}
                  <span className="text-[11px] text-foreground truncate flex-1">{student.name}</span>
                  <span className={`text-[10px] font-mono-nums font-semibold flex-shrink-0 ${getGradeColor(student.moduleGrade)}`}>{getGradeLabel(student.moduleGrade)}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
              {selectedStudents.size} de {STUDENTS.length} alumnos seleccionados
            </div>
          </div>

          {/* Export buttons */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <h3 className="text-xs font-semibold text-foreground mb-3">Exportar informe</h3>
            <div className="space-y-2">
              {[
                { format: 'csv' as ExportFormat, label: 'Descargar CSV', icon: <Download size={13} />, desc: 'Acta en formato tabla', color: 'border-border hover:bg-muted' },
                { format: 'json' as ExportFormat, label: 'Exportar JSON', icon: <FileJson size={13} />, desc: 'Estado completo del módulo', color: 'border-border hover:bg-muted' },
                { format: 'html' as ExportFormat, label: 'Generar HTML', icon: <FileCode size={13} />, desc: 'Documento autocontenido', color: 'border-border hover:bg-muted' },
                { format: 'pdf' as ExportFormat, label: 'Imprimir / PDF', icon: <Printer size={13} />, desc: 'Usa el diálogo del navegador', color: 'border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary' },
              ].map(btn => (
                <button key={btn.format} onClick={() => handleExport(btn.format)} disabled={isGenerating || selectedStudents.size === 0}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors disabled:opacity-50 ${btn.color}`}>
                  <span className="flex-shrink-0">{btn.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium">{btn.label}</p>
                    <p className="text-[10px] text-muted-foreground">{btn.desc}</p>
                  </div>
                  {isGenerating && <RefreshCw size={12} className="animate-spin text-muted-foreground flex-shrink-0" />}
                </button>
              ))}
            </div>
            {selectedStudents.size === 0 && (
              <p className="text-[10px] text-danger mt-2 flex items-center gap-1"><AlertTriangle size={11} /> Selecciona al menos un alumno</p>
            )}
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="lg:col-span-3 space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Alumnos en informe', value: previewStudents.length, color: 'text-foreground' },
                { label: 'Aprobados', value: passCount, color: 'text-success' },
                { label: 'Suspensos', value: failCount, color: failCount > 0 ? 'text-danger' : 'text-muted-foreground' },
                { label: 'Nota media', value: avgGrade.toFixed(2), color: getGradeColor(avgGrade) },
              ].map(stat => (
                <div key={stat.label} className="bg-card rounded-xl border border-border shadow-card p-3 text-center">
                  <p className={`text-2xl font-bold font-mono-nums ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Distribution bar chart */}
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Distribución de calificaciones</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={distributionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk pie chart */}
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3">Estado del alumnado</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                      {riskData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── MODULE SCOPE ── */}
            {scope === 'module' && (
              <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground">Acta de calificaciones — Módulo completo</h3>
                  <span className="text-xs text-muted-foreground">{previewStudents.length} alumnos</span>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">NIA</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Alumno</th>
                        {EVALUATIONS.map(ev => <th key={ev.id} className="text-center px-3 py-2.5 text-muted-foreground font-medium">{ev.name}</th>)}
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium bg-primary/5">Módulo</th>
                        <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Calificación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewStudents.map(student => (
                        <tr key={student.id} className={`hover:bg-muted/30 transition-colors ${student.riskLevel === 'high' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{student.nia}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{student.avatar}</div>
                              <span className="font-medium text-foreground">{student.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center"><span className={`font-mono-nums text-xs font-semibold ${getGradeColor(student.eval1Grade)}`}>{getGradeLabel(student.eval1Grade)}</span></td>
                          <td className="px-3 py-2.5 text-center"><span className={`font-mono-nums text-xs font-semibold ${getGradeColor(student.eval2Grade)}`}>{getGradeLabel(student.eval2Grade)}</span></td>
                          <td className="px-3 py-2.5 text-center bg-primary/5"><span className={`font-mono-nums text-sm font-bold ${getGradeColor(student.moduleGrade)}`}>{getGradeLabel(student.moduleGrade)}</span></td>
                          <td className="px-3 py-2.5 text-center"><span className="text-[10px] text-muted-foreground">{getGradeQualitative(student.moduleGrade)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/40">
                        <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-foreground">Media del grupo</td>
                        <td className="px-3 py-2.5 text-center"><span className="font-mono-nums text-xs font-bold">{(STUDENTS.reduce((s, st) => s + (st.eval1Grade ?? 0), 0) / STUDENTS.length).toFixed(2)}</span></td>
                        <td className="px-3 py-2.5 text-center"><span className="font-mono-nums text-xs font-bold">{(STUDENTS.filter(s => s.eval2Grade !== null).reduce((s, st) => s + (st.eval2Grade ?? 0), 0) / Math.max(1, STUDENTS.filter(s => s.eval2Grade !== null).length)).toFixed(2)}</span></td>
                        <td className="px-3 py-2.5 text-center bg-primary/5"><span className={`font-mono-nums text-xs font-bold ${getGradeColor(avgGrade)}`}>{avgGrade.toFixed(2)}</span></td>
                        <td className="px-3 py-2.5 text-center"><span className="text-xs text-muted-foreground">{passCount}/{previewStudents.length} aprobados</span></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ── RA SCOPE ── */}
            {scope === 'ra' && (
              <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-xs font-semibold text-foreground">Informe por Resultado de Aprendizaje</h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium min-w-[200px]">Alumno</th>
                        {LEARNING_OUTCOMES.map(ra => (
                          <th key={ra.id} className="text-center px-3 py-2.5 text-muted-foreground font-medium min-w-[80px]">
                            <div className="font-mono text-[10px] font-semibold">{ra.code}</div>
                            <div className="text-[9px] font-normal">{ra.weight}%</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewStudents.map(student => (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{student.avatar}</div>
                              <span className="font-medium text-foreground truncate max-w-[150px]">{student.name}</span>
                            </div>
                          </td>
                          {LEARNING_OUTCOMES.map(ra => {
                            const raGrade = getRAGrade(student.id, ra.id);
                            return (
                              <td key={ra.id} className="px-3 py-2.5 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`font-mono-nums text-xs font-bold ${getGradeColor(raGrade)}`}>{getGradeLabel(raGrade)}</span>
                                  {raGrade !== null && (
                                    <span className={`text-[8px] px-1 py-0.5 rounded-full font-medium ${raGrade >= 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {raGrade >= 5 ? 'Sup.' : 'No sup.'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── CE SCOPE ── */}
            {scope === 'ce' && (
              <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-xs font-semibold text-foreground">Seguimiento por Criterio de Evaluación</h3>
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-xs min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium min-w-[200px] sticky left-0 bg-muted/30">Alumno</th>
                        {CRITERIA.map(ce => (
                          <th key={ce.id} className="text-center px-2 py-2.5 text-muted-foreground font-medium min-w-[60px]">
                            <div className="font-mono text-[9px] font-semibold">{ce.code}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewStudents.map(student => (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2 sticky left-0 bg-card">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{student.avatar}</div>
                              <span className="font-medium text-foreground truncate max-w-[140px]">{student.name}</span>
                            </div>
                          </td>
                          {CRITERIA.map(ce => {
                            const ceGrade = getCEGrade(student.id, ce.id);
                            const status = getCEStatus(ceGrade);
                            return (
                              <td key={ce.id} className="px-1 py-2 text-center">
                                <div className={`w-8 h-5 rounded text-[8px] font-semibold flex items-center justify-center mx-auto ${status === 'superado' ? 'bg-green-100 text-green-700' : status === 'parcial' ? 'bg-amber-100 text-amber-700' : status === 'no_superado' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                                  {ceGrade !== null ? ceGrade.toFixed(1) : '—'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── EVALUATION SCOPE ── */}
            {scope === 'evaluation' && (
              <div className="space-y-4">
                {EVALUATIONS.filter(ev => selectedEval === 'all' || ev.id === selectedEval).map(ev => {
                  const evStudents = previewStudents;
                  const evAvg = evStudents.reduce((s, st) => s + ((ev.id === 'eval-1' ? st.eval1Grade : st.eval2Grade) ?? 0), 0) / Math.max(1, evStudents.length);
                  const evPass = evStudents.filter(s => ((ev.id === 'eval-1' ? s.eval1Grade : s.eval2Grade) ?? 0) >= 5).length;
                  return (
                    <div key={ev.id} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xs font-semibold text-foreground">{ev.name}</h3>
                          <span className="text-xs text-muted-foreground">Peso: {ev.weight}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono-nums text-xs font-bold ${getGradeColor(evAvg)}`}>Media: {evAvg.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground">{evPass}/{evStudents.length} aprobados</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-xs min-w-[500px]">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">NIA</th>
                              <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Alumno</th>
                              <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Nota</th>
                              <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Calificación</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {evStudents.map(student => {
                              const grade = ev.id === 'eval-1' ? student.eval1Grade : student.eval2Grade;
                              return (
                                <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{student.nia}</td>
                                  <td className="px-4 py-2.5 font-medium text-foreground">{student.name}</td>
                                  <td className="px-3 py-2.5 text-center"><span className={`font-mono-nums text-xs font-bold ${getGradeColor(grade)}`}>{getGradeLabel(grade)}</span></td>
                                  <td className="px-3 py-2.5 text-center"><span className="text-[10px] text-muted-foreground">{getGradeQualitative(grade)}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
