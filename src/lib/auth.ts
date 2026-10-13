import { timingSafeEqual } from 'node:crypto';

/** Comparación en tiempo constante, para que la respuesta no filtre el secreto byte a byte. */
export const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/**
 * Extrae el token de `Authorization: Bearer …` o de `X-API-Key`. Se aceptan los dos
 * porque aún no sabemos cuál de ellos deja configurar el formulario MCP de HeyNow.
 */
export const readApiToken = (headers: Headers): string | undefined => {
  const authorization = headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (match?.[1]) return match[1].trim();
  return headers.get('x-api-key')?.trim() || undefined;
};

export const isAuthorizedApiCall = (
  headers: Headers,
  expected: string | undefined,
): boolean => {
  if (!expected) return false;
  const token = readApiToken(headers);
  return token !== undefined && safeEqual(token, expected);
};

export const unauthorized = (): Response =>
  Response.json({ error: 'unauthorized' }, { status: 401 });
