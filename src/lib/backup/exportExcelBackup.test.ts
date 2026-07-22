import { describe, expect, it } from 'vitest';
import {
  BACKUP_DATASETS,
  createExcelBackupWorkbook,
  normalizeBackupRows,
} from './exportExcelBackup';

describe('Excel backup', () => {
  it('incluye todas las entidades críticas sin nombres de hoja duplicados', () => {
    const tables = new Set(BACKUP_DATASETS.map((dataset) => dataset.table));
    const sheets = new Set(BACKUP_DATASETS.map((dataset) => dataset.sheet));

    expect(tables.size).toBe(BACKUP_DATASETS.length);
    expect(sheets.size).toBe(BACKUP_DATASETS.length);
    expect([...sheets].every((sheet) => sheet.length <= 31)).toBe(true);
    expect(
      [
        'modules',
        'evaluations',
        'work_units',
        'activities',
        'students',
        'activity_grades',
        'criterion_evidence',
        'calendar_events',
      ].every((table) => tables.has(table))
    ).toBe(true);
  });

  it('conserva tipos simples y serializa estructuras complejas como JSON', () => {
    const [row] = normalizeBackupRows([
      {
        id: 'activity-1',
        weight: 35,
        active: true,
        empty: null,
        criterion_ids: ['ce-1', 'ce-2'],
        payload: { status: 'ok' },
      },
    ]);

    expect(row).toEqual({
      id: 'activity-1',
      weight: 35,
      active: true,
      empty: null,
      criterion_ids: '["ce-1","ce-2"]',
      payload: '{"status":"ok"}',
    });
  });

  it('genera un libro con instrucciones, inventario y hojas filtrables', async () => {
    const workbook = await createExcelBackupWorkbook(
      [
        {
          table: 'modules',
          sheet: 'Modulos',
          description: 'Módulos',
          rows: [{ id: 'module-1', code: 'PSP', evaluation_count: 2 }],
        },
        {
          table: 'activity_grades',
          sheet: 'Calificaciones',
          description: 'Notas',
          rows: [],
        },
      ],
      new Date('2026-07-22T12:00:00.000Z')
    );

    expect(workbook.SheetNames).toEqual(['LEEME', 'Inventario', 'Modulos', 'Calificaciones']);
    expect(workbook.Sheets.Inventario.A2.v).toBe('Modulos');
    expect(workbook.Sheets.Inventario.C2.v).toBe(1);
    expect(workbook.Sheets.Modulos['!autofilter']).toEqual({ ref: 'A1:C2' });
    expect(workbook.Sheets.Calificaciones.A2.v).toBe('Sin registros');
  });
});
