'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, User, AlertTriangle, MessageSquare, Calendar, X, Edit2, Clock, ExternalLink, Check, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StudentTimeline from './StudentTimeline';
import { getGradeLabel, getGradeColor, getRiskBadge, getRiskLabel, getCEGrade, getCEStatus, getCEStatusColor, getCEStatusLabel, getRAGrade, getIncidentTypeColor, getIncidentTypeLabel, getDifficultyPoints } from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';
import { incidentService, studentService } from '@/lib/services/edutrackService';
import type { Student, Incident, TutoringAction } from '@/lib/services/edutrackService';

type ProfileTab = 'rendimiento' | 'seguimiento' | 'tutoría' | 'asistencia';
type MainView = 'students' | 'diary' | 'calendar';

interface IncidentFormData {
  type: string;
  detail: string;
  date: string;
}

interface TutoringFormData {
  type: string;
  content: string;
  followUp: string;
}

export default function StudentsTutoringContent() {
  const { students: dbStudents, incidents: dbIncidents, sessionLogs: SESSION_LOGS, activities: ACTIVITIES, tutoringActions: dbTutoringActions, calendarEvents: CALENDAR_EVENTS, criteria: CRITERIA, learningOutcomes: LEARNING_OUTCOMES, workUnits: WORK_UNITS, loading, refreshIncidents, refreshTutoringActions, refreshStudents } = useEduTrack();

  const [mainView, setMainView] = useState<MainView>('students');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<ProfileTab>('rendimiento');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showTutoringModal, setShowTutoringModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tutoringActions, setTutoringActions] = useState<TutoringAction[]>([]);
  const [incidentForm, setIncidentForm] = useState<IncidentFormData>({ type: 'observación', detail: '', date: new Date().toISOString().split('T')[0] });
  const [tutoringForm, setTutoringForm] = useState<TutoringFormData>({ type: 'entrevista', content: '', followUp: '' });
  const [students, setStudents] = useState<Student[]>([]);
  const [editingGithub, setEditingGithub] = useState(false);
  const [githubInput, setGithubInput] = useState('');
  const STUDENTS = students;

  React.useEffect(() => {
    setStudents(dbStudents);
    if (!selectedStudent && dbStudents.length > 0) setSelectedStudent(dbStudents[0]);
  }, [dbStudents]);

  React.useEffect(() => { setIncidents(dbIncidents); }, [dbIncidents]);
  React.useEffect(() => { setTutoringActions(dbTutoringActions); }, [dbTutoringActions]);

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.nia.includes(search);
    const matchRisk = filterRisk === 'all' || s.riskLevel === filterRisk;
    return matchSearch && matchRisk;
  });

  const studentIncidents = incidents.filter(i => i.studentId === selectedStudent?.id);
  const studentTutoring = tutoringActions.filter(t => t.studentId === selectedStudent?.id);

  const riskCounts = {
    high: students.filter(s => s.riskLevel === 'high').length,
    medium: students.filter(s => s.riskLevel === 'medium').length,
    low: students.filter(s => s.riskLevel === 'low').length,
    none: students.filter(s => s.riskLevel === 'none').length,
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.detail.trim()) { toast.error('El detalle es obligatorio'); return; }
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const newInc: Incident = {
        id: `inc-${Date.now()}`,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        date: incidentForm.date,
        type: incidentForm.type as Incident['type'],
        detail: incidentForm.detail,
      };
      await incidentService.upsert(newInc);
      await refreshIncidents();
      toast.success('Incidencia registrada');
      setShowIncidentModal(false);
      setIncidentForm({ type: 'observación', detail: '', date: new Date().toISOString().split('T')[0] });
    } catch {
      toast.error('Error al guardar la incidencia');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTutoring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutoringForm.content.trim()) { toast.error('El contenido es obligatorio'); return; }
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const newTA: TutoringAction = {
      id: `ta-${Date.now()}`,
      studentId: selectedStudent?.id ?? '',
      date: '2026-07-14',
      type: tutoringForm.type as TutoringAction['type'],
      content: tutoringForm.content,
      followUp: tutoringForm.followUp,
    };
    setTutoringActions(prev => [newTA, ...prev]);
    setIsSubmitting(false);
    setShowTutoringModal(false);
    setTutoringForm({ type: 'entrevista', content: '', followUp: '' });
    toast.success('Acción tutorial registrada');
  };

  const handleSaveGithub = async () => {
    if (!selectedStudent) return;
    const url = githubInput.trim();
    if (url && !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/i.test(url)) {
      toast.error('Usa https://github.com/usuario/repositorio');
      return;
    }
    try {
      const updated = { ...selectedStudent, githubUrl: url || undefined };
      await studentService.upsert(updated);
      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updated : s));
      setSelectedStudent(updated);
      await refreshStudents();
      setEditingGithub(false);
      toast.success('Repositorio GitHub actualizado');
    } catch {
      toast.error('No se pudo guardar el repositorio');
    }
  };

  const profileTabs: { key: ProfileTab; label: string }[] = [
    { key: 'rendimiento', label: 'Rendimiento' },
    { key: 'seguimiento', label: 'Seguimiento CE' },
    { key: 'asistencia', label: 'Asistencia' },
    { key: 'tutoría', label: 'Acción Tutorial' },
  ];

  type ProfileTabExtended = ProfileTab | 'timeline';
  const [profileTabEx, setProfileTabEx] = useState<ProfileTabExtended>('rendimiento');

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Alumnado y Tutoría"
        subtitle={`PSP — DAM 2º · ${STUDENTS.length} alumnos · ${riskCounts.high + riskCounts.medium} en seguimiento`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              {([['students', 'Alumnado'], ['diary', 'Diario'], ['calendar', 'Agenda']] as [MainView, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setMainView(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${mainView === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => toast.info('Nuevo alumno')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all">
              <Plus size={13} /> Nuevo alumno
            </button>
          </div>
        }
      />

      {/* ── STUDENTS VIEW ── */}
      {mainView === 'students' && (
        <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[600px]">
          {/* Left: Student list */}
          <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'all', label: `Todos (${STUDENTS.length})` },
                { key: 'high', label: `Riesgo (${riskCounts.high})`, color: 'bg-red-100 text-danger border-red-200' },
                { key: 'medium', label: `Atención (${riskCounts.medium})`, color: 'bg-amber-100 text-warning border-amber-200' },
                { key: 'none', label: `Correcto (${riskCounts.none})`, color: 'bg-green-100 text-success border-green-200' },
              ].map(chip => (
                <button key={chip.key} onClick={() => setFilterRisk(chip.key)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${filterRisk === chip.key ? 'bg-primary text-primary-foreground border-primary' : (chip.color || 'bg-muted text-muted-foreground border-border')}`}>
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar alumno o NIA..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin bg-card rounded-xl border border-border shadow-card">
              {filtered.map((student) => (
                <div key={student.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${selectedStudent?.id === student.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                  <button onClick={() => setSelectedStudent(student)} className="flex flex-1 min-w-0 items-center gap-3 py-1 text-left">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${student.riskLevel === 'high' ? 'bg-red-100 text-danger' : student.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-muted text-muted-foreground'}`}>
                      {student.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{student.nia}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-xs font-bold font-mono-nums ${getGradeColor(student.moduleGrade)}`}>{getGradeLabel(student.moduleGrade)}</p>
                      {(student.riskLevel === 'high' || student.riskLevel === 'medium') && (
                        <AlertTriangle size={10} className={`${student.riskLevel === 'high' ? 'text-danger' : 'text-warning'} ml-auto mt-0.5`} />
                      )}
                    </div>
                  </button>
                  <Link href={`/students-tutoring/${student.id}`} aria-label={`Abrir ficha de ${student.name}`}
                    className="flex flex-shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/5">
                    <ExternalLink size={11} /> Ficha
                  </Link>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center px-4">
                  <User size={20} className="text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Sin resultados</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Student profile */}
          {selectedStudent ? (
            <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
              {/* Profile header */}
              <div className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${selectedStudent.riskLevel === 'high' ? 'bg-red-100 text-danger' : selectedStudent.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-primary/10 text-primary'}`}>
                    {selectedStudent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">{selectedStudent.name}</h2>
                        <p className="text-xs text-muted-foreground font-mono">{selectedStudent.nia} · {selectedStudent.email}</p>
                        {/* GitHub URL row */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" className="text-muted-foreground flex-shrink-0"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                          {editingGithub ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="url"
                                value={githubInput}
                                onChange={e => setGithubInput(e.target.value)}
                                placeholder="https://github.com/usuario/repositorio"
                                className="text-xs border border-border rounded px-2 py-0.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveGithub(); if (e.key === 'Escape') setEditingGithub(false); }}
                              />
                              <button onClick={handleSaveGithub} className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors" title="Guardar">
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditingGithub(false)} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors" title="Cancelar">
                                <X size={12} />
                              </button>
                            </div>
                          ) : selectedStudent.githubUrl ? (
                            <div className="flex items-center gap-1.5">
                              <a href={selectedStudent.githubUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-xs">
                                {selectedStudent.githubUrl.replace('https://github.com/', '')}
                                <ExternalLink size={10} className="flex-shrink-0" />
                              </a>
                              <button onClick={() => { setGithubInput(selectedStudent.githubUrl ?? ''); setEditingGithub(true); }}
                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Editar repositorio">
                                <Edit2 size={10} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => { setGithubInput(''); setEditingGithub(true); }}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                              <span>Añadir repositorio GitHub</span>
                              <Plus size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskBadge(selectedStudent.riskLevel)}`}>{getRiskLabel(selectedStudent.riskLevel)}</span>
                        <button onClick={() => { setShowIncidentModal(true); }} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-[10px] font-medium hover:bg-muted transition-colors">
                          <Plus size={10} /> Incidencia
                        </button>
                        <button onClick={() => toast.info('Editar alumno')} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mt-3">
                      {[
                        { label: 'Nota módulo', value: getGradeLabel(selectedStudent.moduleGrade), color: getGradeColor(selectedStudent.moduleGrade) },
                        { label: '1ª Evaluación', value: getGradeLabel(selectedStudent.eval1Grade), color: getGradeColor(selectedStudent.eval1Grade) },
                        { label: '2ª Evaluación', value: getGradeLabel(selectedStudent.eval2Grade), color: getGradeColor(selectedStudent.eval2Grade) },
                        { label: 'Faltas', value: selectedStudent.absences.toString(), color: selectedStudent.absences > 8 ? 'text-danger' : selectedStudent.absences > 4 ? 'text-warning' : 'text-foreground' },
                      ].map(stat => (
                        <div key={stat.label} className="text-center p-2 rounded-lg bg-muted/40">
                          <p className={`text-lg font-bold font-mono-nums ${stat.color}`}>{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* CE summary bar */}
              <div className="bg-card rounded-xl border border-border shadow-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-foreground">Estado de criterios de evaluación</p>
                  <p className="text-xs text-muted-foreground">{selectedStudent.ceSuperado + selectedStudent.ceParcial + selectedStudent.ceNoSuperado} evaluados / 22 total</p>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  {[
                    { val: selectedStudent.ceSuperado, color: 'bg-success' },
                    { val: selectedStudent.ceParcial, color: 'bg-warning' },
                    { val: selectedStudent.ceNoSuperado, color: 'bg-danger' },
                    { val: selectedStudent.ceNoEvaluado, color: 'bg-muted' },
                  ].filter(s => s.val > 0).map((seg, si) => (
                    <div key={si} className={`${seg.color} h-full rounded-sm`} style={{ flex: seg.val }} />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success inline-block" /> Superado: {selectedStudent.ceSuperado}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-warning inline-block" /> Parcial: {selectedStudent.ceParcial}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger inline-block" /> No superado: {selectedStudent.ceNoSuperado}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted inline-block" /> No evaluado: {selectedStudent.ceNoEvaluado}</span>
                </div>
              </div>

              {/* Profile tabs */}
              <div className="flex items-center gap-1 border-b border-border overflow-x-auto scrollbar-thin">
                {profileTabs.map(t => (
                  <button key={t.key} onClick={() => { setProfileTab(t.key); setProfileTabEx(t.key); }}
                    className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${profileTabEx === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t.label}
                  </button>
                ))}
                <button onClick={() => setProfileTabEx('timeline')}
                  className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex items-center gap-1.5 ${profileTabEx === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  <TrendingUp size={11} /> Timeline Dominio
                </button>
              </div>

              {/* ── TIMELINE TAB ── */}
              {profileTabEx === 'timeline' && (
                <StudentTimeline student={selectedStudent} />
              )}

              {/* ── RENDIMIENTO TAB ── */}
              {profileTabEx === 'rendimiento' && (
                <div className="space-y-4">
                  {/* RA grades */}
                  <div className="bg-card rounded-xl border border-border shadow-card p-4">
                    <h3 className="text-xs font-semibold text-foreground mb-3">Calificación por Resultado de Aprendizaje</h3>
                    <div className="space-y-2">
                      {LEARNING_OUTCOMES.map(ra => {
                        const raGrade = getRAGrade(selectedStudent.id, ra.id);
                        const pct = raGrade !== null ? (raGrade / 10) * 100 : 0;
                        return (
                          <div key={ra.id} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold font-mono text-primary w-8 flex-shrink-0">{ra.code}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${raGrade === null ? 'bg-muted-foreground/30' : raGrade >= 7 ? 'bg-success' : raGrade >= 5 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`font-mono-nums text-xs font-bold w-10 text-right flex-shrink-0 ${getGradeColor(raGrade)}`}>{getGradeLabel(raGrade)}</span>
                            <span className="text-[10px] text-muted-foreground w-8 flex-shrink-0">{ra.weight}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity grades */}
                  <div className="bg-card rounded-xl border border-border shadow-card p-4">
                    <h3 className="text-xs font-semibold text-foreground mb-3">Actividades evaluadas</h3>
                    <div className="space-y-1.5">
                      {ACTIVITIES.filter(a => a.status !== 'borrador' && a.status !== 'publicada').map(act => {
                        const grade = STUDENTS.findIndex(s => s.id === selectedStudent.id) !== -1
                          ? (() => {
                              const sIdx = STUDENTS.findIndex(s => s.id === selectedStudent.id);
                              const aIdx = ACTIVITIES.findIndex(a => a.id === act.id);
                              if (act.status === 'borrador' || act.status === 'publicada') return null;
                              if (act.status === 'en_correccion') {
                                const corrected = (sIdx * 7 + aIdx * 3) % STUDENTS.length < act.correctionCount;
                                if (!corrected) return null;
                              }
                              const base = ((sIdx * 31 + aIdx * 17) % 60) / 10 + 4;
                              return Math.min(10, Math.max(0, parseFloat(base.toFixed(2))));
                            })()
                          : null;
                        return (
                          <div key={act.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{act.name}</p>
                              <p className="text-[10px] text-muted-foreground">{act.type} · {act.dueDate}</p>
                            </div>
                            <StatusBadge status={act.status} size="sm" />
                            <span className={`font-mono-nums text-xs font-bold w-10 text-right flex-shrink-0 ${getGradeColor(grade)}`}>{getGradeLabel(grade)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── SEGUIMIENTO CE TAB ── */}
              {profileTabEx === 'seguimiento' && (
                <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-xs font-semibold text-foreground">Trazabilidad por Criterio de Evaluación</h3>
                  </div>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-20">CE</th>
                          <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Enunciado</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-20">Nota</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-28">Estado</th>
                          <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-16">Nivel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {LEARNING_OUTCOMES.map(ra => (
                          <React.Fragment key={ra.id}>
                            <tr className="bg-muted/20">
                              <td colSpan={5} className="px-4 py-2">
                                <span className="text-[10px] font-bold text-primary font-mono">{ra.code}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">{ra.description.slice(0, 60)}...</span>
                              </td>
                            </tr>
                            {CRITERIA.filter(c => c.raId === ra.id).map(ce => {
                              const ceGrade = getCEGrade(selectedStudent.id, ce.id);
                              const ceStatus = getCEStatus(ceGrade);
                              return (
                                <tr key={ce.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5">
                                    <span className="font-mono text-[11px] font-semibold text-foreground">{ce.code}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-muted-foreground leading-relaxed">{ce.description}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`font-mono-nums text-xs font-bold ${getGradeColor(ceGrade)}`}>{getGradeLabel(ceGrade)}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getCEStatusColor(ceStatus)}`}>{getCEStatusLabel(ceStatus)}</span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{ce.difficulty} · {getDifficultyPoints(ce.difficulty)}pt</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── ASISTENCIA TAB ── */}
              {profileTabEx === 'asistencia' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Faltas totales', value: selectedStudent.absences, color: selectedStudent.absences > 8 ? 'text-danger' : 'text-foreground' },
                      { label: 'Incidencias', value: selectedStudent.incidents, color: selectedStudent.incidents > 3 ? 'text-warning' : 'text-foreground' },
                      { label: 'Asistencia', value: `${Math.max(0, 100 - Math.round((selectedStudent.absences / 80) * 100))}%`, color: 'text-success' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-card rounded-xl border border-border shadow-card p-3 text-center">
                        <p className={`text-2xl font-bold font-mono-nums ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-card rounded-xl border border-border shadow-card p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-foreground">Registro de incidencias</h3>
                      <button onClick={() => setShowIncidentModal(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Plus size={12} /> Registrar
                      </button>
                    </div>
                    {studentIncidents.length > 0 ? (
                      <div className="space-y-2">
                        {studentIncidents.map(inc => (
                          <div key={inc.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${getIncidentTypeColor(inc.type)}`}>{getIncidentTypeLabel(inc.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground leading-relaxed">{inc.detail}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{inc.date}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">Sin incidencias registradas</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── TUTORÍA TAB ── */}
              {profileTabEx === 'tutoría' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-foreground">Historial de acción tutorial</h3>
                    <button onClick={() => setShowTutoringModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                      <Plus size={12} /> Nueva acción
                    </button>
                  </div>
                  {studentTutoring.length > 0 ? (
                    <div className="space-y-3">
                      {studentTutoring.map(ta => (
                        <div key={ta.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${ta.type === 'entrevista' ? 'bg-blue-100 text-blue-700' : ta.type === 'acuerdo' ? 'bg-green-100 text-green-700' : ta.type === 'seguimiento' ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground'}`}>
                                {ta.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{ta.date}</span>
                            </div>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">{ta.content}</p>
                          {ta.followUp && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-primary bg-primary/5 rounded px-2 py-1">
                              <Clock size={10} /> Seguimiento: {ta.followUp}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
                      <MessageSquare size={24} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Sin acciones tutoriales registradas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <User size={32} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecciona un alumno para ver su perfil</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DIARY VIEW ── */}
      {mainView === 'diary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Diario de sesiones</h2>
            <button onClick={() => toast.info('Nueva sesión')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={13} /> Nueva sesión
            </button>
          </div>
          {SESSION_LOGS.map(log => {
            const unit = WORK_UNITS.find(ut => ut.id === log.unitId);
            return (
              <div key={log.id} className="bg-card rounded-xl border border-border shadow-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{unit?.code ?? log.unitId}</span>
                    <span className="text-sm font-medium text-foreground">{unit?.name ?? log.unitId}</span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{log.date}</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Desarrollo</p>
                    <p className="text-xs text-foreground leading-relaxed">{log.development}</p>
                  </div>
                  {log.homework && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Tareas</p>
                      <p className="text-xs text-foreground leading-relaxed">{log.homework}</p>
                    </div>
                  )}
                  {log.notes && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 leading-relaxed">{log.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {mainView === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Agenda y próximas fechas</h2>
            <button onClick={() => toast.info('Nuevo evento')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={13} /> Nuevo evento
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {CALENDAR_EVENTS.map(ev => (
              <div key={ev.id} className="bg-card rounded-xl border border-border shadow-card p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ev.type === 'examen' ? 'bg-red-100' : ev.type === 'entrega' ? 'bg-amber-100' : ev.type === 'tutoría' ? 'bg-blue-100' : ev.type === 'festivo' ? 'bg-gray-100' : ev.type === 'reunión' ? 'bg-purple-100' : 'bg-green-100'}`}>
                  <Calendar size={16} className={ev.type === 'examen' ? 'text-red-600' : ev.type === 'entrega' ? 'text-amber-600' : ev.type === 'tutoría' ? 'text-blue-600' : ev.type === 'festivo' ? 'text-gray-500' : ev.type === 'reunión' ? 'text-purple-600' : 'text-green-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 capitalize ${ev.type === 'examen' ? 'bg-red-100 text-red-700' : ev.type === 'entrega' ? 'bg-amber-100 text-amber-700' : ev.type === 'tutoría' ? 'bg-blue-100 text-blue-700' : ev.type === 'festivo' ? 'bg-gray-100 text-gray-600' : ev.type === 'reunión' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                      {ev.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{ev.date}</p>
                  {ev.notes && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ev.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INCIDENT MODAL ── */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Registrar incidencia</h3>
              <button onClick={() => setShowIncidentModal(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddIncident} className="p-5 space-y-4">
              {selectedStudent && (
                <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{selectedStudent.avatar}</div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{selectedStudent.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedStudent.nia}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Tipo</label>
                  <select value={incidentForm.type} onChange={e => setIncidentForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="observación">Observación</option>
                    <option value="aviso">Aviso</option>
                    <option value="falta">Falta</option>
                    <option value="positivo">Positivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Fecha</label>
                  <input type="date" value={incidentForm.date} onChange={e => setIncidentForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Detalle *</label>
                <textarea value={incidentForm.detail} onChange={e => setIncidentForm(p => ({ ...p, detail: e.target.value }))} rows={3} required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe la incidencia..." />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowIncidentModal(false)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {isSubmitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TUTORING MODAL ── */}
      {showTutoringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Nueva acción tutorial</h3>
              <button onClick={() => setShowTutoringModal(false)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddTutoring} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Tipo de acción</label>
                <select value={tutoringForm.type} onChange={e => setTutoringForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="entrevista">Entrevista</option>
                  <option value="acuerdo">Acuerdo</option>
                  <option value="observación">Observación</option>
                  <option value="seguimiento">Seguimiento</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Contenido *</label>
                <textarea value={tutoringForm.content} onChange={e => setTutoringForm(p => ({ ...p, content: e.target.value }))} rows={4} required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe la acción tutorial, acuerdos, observaciones..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Seguimiento / Próxima acción</label>
                <input type="text" value={tutoringForm.followUp} onChange={e => setTutoringForm(p => ({ ...p, followUp: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ej: Revisión en 2 semanas" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowTutoringModal(false)} className="flex-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {isSubmitting ? 'Guardando...' : 'Registrar acción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
