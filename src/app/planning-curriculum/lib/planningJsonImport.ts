export type CriterionDifficulty = 'básico' | 'medio' | 'avanzado';

export interface CurriculumCriterionImport {
  code: string;
  description: string;
  difficulty: CriterionDifficulty;
  weight: number;
}

export interface CurriculumRAImport {
  code: string;
  description: string;
  weight: number;
  criteria: CurriculumCriterionImport[];
}

export interface WorkUnitImport {
  code: string;
  name: string;
  evaluation: string;
  hours: number;
  weight: number;
  taughtPercentage: number;
  status: 'pendiente' | 'en_curso' | 'impartida';
  raCodes: string[];
}

export const CURRICULUM_JSON_EXAMPLE = `{
  "resultadosAprendizaje": [
    {
      "code": "RA1",
      "description": "Gestiona procesos del sistema.",
      "weight": 25,
      "criteria": [
        {
          "code": "RA1.a",
          "description": "Reconoce la estructura de los procesos.",
          "difficulty": "básico",
          "weight": 50
        }
      ]
    }
  ]
}`;

export const WORK_UNIT_JSON_EXAMPLE = `{
  "unidadesTrabajo": [
    {
      "code": "UT1",
      "name": "Gestión de procesos",
      "evaluation": "1ª Evaluación",
      "hours": 20,
      "weight": 35,
      "taughtPercentage": 0,
      "status": "pendiente",
      "raCodes": ["RA1", "RA2"]
    }
  ]
}`;

function parseRoot(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('El contenido no es un JSON válido');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La raíz del JSON debe ser un objeto');
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, path: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path} es obligatorio`);
  return value.trim();
}

function percentage(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${path} debe ser un número entre 0 y 100`);
  }
  return value;
}

function nonNegativeNumber(value: unknown, path: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${path} debe ser un número igual o mayor que 0`);
  }
  return value;
}

export function parseCurriculumJson(text: string): CurriculumRAImport[] {
  const root = parseRoot(text);
  if (!Array.isArray(root.resultadosAprendizaje) || !root.resultadosAprendizaje.length) {
    throw new Error('resultadosAprendizaje debe ser una lista no vacía');
  }

  const seenRA = new Set<string>();
  const seenCE = new Set<string>();
  return root.resultadosAprendizaje.map((rawRA, raIndex) => {
    if (!rawRA || typeof rawRA !== 'object' || Array.isArray(rawRA)) {
      throw new Error(`resultadosAprendizaje[${raIndex}] debe ser un objeto`);
    }
    const row = rawRA as Record<string, unknown>;
    const code = requiredText(row.code, `resultadosAprendizaje[${raIndex}].code`);
    const normalizedCode = code.toLocaleLowerCase('es');
    if (seenRA.has(normalizedCode)) throw new Error(`Código RA duplicado: ${code}`);
    seenRA.add(normalizedCode);
    if (!Array.isArray(row.criteria)) {
      throw new Error(`resultadosAprendizaje[${raIndex}].criteria debe ser una lista`);
    }

    const criteria = row.criteria.map((rawCE, ceIndex) => {
      if (!rawCE || typeof rawCE !== 'object' || Array.isArray(rawCE)) {
        throw new Error(`El criterio ${ceIndex + 1} de ${code} debe ser un objeto`);
      }
      const criterion = rawCE as Record<string, unknown>;
      const criterionCode = requiredText(criterion.code, `${code}.criteria[${ceIndex}].code`);
      const normalizedCriterionCode = criterionCode.toLocaleLowerCase('es');
      if (seenCE.has(normalizedCriterionCode)) {
        throw new Error(`Código CE duplicado: ${criterionCode}`);
      }
      seenCE.add(normalizedCriterionCode);
      if (!['básico', 'medio', 'avanzado'].includes(String(criterion.difficulty))) {
        throw new Error(`${criterionCode}.difficulty debe ser básico, medio o avanzado`);
      }
      return {
        code: criterionCode,
        description: requiredText(criterion.description, `${criterionCode}.description`),
        difficulty: criterion.difficulty as CriterionDifficulty,
        weight: percentage(criterion.weight, `${criterionCode}.weight`),
      };
    });

    return {
      code,
      description: requiredText(row.description, `${code}.description`),
      weight: percentage(row.weight, `${code}.weight`),
      criteria,
    };
  });
}

export function parseWorkUnitsJson(text: string): WorkUnitImport[] {
  const root = parseRoot(text);
  if (!Array.isArray(root.unidadesTrabajo) || !root.unidadesTrabajo.length) {
    throw new Error('unidadesTrabajo debe ser una lista no vacía');
  }
  const seen = new Set<string>();
  return root.unidadesTrabajo.map((rawUnit, index) => {
    if (!rawUnit || typeof rawUnit !== 'object' || Array.isArray(rawUnit)) {
      throw new Error(`unidadesTrabajo[${index}] debe ser un objeto`);
    }
    const row = rawUnit as Record<string, unknown>;
    const code = requiredText(row.code, `unidadesTrabajo[${index}].code`);
    const normalizedCode = code.toLocaleLowerCase('es');
    if (seen.has(normalizedCode)) throw new Error(`Código UT duplicado: ${code}`);
    seen.add(normalizedCode);
    if (!['pendiente', 'en_curso', 'impartida'].includes(String(row.status))) {
      throw new Error(`${code}.status debe ser pendiente, en_curso o impartida`);
    }
    if (!Array.isArray(row.raCodes) || row.raCodes.some((value) => typeof value !== 'string')) {
      throw new Error(`${code}.raCodes debe ser una lista de códigos RA`);
    }
    return {
      code,
      name: requiredText(row.name, `${code}.name`),
      evaluation: requiredText(row.evaluation, `${code}.evaluation`),
      hours: nonNegativeNumber(row.hours, `${code}.hours`),
      weight: percentage(row.weight, `${code}.weight`),
      taughtPercentage: percentage(row.taughtPercentage, `${code}.taughtPercentage`),
      status: row.status as WorkUnitImport['status'],
      raCodes: row.raCodes.map((value) => value.trim()).filter(Boolean),
    };
  });
}
