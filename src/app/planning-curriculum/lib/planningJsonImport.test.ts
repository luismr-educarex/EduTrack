import { describe, expect, it } from 'vitest';
import { parseCurriculumJson, parseWorkUnitsJson } from './planningJsonImport';

describe('planning JSON imports', () => {
  it('valida y normaliza RA con sus criterios', () => {
    const result = parseCurriculumJson(
      JSON.stringify({
        resultadosAprendizaje: [
          {
            code: ' RA1 ',
            description: ' Procesos ',
            weight: 50,
            criteria: [
              {
                code: 'RA1.a',
                description: 'Describe procesos',
                difficulty: 'básico',
                weight: 100,
              },
            ],
          },
        ],
      })
    );
    expect(result[0].code).toBe('RA1');
    expect(result[0].criteria[0].difficulty).toBe('básico');
  });

  it('rechaza códigos CE duplicados aunque pertenezcan a RA distintos', () => {
    expect(() =>
      parseCurriculumJson(
        JSON.stringify({
          resultadosAprendizaje: [
            {
              code: 'RA1',
              description: 'Uno',
              weight: 50,
              criteria: [{ code: 'CE1', description: 'A', difficulty: 'medio', weight: 100 }],
            },
            {
              code: 'RA2',
              description: 'Dos',
              weight: 50,
              criteria: [{ code: 'CE1', description: 'B', difficulty: 'medio', weight: 100 }],
            },
          ],
        })
      )
    ).toThrow('Código CE duplicado');
  });

  it('valida unidades y referencias declaradas por código', () => {
    const result = parseWorkUnitsJson(
      JSON.stringify({
        unidadesTrabajo: [
          {
            code: 'UT1',
            name: 'Procesos',
            evaluation: '1ª Evaluación',
            hours: 20,
            weight: 35,
            taughtPercentage: 0,
            status: 'pendiente',
            raCodes: ['RA1'],
          },
        ],
      })
    );
    expect(result[0]).toMatchObject({ code: 'UT1', hours: 20, raCodes: ['RA1'] });
  });
});
