// Se leen en cada llamada, no al importar: así `next build` no exige secretos y un
// cambio de variable en Vercel aplica en el siguiente despliegue sin tocar código.

const read = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export const env = {
  databaseUrl: () => read('DATABASE_URL'),
  intakeApiToken: () => read('INTAKE_API_TOKEN'),
  cronSecret: () => read('CRON_SECRET'),
  retentionDays: () => {
    const days = Number(read('RETENTION_DAYS') ?? '30');
    return Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30;
  },
  patientUser: () => read('DEMO_PATIENT_USER'),
  patientPassword: () => read('DEMO_PATIENT_PASSWORD'),
  doctorUser: () => read('DEMO_DOCTOR_USER'),
  doctorPassword: () => read('DEMO_DOCTOR_PASSWORD'),
  voice: () => ({
    wssUrl: read('VOICE_WSS_URL'),
    sipDomain: read('VOICE_SIP_DOMAIN'),
    sipUser: read('VOICE_SIP_USER'),
    sipPassword: read('VOICE_SIP_PASSWORD'),
    target: read('VOICE_TARGET') ?? 'preconsulta',
    turnUrl: read('VOICE_TURN_URL'),
    turnUser: read('VOICE_TURN_USER'),
    turnPassword: read('VOICE_TURN_PASSWORD'),
  }),
} as const;

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
