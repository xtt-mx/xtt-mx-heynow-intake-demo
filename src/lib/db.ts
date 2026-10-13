import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { env, isProduction } from './env';
import type { IntakeInput, IntakeRecord, IntakeSource } from './intake';

export interface IntakeRepository {
  insert(input: IntakeInput, source: IntakeSource): Promise<IntakeRecord>;
  list(options?: { query?: string; limit?: number }): Promise<IntakeRecord[]>;
  get(id: string): Promise<IntakeRecord | undefined>;
  purgeExpired(): Promise<number>;
}

// Sin 0/O/1/I: el ID se dicta por teléfono o se copia a mano.
const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const newIntakeId = (): string => {
  const bytes = randomBytes(8);
  let id = '';
  for (const byte of bytes) id += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `PRE-${id}`;
};

const expiresAt = (from: Date): string =>
  new Date(from.getTime() + env.retentionDays() * 86_400_000).toISOString();

const buildRecord = (input: IntakeInput, source: IntakeSource): IntakeRecord => {
  const now = new Date();
  return {
    ...input,
    id: newIntakeId(),
    created_at: now.toISOString(),
    expires_at: expiresAt(now),
    source,
  };
};

const matchesQuery = (record: IntakeRecord, query: string): boolean => {
  const q = query.toLowerCase();
  return (
    record.id.toLowerCase() === q ||
    (record.conversation_id ?? '').toLowerCase() === q ||
    (record.patient_alias ?? '').toLowerCase().includes(q)
  );
};

// ---------------------------------------------------------------------------
// Memoria: solo para desarrollo local y pruebas. Se pierde al reiniciar.

export const createMemoryRepository = (): IntakeRepository => {
  const rows = new Map<string, IntakeRecord>();
  const alive = (record: IntakeRecord) => Date.parse(record.expires_at) > Date.now();

  return {
    insert: async (input, source) => {
      const record = buildRecord(input, source);
      rows.set(record.id, record);
      return record;
    },
    list: async ({ query, limit = 100 } = {}) =>
      [...rows.values()]
        .filter(alive)
        .filter((record) => (query ? matchesQuery(record, query) : true))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit),
    get: async (id) => {
      const record = rows.get(id);
      return record && alive(record) ? record : undefined;
    },
    purgeExpired: async () => {
      let removed = 0;
      for (const [id, record] of rows) {
        if (!alive(record)) {
          rows.delete(id);
          removed += 1;
        }
      }
      return removed;
    },
  };
};

// ---------------------------------------------------------------------------
// Postgres (Neon, vía la integración de Vercel).

const SCHEMA_SQL = `
create table if not exists intake_records (
  id text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  source text not null,
  conversation_id text,
  patient_alias text,
  appointment_ref text,
  reason_raw text,
  symptoms_raw text,
  onset_raw text,
  severity_raw text,
  history_raw text,
  medications_raw text,
  allergies_raw text,
  additional_raw text,
  patient_questions jsonb not null default '[]'::jsonb,
  pending_items jsonb not null default '[]'::jsonb,
  summary text,
  urgent boolean not null default false,
  urgent_trigger_raw text
);
create index if not exists intake_records_created_at_idx on intake_records (created_at desc);
create index if not exists intake_records_conversation_idx on intake_records (conversation_id);
`;

type Row = Record<string, unknown>;

const fromRow = (row: Row): IntakeRecord => {
  const str = (key: string) => (row[key] == null ? undefined : String(row[key]));
  const list = (key: string) => (Array.isArray(row[key]) ? (row[key] as string[]) : []);
  const iso = (key: string) => new Date(row[key] as string | Date).toISOString();
  return {
    id: String(row.id),
    created_at: iso('created_at'),
    expires_at: iso('expires_at'),
    source: String(row.source) as IntakeSource,
    conversation_id: str('conversation_id'),
    patient_alias: str('patient_alias'),
    appointment_ref: str('appointment_ref'),
    reason_raw: str('reason_raw'),
    symptoms_raw: str('symptoms_raw'),
    onset_raw: str('onset_raw'),
    severity_raw: str('severity_raw'),
    history_raw: str('history_raw'),
    medications_raw: str('medications_raw'),
    allergies_raw: str('allergies_raw'),
    additional_raw: str('additional_raw'),
    patient_questions: list('patient_questions'),
    pending_items: list('pending_items'),
    summary: str('summary'),
    urgent: row.urgent === true,
    urgent_trigger_raw: str('urgent_trigger_raw'),
  };
};

export const createPostgresRepository = (databaseUrl: string): IntakeRepository => {
  const sql = neon(databaseUrl);
  let schemaReady: Promise<void> | undefined;

  // La tabla se crea sola la primera vez: evita un paso manual de migración en la demo.
  const ready = () => {
    schemaReady ??= (async () => {
      for (const statement of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
        await sql.query(statement);
      }
    })().catch((error: unknown) => {
      schemaReady = undefined;
      throw error;
    });
    return schemaReady;
  };

  return {
    insert: async (input, source) => {
      await ready();
      const r = buildRecord(input, source);
      await sql.query(
        `insert into intake_records (
          id, created_at, expires_at, source, conversation_id, patient_alias, appointment_ref,
          reason_raw, symptoms_raw, onset_raw, severity_raw, history_raw, medications_raw,
          allergies_raw, additional_raw, patient_questions, pending_items, summary, urgent,
          urgent_trigger_raw
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20)`,
        [
          r.id,
          r.created_at,
          r.expires_at,
          r.source,
          r.conversation_id ?? null,
          r.patient_alias ?? null,
          r.appointment_ref ?? null,
          r.reason_raw ?? null,
          r.symptoms_raw ?? null,
          r.onset_raw ?? null,
          r.severity_raw ?? null,
          r.history_raw ?? null,
          r.medications_raw ?? null,
          r.allergies_raw ?? null,
          r.additional_raw ?? null,
          JSON.stringify(r.patient_questions),
          JSON.stringify(r.pending_items),
          r.summary ?? null,
          r.urgent,
          r.urgent_trigger_raw ?? null,
        ],
      );
      return r;
    },
    list: async ({ query, limit = 100 } = {}) => {
      await ready();
      const rows = query
        ? await sql.query(
            `select * from intake_records
             where expires_at > now()
               and (upper(id) = upper($1) or conversation_id = $1
                    or patient_alias ilike '%' || $1 || '%')
             order by created_at desc limit $2`,
            [query, limit],
          )
        : await sql.query(
            `select * from intake_records where expires_at > now()
             order by created_at desc limit $1`,
            [limit],
          );
      return (rows as Row[]).map(fromRow);
    },
    get: async (id) => {
      await ready();
      const rows = (await sql.query(
        'select * from intake_records where id = $1 and expires_at > now()',
        [id],
      )) as Row[];
      return rows[0] ? fromRow(rows[0]) : undefined;
    },
    purgeExpired: async () => {
      await ready();
      const rows = (await sql.query(
        'delete from intake_records where expires_at <= now() returning id',
      )) as Row[];
      return rows.length;
    },
  };
};

// ---------------------------------------------------------------------------

// En globalThis y no en una variable del módulo: Next.js carga las rutas de API y las
// páginas en grafos de módulos distintos, y con una variable local cada uno tendría su
// propia memoria (lo que guarda la API no lo vería el panel).
const holder = globalThis as typeof globalThis & { __intakeRepository?: IntakeRepository };

export const getRepository = (): IntakeRepository => {
  if (holder.__intakeRepository) return holder.__intakeRepository;
  const url = env.databaseUrl();
  if (url) {
    holder.__intakeRepository = createPostgresRepository(url);
  } else if (isProduction()) {
    // En Vercel cada instancia tiene su propia memoria: los datos se perderían y el
    // médico vería resultados al azar. Mejor fallar de forma visible.
    throw new Error('DATABASE_URL no está configurada.');
  } else {
    console.warn('[db] Sin DATABASE_URL: usando memoria (los datos se pierden al reiniciar).');
    holder.__intakeRepository = createMemoryRepository();
  }
  return holder.__intakeRepository;
};

/** Solo para pruebas. */
export const setRepositoryForTests = (repo: IntakeRepository | undefined): void => {
  holder.__intakeRepository = repo;
};
