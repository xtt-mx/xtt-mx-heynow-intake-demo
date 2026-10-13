import { isAuthorizedApiCall, unauthorized } from '@/lib/auth';
import { getRepository } from '@/lib/db';
import { env } from '@/lib/env';
import { hasAnyContent, intakeInputSchema } from '@/lib/intake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alternativa REST al servidor MCP, por si HeyNow termina usando una "Herramienta"
 * HTTP en lugar de MCP. Mismo esquema y mismo token.
 */
export const POST = async (request: Request): Promise<Response> => {
  if (!isAuthorizedApiCall(request.headers, env.intakeApiToken())) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = intakeInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid_payload', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  if (!hasAnyContent(parsed.data)) {
    return Response.json({ error: 'empty_intake' }, { status: 422 });
  }

  const source = request.headers.get('x-intake-source') === 'simulator' ? 'simulator' : 'heynow-http';
  const record = await getRepository().insert(parsed.data, source);
  return Response.json({ id: record.id, expires_at: record.expires_at }, { status: 201 });
};
