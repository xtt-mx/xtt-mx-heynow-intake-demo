import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { safeEqual } from '@/lib/auth';

// Autenticación básica por rol. Basta para una demo con datos ficticios; con pacientes
// reales haría falta login individual, auditoría y control de acceso por médico.

interface Realm {
  name: string;
  user: string | undefined;
  password: string | undefined;
}

const realmFor = (pathname: string): Realm | undefined => {
  if (pathname.startsWith('/medico')) {
    return {
      name: 'Panel del medico',
      user: process.env.DEMO_DOCTOR_USER,
      password: process.env.DEMO_DOCTOR_PASSWORD,
    };
  }
  if (pathname.startsWith('/llamar')) {
    return {
      name: 'Demo preconsulta',
      user: process.env.DEMO_PATIENT_USER,
      password: process.env.DEMO_PATIENT_PASSWORD,
    };
  }
  return undefined;
};

const decodeBasic = (header: string | null): [string, string] | undefined => {
  const match = /^Basic\s+(.+)$/i.exec(header ?? '');
  if (!match?.[1]) return undefined;
  try {
    const decoded = atob(match[1]);
    const separator = decoded.indexOf(':');
    if (separator < 0) return undefined;
    return [decoded.slice(0, separator), decoded.slice(separator + 1)];
  } catch {
    return undefined;
  }
};

export const proxy = (request: NextRequest): NextResponse => {
  const realm = realmFor(request.nextUrl.pathname);
  if (!realm) return NextResponse.next();

  if (!realm.user || !realm.password) {
    // Sin credenciales configuradas la ruta queda cerrada, nunca abierta.
    return new NextResponse('Acceso no configurado.', { status: 503 });
  }

  const credentials = decodeBasic(request.headers.get('authorization'));
  if (
    credentials &&
    safeEqual(credentials[0], realm.user) &&
    safeEqual(credentials[1], realm.password)
  ) {
    return NextResponse.next();
  }

  return new NextResponse('Autenticación requerida.', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${realm.name}", charset="UTF-8"` },
  });
};

export const config = {
  matcher: ['/medico/:path*', '/llamar/:path*'],
};
