'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, BookCheck, ClipboardCheck, Target, TrendingUp, Clock, CheckCircle2, ChevronRight, RefreshCw, Calendar, Users, BookOpen, BarChart2, ArrowRight, Bell } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/ui/PageHeader';
import Link from 'next/link';
import { getCEGrade, getCEStatus, getEvalWeightedGrade, getGradeLabel, getGradeColor, getRiskBadge, getRiskLabel, getIncidentTypeColor, getIncidentTypeLabel, getRAGrade } from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';

const CEPerformanceChart = dynamic(() => import('./CEPerformanceChart'), { ssr: false });
const GradeTrendChart = dynamic(() => import('./GradeTrendChart'), { ssr: false });
const RARadialChart = dynamic(() => import('./RARadialChart'), { ssr: false });

export default function DashboardContent() {
  const { students: STUDENTS, activities: ACTIVITIES, grades: GRADES, learningOutcomes: LEARNING_OUTCOMES, criteria: CRITERIA, evaluations: EVALUATIONS, workUnits: WORK_UNITS, incidents: INCIDENTS, sessionLogs: SESSION_LOGS, loading } = useEduTrack();
  const [lastUpdate] = useState(new Date()?.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));

  const atRiskStudents = STUDENTS?.filter(s => s?.riskLevel === 'high' || s?.riskLevel === 'medium');
  const pendingActivities = ACTIVITIES?.filter(a => a?.status === 'en_correccion' || a?.status === 'pendiente_revision');
  const ceCovered = CRITERIA.filter(criterion => ACTIVITIES.some(activity => activity.ceIds.includes(criterion.id))).length;
  const raPassed = LEARNING_OUTCOMES.filter(outcome => {
    const values = STUDENTS.map(student => getRAGrade(student.id, outcome.id)).filter((value): value is number => value !== null);
    return values.length > 0 && values.filter(value => value >= 5).length / values.length >= 0.5;
  }).length;
  const avgGrade = STUDENTS?.length ? STUDENTS?.reduce((s, st) => s + (st?.moduleGrade ?? 0), 0) / STUDENTS?.length : 0;
  const taughtAvg = WORK_UNITS?.length ? Math.round(WORK_UNITS?.reduce((s, ut) => s + ut?.taughtPercentage, 0) / WORK_UNITS?.length) : 0;

  const cePerformance = CRITERIA.map(criterion => {
    const values = STUDENTS.map(student => getCEGrade(student.id, criterion.id));
    const evaluated = values.filter((value): value is number => value !== null);
    const statuses = values.map(getCEStatus);
    return { ce: criterion.code, avg: evaluated.length ? evaluated.reduce((sum, value) => sum + value, 0) / evaluated.length : null, superado: statuses.filter(status => status === 'superado').length, parcial: statuses.filter(status => status === 'parcial').length, noSuperado: statuses.filter(status => status === 'no_superado').length, noEvaluado: statuses.filter(status => status === 'no_evaluado').length };
  });
  const worstCE = cePerformance.filter(c => c.avg !== null).sort((a, b) => (a.avg ?? 10) - (b.avg ?? 10)).slice(0, 5);
  const raCoverage = LEARNING_OUTCOMES.map(outcome => { const rows = CRITERIA.filter(criterion => criterion.raId === outcome.id); const covered = rows.filter(criterion => ACTIVITIES.some(activity => activity.ceIds.includes(criterion.id))).length; const coverage = rows.length ? Math.round(covered / rows.length * 100) : 0; return { name: outcome.code, label: outcome.description, coverage, fill: coverage >= 80 ? '#16A34A' : coverage >= 50 ? '#D97706' : coverage > 0 ? '#DC2626' : '#94A3B8' }; });
  const gradeTrend = EVALUATIONS.map(evaluation => { const values = STUDENTS.map(student => getEvalWeightedGrade(student.id, evaluation.id)).filter((value): value is number => value !== null); return { label: evaluation.name, avg: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null }; });
  const recentCorrections = GRADES.filter(grade => grade.grade !== null).slice(0, 4).map(grade => ({
    id: grade.id, studentId: grade.studentId, activityId: grade.activityId,
    teacherScore: grade.grade, aiScore: null as number | null, feedback: '', status: 'revisada_docente',
  }));

  if (loading) {
    return (
      <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-sm">Cargando datos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`PSP — DAM 2º · 2025–2026 · ${STUDENTS?.length} alumnos matriculados`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw size={12} /> Actualizado {lastUpdate}
            </span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 active:scale-95 transition-all duration-150">
              <Calendar size={13} /> Hoy
            </button>
          </div>
        }
      />
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <MetricCard label="Cobertura de CE" value={`${CRITERIA.length ? Math.round((ceCovered / CRITERIA.length) * 100) : 0}%`}
          sub={`${ceCovered} de ${CRITERIA.length} CE con actividad asignada`} icon={<BookCheck size={16} />}
          trend="up" trendValue="+5 esta semana" variant="info" />
        <MetricCard label="Alumnos en riesgo" value={atRiskStudents?.length}
          sub={`${STUDENTS?.filter(s => s?.riskLevel === 'high')?.length} críticos · ${STUDENTS?.filter(s => s?.riskLevel === 'medium')?.length} en atención`}
          icon={<AlertTriangle size={16} />} variant="danger" trend="down" trendValue="+2 esta semana" />
        <MetricCard label="Correcciones pendientes" value={pendingActivities?.length}
          sub={`${ACTIVITIES?.filter(a => a?.status === 'pendiente_revision')?.length} pend. revisión · ${ACTIVITIES?.filter(a => a?.status === 'en_correccion')?.length} en corrección`}
          icon={<ClipboardCheck size={16} />} variant="warning" trend="neutral" trendValue="sin cambio" />
        <MetricCard label="RA superados (grupo)" value={`${raPassed}/${LEARNING_OUTCOMES?.length}`}
          sub="RA con ≥50% del grupo aprobado" icon={<Target size={16} />} variant="success" trend="neutral" trendValue="estable" />
        <MetricCard label="Impartición media" value={`${taughtAvg}%`}
          sub="Porcentaje medio impartido por UT" icon={<Clock size={16} />} variant="default" trend="up" trendValue="+8% esta semana" />
        <MetricCard label="Nota media módulo" value={avgGrade?.toFixed(2)}
          sub="Media ponderada del grupo" icon={<TrendingUp size={16} />}
          variant={avgGrade >= 7 ? 'success' : avgGrade >= 5 ? 'default' : 'danger'}
          trend={avgGrade >= 6.5 ? 'up' : 'down'} trendValue="vs evaluación anterior" />
      </div>
      {/* Quick access links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { href: '/grading', icon: <ClipboardCheck size={16} />, label: 'Calificaciones', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { href: '/planning-curriculum', icon: <BookOpen size={16} />, label: 'Planificación', color: 'bg-purple-50 text-purple-700 border-purple-200' },
          { href: '/students-tutoring', icon: <Users size={16} />, label: 'Alumnado', color: 'bg-green-50 text-green-700 border-green-200' },
          { href: '/reports', icon: <BarChart2 size={16} />, label: 'Informes', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        ]?.map(item => (
          <Link key={item?.href} href={item?.href}
            className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${item?.color}`}>
            <span className="flex-shrink-0">{item?.icon}</span>
            <span className="text-xs font-semibold">{item?.label}</span>
            <ArrowRight size={12} className="ml-auto flex-shrink-0 opacity-60" />
          </Link>
        ))}
      </div>
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* CE Performance Chart — 2 cols */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Estado CE por criterio</h2>
              <p className="text-xs text-muted-foreground">CE evaluados (RA1–RA3) · alumnos por estado</p>
            </div>
            <span className="text-xs text-muted-foreground">CE evaluados: 13/22</span>
          </div>
          <CEPerformanceChart rows={cePerformance} />
        </div>

        {/* RA Coverage Radial */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Cobertura por RA</h2>
              <p className="text-xs text-muted-foreground">Actividades asignadas / CE del RA</p>
            </div>
          </div>
          <RARadialChart data={raCoverage} />
          <div className="mt-3 space-y-1.5">
            {raCoverage.map((ra) => (
              <div key={`ra-cov-${ra?.name}`} className="flex items-center gap-2 text-xs">
                <span className="font-semibold w-8 text-foreground">{ra?.name}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${ra.coverage}%`, backgroundColor: ra.fill }} />
                </div>
                <span className="w-8 text-right font-mono-nums text-muted-foreground">{ra.coverage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* At-risk students */}
        <div className="bg-card rounded-xl border border-red-200 shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-danger" />
              <h2 className="text-sm font-semibold text-foreground">Alumnado en riesgo</h2>
            </div>
            <Link href="/students-tutoring" className="text-xs text-primary hover:underline flex items-center gap-1">Ver todos <ChevronRight size={11} /></Link>
          </div>
          <div className="space-y-2">
            {atRiskStudents?.map((student) => (
              <div key={`risk-${student?.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${student?.riskLevel === 'high' ? 'bg-red-100 text-danger' : 'bg-amber-100 text-warning'}`}>
                  {student?.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{student?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{student?.nia} · {student?.incidents} incidencias · {student?.absences} faltas</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`font-mono-nums text-xs font-semibold ${getGradeColor(student?.moduleGrade)}`}>{getGradeLabel(student?.moduleGrade)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getRiskBadge(student?.riskLevel)}`}>{getRiskLabel(student?.riskLevel)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending corrections */}
        <div className="bg-card rounded-xl border border-amber-200 shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={14} className="text-warning" />
              <h2 className="text-sm font-semibold text-foreground">Correcciones pendientes</h2>
            </div>
            <Link href="/activities" className="text-xs text-primary hover:underline flex items-center gap-1">Ver actividades <ChevronRight size={11} /></Link>
          </div>
          <div className="space-y-2">
            {pendingActivities?.map((act) => (
              <div key={`pend-${act?.id}`} className="p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-foreground leading-tight">{act?.name}</p>
                  <StatusBadge status={act?.status} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{act?.reviewedCount}/{act?.correctionCount} revisadas</p>
                  <div className="flex-1 mx-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${act?.correctionCount > 0 ? (act?.reviewedCount / act?.correctionCount) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] font-medium text-primary">{act?.correctionCount > 0 ? Math.round((act?.reviewedCount / act?.correctionCount) * 100) : 0}%</p>
                </div>
              </div>
            ))}
            {pendingActivities?.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 size={24} className="text-success mb-2" />
                <p className="text-xs text-muted-foreground">Sin correcciones pendientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Worst CE + Grade trend */}
        <div className="flex flex-col gap-4">
          {/* Worst CE */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-danger" />
              <h2 className="text-sm font-semibold text-foreground">CE con peor rendimiento</h2>
            </div>
            <div className="space-y-1.5">
              {worstCE?.map(ce => (
                <div key={ce?.ce} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-foreground w-12 flex-shrink-0">{ce?.ce}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(ce?.avg ?? 0) >= 5 ? 'bg-warning' : 'bg-danger'}`} style={{ width: `${((ce?.avg ?? 0) / 10) * 100}%` }} />
                  </div>
                  <span className={`font-mono-nums text-[10px] font-bold w-8 text-right flex-shrink-0 ${(ce?.avg ?? 0) >= 5 ? 'text-warning' : 'text-danger'}`}>{ce?.avg?.toFixed(1)}</span>
                  <span className="text-[9px] text-muted-foreground w-12 text-right flex-shrink-0">{ce?.noSuperado} no sup.</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grade trend */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4 flex-1">
            <h2 className="text-sm font-semibold text-foreground mb-1">Tendencia de calificaciones</h2>
            <p className="text-xs text-muted-foreground mb-3">Media del grupo por evaluación</p>
            <GradeTrendChart data={gradeTrend} />
          </div>
        </div>
      </div>
      {/* Bottom row: Recent corrections + Session log + Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent corrections */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Calificaciones registradas</h2>
            <Link href="/activities" className="text-xs text-primary hover:underline flex items-center gap-1">Ver más <ChevronRight size={11} /></Link>
          </div>
          <div className="space-y-2">
            {recentCorrections?.map(cor => {
              const student = STUDENTS?.find(s => s?.id === cor?.studentId);
              const activity = ACTIVITIES?.find(a => a?.id === cor?.activityId);
              return (
                <div key={cor?.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
                    {student?.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{student?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{activity?.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{cor?.feedback}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {cor?.teacherScore !== null ? (
                      <span className={`font-mono-nums text-xs font-bold ${getGradeColor(cor?.teacherScore)}`}>{cor?.teacherScore?.toFixed(1)}</span>
                    ) : cor?.aiScore !== null ? (
                      <span className={`font-mono-nums text-xs font-semibold text-muted-foreground`}>IA: {cor?.aiScore?.toFixed(1)}</span>
                    ) : null}
                    <StatusBadge status={cor?.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session log */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Diario de sesiones</h2>
            <Link href="/students-tutoring" className="text-xs text-primary hover:underline flex items-center gap-1">Ver diario <ChevronRight size={11} /></Link>
          </div>
          <div className="space-y-3">
            {SESSION_LOGS?.slice(0, 3)?.map(log => {
              const unit = WORK_UNITS?.find(ut => ut?.id === log?.unitId);
              return (
                <div key={log?.id} className="p-2.5 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{unit?.code}</span>
                    <span className="text-[10px] text-muted-foreground">{log?.date}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-2">{log?.development}</p>
                  {log?.notes && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1.5 leading-relaxed line-clamp-1">
                      📝 {log?.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent incidents */}
        <div className="bg-card rounded-xl border border-border shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Incidencias recientes</h2>
            </div>
            <Link href="/students-tutoring" className="text-xs text-primary hover:underline flex items-center gap-1">Ver todas <ChevronRight size={11} /></Link>
          </div>
          <div className="space-y-2">
            {INCIDENTS?.slice(0, 5)?.map(inc => (
              <div key={inc?.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5 ${getIncidentTypeColor(inc?.type)}`}>{getIncidentTypeLabel(inc?.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{inc?.studentName}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{inc?.detail}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{inc?.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
