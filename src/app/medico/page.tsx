import Link from 'next/link';
import { getRepository } from '@/lib/db';
import { formatDate, SOURCE_LABEL } from './format';
import styles from './medico.module.css';

export const dynamic = 'force-dynamic';

export default async function MedicoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim().slice(0, 100) || undefined;
  const records = await getRepository().list({ query });

  return (
    <main>
      <h1>Preconsultas</h1>
      <p className="muted">
        Fichas recopiladas por la asistente de voz. Los datos son ficticios y se borran
        automáticamente al vencer su plazo de conservación.
      </p>

      <form className={styles.search} role="search">
        <label htmlFor="q" className={styles.srOnly}>
          Buscar por identificador o nombre
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query ?? ''}
          placeholder="PRE-XXXXXXXX o nombre"
          autoComplete="off"
        />
        <button type="submit">Buscar</button>
        {query && (
          <Link className="button" href="/medico">
            Limpiar
          </Link>
        )}
      </form>

      {records.length === 0 ? (
        <p>{query ? 'No hay resultados para esa búsqueda.' : 'Todavía no hay preconsultas.'}</p>
      ) : (
        <ul className={styles.list}>
          {records.map((record) => (
            <li key={record.id}>
              <Link href={`/medico/${record.id}`} className={styles.row}>
                <span className={styles.rowMain}>
                  <strong>{record.patient_alias || 'Sin nombre'}</strong>
                  <span className="muted">{record.reason_raw || 'Motivo no registrado'}</span>
                </span>
                <span className={styles.rowMeta}>
                  {record.urgent && <span className={styles.urgent}>Posible urgencia</span>}
                  {record.pending_items.length > 0 && (
                    <span className={styles.pending}>
                      {record.pending_items.length} pendiente(s)
                    </span>
                  )}
                  <span className="muted">
                    {formatDate(record.created_at)} · {record.id} · {SOURCE_LABEL[record.source]}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
