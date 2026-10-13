import { env } from './env';

export interface VoiceConfig {
  wssUrl: string;
  sipUri: string;
  password: string;
  target: string;
  iceServers: RTCIceServer[];
}

/**
 * Configuración del softphone. Se lee en el servidor y se pasa como prop a una página
 * protegida con contraseña: la credencial SIP nunca va al bundle público.
 */
export const readVoiceConfig = (): VoiceConfig | undefined => {
  const voice = env.voice();
  if (!voice.wssUrl || !voice.sipDomain || !voice.sipUser || !voice.sipPassword) {
    return undefined;
  }

  const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (voice.turnUrl) {
    iceServers.push({
      urls: voice.turnUrl,
      username: voice.turnUser,
      credential: voice.turnPassword,
    });
  }

  return {
    wssUrl: voice.wssUrl,
    sipUri: `sip:${voice.sipUser}@${voice.sipDomain}`,
    password: voice.sipPassword,
    target: `sip:${voice.target}@${voice.sipDomain}`,
    iceServers,
  };
};
