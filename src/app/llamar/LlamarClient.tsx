'use client';

import { useEffect, useRef, useState } from 'react';
import type { RTCSession } from 'jssip/lib/RTCSession';
import type { UA } from 'jssip/lib/UA';
import type { VoiceConfig } from '@/lib/voice';
import styles from './llamar.module.css';

type Status = 'idle' | 'preparing' | 'connecting' | 'ringing' | 'in-call' | 'ended' | 'error';

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Lista para llamar',
  preparing: 'Pidiendo acceso al micrófono…',
  connecting: 'Conectando…',
  ringing: 'Llamando a Clara…',
  'in-call': 'En llamada',
  ended: 'Llamada finalizada',
  error: 'No se pudo completar la llamada',
};

// Sin esto, el navegador espera a agotar todos los candidatos ICE (puede tardar
// decenas de segundos detrás de algunos NAT) antes de enviar la oferta.
const ICE_GATHERING_GRACE_MS = 1_500;

const formatElapsed = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const describeMicError = (error: unknown): string => {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError') {
    return 'El navegador bloqueó el micrófono. Permítalo desde el candado de la barra de direcciones y vuelva a intentar.';
  }
  if (name === 'NotFoundError') return 'No se encontró ningún micrófono.';
  if (name === 'NotReadableError') {
    return 'El micrófono está ocupado por otra aplicación (Teams, Zoom, Meet…). Ciérrela y vuelva a intentar.';
  }
  return 'No se pudo acceder al micrófono.';
};

export const LlamarClient = ({ voice }: { voice: VoiceConfig }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [detail, setDetail] = useState('');
  const [consent, setConsent] = useState(false);
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const uaRef = useRef<UA | null>(null);
  const sessionRef = useRef<RTCSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const active = status === 'connecting' || status === 'ringing' || status === 'in-call';

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    uaRef.current?.stop();
    uaRef.current = null;
    sessionRef.current = null;
    setMuted(false);
  };

  useEffect(() => {
    if (status !== 'in-call') return;
    const started = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [status]);

  // Colgar si el paciente cierra la pestaña o navega fuera a mitad de la llamada.
  useEffect(() => () => {
    sessionRef.current?.terminate();
    cleanup();
  }, []);

  const start = async () => {
    setDetail('');
    setElapsed(0);
    setStatus('preparing');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (error) {
      setDetail(describeMicError(error));
      setStatus('error');
      return;
    }
    streamRef.current = stream;
    setStatus('connecting');

    // JsSIP toca `window` al cargarse: se importa solo en el navegador y solo al llamar.
    const JsSIP = await import('jssip');
    const socket = new JsSIP.WebSocketInterface(voice.wssUrl);
    const ua = new JsSIP.UA({
      sockets: [socket],
      uri: voice.sipUri,
      password: voice.password,
      register: false,
      session_timers: false,
    });
    uaRef.current = ua;

    ua.on('disconnected', () => {
      if (!sessionRef.current) {
        setDetail('No se pudo conectar con el servidor de voz.');
        setStatus('error');
        cleanup();
      }
    });

    ua.on('connected', () => {
      const session = ua.call(voice.target, {
        mediaStream: stream,
        pcConfig: { iceServers: voice.iceServers },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      });
      sessionRef.current = session;

      let iceTimer: number | undefined;
      session.on('icecandidate', (event) => {
        if (iceTimer === undefined) {
          iceTimer = window.setTimeout(() => event.ready(), ICE_GATHERING_GRACE_MS);
        }
      });

      session.on('peerconnection', ({ peerconnection }) => {
        peerconnection.addEventListener('track', (event) => {
          if (audioRef.current && event.streams[0]) {
            audioRef.current.srcObject = event.streams[0];
            void audioRef.current.play().catch(() => undefined);
          }
        });
      });

      session.on('progress', () => setStatus('ringing'));
      session.on('confirmed', () => setStatus('in-call'));
      session.on('ended', () => {
        setStatus('ended');
        cleanup();
      });
      session.on('failed', (event) => {
        setDetail(`Motivo: ${event.cause}.`);
        setStatus('error');
        cleanup();
      });
    });

    ua.start();
  };

  const hangUp = () => {
    sessionRef.current?.terminate();
    setStatus('ended');
    cleanup();
  };

  const toggleMute = () => {
    const session = sessionRef.current;
    if (!session) return;
    if (muted) session.unmute({ audio: true });
    else session.mute({ audio: true });
    setMuted(!muted);
  };

  return (
    <section className={styles.panel} aria-live="polite">
      {!active && (
        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
          />
          <span>
            Entiendo que es una demostración, que usaré datos ficticios y que la conversación
            será procesada por la asistente para generar una ficha para el médico.
          </span>
        </label>
      )}

      <p className={styles.status} data-status={status}>
        {STATUS_LABEL[status]}
        {status === 'in-call' && <span className={styles.timer}> · {formatElapsed(elapsed)}</span>}
      </p>
      {detail && (
        <p role="alert" className={styles.detail}>
          {detail}
        </p>
      )}

      <div className={styles.actions}>
        {!active ? (
          <button
            type="button"
            className="primary"
            onClick={() => void start()}
            disabled={!consent || status === 'preparing'}
          >
            {status === 'ended' || status === 'error' ? 'Llamar de nuevo' : 'Iniciar conversación'}
          </button>
        ) : (
          <>
            <button type="button" onClick={toggleMute} disabled={status !== 'in-call'}>
              {muted ? 'Activar micrófono' : 'Silenciar'}
            </button>
            <button type="button" className="danger" onClick={hangUp}>
              Colgar
            </button>
          </>
        )}
      </div>

      <p className="muted">
        Use audífonos si puede: evita que Clara se escuche a sí misma. Puede interrumpirla
        hablando en cualquier momento.
      </p>
      <audio ref={audioRef} autoPlay />
    </section>
  );
};
