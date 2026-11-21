import Peer, { type DataConnection } from 'peerjs';
import type { PeerOptions } from 'peerjs';
import type { Side } from '../game/board';
import { storageGet } from '../ui/dom';

/**
 * By default PeerJS uses its free public handshake server. For testing (or to
 * run your own server) set localStorage "fc.peerServer" to e.g.
 * {"host":"localhost","port":9000,"path":"/","secure":false}.
 */
function peerOptions(): PeerOptions {
  return storageGet<PeerOptions>('fc.peerServer', {});
}

/**
 * Live play between two devices.
 *
 * GitHub Pages only serves files, so the two phones connect to each other
 * directly (WebRTC) using PeerJS. The free PeerJS cloud server is only used for
 * the initial "handshake"; moves then travel device to device.
 *
 * The host holds the authoritative move list. Either player can send a move;
 * if the two ever disagree (e.g. after a dropped connection) the guest asks the
 * host for the full game and replaces its copy.
 */

export type Msg =
  | { t: 'state'; moves: string[]; hostColor: Side; result?: string }
  | { t: 'move'; uci: string; ply: number }
  | { t: 'sync-req' }
  | { t: 'resign'; side: Side }
  | { t: 'newgame'; hostColor: Side }
  | { t: 'undo-req' }
  | { t: 'undo-ok' }
  | { t: 'undo-no' };

export type Status = 'starting' | 'waiting' | 'connected' | 'reconnecting' | 'error';

const PREFIX = 'famchess-v1-';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newCode(): string {
  let s = '';
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  for (const n of buf) s += ALPHABET[n % ALPHABET.length];
  return s;
}

export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export class OnlineSession {
  readonly role: 'host' | 'guest';
  readonly code: string;
  private peer!: Peer;
  private conn: DataConnection | null = null;
  private retryTimer: number | undefined;
  private closed = false;
  status: Status = 'starting';

  onMessage: (m: Msg) => void = () => {};
  onStatus: (s: Status, detail?: string) => void = () => {};
  /** Host only: called when a guest connects, so the host can send the current state. */
  onGuestJoined: () => void = () => {};

  constructor(role: 'host' | 'guest', code: string) {
    this.role = role;
    this.code = code;
    this.start();
  }

  private setStatus(s: Status, detail?: string) {
    this.status = s;
    this.onStatus(s, detail);
  }

  private start() {
    if (this.closed) return;
    this.setStatus('starting');
    this.peer = this.role === 'host' ? new Peer(PREFIX + this.code, peerOptions()) : new Peer(peerOptions());

    this.peer.on('open', () => {
      if (this.role === 'host') this.setStatus('waiting');
      else this.connectToHost();
    });

    this.peer.on('connection', (c) => {
      if (this.role !== 'host') return;
      this.conn?.close();
      this.attach(c);
    });

    this.peer.on('disconnected', () => {
      // Lost the handshake server (not necessarily the game connection). Try to get it back.
      if (!this.closed && !this.peer.destroyed) {
        window.setTimeout(() => {
          if (!this.closed && !this.peer.destroyed) this.peer.reconnect();
        }, 1500);
      }
    });

    this.peer.on('error', (err: Error & { type?: string }) => {
      if (this.closed) return;
      switch (err.type) {
        case 'unavailable-id':
          // Our code is still registered from a moment ago (e.g. after a page reload). Retry shortly.
          this.setStatus('reconnecting', 'Reclaiming game code…');
          this.restartSoon(4000);
          break;
        case 'peer-unavailable':
          this.setStatus('reconnecting', 'Waiting for the other player to open the game…');
          this.retrySoon(3000);
          break;
        case 'network':
        case 'server-error':
        case 'socket-error':
        case 'socket-closed':
          this.setStatus('reconnecting', 'Connection problem — retrying…');
          this.restartSoon(4000);
          break;
        case 'browser-incompatible':
          this.setStatus('error', 'This browser does not support live play.');
          break;
        default:
          this.setStatus('reconnecting', err.message);
          this.restartSoon(5000);
      }
    });
  }

  private restartSoon(ms: number) {
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => {
      try {
        this.peer.destroy();
      } catch {
        /* ignore */
      }
      this.start();
    }, ms);
  }

  private retrySoon(ms: number) {
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => this.connectToHost(), ms);
  }

  private connectToHost() {
    if (this.closed || this.peer.destroyed) return;
    const c = this.peer.connect(PREFIX + this.code, { reliable: true, serialization: 'json' });
    this.attach(c);
  }

  private attach(c: DataConnection) {
    this.conn = c;
    c.on('open', () => {
      this.setStatus('connected');
      if (this.role === 'host') this.onGuestJoined();
      else this.send({ t: 'sync-req' });
    });
    c.on('data', (d) => this.onMessage(d as Msg));
    c.on('close', () => {
      if (this.conn !== c || this.closed) return;
      this.conn = null;
      if (this.role === 'host') this.setStatus('waiting', 'The other player disconnected. Waiting for them to come back…');
      else {
        this.setStatus('reconnecting', 'Connection lost — reconnecting…');
        this.retrySoon(2000);
      }
    });
    c.on('error', () => {
      /* handled by close */
    });
  }

  get connected() {
    return !!this.conn?.open;
  }

  send(m: Msg) {
    if (this.conn?.open) this.conn.send(m);
  }

  close() {
    this.closed = true;
    window.clearTimeout(this.retryTimer);
    try {
      this.conn?.close();
      this.peer.destroy();
    } catch {
      /* ignore */
    }
  }
}

export function shareLink(code: string): string {
  const u = new URL(document.baseURI);
  u.hash = `#/online/join/${code}`;
  return u.href;
}
