'use client';

import { createClient } from '../supabase/client';

export interface BackupDatasetDefinition {
  table: string;
  sheet: string;
  description: string;
}

export interface BackupDataset extends BackupDatasetDefinition {
  rows: Record<string, unknown>[];
}

export interface ExcelBackupResult {
  fileName: string;
  generatedAt: string;
  totalRows: number;
  datasets: Array<BackupDatasetDefinition & { rowCount: number }>;
}

export const BACKUP_DATASETS: BackupDatasetDefinition[] = [
  { table: 'modules', sheet: 'Modulos', description: 'Módulos formativos y curso académico' },
  { table: 'evaluations', sheet: 'Evaluaciones', description: 'Periodos y pesos de evaluación' },
  { table: 'learning_outcomes', sheet: 'Resultados RA', description: 'Resultados de aprendizaje' },
  { table: 'criteria', sheet: 'Criterios CE', description: 'Criterios de evaluación y dificultad' },
  {
    table: 'work_units',
    sheet: 'Unidades UT',
    description: 'Unidades de trabajo, horas y relaciones',
  },
  {
    table: 'activities',
    sheet: 'Actividades',
    description: 'Actividades, entregas, pesos y criterios',
  },
  {
    table: 'students',
    sheet: 'Alumnado',
    description: 'Alumnado, contacto e indicadores académicos',
  },
  {
    table: 'activity_grades',
    sheet: 'Calificaciones',
    description: 'Calificaciones por actividad y alumno',
  },
  {
    table: 'ra_relationships',
    sheet: 'Relaciones RA',
    description: 'Relaciones curriculares entre RA',
  },
  {
    table: 'criterion_grading_configs',
    sheet: 'Config criterial',
    description: 'Parámetros del sistema criterial',
  },
  {
    table: 'criterion_implications',
    sheet: 'Implicaciones CE',
    description: 'Implicaciones entre criterios',
  },
  { table: 'rubric_items', sheet: 'Items rubrica', description: 'Ítems y niveles de las rúbricas' },
  {
    table: 'rubric_item_grades',
    sheet: 'Notas rubrica',
    description: 'Notas atómicas de los ítems de rúbrica',
  },
  {
    table: 'criterion_evidence',
    sheet: 'Evidencias CE',
    description: 'Evidencias directas e implícitas',
  },
  {
    table: 'activity_templates',
    sheet: 'Plantillas actividad',
    description: 'Banco de plantillas de actividades',
  },
  {
    table: 'recovery_plans',
    sheet: 'Recuperaciones',
    description: 'Planes de recuperación del alumnado',
  },
  {
    table: 'grading_graph_rejections',
    sheet: 'Rechazos grafo',
    description: 'Importaciones de grafo rechazadas',
  },
  { table: 'incidents', sheet: 'Incidencias', description: 'Incidencias del alumnado' },
  { table: 'session_logs', sheet: 'Diario sesiones', description: 'Diario docente y tareas' },
  {
    table: 'tutoring_actions',
    sheet: 'Tutoria',
    description: 'Actuaciones y seguimientos tutoriales',
  },
  {
    table: 'calendar_events',
    sheet: 'Eventos calendario',
    description: 'Eventos del calendario lectivo',
  },
  {
    table: 'calendar_event_types',
    sheet: 'Tipos evento',
    description: 'Tipos y colores del calendario',
  },
  { table: 'contents', sheet: 'Contenidos', description: 'Contenidos vinculados a unidades' },
  {
    table: 'seat_layouts',
    sheet: 'Aulas',
    description: 'Dimensiones de las distribuciones de aula',
  },
  {
    table: 'seat_assignments',
    sheet: 'Asientos',
    description: 'Asignación del alumnado a asientos',
  },
  { table: 'class_groups', sheet: 'Grupos', description: 'Grupos, tutoría y aula' },
  { table: 'grading_scales', sheet: 'Escalas', description: 'Escalas de calificación' },
  {
    table: 'grading_audit_log',
    sheet: 'Auditoria',
    description: 'Historial de cambios del sistema criterial',
  },
];

const PAGE_SIZE = 1000;

function normalizeValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) || (typeof value === 'object' && !(value instanceof Date))) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

export function normalizeBackupRows(rows: Record<string, unknown>[]) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]))
  );
}

async function fetchAllRows(table: string): Promise<Record<string, unknown>[]> {
  const supabase = createClient();
  const rows: Record<string, unknown>[] = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error(`No se pudo exportar ${table}: ${error.message}`);
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return rows;
}

export async function collectBackupDatasets(
  onProgress?: (completed: number, total: number, sheet: string) => void
): Promise<BackupDataset[]> {
  const datasets: BackupDataset[] = [];
  for (const [index, definition] of BACKUP_DATASETS.entries()) {
    const rows = await fetchAllRows(definition.table);
    datasets.push({ ...definition, rows });
    onProgress?.(index + 1, BACKUP_DATASETS.length, definition.sheet);
  }
  return datasets;
}

function columnWidths(rows: Record<string, unknown>[]) {
  if (!rows.length) return [{ wch: 18 }];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    const longest = rows.slice(0, 250).reduce((max, row) => {
      const value = row[key] == null ? '' : String(row[key]);
      return Math.max(max, value.length);
    }, key.length);
    return { wch: Math.min(Math.max(longest + 2, 11), 48) };
  });
}

function safeFileTimestamp(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export async function createExcelBackupWorkbook(datasets: BackupDataset[], generatedAt: Date) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const totalRows = datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0);

  const readmeRows = [
    ['COPIA DE SEGURIDAD COMPLETA DE EDUTRACK', ''],
    ['Versión del formato', '1'],
    ['Generada en UTC', generatedAt.toISOString()],
    ['Ámbito', 'Todos los datos accesibles del usuario autenticado y todos sus módulos'],
    ['Total de tablas', datasets.length],
    ['Total de registros', totalRows],
    ['Estructura', 'Una hoja por tabla. Las columnas conservan los nombres de la base de datos.'],
    ['Campos complejos', 'Las listas y objetos JSON se guardan como texto JSON válido.'],
    [
      'Restauración',
      'No importe directamente el libro en producción. Valide relaciones e identificadores antes de restaurar.',
    ],
    [
      'Seguridad',
      'El archivo contiene datos personales y calificaciones. Guárdelo en una ubicación protegida.',
    ],
  ];
  const readmeSheet = XLSX.utils.aoa_to_sheet(readmeRows);
  readmeSheet['!cols'] = [{ wch: 24 }, { wch: 94 }];
  XLSX.utils.book_append_sheet(workbook, readmeSheet, 'LEEME');

  const inventoryRows = datasets.map((dataset) => ({
    hoja: dataset.sheet,
    tabla_origen: dataset.table,
    registros: dataset.rows.length,
    descripcion: dataset.description,
  }));
  const inventorySheet = XLSX.utils.json_to_sheet(inventoryRows);
  inventorySheet['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 12 }, { wch: 52 }];
  inventorySheet['!autofilter'] = { ref: `A1:D${inventoryRows.length + 1}` };
  XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario');

  for (const dataset of datasets) {
    const rows = normalizeBackupRows(dataset.rows);
    const sheet = rows.length
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([['estado'], ['Sin registros']]);
    sheet['!cols'] = columnWidths(rows);
    if (rows.length) {
      const lastColumn = XLSX.utils.encode_col(Object.keys(rows[0]).length - 1);
      sheet['!autofilter'] = { ref: `A1:${lastColumn}${rows.length + 1}` };
    }
    XLSX.utils.book_append_sheet(workbook, sheet, dataset.sheet);
  }

  workbook.Props = {
    Title: 'Copia de seguridad completa de EduTrack',
    Subject: 'Réplica tabular de los datos persistidos',
    Author: 'EduTrack',
    CreatedDate: generatedAt,
  };

  return workbook;
}

export async function exportCompleteExcelBackup(
  onProgress?: (completed: number, total: number, sheet: string) => void
): Promise<ExcelBackupResult> {
  const datasets = await collectBackupDatasets(onProgress);
  const XLSX = await import('xlsx');
  const generatedAt = new Date();
  const totalRows = datasets.reduce((sum, dataset) => sum + dataset.rows.length, 0);
  const workbook = await createExcelBackupWorkbook(datasets, generatedAt);

  const fileName = `edutrack_backup_${safeFileTimestamp(generatedAt)}.xlsx`;
  XLSX.writeFile(workbook, fileName, { compression: true });

  return {
    fileName,
    generatedAt: generatedAt.toISOString(),
    totalRows,
    datasets: datasets.map(({ table, sheet, description, rows }) => ({
      table,
      sheet,
      description,
      rowCount: rows.length,
    })),
  };
}
