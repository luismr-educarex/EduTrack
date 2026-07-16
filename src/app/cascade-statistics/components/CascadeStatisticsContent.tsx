'use client';
import React, { useMemo, useState } from 'react';
import { GitBranch, AlertTriangle, TrendingUp, Users, ChevronDown, ChevronRight, Info, Activity } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import {
  getRAGrade, getEffectiveRAGrade, getRARelationshipsToTarget, getRARelationshipsFromSource,
  getGradeColor, getRiskBadge, getRiskLabel,
  STUDENTS as MOCK_STUDENTS, LEARNING_OUTCOMES as MOCK_LEARNING_OUTCOMES, RA_RELATIONSHIPS as MOCK_RA_RELATIONSHIPS
} from '@/lib/mockData';
import { useEduTrack } from '@/contexts/EduTrackContext';

interface CascadeRuleStats {
  relId: string;
  sourceCode: string;
  targetCode: string;
  sourceDesc: string;
  targetDesc: string;
  percentage: number;
  studentsAffected: number;
  avgBaseGrade: number | null;
  avgEffectiveGrade: number | null;
  avgShift: number | null;
  positiveShifts: number;
  negativeShifts: number;
  noShift: number;
  studentsUnlocked: number;
}

interface RiskAlert {
  studentId: string;
  studentName: string;
  avatar: string;
  riskLevel: string;
  raCode: string;
  raDesc: string;
  baseGrade: number | null;
  effectiveGrade: number | null;
  shift: number;
  type: 'downgrade' | 'unlock' | 'significant_boost';
}

export default function CascadeStatisticsContent() {
  const { students: dbStudents, learningOutcomes: dbLearningOutcomes, raRelationships: dbRARelationships, loading } = useEduTrack();

  const STUDENTS = dbStudents.length > 0 ? dbStudents : MOCK_STUDENTS;
  const LEARNING_OUTCOMES = dbLearningOutcomes.length > 0 ? dbLearningOutcomes : MOCK_LEARNING_OUTCOMES;
  const RA_RELATIONSHIPS = dbRARelationships.length > 0 ? dbRARelationships : MOCK_RA_RELATIONSHIPS;

  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const ruleStats = useMemo<CascadeRuleStats[]>(() => {
    return RA_RELATIONSHIPS.map(rel => {
      const srcRA = LEARNING_OUTCOMES.find(r => r.id === rel.raSourceId);
      const tgtRA = LEARNING_OUTCOMES.find(r => r.id === rel.raTargetId);

      let studentsAffected = 0;
      let totalBaseGrade = 0;
      let totalEffectiveGrade = 0;
      let gradeCount = 0;
      let positiveShifts = 0;
      let negativeShifts = 0;
      let noShift = 0;
      let studentsUnlocked = 0;

      for (const student of STUDENTS) {
        const srcGrade = getRAGrade(student.id, rel.raSourceId);
        if (srcGrade === null) continue;

        const baseGrade = getRAGrade(student.id, rel.raTargetId);
        const effectiveGrade = getEffectiveRAGrade(student.id, rel.raTargetId, baseGrade);

        if (effectiveGrade === null) continue;
        studentsAffected++;

        if (baseGrade !== null) {
          totalBaseGrade += baseGrade;
          totalEffectiveGrade += effectiveGrade;
          gradeCount++;
          const shift = effectiveGrade - baseGrade;
          if (Math.abs(shift) < 0.01) noShift++;
          else if (shift > 0) positiveShifts++;
          else negativeShifts++;
        } else {
          studentsUnlocked++;
        }
      }

      return {
        relId: rel.id,
        sourceCode: srcRA?.code ?? '?',
        targetCode: tgtRA?.code ?? '?',
        sourceDesc: srcRA?.description ?? '',
        targetDesc: tgtRA?.description ?? '',
        percentage: rel.percentage,
        studentsAffected,
        avgBaseGrade: gradeCount > 0 ? parseFloat((totalBaseGrade / gradeCount).toFixed(2)) : null,
        avgEffectiveGrade: gradeCount > 0 ? parseFloat((totalEffectiveGrade / gradeCount).toFixed(2)) : null,
        avgShift: gradeCount > 0 ? parseFloat(((totalEffectiveGrade - totalBaseGrade) / gradeCount).toFixed(2)) : null,
        positiveShifts,
        negativeShifts,
        noShift,
        studentsUnlocked,
      };
    });
  }, []);

  const globalStats = useMemo(() => {
    const totalStudents = STUDENTS.length;
    const affectedStudentIds = new Set<string>();

    for (const rel of RA_RELATIONSHIPS) {
      for (const student of STUDENTS) {
        const srcGrade = getRAGrade(student.id, rel.raSourceId);
        if (srcGrade !== null) {
          const baseGrade = getRAGrade(student.id, rel.raTargetId);
          const effectiveGrade = getEffectiveRAGrade(student.id, rel.raTargetId, baseGrade);
          if (effectiveGrade !== null) affectedStudentIds.add(student.id);
        }
      }
    }

    const totalRules = RA_RELATIONSHIPS.length;
    const totalPositive = ruleStats.reduce((s, r) => s + r.positiveShifts, 0);
    const totalNegative = ruleStats.reduce((s, r) => s + r.negativeShifts, 0);
    const totalNoShift = ruleStats.reduce((s, r) => s + r.noShift, 0);
    const totalCascadeEvents = totalPositive + totalNegative + totalNoShift;
    const effectivenessRate = totalCascadeEvents > 0
      ? parseFloat(((totalPositive / totalCascadeEvents) * 100).toFixed(1))
      : 0;

    return {
      totalStudents,
      affectedStudents: affectedStudentIds.size,
      totalRules,
      effectivenessRate,
      totalPositive,
      totalNegative,
    };
  }, [ruleStats]);

  const riskAlerts = useMemo<RiskAlert[]>(() => {
    const alerts: RiskAlert[] = [];

    for (const rel of RA_RELATIONSHIPS) {
      const tgtRA = LEARNING_OUTCOMES.find(r => r.id === rel.raTargetId);
      if (!tgtRA) continue;

      for (const student of STUDENTS) {
        const srcGrade = getRAGrade(student.id, rel.raSourceId);
        if (srcGrade === null) continue;

        const baseGrade = getRAGrade(student.id, rel.raTargetId);
        const effectiveGrade = getEffectiveRAGrade(student.id, rel.raTargetId, baseGrade);
        if (effectiveGrade === null) continue;

        if (baseGrade === null && effectiveGrade >= 5) {
          alerts.push({
            studentId: student.id,
            studentName: student.name,
            avatar: student.avatar,
            riskLevel: student.riskLevel,
            raCode: tgtRA.code,
            raDesc: tgtRA.description,
            baseGrade: null,
            effectiveGrade,
            shift: effectiveGrade,
            type: 'unlock',
          });
        } else if (baseGrade !== null) {
          const shift = effectiveGrade - baseGrade;
          if (shift < -0.5) {
            alerts.push({
              studentId: student.id,
              studentName: student.name,
              avatar: student.avatar,
              riskLevel: student.riskLevel,
              raCode: tgtRA.code,
              raDesc: tgtRA.description,
              baseGrade,
              effectiveGrade,
              shift,
              type: 'downgrade',
            });
          } else if (shift > 1.5) {
            alerts.push({
              studentId: student.id,
              studentName: student.name,
              avatar: student.avatar,
              riskLevel: student.riskLevel,
              raCode: tgtRA.code,
              raDesc: tgtRA.description,
              baseGrade,
              effectiveGrade,
              shift,
              type: 'significant_boost',
            });
          }
        }
      }
    }

    return alerts.sort((a, b) => Math.abs(b.shift) - Math.abs(a.shift)).slice(0, 12);
  }, []);

  const alertsByType = {
    downgrade: riskAlerts.filter(a => a.type === 'downgrade'),
    unlock: riskAlerts.filter(a => a.type === 'unlock'),
    significant_boost: riskAlerts.filter(a => a.type === 'significant_boost'),
  };

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Estadísticas de Cascada"
        subtitle="PSP — DAM 2º · Análisis de impacto de reglas RA a nivel de cohorte"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              {RA_RELATIONSHIPS.length} reglas activas · {STUDENTS.length} alumnos
            </span>
          </div>
        }
      />

      {/* Global KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          {
            label: 'Alumnos afectados',
            value: `${globalStats.affectedStudents}/${globalStats.totalStudents}`,
            sub: `${Math.round((globalStats.affectedStudents / globalStats.totalStudents) * 100)}% del grupo`,
            color: 'text-primary',
            icon: <Users size={16} className="text-primary" />,
          },
          {
            label: 'Reglas de cascada',
            value: globalStats.totalRules,
            sub: 'relaciones RA activas',
            color: 'text-foreground',
            icon: <GitBranch size={16} className="text-muted-foreground" />,
          },
          {
            label: 'Tasa efectividad',
            value: `${globalStats.effectivenessRate}%`,
            sub: 'cascadas con mejora',
            color: globalStats.effectivenessRate >= 50 ? 'text-success' : 'text-warning',
            icon: <TrendingUp size={16} className={globalStats.effectivenessRate >= 50 ? 'text-success' : 'text-warning'} />,
          },
          {
            label: 'Mejoras positivas',
            value: globalStats.totalPositive,
            sub: 'notas mejoradas',
            color: 'text-success',
            icon: <Activity size={16} className="text-success" />,
          },
          {
            label: 'Bajadas de nota',
            value: globalStats.totalNegative,
            sub: 'notas reducidas',
            color: globalStats.totalNegative > 0 ? 'text-danger' : 'text-muted-foreground',
            icon: <AlertTriangle size={16} className={globalStats.totalNegative > 0 ? 'text-danger' : 'text-muted-foreground'} />,
          },
          {
            label: 'Alertas activas',
            value: riskAlerts.length,
            sub: 'requieren revisión',
            color: riskAlerts.length > 0 ? 'text-warning' : 'text-muted-foreground',
            icon: <AlertTriangle size={16} className={riskAlerts.length > 0 ? 'text-warning' : 'text-muted-foreground'} />,
          },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-xl border border-border shadow-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              {stat.icon}
            </div>
            <p className={`text-xl font-bold font-mono-nums ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] font-medium text-foreground mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Rule-by-rule breakdown */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GitBranch size={15} className="text-primary" />
            Desglose por regla de cascada
          </h2>

          {ruleStats.map(rule => {
            const isExpanded = expandedRule === rule.relId;
            const shiftColor = rule.avgShift === null ? 'text-muted-foreground'
              : rule.avgShift > 0 ? 'text-success' : rule.avgShift < 0 ? 'text-danger' : 'text-muted-foreground';

            return (
              <div key={rule.relId} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <button
                  onClick={() => setExpandedRule(isExpanded ? null : rule.relId)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-muted/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 mt-0.5 flex-shrink-0">
                    {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{rule.sourceCode}</span>
                      <span className="text-muted-foreground text-xs">→</span>
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{rule.targetCode}</span>
                      <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{rule.percentage}% propagación</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{rule.sourceCode}: {rule.sourceDesc.slice(0, 60)}…</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-xs font-bold text-foreground">{rule.studentsAffected}</p>
                      <p className="text-[10px] text-muted-foreground">afectados</p>
                    </div>
                    <div>
                      <p className={`text-xs font-bold font-mono-nums ${shiftColor}`}>
                        {rule.avgShift !== null ? (rule.avgShift > 0 ? '+' : '') + rule.avgShift.toFixed(2) : '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Δ media</p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 p-4 space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Nota base media', value: rule.avgBaseGrade?.toFixed(2) ?? '—', color: getGradeColor(rule.avgBaseGrade) },
                        { label: 'Nota efectiva media', value: rule.avgEffectiveGrade?.toFixed(2) ?? '—', color: getGradeColor(rule.avgEffectiveGrade) },
                        { label: 'Mejoras', value: rule.positiveShifts, color: 'text-success' },
                        { label: 'Bajadas', value: rule.negativeShifts, color: rule.negativeShifts > 0 ? 'text-danger' : 'text-muted-foreground' },
                      ].map(s => (
                        <div key={s.label} className="bg-card rounded-lg border border-border p-2.5 text-center">
                          <p className={`text-sm font-bold font-mono-nums ${s.color}`}>{s.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Grade shift bar */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Distribución de cambios de nota</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex h-5 rounded-full overflow-hidden gap-0.5">
                          {rule.positiveShifts > 0 && (
                            <div className="bg-success flex items-center justify-center text-[9px] text-white font-bold"
                              style={{ flex: rule.positiveShifts }}>
                              +{rule.positiveShifts}
                            </div>
                          )}
                          {rule.noShift > 0 && (
                            <div className="bg-muted flex items-center justify-center text-[9px] text-muted-foreground font-bold"
                              style={{ flex: rule.noShift }}>
                              ={rule.noShift}
                            </div>
                          )}
                          {rule.negativeShifts > 0 && (
                            <div className="bg-danger flex items-center justify-center text-[9px] text-white font-bold"
                              style={{ flex: rule.negativeShifts }}>
                              -{rule.negativeShifts}
                            </div>
                          )}
                          {rule.studentsUnlocked > 0 && (
                            <div className="bg-blue-400 flex items-center justify-center text-[9px] text-white font-bold"
                              style={{ flex: rule.studentsUnlocked }}>
                              ↑{rule.studentsUnlocked}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-shrink-0">
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" />mejora</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger inline-block" />baja</span>
                          {rule.studentsUnlocked > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />desbloqueado</span>}
                        </div>
                      </div>
                    </div>

                    {/* Per-student detail */}
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Detalle por alumno</p>
                      <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-[10px] min-w-[500px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Alumno</th>
                              <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Nota base {rule.targetCode}</th>
                              <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Nota {rule.sourceCode}</th>
                              <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Nota efectiva</th>
                              <th className="text-center px-2 py-1.5 text-muted-foreground font-medium">Δ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {STUDENTS.map(student => {
                              const srcGrade = getRAGrade(student.id, RA_RELATIONSHIPS.find(r => r.id === rule.relId)!.raSourceId);
                              if (srcGrade === null) return null;
                              const baseGrade = getRAGrade(student.id, RA_RELATIONSHIPS.find(r => r.id === rule.relId)!.raTargetId);
                              const effectiveGrade = getEffectiveRAGrade(student.id, RA_RELATIONSHIPS.find(r => r.id === rule.relId)!.raTargetId, baseGrade);
                              if (effectiveGrade === null) return null;
                              const shift = baseGrade !== null ? effectiveGrade - baseGrade : null;
                              return (
                                <tr key={student.id} className="hover:bg-muted/20">
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground flex-shrink-0">{student.avatar}</div>
                                      <span className="font-medium text-foreground truncate max-w-[120px]">{student.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {baseGrade !== null ? <span className={`font-mono-nums font-semibold ${getGradeColor(baseGrade)}`}>{baseGrade.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <span className={`font-mono-nums font-semibold ${getGradeColor(srcGrade)}`}>{srcGrade.toFixed(2)}</span>
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    <span className={`font-mono-nums font-semibold ${getGradeColor(effectiveGrade)}`}>{effectiveGrade.toFixed(2)}</span>
                                  </td>
                                  <td className="px-2 py-1.5 text-center">
                                    {shift !== null ? (
                                      <span className={`font-mono-nums font-bold text-[9px] px-1 py-0.5 rounded-full ${Math.abs(shift) < 0.01 ? 'text-muted-foreground' : shift > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {shift > 0 ? '+' : ''}{shift.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full font-medium">desbloqueado</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {RA_RELATIONSHIPS.length === 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card p-8 text-center">
              <GitBranch size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Sin reglas de cascada configuradas</p>
              <p className="text-xs text-muted-foreground mt-1">Configura relaciones entre RAs en la sección Relaciones entre RAs</p>
            </div>
          )}
        </div>

        {/* Risk alerts panel */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle size={15} className="text-warning" />
            Alertas de riesgo
          </h2>

          {/* Alert type tabs */}
          {(['downgrade', 'unlock', 'significant_boost'] as const).map(type => {
            const alerts = alertsByType[type];
            if (alerts.length === 0) return null;
            const config = {
              downgrade: { label: 'Bajadas de nota', color: 'bg-red-50 border-red-200', headerColor: 'text-danger', badgeColor: 'bg-red-100 text-red-700' },
              unlock: { label: 'Notas desbloqueadas', color: 'bg-blue-50 border-blue-200', headerColor: 'text-blue-700', badgeColor: 'bg-blue-100 text-blue-700' },
              significant_boost: { label: 'Mejoras significativas', color: 'bg-green-50 border-green-200', headerColor: 'text-success', badgeColor: 'bg-green-100 text-green-700' },
            }[type];

            return (
              <div key={type} className={`rounded-xl border ${config.color} overflow-hidden`}>
                <div className={`px-3 py-2 border-b ${config.color} flex items-center justify-between`}>
                  <span className={`text-xs font-semibold ${config.headerColor}`}>{config.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.badgeColor}`}>{alerts.length}</span>
                </div>
                <div className="divide-y divide-border/50">
                  {alerts.map((alert, idx) => (
                    <div key={`${alert.studentId}-${alert.raCode}-${idx}`} className="px-3 py-2.5 bg-card hover:bg-muted/20 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${alert.riskLevel === 'high' ? 'bg-red-100 text-danger' : alert.riskLevel === 'medium' ? 'bg-amber-100 text-warning' : 'bg-muted text-muted-foreground'}`}>
                          {alert.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-medium text-foreground truncate">{alert.studentName}</span>
                            <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium ${getRiskBadge(alert.riskLevel)}`}>{getRiskLabel(alert.riskLevel)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-primary">{alert.raCode}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {alert.baseGrade !== null ? `${alert.baseGrade.toFixed(2)} → ` : 'sin nota → '}
                              <span className={`font-semibold ${getGradeColor(alert.effectiveGrade)}`}>{alert.effectiveGrade?.toFixed(2)}</span>
                            </span>
                            <span className={`text-[9px] font-bold font-mono-nums ml-auto ${alert.shift > 0 ? 'text-success' : 'text-danger'}`}>
                              {alert.shift > 0 ? '+' : ''}{alert.shift.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {riskAlerts.length === 0 && (
            <div className="bg-card rounded-xl border border-border shadow-card p-6 text-center">
              <Info size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Sin alertas activas</p>
              <p className="text-[10px] text-muted-foreground mt-1">Las cascadas no generan cambios significativos</p>
            </div>
          )}

          {/* RA coverage summary */}
          <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground">Cobertura de cascada por RA</p>
            </div>
            <div className="divide-y divide-border/50">
              {LEARNING_OUTCOMES.map(ra => {
                const incoming = getRARelationshipsToTarget(ra.id);
                const outgoing = getRARelationshipsFromSource(ra.id);
                const studentsWithEffective = STUDENTS.filter(s => {
                  const base = getRAGrade(s.id, ra.id);
                  const eff = getEffectiveRAGrade(s.id, ra.id, base);
                  return eff !== null && (base === null || Math.abs(eff - base) > 0.01);
                }).length;

                return (
                  <div key={ra.id} className="px-3 py-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded w-10 text-center flex-shrink-0">{ra.code}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {incoming.length > 0 && (
                          <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded font-medium">←{incoming.length} entrada</span>
                        )}
                        {outgoing.length > 0 && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.5 rounded font-medium">{outgoing.length} salida→</span>
                        )}
                        {incoming.length === 0 && outgoing.length === 0 && (
                          <span className="text-[9px] text-muted-foreground">sin relaciones</span>
                        )}
                      </div>
                    </div>
                    {studentsWithEffective > 0 && (
                      <span className="text-[10px] font-mono-nums font-semibold text-foreground flex-shrink-0">{studentsWithEffective} alumnos</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
