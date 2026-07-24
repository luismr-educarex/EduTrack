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

import { moduleService, type Module } from './edutrackService';

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
