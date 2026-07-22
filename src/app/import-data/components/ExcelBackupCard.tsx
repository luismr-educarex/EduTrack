'use client';

import { useState } from 'react';
import { CheckCircle2, DatabaseBackup, Download, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  BACKUP_DATASETS,
  ExcelBackupResult,
  exportCompleteExcelBackup,
} from '@/lib/backup/exportExcelBackup';

export default function ExcelBackupCard() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({
    completed: 0,
    total: BACKUP_DATASETS.length,
    sheet: '',
  });
  const [lastResult, setLastResult] = useState<ExcelBackupResult | null>(null);

  const exportBackup = async () => {
    try {
      setExporting(true);
      setLastResult(null);
      const result = await exportCompleteExcelBackup((completed, total, sheet) => {
        setProgress({ completed, total, sheet });
      });
      setLastResult(result);
      toast.success(`Copia Excel creada con ${result.totalRows.toLocaleString('es-ES')} registros`);
    } catch (error) {
      console.error('Excel backup:', error);
      toast.error(
        error instanceof Error ? error.message : 'No se pudo generar la copia de seguridad'
      );
    } finally {
      setExporting(false);
    }
  };

  const percentage = Math.round((progress.completed / Math.max(progress.total, 1)) * 100);

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-emerald-200 bg-card shadow-card">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <DatabaseBackup size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Copia de seguridad completa en Excel
              </h2>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {BACKUP_DATASETS.length} hojas de datos
              </span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Exporta todos tus módulos, evaluaciones, unidades, actividades, alumnado,
              calificaciones, criterios, rúbricas, calendario y configuraciones en un único libro
              normalizado.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet size={13} className="text-emerald-600" /> Inventario y una hoja por
                tabla
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-600" /> Todos los módulos accesibles
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" /> Identificadores y relaciones
                conservados
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={exportBackup}
          disabled={exporting}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
        >
          <Download size={16} />
          {exporting ? 'Generando copia…' : 'Exportar copia Excel'}
        </button>
      </div>

      {exporting && (
        <div className="border-t border-emerald-100 bg-emerald-50/60 px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-emerald-800">
            <span>Exportando {progress.sheet || 'datos'}…</span>
            <span>
              {progress.completed}/{progress.total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {lastResult && !exporting && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-emerald-100 bg-emerald-50/60 px-5 py-3 text-[11px] text-emerald-800">
          <CheckCircle2 size={14} />
          <strong>Copia descargada:</strong>
          <span>{lastResult.fileName}</span>
          <span>·</span>
          <span>{lastResult.totalRows.toLocaleString('es-ES')} registros</span>
        </div>
      )}

      <div className="border-t border-border bg-muted/20 px-5 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
        El archivo contiene datos personales y calificaciones. Consérvalo en una ubicación protegida
        y genera copias periódicas.
      </div>
    </section>
  );
}
