// Cross-tab sinxronizatsiya: bitta brauzerda bir nechta tab bo'lsa,
// BroadcastChannel orqali zudlik bilan xabarlashadi. Poll kutmaydi.

const CHANNEL_NAME = 'ipost:sync';

export interface SyncMessage {
  type: 'collection-changed' | 'full-changed';
  collection?: string;
  updatedAt: number;
  tabId: string;
}

const TAB_ID = `tab-${Math.random().toString(36).slice(2, 10)}`;

let channel: BroadcastChannel | null = null;
let listeners: Array<(msg: SyncMessage) => void> = [];

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (e) => {
      const msg = e.data as SyncMessage;
      if (msg.tabId === TAB_ID) return; // o'zimizdan kelganini e'tiborga olmaymiz
      listeners.forEach((fn) => fn(msg));
    };
  }
  return channel;
}

export function broadcastChange(collection?: string) {
  const ch = getChannel();
  if (!ch) return;
  const msg: SyncMessage = {
    type: collection ? 'collection-changed' : 'full-changed',
    collection,
    updatedAt: Date.now(),
    tabId: TAB_ID,
  };
  try {
    ch.postMessage(msg);
  } catch {
    // jim — ba'zi brauzerlar BroadcastChannel'ni qo'llab-quvvatlamasligi mumkin
  }
}

export function onBroadcast(fn: (msg: SyncMessage) => void): () => void {
  getChannel();
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((x) => x !== fn);
  };
}

export const MY_TAB_ID = TAB_ID;
