import { safeEqual } from '@/lib/auth';
import { getRepository } from '@/lib/db';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Borra las fichas vencidas. Vercel Cron la llama a diario con `Bearer CRON_SECRET`. */
export const GET = async (request: Request): Promise<Response> => {
  const secret = env.cronSecret();
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  const removed = await getRepository().purgeExpired();
  return Response.json({ removed });
};
