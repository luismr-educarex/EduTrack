import { describe, expect, it } from 'vitest';
import { validateCompletionRequest } from './completionRequest';

const validRequest = {
  provider: 'OPEN_AI',
  model: 'gpt-test',
  messages: [{ role: 'user', content: 'Hola' }],
};

describe('validateCompletionRequest', () => {
  it('conserva únicamente parámetros de generación permitidos', () => {
    expect(
      validateCompletionRequest({
        ...validRequest,
        parameters: { temperature: 0.4, max_tokens: 500 },
      })
    ).toMatchObject({
      ...validRequest,
      stream: false,
      parameters: { temperature: 0.4, max_tokens: 500 },
    });
  });

  it.each(['api_key', 'model', 'messages', 'stream', 'base_url'])(
    'rechaza el parámetro controlado por el servidor %s',
    (name) => {
      expect(() =>
        validateCompletionRequest({ ...validRequest, parameters: { [name]: 'attacker-value' } })
      ).toThrow(`El parámetro ${name} no está permitido.`);
    }
  );

  it('rechaza proveedores y mensajes con tipos incorrectos', () => {
    expect(() => validateCompletionRequest({ ...validRequest, provider: {} })).toThrow(
      'El proveedor de IA no es válido.'
    );
    expect(() => validateCompletionRequest({ ...validRequest, messages: [{ content: 'Hola' }] }))
      .toThrow('Los mensajes de la solicitud no son válidos.');
  });
});
