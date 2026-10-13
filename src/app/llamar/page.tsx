import { readVoiceConfig } from '@/lib/voice';
import { LlamarClient } from './LlamarClient';

export const dynamic = 'force-dynamic';

export default function LlamarPage() {
  const voice = readVoiceConfig();
  return (
    <main>
      <h1>Hablar con Clara</h1>
      <p className="muted">
        Clara es una asistente de voz que le hará unas preguntas antes de su cita para que el
        médico ya tenga su información. Toma unos cinco minutos.
      </p>
      <p className="notice">
        Demostración con <strong>datos ficticios</strong>: no comparta información médica real.
        Clara no diagnostica ni recomienda tratamientos. Ante una urgencia, llame al 911.
      </p>
      {voice ? (
        <LlamarClient voice={voice} />
      ) : (
        <p role="alert">La línea de voz aún no está configurada en este despliegue.</p>
      )}
    </main>
  );
}
