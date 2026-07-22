'use client';
import React, { useState, useRef } from 'react';
import {
  Upload,
  FileJson,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';
import ExcelBackupCard from './ExcelBackupCard';

type ImportType = 'alumnos' | 'ra' | 'criterios' | 'unidades' | 'evaluaciones';

interface ImportResult {
  type: ImportType;
  status: 'success' | 'error' | 'warning';
  count: number;
  errors: string[];
  warnings: string[];
  data: unknown[];
}

interface ImportState {
  alumnos: ImportResult | null;
  ra: ImportResult | null;
  criterios: ImportResult | null;
  unidades: ImportResult | null;
  evaluaciones: ImportResult | null;
}

const IMPORT_TYPES: {
  key: ImportType;
  label: string;
  description: string;
  color: string;
  schema: string;
}[] = [
  {
    key: 'alumnos',
    label: 'Alumnos',
    description: 'Importa el listado de alumnos del módulo',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    schema: `[
  {
    "nia": "22DAM001",
    "name": "Nombre Apellido",
    "email": "alumno@edu.es",
    "githubUrl": "https://github.com/usuario/repo"
  }
]`,
  },
  {
    key: 'ra',
    label: 'Resultados de Aprendizaje (RA)',
    description: 'Importa los resultados de aprendizaje del módulo',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    schema: `[
  {
    "code": "RA1",
    "description": "Descripción del resultado de aprendizaje.",
    "weight": 20
  }
]`,
  },
  {
    key: 'criterios',
    label: 'Criterios de Evaluación (CE)',
    description: 'Importa los criterios de evaluación vinculados a RA',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    schema: `[
  {
    "raCode": "RA1",
    "code": "RA1.a",
    "description": "Descripción del criterio.",
    "difficulty": "básico",
    "weight": 15
  }
]`,
  },
  {
    key: 'unidades',
    label: 'Unidades de Trabajo (UT)',
    description: 'Importa las unidades de trabajo del módulo',
    color: 'bg-green-50 border-green-200 text-green-700',
    schema: `[
  {
    "code": "UT1",
    "name": "Nombre de la unidad",
    "evaluationId": "eval-1",
    "hours": 18,
    "weight": 35,
    "raCodes": ["RA1"]
  }
]`,
  },
  {
    key: 'evaluaciones',
    label: 'Evaluaciones',
    description: 'Importa las evaluaciones parciales y finales',
    color: 'bg-red-50 border-red-200 text-red-700',
    schema: `[
  {
    "name": "1ª Evaluación",
    "type": "parcial",
    "weight": 40,
    "startDate": "2025-09-15",
    "endDate": "2025-12-20"
  }
]`,
  },
];

// ── Validators ──────────────────────────────────────────────────────────────
function validateAlumnos(data: unknown[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  data.forEach((item, i) => {
    const row = item as Record<string, unknown>;
    if (!row.nia) errors.push(`Fila ${i + 1}: falta el campo "nia"`);
    if (!row.name) errors.push(`Fila ${i + 1}: falta el campo "name"`);
    if (!row.email) warnings.push(`Fila ${i + 1}: falta el campo "email" (opcional)`);
    if (
      row.githubUrl &&
      typeof row.githubUrl === 'string' &&
      !row.githubUrl.startsWith('https://')
    ) {
      warnings.push(`Fila ${i + 1}: "githubUrl" debería comenzar con https://`);
    }
  });
  return { errors, warnings };
}

function validateRA(data: unknown[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  data.forEach((item, i) => {
    const row = item as Record<string, unknown>;
    if (!row.code) errors.push(`Fila ${i + 1}: falta el campo "code"`);
    if (!row.description) errors.push(`Fila ${i + 1}: falta el campo "description"`);
    if (row.weight === undefined) warnings.push(`Fila ${i + 1}: falta "weight", se usará 0`);
    if (typeof row.weight === 'number' && (row.weight < 0 || row.weight > 100)) {
      warnings.push(`Fila ${i + 1}: "weight" debería estar entre 0 y 100`);
    }
  });
  return { errors, warnings };
}

function validateCriterios(data: unknown[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  data.forEach((item, i) => {
    const row = item as Record<string, unknown>;
    if (!row.raCode) errors.push(`Fila ${i + 1}: falta el campo "raCode"`);
    if (!row.code) errors.push(`Fila ${i + 1}: falta el campo "code"`);
    if (!row.description) errors.push(`Fila ${i + 1}: falta el campo "description"`);
    if (!row.difficulty)
      warnings.push(`Fila ${i + 1}: falta "difficulty" (básico/medio/avanzado), se usará "básico"`);
    if (row.difficulty && !['básico', 'medio', 'avanzado'].includes(row.difficulty as string)) {
      warnings.push(`Fila ${i + 1}: "difficulty" debe ser "básico", "medio" o "avanzado"`);
    }
  });
  return { errors, warnings };
}

function validateUnidades(data: unknown[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  data.forEach((item, i) => {
    const row = item as Record<string, unknown>;
    if (!row.code) errors.push(`Fila ${i + 1}: falta el campo "code"`);
    if (!row.name) errors.push(`Fila ${i + 1}: falta el campo "name"`);
    if (!row.hours) warnings.push(`Fila ${i + 1}: falta "hours", se usará 0`);
    if (!row.weight) warnings.push(`Fila ${i + 1}: falta "weight", se usará 0`);
  });
  return { errors, warnings };
}

function validateEvaluaciones(data: unknown[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  data.forEach((item, i) => {
    const row = item as Record<string, unknown>;
    if (!row.name) errors.push(`Fila ${i + 1}: falta el campo "name"`);
    if (!row.type) warnings.push(`Fila ${i + 1}: falta "type" (parcial/final)`);
    if (!row.weight) warnings.push(`Fila ${i + 1}: falta "weight"`);
    if (!row.startDate) warnings.push(`Fila ${i + 1}: falta "startDate"`);
    if (!row.endDate) warnings.push(`Fila ${i + 1}: falta "endDate"`);
  });
  return { errors, warnings };
}

const VALIDATORS: Record<
  ImportType,
  (data: unknown[]) => { errors: string[]; warnings: string[] }
> = {
  alumnos: validateAlumnos,
  ra: validateRA,
  criterios: validateCriterios,
  unidades: validateUnidades,
  evaluaciones: validateEvaluaciones,
};

export default function ImportDataContent() {
  const [activeType, setActiveType] = useState<ImportType>('alumnos');
  const [jsonText, setJsonText] = useState('');
  const [results, setResults] = useState<ImportState>({
    alumnos: null,
    ra: null,
    criterios: null,
    unidades: null,
    evaluaciones: null,
  });
  const [showSchema, setShowSchema] = useState(false);
  const [expandedResult, setExpandedResult] = useState<ImportType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConfig = IMPORT_TYPES.find((t) => t.key === activeType)!;

  const processJSON = (text: string, type: ImportType) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      toast.error('JSON inválido. Revisa la sintaxis del fichero.');
      return;
    }

    const data = Array.isArray(parsed) ? parsed : [parsed];
    if (data.length === 0) {
      toast.warning('El JSON está vacío.');
      return;
    }

    const { errors, warnings } = VALIDATORS[type](data);
    const status: ImportResult['status'] =
      errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success';

    const result: ImportResult = { type, status, count: data.length, errors, warnings, data };
    setResults((prev) => ({ ...prev, [type]: result }));
    setExpandedResult(type);

    if (status === 'success') {
      toast.success(`${data.length} ${activeConfig.label.toLowerCase()} importados correctamente`);
    } else if (status === 'warning') {
      toast.warning(`${data.length} registros importados con ${warnings.length} advertencia(s)`);
    } else {
      toast.error(`Importación fallida: ${errors.length} error(es) encontrado(s)`);
    }
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      toast.error('Pega el contenido JSON o carga un fichero');
      return;
    }
    processJSON(jsonText, activeType);
  };

  const handleFileLoad = (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('Solo se admiten ficheros .json');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonText(text);
      processJSON(text, activeType);
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileLoad(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileLoad(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const blob = new Blob([activeConfig.schema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla_${activeType}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Plantilla descargada');
  };

  const clearResult = (type: ImportType) => {
    setResults((prev) => ({ ...prev, [type]: null }));
    if (expandedResult === type) setExpandedResult(null);
  };

  const totalImported = Object.values(results)
    .filter((r) => r && r.status !== 'error')
    .reduce((s, r) => s + (r?.count ?? 0), 0);
  const totalErrors = Object.values(results).filter((r) => r?.status === 'error').length;

  return (
    <div className="px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 max-w-screen-2xl w-full fade-in">
      <PageHeader
        title="Importar y respaldar datos"
        subtitle="Genera una copia de seguridad completa o importa datos académicos desde ficheros JSON"
        actions={
          <div className="flex items-center gap-2">
            {totalImported > 0 && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                {totalImported} registros importados
              </span>
            )}
            {totalErrors > 0 && (
              <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                {totalErrors} tipo(s) con errores
              </span>
            )}
          </div>
        }
      />

      <ExcelBackupCard />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Import panel */}
        <div className="xl:col-span-2 space-y-5">
          {/* Type selector */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Tipo de datos a importar</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {IMPORT_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveType(t.key);
                    setJsonText('');
                    setShowSchema(false);
                  }}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left ${activeType === t.key ? t.color + ' shadow-sm' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'}`}
                >
                  <FileJson size={14} className="mb-1" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone + text area */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{activeConfig.label}</p>
                <p className="text-xs text-muted-foreground">{activeConfig.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
                >
                  <Download size={12} /> Plantilla
                </button>
                <button
                  onClick={() => setShowSchema((s) => !s)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
                >
                  <Info size={12} /> Esquema
                </button>
              </div>
            </div>

            {showSchema && (
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Formato esperado
                </p>
                <pre className="text-xs text-foreground font-mono overflow-x-auto scrollbar-thin whitespace-pre-wrap">
                  {activeConfig.schema}
                </pre>
              </div>
            )}

            {/* Drag & drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
            >
              <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Arrastra un fichero .json aquí</p>
              <p className="text-xs text-muted-foreground mt-1">o haz clic para seleccionar</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">o pega el JSON directamente</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="relative">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={10}
                placeholder={`Pega aquí el JSON de ${activeConfig.label.toLowerCase()}...\n\nEjemplo:\n${activeConfig.schema}`}
                className="w-full px-3 py-2.5 text-xs font-mono border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none scrollbar-thin"
              />
              {jsonText && (
                <button
                  onClick={() => setJsonText('')}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setJsonText('')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
              >
                <RefreshCw size={12} /> Limpiar
              </button>
              <button
                onClick={handleImport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Upload size={14} /> Importar {activeConfig.label}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Results panel */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Resumen de importaciones</p>
            <div className="space-y-2">
              {IMPORT_TYPES.map((t) => {
                const result = results[t.key];
                return (
                  <div
                    key={t.key}
                    className={`rounded-lg border p-3 transition-all ${result ? (result.status === 'success' ? 'border-green-200 bg-green-50' : result.status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50') : 'border-border bg-muted/20'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result ? (
                          result.status === 'success' ? (
                            <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                          ) : result.status === 'warning' ? (
                            <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                          )
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-border flex-shrink-0" />
                        )}
                        <span
                          className={`text-xs font-medium ${result ? (result.status === 'success' ? 'text-green-700' : result.status === 'warning' ? 'text-amber-700' : 'text-red-700') : 'text-muted-foreground'}`}
                        >
                          {t.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {result && (
                          <>
                            <span
                              className={`text-[10px] font-semibold ${result.status === 'success' ? 'text-green-700' : result.status === 'warning' ? 'text-amber-700' : 'text-red-700'}`}
                            >
                              {result.status === 'error'
                                ? `${result.errors.length} error(es)`
                                : `${result.count} reg.`}
                            </span>
                            <button
                              onClick={() =>
                                setExpandedResult(expandedResult === t.key ? null : t.key)
                              }
                              className="p-0.5 rounded hover:bg-black/5 transition-colors"
                            >
                              {expandedResult === t.key ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}
                            </button>
                            <button
                              onClick={() => clearResult(t.key)}
                              className="p-0.5 rounded hover:bg-black/5 text-muted-foreground transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {expandedResult === t.key && result && (
                      <div className="mt-2.5 space-y-1.5 border-t border-black/10 pt-2.5">
                        {result.status !== 'error' && (
                          <p className="text-[10px] text-green-700 font-medium">
                            {result.count} registro(s) procesado(s) correctamente
                          </p>
                        )}
                        {result.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <AlertCircle size={10} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-700 leading-relaxed">{err}</p>
                          </div>
                        ))}
                        {result.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <AlertCircle
                              size={10}
                              className="text-amber-600 flex-shrink-0 mt-0.5"
                            />
                            <p className="text-[10px] text-amber-700 leading-relaxed">{w}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Help card */}
          <div className="bg-card rounded-xl border border-border shadow-card p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Instrucciones</p>
            <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
              <li>Selecciona el tipo de datos a importar</li>
              <li>Descarga la plantilla JSON para ver el formato</li>
              <li>Arrastra el fichero o pega el JSON</li>
              <li>
                Haz clic en <strong className="text-foreground">Importar</strong>
              </li>
              <li>Revisa el resumen de resultados</li>
            </ol>
            <div className="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-[10px] text-blue-700 leading-relaxed">
                <strong>Nota:</strong> Los datos importados se validan antes de aplicarse. Los
                errores bloquean la importación; las advertencias son informativas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
