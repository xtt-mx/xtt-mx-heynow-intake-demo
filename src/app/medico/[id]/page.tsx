import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepository } from '@/lib/db';
import { RAW_FIELDS } from '@/lib/intake';
import { formatDate, SOURCE_LABEL } from '../format';
import styles from '../medico.module.css';

export const dynamic = 'force-dynamic';

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getRepository().get(id);
  if (!record) notFound();

  return (
    <main>
      <p>
        <Link href="/medico">← Todas las preconsultas</Link>
      </p>
      <h1>{record.patient_alias || 'Paciente sin nombre'}</h1>
      <p className="muted">
        {record.id} · {formatDate(record.created_at)} · {SOURCE_LABEL[record.source]}
        {record.appointment_ref && ` · Cita ${record.appointment_ref}`}
        {record.conversation_id && ` · Conversación HeyNow ${record.conversation_id}`}
      </p>

      {record.urgent && (
        <section className={styles.alert} role="alert">
          <strong>Se activó el protocolo de urgencia durante la llamada.</strong>
          {record.urgent_trigger_raw && (
            <p>
              Frase del paciente: <q>{record.urgent_trigger_raw}</q>
            </p>
          )}
          <p>La asistente detuvo la entrevista y orientó al paciente a buscar atención urgente.</p>
        </section>
      )}

      <h2>Lo que dijo el paciente</h2>
      <p className="muted">Textual, con sus palabras. No es una interpretación clínica.</p>
      <dl className={styles.fields}>
        {RAW_FIELDS.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{record[key] || <span className="muted">Sin respuesta</span>}</dd>
          </div>
        ))}
      </dl>

      {record.pending_items.length > 0 && (
        <>
          <h2>Pendientes o sin confirmar</h2>
          <ul>
            {record.pending_items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {record.patient_questions.length > 0 && (
        <>
          <h2>Preguntas del paciente para el médico</h2>
          <ul>
            {record.patient_questions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {record.summary && (
        <>
          <h2>Resumen</h2>
          <div className={styles.generated}>
            <p className={styles.generatedLabel}>Generado por IA · no verificado</p>
            <p>{record.summary}</p>
          </div>
        </>
      )}

      <p className="muted">
        Esta ficha se borra automáticamente el {formatDate(record.expires_at)}.
        {record.conversation_id &&
          ' La transcripción completa está en Agent Center de HeyNow; no se copia aquí.'}
      </p>
    </main>
  );
}
