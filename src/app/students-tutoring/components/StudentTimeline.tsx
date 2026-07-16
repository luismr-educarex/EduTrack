'use client';
import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Target, BookOpen, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LEARNING_OUTCOMES, CRITERIA, buildStudentMasteryTimeline, getCEGrade, getCEStatus, getCEStatusColor, getCEStatusLabel, getGradeColor, Student } from '@/lib/mockData';

interface StudentTimelineProps {
  student: Student;
}

const RISK_COLORS: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
};

const RISK_ICONS: Record<string, React.ReactNode> = {
  high: <AlertTriangle size={13} className="text-danger flex-shrink-0" />,
  medium: <AlertTriangle size={13} className="text-warning flex-shrink-0" />,
  low: <Clock size={13} className="text-info flex-shrink-0" />,
};

const MILESTONE_COLORS: Record<string, string> = {
  activity: 'bg-primary',
  ut: 'bg-purple-500',
  evaluation: 'bg-amber-500',
  ra: 'bg-green-500',
};

const STATUS_DOT: Record<string, string> = {
  superado: 'bg-success',
  parcial: 'bg-warning',
  no_superado: 'bg-danger',
  no_evaluado: 'bg-muted-foreground',
};

export default function StudentTimeline({ student }: StudentTimelineProps) {
  const timeline = buildStudentMasteryTimeline(student.id);
  const [expandedRA, setExpandedRA] = useState<string[]>([]);

  const toggleRA = (raId: string) => {
    setExpandedRA(prev => prev.includes(raId) ? prev.filter(id => id !== raId) : [...prev, raId]);
  };

  // Velocity chart data
  const velocityData = timeline.milestones
    .filter(m => m.grade !== null)
    .map((m, i) => ({
      name: m.label.split(':')[0].slice(0, 12),
      nota: m.grade,
      index: i + 1,
    }));

  // CE mastery per RA
  const raProgress = LEARNING_OUTCOMES.map(ra => {
    const ces = CRITERIA.filter(c => c.raId === ra.id);
    const evaluated = ces.filter(c => getCEGrade(student.id, c.id) !== null);
    const mastered = ces.filter(c => {
      const g = getCEGrade(student.id, c.id);
      return g !== null && g >= 7;
    });
    const partial = ces.filter(c => {
      const g = getCEGrade(student.id, c.id);
      return g !== null && g >= 5 && g < 7;
    });
    const failed = ces.filter(c => {
      const g = getCEGrade(student.id, c.id);
      return g !== null && g < 5;
    });
    return {
      ra,
      ces,
      evaluated,
      mastered,
      partial,
      failed,
      masteryPct: ces.length > 0 ? Math.round((mastered.length / ces.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xl font-bold font-mono-nums text-success">{timeline.masteredCECount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">CE superados</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xl font-bold font-mono-nums text-warning">{timeline.knowledgeGaps.filter(g => g.status === 'parcial').length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">CE parciales</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xl font-bold font-mono-nums text-danger">{timeline.knowledgeGaps.filter(g => g.status === 'no_superado').length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">CE no superados</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <p className="text-xl font-bold font-mono-nums text-primary">{timeline.overallProgress}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Progreso global</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">Progreso de dominio curricular</p>
          <span className="text-xs font-mono-nums text-muted-foreground">{timeline.masteredCECount}/{CRITERIA.length} CE</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all duration-500"
            style={{ width: `${timeline.overallProgress}%` }} />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[10px] text-muted-foreground">Superado ({timeline.masteredCECount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[10px] text-muted-foreground">Parcial ({timeline.knowledgeGaps.filter(g => g.status === 'parcial').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-danger" />
            <span className="text-[10px] text-muted-foreground">No superado ({timeline.knowledgeGaps.filter(g => g.status === 'no_superado').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground">No evaluado ({CRITERIA.length - timeline.totalEvaluatedCECount})</span>
          </div>
        </div>
      </div>

      {/* Risk alerts */}
      {timeline.riskAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-warning" /> Alertas predictivas de riesgo
          </p>
          {timeline.riskAlerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${RISK_COLORS[alert.severity]}`}>
              {RISK_ICONS[alert.severity]}
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Learning velocity chart */}
      {velocityData.length > 1 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-primary" /> Velocidad de aprendizaje (notas por actividad)
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={velocityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }}
                formatter={(v: number) => [v?.toFixed(2), 'Nota']}
              />
              <Line type="monotone" dataKey="nota" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--primary)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Milestone timeline */}
      {timeline.milestones.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <Target size={13} className="text-primary" /> Hitos del recorrido de dominio
          </p>
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3 pl-8">
              {timeline.milestones.map((m, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-card ${MILESTONE_COLORS[m.type]} ${STATUS_DOT[m.status]}`} />
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate">{m.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          m.status === 'superado' ? 'bg-green-100 text-green-700' :
                          m.status === 'parcial' ? 'bg-amber-100 text-amber-700' :
                          m.status === 'no_superado'? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
                        }`}>{getCEStatusLabel(m.status)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{m.date}</span>
                        {m.grade !== null && (
                          <span className={`text-[10px] font-bold font-mono-nums ${getGradeColor(m.grade)}`}>{m.grade.toFixed(2)}</span>
                        )}
                        {m.ceIds.length > 0 && (
                          <span className="text-[9px] text-muted-foreground">{m.ceIds.length} CE evaluados</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RA/CE mastery breakdown */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <BookOpen size={13} className="text-primary" /> Dominio por RA y CE
        </p>
        <div className="space-y-2">
          {raProgress.map(({ ra, ces, mastered, partial, failed, masteryPct }) => {
            const isExpanded = expandedRA.includes(ra.id);
            return (
              <div key={ra.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleRA(ra.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />}
                  <span className="text-[10px] font-bold text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">{ra.code}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{ra.description.slice(0, 55)}...</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${masteryPct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono-nums text-muted-foreground w-8">{masteryPct}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-success font-semibold">{mastered.length}✓</span>
                      <span className="text-[9px] text-warning font-semibold">{partial.length}~</span>
                      <span className="text-[9px] text-danger font-semibold">{failed.length}✗</span>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border divide-y divide-border/50">
                    {ces.map(ce => {
                      const grade = getCEGrade(student.id, ce.id);
                      const status = getCEStatus(grade);
                      return (
                        <div key={ce.id} className="flex items-center gap-3 px-4 py-2 bg-muted/10">
                          <span className="text-[10px] font-bold text-primary font-mono w-14 flex-shrink-0">{ce.code}</span>
                          <span className="text-[10px] text-muted-foreground flex-1 leading-relaxed">{ce.description}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {grade !== null ? (
                              <span className={`text-[10px] font-bold font-mono-nums ${getGradeColor(grade)}`}>{grade.toFixed(2)}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getCEStatusColor(status)}`}>
                              {getCEStatusLabel(status).slice(0, 4)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Knowledge gaps */}
      {timeline.knowledgeGaps.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <XCircle size={13} className="text-danger" /> Brechas de conocimiento detectadas ({timeline.knowledgeGaps.length})
          </p>
          <div className="space-y-1.5">
            {timeline.knowledgeGaps.map(gap => (
              <div key={gap.ceId} className={`flex items-start gap-2 p-2.5 rounded-lg border ${gap.status === 'no_superado' ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'}`}>
                <span className="text-[10px] font-bold font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded flex-shrink-0">{gap.ceCode}</span>
                <span className="text-[10px] text-foreground flex-1 leading-relaxed">{gap.description}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {gap.grade !== null && (
                    <span className={`text-[10px] font-bold font-mono-nums ${getGradeColor(gap.grade)}`}>{gap.grade.toFixed(2)}</span>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${gap.status === 'no_superado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {getCEStatusLabel(gap.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
