// O'rnatilgan SIP telefon liniyasi — JsSIP (WebRTC) orqali.
// Tashqi dastur (MicroSIP) kerak emas: qo'ng'iroqlar to'g'ridan-to'g'ri
// CRM ichida (brauzer/desktop webview) amalga oshiriladi.
//
// Ishlashi uchun SIP-over-WebSocket qo'llab-quvvatlaydigan PBX kerak
// (masalan Asterisk + chan_pjsip WSS, FreeSWITCH, yoki SIP provayder).
// Sozlamalar: Sozlamalar → Telefon liniyasi.

import JsSIP from 'jssip';
import type { SipConfig } from '../types';

export type SipRegState = 'idle' | 'connecting' | 'registered' | 'failed';
export type SipCallState = 'none' | 'outgoing' | 'incoming' | 'connected';

export interface SipAccount {
  extension?: string;   // operatorning shaxsiy raqami (bo'lsa global'dan ustun)
  password?: string;    // shaxsiy parol
  displayName?: string;
}

export interface SipState {
  reg: SipRegState;
  call: SipCallState;
  number: string;
  displayName?: string;
  direction: 'inbound' | 'outbound' | null;
  muted: boolean;
  lastError?: string;
}

type Listener = (s: SipState) => void;

class SipManager {
  private ua: JsSIP.UA | null = null;
  private session: any = null;
  private audioEl: HTMLAudioElement | null = null;
  private listeners = new Set<Listener>();
  private cfg: SipConfig | null = null;
  private account: SipAccount = {};
  private lastConfigKey = '';

  state: SipState = {
    reg: 'idle',
    call: 'none',
    number: '',
    direction: null,
    muted: false,
  };

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  private emit(patch: Partial<SipState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  private ensureAudio(): HTMLAudioElement {
    if (!this.audioEl) {
      const el = document.createElement('audio');
      el.autoplay = true;
      el.hidden = true;
      el.id = 'ipost-sip-audio';
      document.body.appendChild(el);
      this.audioEl = el;
    }
    return this.audioEl;
  }

  private iceServers(): RTCIceServer[] {
    const servers: RTCIceServer[] = [];
    if (this.cfg?.stunUrl) servers.push({ urls: this.cfg.stunUrl });
    if (this.cfg?.turnUrl) {
      servers.push({
        urls: this.cfg.turnUrl,
        username: this.cfg.turnUsername,
        credential: this.cfg.turnPassword,
      });
    }
    if (servers.length === 0) servers.push({ urls: 'stun:stun.l.google.com:19302' });
    return servers;
  }

  // Sozlama o'zgarsa qayta ulanadi. account — joriy operatorning shaxsiy raqami.
  configure(cfg: SipConfig | undefined, account: SipAccount) {
    if (!cfg || !cfg.enabled || !cfg.wsUrl || !cfg.domain) {
      this.stop();
      this.cfg = cfg ?? null;
      this.emit({ reg: 'idle', lastError: undefined });
      return;
    }
    const user = account.extension || cfg.username;
    const pass = account.password || cfg.password;
    const key = JSON.stringify({ ws: cfg.wsUrl, dom: cfg.domain, user, pass });
    if (key === this.lastConfigKey && this.ua) return; // o'zgarmagan
    this.lastConfigKey = key;
    this.cfg = cfg;
    this.account = account;
    this.start(user, pass, account.displayName || cfg.displayName);
  }

  private start(user: string, password: string, displayName?: string) {
    this.stop();
    if (!this.cfg) return;
    try {
      const socket = new JsSIP.WebSocketInterface(this.cfg.wsUrl);
      const ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${user}@${this.cfg.domain}`,
        password,
        display_name: displayName,
        register: true,
        session_timers: false,
      });
      this.ua = ua;
      this.emit({ reg: 'connecting', lastError: undefined });

      ua.on('registered', () => this.emit({ reg: 'registered', lastError: undefined }));
      ua.on('unregistered', () => this.emit({ reg: 'idle' }));
      ua.on('registrationFailed', (e: any) =>
        this.emit({ reg: 'failed', lastError: e?.cause || 'Ro\'yxatdan o\'tib bo\'lmadi' })
      );
      ua.on('disconnected', () => {
        if (this.state.reg !== 'failed') this.emit({ reg: 'connecting' });
      });

      ua.on('newRTCSession', (data: any) => {
        const session = data.session;
        // Bir vaqtda bitta qo'ng'iroq
        if (this.session) {
          try { session.terminate(); } catch {}
          return;
        }
        if (data.originator === 'remote') {
          // Kiruvchi qo'ng'iroq
          const from = session.remote_identity;
          this.bindSession(session, 'inbound');
          this.emit({
            call: 'incoming',
            direction: 'inbound',
            number: from?.uri?.user || from?.display_name || 'Noma\'lum',
            displayName: from?.display_name,
            muted: false,
          });
        }
      });

      ua.start();
    } catch (e) {
      this.emit({ reg: 'failed', lastError: (e as Error).message });
    }
  }

  private bindSession(session: any, direction: 'inbound' | 'outbound') {
    this.session = session;

    session.on('peerconnection', (e: any) => {
      const pc: RTCPeerConnection = e.peerconnection;
      pc.addEventListener('track', (ev: RTCTrackEvent) => {
        const el = this.ensureAudio();
        el.srcObject = ev.streams[0];
        el.play().catch(() => {});
      });
    });
    session.on('progress', () => {
      if (direction === 'outbound') this.emit({ call: 'outgoing' });
    });
    const connected = () => this.emit({ call: 'connected' });
    session.on('accepted', connected);
    session.on('confirmed', connected);
    session.on('ended', () => this.clearCall());
    session.on('failed', (e: any) => {
      this.emit({ lastError: e?.cause });
      this.clearCall();
    });
    session.on('muted', () => this.emit({ muted: true }));
    session.on('unmuted', () => this.emit({ muted: false }));
  }

  private clearCall() {
    this.session = null;
    this.emit({ call: 'none', number: '', direction: null, muted: false, displayName: undefined });
  }

  call(target: string): boolean {
    if (!this.ua || this.state.reg !== 'registered' || !this.cfg) return false;
    if (this.session) return false;
    const clean = target.replace(/[^\d+*#]/g, '');
    if (!clean) return false;
    const session = this.ua.call(`sip:${clean}@${this.cfg.domain}`, {
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: this.iceServers() },
    });
    this.bindSession(session, 'outbound');
    this.emit({ call: 'outgoing', direction: 'outbound', number: clean, muted: false });
    return true;
  }

  answer() {
    if (!this.session) return;
    this.session.answer({
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers: this.iceServers() },
    });
  }

  hangup() {
    if (this.session) {
      try { this.session.terminate(); } catch {}
    }
    this.clearCall();
  }

  toggleMute() {
    if (!this.session) return;
    if (this.state.muted) this.session.unmute({ audio: true });
    else this.session.mute({ audio: true });
  }

  sendDtmf(tone: string) {
    if (this.session && this.state.call === 'connected') {
      try { this.session.sendDTMF(tone); } catch {}
    }
  }

  stop() {
    if (this.session) {
      try { this.session.terminate(); } catch {}
      this.session = null;
    }
    if (this.ua) {
      try { this.ua.stop(); } catch {}
      this.ua = null;
    }
  }
}

export const sipManager = new SipManager();
