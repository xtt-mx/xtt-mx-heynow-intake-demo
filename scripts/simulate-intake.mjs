// Envía fichas ficticias a /api/intake para probar el panel del médico sin HeyNow.
//
//   INTAKE_API_TOKEN=... node scripts/simulate-intake.mjs [http://localhost:3000]

const baseUrl = process.argv[2] ?? 'http://localhost:3000';
const token = process.env.INTAKE_API_TOKEN;

if (!token) {
  console.error('Falta INTAKE_API_TOKEN en el entorno.');
  process.exit(1);
}

const samples = [
  {
    patient_alias: 'Laura Ficticia',
    reason_raw: 'Vengo porque me duele la garganta',
    symptoms_raw: 'Me duele al tragar y tengo un poco de fiebre en las noches',
    onset_raw: 'Desde hace tres días',
    severity_raw: 'Como un seis de diez, y va igual',
    history_raw: 'Tengo presión alta',
    medications_raw: 'Losartán, una pastilla en la mañana',
    allergies_raw: 'Soy alérgica a la penicilina',
    additional_raw: 'Mi hijo también estuvo enfermo la semana pasada',
    patient_questions: ['¿Puedo seguir yendo a trabajar?'],
    pending_items: [],
    summary:
      'Paciente refiere dolor de garganta de tres días, intensidad 6/10, sin cambios. Toma losartán. Alergia a penicilina referida.',
    urgent: false,
  },
  {
    patient_alias: 'Jorge Ejemplo',
    reason_raw: 'Revisión por dolor de espalda',
    symptoms_raw: 'Me duele la parte baja de la espalda cuando me agacho',
    onset_raw: 'No me acuerdo bien, como un mes',
    severity_raw: 'Cuatro de diez',
    history_raw: '',
    medications_raw: 'Ninguno',
    allergies_raw: 'Ninguna que sepa',
    patient_questions: [],
    pending_items: ['Antecedentes: prefirió no responder', 'Fecha de inicio: no la recuerda con precisión'],
    summary: 'Dolor lumbar de aproximadamente un mes, 4/10, relacionado con flexión.',
    urgent: false,
  },
  {
    patient_alias: 'Carmen Demo',
    reason_raw: 'Me siento mal del estómago',
    symptoms_raw: '',
    urgent: true,
    urgent_trigger_raw: 'Ahorita me está doliendo mucho el pecho y me falta el aire',
    pending_items: ['Entrevista interrumpida por protocolo de urgencia'],
    summary: 'Se activó el protocolo de urgencia y se orientó a llamar al 911.',
  },
];

for (const sample of samples) {
  const response = await fetch(new URL('/api/intake', baseUrl), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-intake-source': 'simulator',
    },
    body: JSON.stringify(sample),
  });
  const body = await response.json().catch(() => ({}));
  console.log(response.status, sample.patient_alias, body.id ?? body.error ?? '');
}
