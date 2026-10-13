import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isAuthorizedApiCall, unauthorized } from '@/lib/auth';
import { env } from '@/lib/env';
import { createIntakeMcpServer } from '@/lib/mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Modo sin sesión: cada petición crea su servidor y su transporte. En Vercel no hay
// memoria compartida entre invocaciones, así que guardar sesiones no serviría de nada.
const handle = async (request: Request): Promise<Response> => {
  if (!isAuthorizedApiCall(request.headers, env.intakeApiToken())) return unauthorized();

  const server = createIntakeMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 256_000,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
};

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
