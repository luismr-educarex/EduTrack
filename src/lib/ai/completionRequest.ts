export const SUPPORTED_PROVIDERS = ['OPEN_AI', 'ANTHROPIC', 'GEMINI', 'PERPLEXITY'] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

type CompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type CompletionParameters = {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
};

export type ValidatedCompletionRequest = {
  provider: SupportedProvider;
  model: string;
  messages: CompletionMessage[];
  stream: boolean;
  parameters: CompletionParameters;
};

const PARAMETER_NAMES = new Set([
  'temperature',
  'max_tokens',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stop',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(
  parameters: Record<string, unknown>,
  name: keyof CompletionParameters,
  minimum: number,
  maximum: number
) {
  const value = parameters[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`El parámetro ${name} no es válido.`);
  }
  return value;
}

export function validateCompletionRequest(input: unknown): ValidatedCompletionRequest {
  if (!isPlainObject(input)) throw new Error('El cuerpo de la solicitud no es válido.');

  const { provider, model, messages, stream = false, parameters = {} } = input;
  if (
    typeof provider !== 'string' ||
    !SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)
  ) {
    throw new Error('El proveedor de IA no es válido.');
  }
  if (typeof model !== 'string' || !model.trim() || model.length > 200) {
    throw new Error('El modelo de IA no es válido.');
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
    throw new Error('Los mensajes de la solicitud no son válidos.');
  }

  const validatedMessages = messages.map((message) => {
    if (
      !isPlainObject(message) ||
      !['system', 'user', 'assistant'].includes(String(message.role)) ||
      typeof message.content !== 'string' ||
      message.content.length > 200_000
    ) {
      throw new Error('Los mensajes de la solicitud no son válidos.');
    }
    return {
      role: message.role as CompletionMessage['role'],
      content: message.content,
    };
  });

  if (typeof stream !== 'boolean') throw new Error('El modo de respuesta no es válido.');
  if (!isPlainObject(parameters)) throw new Error('Los parámetros de IA no son válidos.');
  const unsupported = Object.keys(parameters).find((name) => !PARAMETER_NAMES.has(name));
  if (unsupported) throw new Error(`El parámetro ${unsupported} no está permitido.`);

  const stop = parameters.stop;
  if (
    stop !== undefined &&
    !(
      (typeof stop === 'string' && stop.length <= 1_000) ||
      (Array.isArray(stop) &&
        stop.length <= 20 &&
        stop.every((item) => typeof item === 'string' && item.length <= 1_000))
    )
  ) {
    throw new Error('El parámetro stop no es válido.');
  }

  return {
    provider: provider as SupportedProvider,
    model: model.trim(),
    messages: validatedMessages,
    stream,
    parameters: {
      temperature: finiteNumber(parameters, 'temperature', 0, 2),
      max_tokens: finiteNumber(parameters, 'max_tokens', 1, 100_000),
      top_p: finiteNumber(parameters, 'top_p', 0, 1),
      frequency_penalty: finiteNumber(parameters, 'frequency_penalty', -2, 2),
      presence_penalty: finiteNumber(parameters, 'presence_penalty', -2, 2),
      ...(stop === undefined ? {} : { stop: stop as string | string[] }),
    },
  };
}
