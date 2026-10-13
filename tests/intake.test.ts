import { describe, expect, it } from 'vitest';
import { hasAnyContent, intakeInputSchema } from '@/lib/intake';
import { createMemoryRepository, newIntakeId } from '@/lib/db';
import { readApiToken, safeEqual } from '@/lib/auth';

describe('intakeInputSchema', () => {
  it('acepta una ficha mínima y rellena listas vacías', () => {
    const parsed = intakeInputSchema.parse({ reason_raw: 'Dolor de garganta' });
    expect(parsed.pending_items).toEqual([]);
    expect(parsed.patient_questions).toEqual([]);
    expect(parsed.urgent).toBe(false);
  });

  it('rechaza campos desconocidos para no guardar datos que no pedimos', () => {
    const result = intakeInputSchema.safeParse({ reason_raw: 'x', curp: 'ABCD000000' });
    expect(result.success).toBe(false);
  });

  it('rechaza textos excesivos', () => {
    const result = intakeInputSchema.safeParse({ symptoms_raw: 'a'.repeat(4_001) });
    expect(result.success).toBe(false);
  });

  it('detecta una ficha vacía', () => {
    expect(hasAnyContent(intakeInputSchema.parse({}))).toBe(false);
    expect(hasAnyContent(intakeInputSchema.parse({ urgent: true }))).toBe(true);
  });
});

describe('repositorio en memoria', () => {
  it('guarda, lista, busca y purga', async () => {
    const repo = createMemoryRepository();
    const record = await repo.insert(
      intakeInputSchema.parse({ patient_alias: 'Ana Prueba', reason_raw: 'Tos' }),
      'simulator',
    );
    expect(record.id).toMatch(/^PRE-[2-9A-HJ-NP-Z]{8}$/);
    expect(await repo.get(record.id)).toMatchObject({ reason_raw: 'Tos' });
    expect(await repo.list({ query: 'ana' })).toHaveLength(1);
    expect(await repo.list({ query: record.id })).toHaveLength(1);
    expect(await repo.list({ query: 'nadie' })).toHaveLength(0);
    expect(await repo.purgeExpired()).toBe(0);
  });

  it('genera IDs distintos', () => {
    const ids = new Set(Array.from({ length: 500 }, newIntakeId));
    expect(ids.size).toBe(500);
  });
});

describe('auth', () => {
  it('lee Bearer y X-API-Key', () => {
    expect(readApiToken(new Headers({ authorization: 'Bearer abc' }))).toBe('abc');
    expect(readApiToken(new Headers({ 'x-api-key': 'xyz' }))).toBe('xyz');
    expect(readApiToken(new Headers())).toBeUndefined();
  });

  it('compara en tiempo constante sin fallar por longitudes distintas', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
