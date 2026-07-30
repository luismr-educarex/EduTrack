import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => createClientMock(),
}));

vi.mock('@/lib/domain/criterionGrading', () => ({
  parseGradingGraph: vi.fn(),
  parseTemplateBank: vi.fn(),
  validateRubricLevels: vi.fn(),
}));

import { moduleService, seatLayoutService, type Module } from './edutrackService';

const intermodularModule: Module = {
  id: 'module-new',
  code: 'PRO',
  name: 'Proyecto intermodular',
  cycle: 'DAW',
  course: '2026-2027',
  deliveryMode: 'intermodular',
  evaluationCount: 2,
  totalStudents: 0,
};

function upsertResult(data: unknown, error: unknown) {
  return {
    select: () => ({
      single: async () => ({ data, error }),
    }),
  };
}

describe('moduleService CRUD integrity', () => {
  const localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { localStorage });
  });

  it('persiste el módulo antes de aplicar la compatibilidad del modo intermodular', async () => {
    const upsert = vi
      .fn()
      .mockReturnValueOnce(
        upsertResult(null, {
          message: 'new row violates check constraint "modules_delivery_mode_check"',
        })
      )
      .mockReturnValueOnce(
        upsertResult(
          {
            id: intermodularModule.id,
            code: intermodularModule.code,
            name: intermodularModule.name,
            cycle: intermodularModule.cycle,
            course: intermodularModule.course,
            delivery_mode: 'in_person',
            evaluation_count: 2,
            total_students: 0,
          },
          null
        )
      );
    createClientMock.mockReturnValue({ from: () => ({ upsert }) });

    await expect(moduleService.upsert(intermodularModule)).resolves.toMatchObject({
      id: intermodularModule.id,
      deliveryMode: 'intermodular',
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[1][0]).toMatchObject({
      id: intermodularModule.id,
      delivery_mode: 'in_person',
    });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      `edutrack-module-mode:${intermodularModule.id}`,
      'intermodular'
    );
  });

  it('no comunica éxito cuando también falla la persistencia de compatibilidad', async () => {
    const upsert = vi
      .fn()
      .mockReturnValueOnce(
        upsertResult(null, {
          message: 'new row violates check constraint "modules_delivery_mode_check"',
        })
      )
      .mockReturnValueOnce(upsertResult(null, { message: 'insert blocked' }));
    createClientMock.mockReturnValue({ from: () => ({ upsert }) });

    await expect(moduleService.upsert(intermodularModule)).rejects.toThrow(
      'No se pudo guardar el módulo: insert blocked'
    );
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('propaga los errores de borrado y conserva el estado local', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'delete blocked' } });
    createClientMock.mockReturnValue({
      from: () => ({ delete: () => ({ eq }) }),
    });

    await expect(moduleService.delete(intermodularModule.id)).rejects.toThrow(
      'No se pudo eliminar el módulo: delete blocked'
    );
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });
});

describe('seatLayoutService atomic persistence', () => {
  it('delega la sustitución completa en una única operación transaccional', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({ rpc });

    await seatLayoutService.save({
      moduleId: 'module-1',
      rows: 4,
      columns: 6,
      assignments: { 'seat-1': 'student-1', 'seat-2': 'student-2' },
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('save_seat_layout', {
      p_module_id: 'module-1',
      p_rows: 4,
      p_columns: 6,
      p_assignments: { 'seat-1': 'student-1', 'seat-2': 'student-2' },
    });
  });

  it('propaga el fallo transaccional al consumidor', async () => {
    createClientMock.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ error: { message: 'invalid assignment' } }),
    });

    await expect(
      seatLayoutService.save({
        moduleId: 'module-1',
        rows: 3,
        columns: 5,
        assignments: { 'seat-1': 'missing-student' },
      })
    ).rejects.toThrow('No se pudo guardar el plano del aula: invalid assignment');
  });
});
