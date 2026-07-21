'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, ChevronDown, Sparkles, RefreshCw, CheckCircle2, Copy, Info, BookOpen, ListChecks, Lightbulb, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useChat } from '@/lib/hooks/useChat';
import { getDifficultyPoints } from '@/lib/mockData';
import type { Activity } from '@/lib/services/edutrackService';
import { useEduTrack } from '@/contexts/EduTrackContext';

interface GeneratedActivity {
  name: string;
  description: string;
  rubric: RubricRow[];
  solution: string;
  type: string;
}

interface RubricRow {
  ceCode: string;
  ceDescription: string;
  weight: number;
  excelente: string;
  notable: string;
  aprobado: string;
  insuficiente: string;
}

interface ActivityGeneratorModalProps {
  onClose: () => void;
  onAccept: (activity: Omit<Activity, 'id' | 'moduleId' | 'correctionCount' | 'reviewedCount'>, generatedRubric: RubricRow[]) => void;
}

const ACTIVITY_TYPES = ['práctica', 'examen', 'proyecto', 'exposición', 'cuestionario', 'trabajo'];

export default function ActivityGeneratorModal({ onClose, onAccept }: ActivityGeneratorModalProps) {
  const { criteria: CRITERIA, learningOutcomes: LEARNING_OUTCOMES, evaluations: EVALUATIONS, workUnits: WORK_UNITS } = useEduTrack();
  const [step, setStep] = useState<'select' | 'generating' | 'result'>('select');
  const [ceSearch, setCeSearch] = useState('');
  const [expandedRA, setExpandedRA] = useState<string[]>(['ra-1', 'ra-2']);
  const [selectedCeIds, setSelectedCeIds] = useState<string[]>([]);
  const [activityType, setActivityType] = useState('práctica');
  const [evaluationId, setEvaluationId] = useState('eval-1');
  const [unitId, setUnitId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generated, setGenerated] = useState<GeneratedActivity | null>(null);
  const [activeTab, setActiveTab] = useState<'enunciado' | 'rubrica' | 'solucion'>('enunciado');
  const [parseError, setParseError] = useState(false);

  const { response, isLoading, error, sendMessage } = useChat('OPEN_AI', 'gpt-4o', false);

  useEffect(() => {
    if (error) toast.error('Error al generar con IA: ' + error.message);
  }, [error]);

  // Parse AI response when it arrives
  useEffect(() => {
    if (response && step === 'generating') {
      try {
        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response];
        const jsonStr = jsonMatch[1]?.trim() || response.trim();
        const parsed = JSON.parse(jsonStr) as GeneratedActivity;
        setGenerated(parsed);
        setStep('result');
        setParseError(false);
      } catch {
        // Try to extract partial JSON
        try {
          const start = response.indexOf('{');
          const end = response.lastIndexOf('}');
          if (start !== -1 && end !== -1) {
            const parsed = JSON.parse(response.slice(start, end + 1)) as GeneratedActivity;
            setGenerated(parsed);
            setStep('result');
            setParseError(false);
          } else {
            setParseError(true);
            setStep('select');
            toast.error('No se pudo interpretar la respuesta de la IA. Inténtalo de nuevo.');
          }
        } catch {
          setParseError(true);
          setStep('select');
          toast.error('No se pudo interpretar la respuesta de la IA. Inténtalo de nuevo.');
        }
      }
    }
  }, [response, step]);

  const filteredCriteria = useMemo(() => {
    if (!ceSearch) return CRITERIA;
    const q = ceSearch.toLowerCase();
    return CRITERIA.filter(c => c.code.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [ceSearch]);

  const selectedCriteria = useMemo(() =>
    CRITERIA.filter(c => selectedCeIds.includes(c.id)),
    [selectedCeIds]
  );

  const totalWeight = useMemo(() =>
    selectedCriteria.reduce((sum, c) => sum + getDifficultyPoints(c.difficulty), 0),
    [selectedCriteria]
  );

  const toggleCE = (ceId: string) => {
    setSelectedCeIds(prev =>
      prev.includes(ceId) ? prev.filter(id => id !== ceId) : [...prev, ceId]
    );
  };

  const handleGenerate = () => {
    if (selectedCeIds.length === 0) {
      toast.error('Selecciona al menos un criterio de evaluación');
      return;
    }

    setStep('generating');
    setGenerated(null);
    setParseError(false);

    const ceDetails = selectedCriteria.map(ce => {
      const ra = LEARNING_OUTCOMES.find(r => r.id === ce.raId);
      const pts = getDifficultyPoints(ce.difficulty);
      return `- ${ce.code} (RA: ${ra?.code ?? ce.raId}, Nivel: ${ce.difficulty}, Puntos: ${pts}): ${ce.description}`;
    }).join('\n');

    const totalW = totalWeight;
    const ceWeightInfo = selectedCriteria.map(ce => {
      const pts = getDifficultyPoints(ce.difficulty);
      return `${ce.code}: nivel ${ce.difficulty} (${pts}pt, ${Math.round((pts / totalW) * 100)}% del total)`;
    }).join(', ');

    const prompt = `Eres un docente experto en Formación Profesional de Informática (DAM 2º). Genera una actividad de tipo "${activityType}" para el módulo "Programación de Servicios y Procesos (PSP)".

CRITERIOS DE EVALUACIÓN SELECCIONADOS (estos criterios deben guiar el enunciado, la rúbrica y la solución):
${ceDetails}

SISTEMA DE PUNTUACIÓN POR NIVEL DE DIFICULTAD:
- Básico = 3 puntos (aprendizajes imprescindibles y mínimos exigibles)
- Medio = 2 puntos (aplicación práctica, implementación guiada)
- Avanzado = 1 punto (desempeño experto, transferencia y diseño)

DISTRIBUCIÓN DE PUNTOS: ${ceWeightInfo}
PUNTOS TOTALES DE LA ACTIVIDAD: ${totalW}

${additionalContext ? `CONTEXTO ADICIONAL DEL DOCENTE: ${additionalContext}` : ''}

La complejidad del enunciado y los descriptores de la rúbrica deben reflejar el nivel de dificultad de cada CE. Los CE avanzados (3pt) requieren descriptores más exigentes y detallados que los básicos (1pt).

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin texto adicional, sin markdown):
{
  "name": "Nombre descriptivo de la actividad",
  "type": "${activityType}",
  "description": "Enunciado completo y detallado de la actividad con todos los requisitos, pasos y entregables esperados. Mínimo 200 palabras.",
  "solution": "Solución modelo completa con código de ejemplo si aplica, explicaciones detalladas y criterios de éxito. Mínimo 150 palabras.",
  "rubric": [
    ${selectedCriteria.map(ce => {
      const pts = getDifficultyPoints(ce.difficulty);
      return `{
      "ceCode": "${ce.code}",
      "ceDescription": "${ce.description.replace(/"/g, "'")}",
      "weight": ${pts},
      "excelente": "Descriptor detallado para nivel Excelente (9-10) acorde al nivel ${ce.difficulty} (${pts}pt) de este CE",
      "notable": "Descriptor detallado para nivel Notable (7-8) acorde al nivel ${ce.difficulty} (${pts}pt) de este CE",
      "aprobado": "Descriptor detallado para nivel Aprobado (5-6) acorde al nivel ${ce.difficulty} (${pts}pt) de este CE",
      "insuficiente": "Descriptor detallado para nivel Insuficiente (0-4) acorde al nivel ${ce.difficulty} (${pts}pt) de este CE"
    }`;
    }).join(',\n    ')}
  ]
}`;

    sendMessage([
      { role: 'system', content: 'Eres un asistente educativo especializado en Formación Profesional de Informática. Siempre respondes con JSON válido y bien estructurado, sin texto adicional.' },
      { role: 'user', content: prompt }
    ], { max_completion_tokens: 3000 });
  };

  const handleAccept = () => {
    if (!generated) return;
    const activity: Omit<Activity, 'id' | 'moduleId' | 'correctionCount' | 'reviewedCount'> = {
      name: generated.name,
      unitId: unitId || null,
      evaluationId,
      type: generated.type || activityType,
      status: 'borrador',
      weight: totalWeight,
      dueDate,
      description: generated.description,
      ceIds: selectedCeIds,
    };
    onAccept(activity, generated.rubric);
    toast.success('Actividad generada e importada correctamente');
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado al portapapeles'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Generador de Actividades con IA</h3>
              <p className="text-xs text-muted-foreground">Selecciona los CE y genera enunciado, rúbrica y solución automáticamente</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {/* ── STEP: SELECT ── */}
          {(step === 'select' || step === 'generating') && (
            <div className="p-5 space-y-5">
              {/* Activity config */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Tipo de actividad</label>
                  <select value={activityType} onChange={e => setActivityType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Evaluación</label>
                  <select value={evaluationId} onChange={e => setEvaluationId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    {EVALUATIONS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Unidad (opcional)</label>
                  <select value={unitId} onChange={e => setUnitId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Sin UT</option>
                    {WORK_UNITS.map(ut => <option key={ut.id} value={ut.id}>{ut.code} — {ut.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Fecha entrega</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* Additional context */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Contexto adicional (opcional)</label>
                <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} rows={2}
                  placeholder="Ej: La actividad debe usar Java con sockets TCP, nivel avanzado, incluir manejo de excepciones..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              {/* CE Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground">Criterios de evaluación a trabajar *</label>
                  {selectedCeIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        {selectedCeIds.length} CE · Peso total: <span className="font-bold">{totalWeight}</span>
                      </span>
                      <button type="button" onClick={() => setSelectedCeIds([])}
                        className="text-[10px] text-muted-foreground hover:text-danger transition-colors">Limpiar</button>
                    </div>
                  )}
                </div>

                {selectedCeIds.length > 0 && (
                  <div className="mb-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-2">
                    <Info size={12} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Los pesos de los CE seleccionados informarán el prompt de IA para que la rúbrica generada sea coherente con la importancia de cada criterio. CE con mayor peso tendrán descriptores más exigentes.
                    </p>
                  </div>
                )}

                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" placeholder="Buscar CE por código o descripción..." value={ceSearch} onChange={e => setCeSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto scrollbar-thin">
                  {LEARNING_OUTCOMES.map(ra => {
                    const raCriteria = filteredCriteria.filter(c => c.raId === ra.id);
                    if (raCriteria.length === 0) return null;
                    const isExpanded = expandedRA.includes(ra.id);
                    const selectedInRA = raCriteria.filter(c => selectedCeIds.includes(c.id)).length;
                    return (
                      <div key={ra.id}>
                        <button type="button"
                          onClick={() => setExpandedRA(prev => isExpanded ? prev.filter(id => id !== ra.id) : [...prev, ra.id])}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border text-left">
                          <ChevronDown size={12} className={`text-muted-foreground transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          <span className="text-[10px] font-bold text-primary font-mono">{ra.code}</span>
                          <span className="text-[10px] text-muted-foreground flex-1 truncate">{ra.description.slice(0, 65)}...</span>
                          {selectedInRA > 0 && (
                            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">{selectedInRA}</span>
                          )}
                        </button>
                        {isExpanded && raCriteria.map(ce => (
                          <label key={ce.id}
                            className={`flex items-start gap-2.5 px-4 py-2 cursor-pointer hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0 ${selectedCeIds.includes(ce.id) ? 'bg-primary/5' : ''}`}>
                            <input type="checkbox" checked={selectedCeIds.includes(ce.id)} onChange={() => toggleCE(ce.id)}
                              className="mt-0.5 flex-shrink-0 accent-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-primary font-mono">{ce.code}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${ce.difficulty === 'básico' ? 'bg-green-100 text-green-700' : ce.difficulty === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {ce.difficulty} · {getDifficultyPoints(ce.difficulty)}pt
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{ce.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={14} className="text-danger flex-shrink-0" />
                  <p className="text-xs text-danger">La IA no devolvió un formato válido. Intenta de nuevo o añade más contexto.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === 'generating' && (
            <div className="px-5 pb-5">
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={24} className="text-primary animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Generando actividad con IA...</p>
                  <p className="text-xs text-muted-foreground mt-1">Creando enunciado, rúbrica y solución para {selectedCeIds.length} CE seleccionados</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === 'result' && generated && (
            <div className="p-5 space-y-4">
              {/* Activity name */}
              <div className="flex items-start justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Actividad generada</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{generated.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">{generated.type}</span>
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">{selectedCeIds.length} CE · Peso: {totalWeight}</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <CheckCircle2 size={9} /> Generado con IA
                    </span>
                  </div>
                </div>
                <button onClick={() => { setStep('select'); setGenerated(null); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors flex-shrink-0">
                  <RefreshCw size={11} /> Regenerar
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-border">
                {([
                  { id: 'enunciado', label: 'Enunciado', icon: BookOpen },
                  { id: 'rubrica', label: `Rúbrica (${generated.rubric?.length ?? 0} CE)`, icon: ListChecks },
                  { id: 'solucion', label: 'Solución modelo', icon: Lightbulb },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <tab.icon size={12} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'enunciado' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">Enunciado de la actividad</p>
                    <button onClick={() => copyToClipboard(generated.description)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <Copy size={11} /> Copiar
                    </button>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap border border-border">
                    {generated.description}
                  </div>
                </div>
              )}

              {activeTab === 'rubrica' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Rúbrica de evaluación</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Esta rúbrica se usará en las correcciones automáticas. Los pesos reflejan la importancia de cada CE.</p>
                    </div>
                    <button onClick={() => copyToClipboard(JSON.stringify(generated.rubric, null, 2))}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                      <Copy size={11} /> Copiar JSON
                    </button>
                  </div>
                  <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
                    <table className="w-full text-[10px] min-w-[700px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold w-20">CE</th>
                          <th className="text-center px-2 py-2.5 text-muted-foreground font-semibold w-14">Peso</th>
                          <th className="text-left px-2 py-2.5 text-green-700 font-semibold">Excelente (9-10)</th>
                          <th className="text-left px-2 py-2.5 text-blue-700 font-semibold">Notable (7-8)</th>
                          <th className="text-left px-2 py-2.5 text-amber-700 font-semibold">Aprobado (5-6)</th>
                          <th className="text-left px-2 py-2.5 text-red-700 font-semibold">Insuficiente (0-4)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {generated.rubric?.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/20 align-top">
                            <td className="px-3 py-2.5">
                              <span className="font-mono font-bold text-primary">{row.ceCode}</span>
                              <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed max-w-[100px]">{row.ceDescription?.slice(0, 60)}...</p>
                            </td>
                            <td className="px-2 py-2.5 text-center">
                              <span className="font-mono-nums font-bold text-foreground">{row.weight}</span>
                              <div className="text-[9px] text-muted-foreground">{totalWeight > 0 ? Math.round((row.weight / totalWeight) * 100) : 0}%</div>
                            </td>
                            <td className="px-2 py-2.5 text-muted-foreground leading-relaxed max-w-[160px]">{row.excelente}</td>
                            <td className="px-2 py-2.5 text-muted-foreground leading-relaxed max-w-[160px]">{row.notable}</td>
                            <td className="px-2 py-2.5 text-muted-foreground leading-relaxed max-w-[160px]">{row.aprobado}</td>
                            <td className="px-2 py-2.5 text-muted-foreground leading-relaxed max-w-[160px]">{row.insuficiente}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info size={11} className="text-amber-600 flex-shrink-0" />
                    <p className="text-[10px] text-amber-700">Esta rúbrica se guardará junto con la actividad y se usará como referencia en las correcciones automáticas de la IA.</p>
                  </div>
                </div>
              )}

              {activeTab === 'solucion' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">Solución modelo</p>
                    <button onClick={() => copyToClipboard(generated.solution)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                      <Copy size={11} /> Copiar
                    </button>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-xs text-foreground leading-relaxed whitespace-pre-wrap border border-border">
                    {generated.solution}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-border flex-shrink-0 bg-card">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <div className="flex items-center gap-2">
            {step === 'result' && generated && (
              <button onClick={handleAccept}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
                <CheckCircle2 size={13} /> Importar actividad
              </button>
            )}
            {(step === 'select') && (
              <button onClick={handleGenerate} disabled={selectedCeIds.length === 0 || isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Sparkles size={13} />
                {isLoading ? 'Generando...' : `Generar con IA (${selectedCeIds.length} CE)`}
              </button>
            )}
            {step === 'generating' && (
              <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium opacity-60 cursor-not-allowed">
                <RefreshCw size={13} className="animate-spin" /> Generando...
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
