// JsSIP asosida ichki softphone — WebRTC orqali to'g'ridan-to'g'ri qo'ng'iroq qilish.
// SPA bo'lganligi uchun sahifa o'zgarganda ham aloqa uzilmaydi (komponent
// Layout ichida turadi).

import JsSIP from 'jssip';
import type { SipConfig } from '../types';

export type SipState =
  | 'disabled'
  | 'disconnected'
  | 'connecting'
  | 'registered'
  | 'registration_failed'
  | 'incoming'
  | 'in_call'
  | 'ringing_out'
  | 'failed'
  | 'ended';

export interface SipCallInfo {
  number: string;
  displayName?: string;
  direction: 'in' | 'out';
  startedAt?: number;
}

export type SipListener = (state: SipState, info?: SipCallInfo, err?: string) => void;

export class SipPhone {
  private ua: any | null = null;
  private session: any | null = null;
  private state: SipState = 'disconnected';
  private currentCall: SipCallInfo | null = null;
  private listeners = new Set<SipListener>();
  private audioEl: HTMLAudioElement | null = null;
  private config: SipConfig | null = null;
  private errorMsg = '';

  on(fn: SipListener): () => void {
    this.listeners.add(fn);
    fn(this.state, this.currentCall ?? undefined, this.errorMsg);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state, this.currentCall ?? undefined, this.errorMsg));
  }

  getState() {
    return this.state;
  }

  getCall() {
    return this.currentCall;
  }

  getError() {
    return this.errorMsg;
  }

  private ensureAudio() {
    if (!this.audioEl) {
      this.audioEl = document.createElement('audio');
      this.audioEl.autoplay = true;
      this.audioEl.setAttribute('playsinline', '');
      document.body.appendChild(this.audioEl);
    }
    return this.audioEl;
  }

  start(config: SipConfig) {
    // Agar konfiguratsiya bir xil va UA allaqachon ishlayotgan bo'lsa,
    // hech narsa qilmaymiz — bekorga qayta ulanmasin (qo'ng'iroq paytida muhim).
    if (
      this.ua &&
      this.config &&
      this.config.enabled === config.enabled &&
      this.config.wsUri === config.wsUri &&
      this.config.sipUri === config.sipUri &&
      this.config.password === config.password &&
      this.config.displayName === config.displayName &&
      this.config.registrar === config.registrar
    ) {
      return;
    }
    this.stop();
    this.config = config;
    this.errorMsg = '';
    if (!config.enabled || !config.wsUri || !config.sipUri || !config.password) {
      this.state = 'disabled';
      this.emit();
      return;
    }

    try {
      const socket = new JsSIP.WebSocketInterface(config.wsUri);
      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: config.sipUri,
        password: config.password,
        display_name: config.displayName,
        register: true,
        registrar_server: config.registrar || undefined,
        session_timers: false,
      } as any);

      ua.on('connecting', () => {
        this.state = 'connecting';
        this.emit();
      });
      ua.on('registered', () => {
        this.state = 'registered';
        this.errorMsg = '';
        this.emit();
      });
      ua.on('unregistered', () => {
        this.state = 'disconnected';
        this.emit();
      });
      ua.on('registrationFailed', (e: any) => {
        this.state = 'registration_failed';
        this.errorMsg = e?.cause ?? 'Registration failed';
        this.emit();
      });
      ua.on('disconnected', (e: any) => {
        this.state = 'disconnected';
        this.errorMsg = e?.error ? (e?.reason ?? '') : '';
        this.emit();
      });

      ua.on('newRTCSession', (data: any) => {
        const session = data.session;
        this.session = session;
        const direction = data.originator === 'remote' ? 'in' : 'out';
        const remoteId =
          session.remote_identity?.uri?.user ??
          session.remote_identity?.display_name ?? 'unknown';
        const displayName = session.remote_identity?.display_name;
        this.currentCall = {
          number: String(remoteId),
          displayName,
          direction,
        };

        if (direction === 'in') {
          this.state = 'incoming';
        } else {
          this.state = 'ringing_out';
        }
        this.emit();

        session.on('accepted', () => {
          this.state = 'in_call';
          if (this.currentCall) this.currentCall.startedAt = Date.now();
          this.attachAudio(session);
          this.emit();
        });
        session.on('confirmed', () => {
          this.attachAudio(session);
        });
        session.on('ended', () => {
          this.state = 'ended';
          this.session = null;
          this.emit();
          setTimeout(() => {
            if (this.state === 'ended') {
              this.currentCall = null;
              this.state = this.ua ? 'registered' : 'disconnected';
              this.emit();
            }
          }, 1500);
        });
        session.on('failed', (e: any) => {
          this.state = 'failed';
          this.errorMsg = e?.cause ?? 'Call failed';
          this.session = null;
          this.emit();
          setTimeout(() => {
            this.currentCall = null;
            this.state = this.ua ? 'registered' : 'disconnected';
            this.emit();
          }, 2500);
        });
      });

      ua.start();
      this.ua = ua;
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'SIP boshlashda xato';
      this.state = 'registration_failed';
      this.emit();
    }
  }

  stop() {
    try {
      if (this.session) {
        this.session.terminate();
      }
    } catch {}
    try {
      if (this.ua) {
        this.ua.stop();
      }
    } catch {}
    this.ua = null;
    this.session = null;
    this.currentCall = null;
    this.state = 'disconnected';
    this.errorMsg = '';
    this.emit();
  }

  private attachAudio(session: any) {
    const audio = this.ensureAudio();
    const pc = session.connection;
    if (!pc) return;
    pc.ontrack = (ev: RTCTrackEvent) => {
      if (ev.streams && ev.streams[0]) {
        audio.srcObject = ev.streams[0];
      }
    };
    pc.getReceivers().forEach((r: RTCRtpReceiver) => {
      if (r.track) {
        const ms = new MediaStream();
        ms.addTrack(r.track);
        audio.srcObject = ms;
      }
    });
  }

  dial(number: string) {
    if (!this.ua || this.state === 'disabled') {
      this.errorMsg = 'SIP ulanmagan';
      this.emit();
      return;
    }
    const cleaned = number.replace(/[^\d+*#]/g, '');
    if (!cleaned) return;
    try {
      const target = cleaned.startsWith('sip:') ? cleaned : `sip:${cleaned}@${this.extractHost()}`;
      this.ua.call(target, {
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      });
    } catch (err: any) {
      this.errorMsg = err?.message ?? 'Qo\'ng\'iroq xato';
      this.emit();
    }
  }

  answer() {
    if (this.session && this.state === 'incoming') {
      this.session.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
      });
    }
  }

  hangup() {
    if (this.session) {
      try {
        this.session.terminate();
      } catch {}
    }
  }

  toggleHold(): boolean {
    if (!this.session) return false;
    try {
      const isHeld = !!this.session.isOnHold?.()?.local;
      if (isHeld) this.session.unhold();
      else this.session.hold();
      return !isHeld;
    } catch {
      return false;
    }
  }

  isOnHold(): boolean {
    try {
      return !!this.session?.isOnHold?.()?.local;
    } catch {
      return false;
    }
  }

  toggleMute() {
    if (!this.session) return false;
    try {
      const isMuted = this.session.isMuted?.()?.audio;
      if (isMuted) this.session.unmute({ audio: true });
      else this.session.mute({ audio: true });
      return !isMuted;
    } catch {
      return false;
    }
  }

  isMuted() {
    try {
      return !!this.session?.isMuted?.()?.audio;
    } catch {
      return false;
    }
  }

  sendDtmf(digit: string) {
    if (!this.session) return;
    try {
      this.session.sendDTMF(digit);
    } catch {}
  }

  private extractHost(): string {
    if (!this.config) return '';
    if (this.config.serverHost) return this.config.serverHost;
    // Legacy fallback: sip:user@host:port
    const m = this.config.sipUri?.match(/sip:[^@]+@([^;]+)/);
    return m ? m[1] : '';
  }
}

// Global singleton — sahifa o'zgarganda ham bir xil instance
export const sipPhone = new SipPhone();
