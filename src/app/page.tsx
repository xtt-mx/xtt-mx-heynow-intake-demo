import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      <h1>Preconsulta por voz</h1>
      <p className="muted">Demostración de XTT con HeyNow.</p>
      <p className="notice">
        Esta demo usa <strong>datos ficticios</strong>. No diagnostica, no recomienda
        tratamientos y no sustituye la atención médica. Ante una urgencia, llame al 911.
      </p>
      <p>
        <Link className="button primary" href="/llamar">
          Hablar con la asistente
        </Link>{' '}
        <Link className="button" href="/medico">
          Panel del médico
        </Link>
      </p>
    </main>
  );
}
