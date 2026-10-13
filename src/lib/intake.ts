import { z } from 'zod';

// Límite por campo: una respuesta hablada larga cabe de sobra, y acota lo que un
// cliente mal configurado (o malicioso) puede meter en la base.
const MAX_TEXT = 4_000;
const MAX_ITEMS = 30;

const text = (description: string) =>
  z.string().trim().max(MAX_TEXT).describe(description);

const optionalText = (description: string) => text(description).optional();

const textList = (description: string) =>
  z.array(z.string().trim().min(1).max(500)).max(MAX_ITEMS).default([]).describe(description);

/**
 * Lo que el agente de HeyNow envía al cerrar la entrevista.
 *
 * Los campos `*_raw` son las palabras del paciente, no una interpretación. El único
 * texto generado es `summary`, y se guarda marcado como tal.
 */
export const intakeInputShape = {
  conversation_id: z
    .string()
    .trim()
    .max(200)
    .optional()
    .describe('Identificador de la conversación o llamada en HeyNow, si lo conoces.'),
  patient_alias: optionalText('Nombre con el que el paciente pidió que lo llamaran.'),
  appointment_ref: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe('Referencia de la cita, solo si el paciente la dio.'),
  reason_raw: optionalText('Motivo de la consulta, con las palabras del paciente.'),
  symptoms_raw: optionalText('Síntomas descritos, con las palabras del paciente.'),
  onset_raw: optionalText('Desde cuándo tiene los síntomas, tal como lo dijo.'),
  severity_raw: optionalText('Intensidad (0 a 10) y evolución, tal como lo dijo.'),
  history_raw: optionalText('Antecedentes médicos relevantes, tal como los dijo.'),
  medications_raw: optionalText('Medicamentos actuales, tal como los dijo.'),
  allergies_raw: optionalText('Alergias conocidas, tal como las dijo.'),
  additional_raw: optionalText('Cualquier otra cosa que quiso que supiera el médico.'),
  patient_questions: textList('Preguntas que el paciente quiere hacerle al médico.'),
  pending_items: textList(
    'Preguntas que el paciente no supo o no quiso responder, o que no se entendieron.',
  ),
  summary: optionalText('Resumen breve de la entrevista redactado por el agente.'),
  urgent: z
    .boolean()
    .default(false)
    .describe('true si se activó el protocolo de urgencia durante la llamada.'),
  urgent_trigger_raw: optionalText(
    'Frase exacta del paciente que activó el protocolo de urgencia.',
  ),
} as const;

export const intakeInputSchema = z.object(intakeInputShape).strict();

export type IntakeInput = z.infer<typeof intakeInputSchema>;

export interface IntakeRecord extends IntakeInput {
  id: string;
  created_at: string;
  expires_at: string;
  source: IntakeSource;
}

export type IntakeSource = 'heynow-mcp' | 'heynow-http' | 'simulator';

/** Campos literales en el orden en que el agente los pregunta. */
export const RAW_FIELDS = [
  ['reason_raw', 'Motivo de consulta'],
  ['symptoms_raw', 'Síntomas'],
  ['onset_raw', 'Inicio'],
  ['severity_raw', 'Intensidad y evolución'],
  ['history_raw', 'Antecedentes'],
  ['medications_raw', 'Medicamentos actuales'],
  ['allergies_raw', 'Alergias'],
  ['additional_raw', 'Información adicional'],
] as const satisfies ReadonlyArray<readonly [keyof IntakeInput, string]>;

export const hasAnyContent = (input: IntakeInput): boolean =>
  RAW_FIELDS.some(([key]) => (input[key] ?? '').length > 0) ||
  (input.summary ?? '').length > 0 ||
  input.urgent;
