import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRepository, setRepositoryForTests } from '@/lib/db';
import type { IntakeRepository } from '@/lib/db';
import { POST as intakePost } from '@/app/api/intake/route';
import { POST as mcpPost } from '@/app/api/mcp/route';
import { GET as purgeGet } from '@/app/api/cron/purge/route';

const TOKEN = 'token-de-prueba';
let repo: IntakeRepository;

beforeEach(() => {
  process.env.INTAKE_API_TOKEN = TOKEN;
  process.env.CRON_SECRET = 'cron-de-prueba';
  repo = createMemoryRepository();
  setRepositoryForTests(repo);
});

afterEach(() => setRepositoryForTests(undefined));

const mcpCall = (body: unknown, token = TOKEN) =>
  mcpPost(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    }),
  );

describe('/api/mcp', () => {
  it('rechaza peticiones sin token', async () => {
    const response = await mcpCall({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'malo');
    expect(response.status).toBe(401);
  });

  it('expone registrar_preconsulta y guarda la ficha', async () => {
    const init = await mcpCall({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      },
    });
    expect(init.status).toBe(200);

    const list = await mcpCall({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (await list.json()) as { result: { tools: { name: string }[] } };
    expect(tools.result.tools.map((tool) => tool.name)).toEqual(['registrar_preconsulta']);

    const call = await mcpCall({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'registrar_preconsulta',
        arguments: {
          patient_alias: 'Luis Prueba',
          reason_raw: 'Me duele la garganta',
          allergies_raw: 'Penicilina',
          pending_items: ['Antecedentes: prefirió no responder'],
        },
      },
    });
    const result = (await call.json()) as {
      result: { isError?: boolean; content: { text: string }[] };
    };
    expect(result.result.isError).toBeFalsy();
    expect(result.result.content[0]?.text).toMatch(/PRE-/);

    const [saved] = await repo.list();
    expect(saved).toMatchObject({
      source: 'heynow-mcp',
      allergies_raw: 'Penicilina',
      pending_items: ['Antecedentes: prefirió no responder'],
    });
  });

  it('no guarda fichas vacías', async () => {
    const call = await mcpCall({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'registrar_preconsulta', arguments: {} },
    });
    const result = (await call.json()) as { result: { isError?: boolean } };
    expect(result.result.isError).toBe(true);
    expect(await repo.list()).toHaveLength(0);
  });
});

describe('/api/intake', () => {
  const post = (body: unknown, token = TOKEN) =>
    intakePost(
      new Request('http://localhost/api/intake', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('crea una ficha válida', async () => {
    const response = await post({ reason_raw: 'Control', urgent: false });
    expect(response.status).toBe(201);
    expect(await repo.list()).toHaveLength(1);
  });

  it('responde 422 a un payload inválido', async () => {
    expect((await post({ urgent: 'sí' })).status).toBe(422);
  });

  it('responde 401 sin token válido', async () => {
    expect((await post({ reason_raw: 'x' }, 'otro')).status).toBe(401);
  });
});

describe('/api/cron/purge', () => {
  it('exige CRON_SECRET', async () => {
    const denied = await purgeGet(new Request('http://localhost/api/cron/purge'));
    expect(denied.status).toBe(401);
    const allowed = await purgeGet(
      new Request('http://localhost/api/cron/purge', {
        headers: { authorization: 'Bearer cron-de-prueba' },
      }),
    );
    expect(allowed.status).toBe(200);
  });
});
