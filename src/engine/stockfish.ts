/**
 * Talks to Stockfish (running in a Web Worker) using the UCI protocol.
 * One search runs at a time; requests queue up in order.
 */

export interface Analysis {
  bestmove: string;
  /** Score in centipawns from the side to move's point of view (100 = one pawn). */
  cp?: number;
  /** Moves to mate from the side to move's point of view (negative = being mated). */
  mate?: number;
  pv: string[];
  depth: number;
}

export interface Strength {
  /** Stockfish "Skill Level", 0 (weakest) to 20 (full strength). */
  skill: number;
  depth?: number;
  movetime?: number;
  /** Chance (0–1) of playing a random legal move instead, to make the easiest level beatable. */
  randomness?: number;
}

export const LEVELS: Record<string, { label: string; blurb: string; strength: Strength }> = {
  beginner: {
    label: 'Beginner',
    blurb: 'Makes mistakes often. Good for learning the basics.',
    strength: { skill: 0, depth: 1, randomness: 0.35 },
  },
  intermediate: {
    label: 'Intermediate',
    blurb: 'Plays sensibly but misses deeper ideas.',
    strength: { skill: 5, depth: 5 },
  },
  advanced: {
    label: 'Advanced',
    blurb: 'A strong club player. Punishes loose pieces.',
    strength: { skill: 12, depth: 10, movetime: 800 },
  },
  master: {
    label: 'Master',
    blurb: 'Full strength. Very hard to beat.',
    strength: { skill: 20, movetime: 1500 },
  },
};

export class Engine {
  private worker: Worker;
  private listeners: ((line: string) => void)[] = [];
  private queue: Promise<unknown> = Promise.resolve();
  readonly ready: Promise<void>;

  constructor() {
    const url = new URL('engine/stockfish-19-lite-single.js', document.baseURI).href;
    this.worker = new Worker(url);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      for (const l of [...this.listeners]) l(line);
    };
    this.ready = (async () => {
      await this.sendAndWait('uci', (l) => l === 'uciok');
      await this.sendAndWait('isready', (l) => l === 'readyok');
    })();
  }

  terminate() {
    this.worker.terminate();
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private sendAndWait(cmd: string, done: (line: string) => boolean, onLine?: (l: string) => void): Promise<string> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        onLine?.(line);
        if (done(line)) {
          this.listeners = this.listeners.filter((x) => x !== listener);
          resolve(line);
        }
      };
      this.listeners.push(listener);
      this.send(cmd);
    });
  }

  /** Run a task after all earlier ones have finished. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const p = this.queue.then(task, task);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Full-strength analysis of a position. */
  analyse(fen: string, opts: { depth?: number; movetime?: number } = {}): Promise<Analysis> {
    return this.enqueue(async () => {
      await this.ready;
      this.send('setoption name Skill Level value 20');
      return this.search(fen, opts.depth ?? 12, opts.movetime);
    });
  }

  /** Choose a move at a given playing strength. */
  chooseMove(fen: string, s: Strength): Promise<string> {
    return this.enqueue(async () => {
      await this.ready;
      this.send(`setoption name Skill Level value ${s.skill}`);
      const a = await this.search(fen, s.depth, s.movetime);
      return a.bestmove;
    });
  }

  private async search(fen: string, depth?: number, movetime?: number): Promise<Analysis> {
    this.send(`position fen ${fen}`);
    const result: Analysis = { bestmove: '', pv: [], depth: 0 };
    let go = 'go';
    if (depth) go += ` depth ${depth}`;
    if (movetime) go += ` movetime ${movetime}`;
    if (!depth && !movetime) go += ' depth 12';
    const last = await this.sendAndWait(
      go,
      (l) => l.startsWith('bestmove'),
      (l) => {
        if (!l.startsWith('info') || !l.includes(' pv ')) return;
        if (/ multipv (\d+)/.exec(l)?.[1] && !l.includes(' multipv 1 ')) return;
        const d = / depth (\d+)/.exec(l);
        const cp = / score cp (-?\d+)/.exec(l);
        const mate = / score mate (-?\d+)/.exec(l);
        const pv = / pv (.+)$/.exec(l);
        if (d) result.depth = Number(d[1]);
        if (cp) {
          result.cp = Number(cp[1]);
          result.mate = undefined;
        }
        if (mate) {
          result.mate = Number(mate[1]);
          result.cp = undefined;
        }
        if (pv) result.pv = pv[1].trim().split(/\s+/);
      },
    );
    result.bestmove = last.split(/\s+/)[1] ?? '';
    return result;
  }
}

let shared: Engine | null = null;
/** The app keeps one engine alive and shares it between screens. */
export function getEngine(): Engine {
  shared ??= new Engine();
  return shared;
}

/** Turn an analysis score into a single number from White's point of view, for comparing positions. */
export function scoreForWhite(a: Analysis, whiteToMove: boolean): number {
  const s = a.mate !== undefined ? (a.mate > 0 ? 10000 - a.mate * 10 : -10000 - a.mate * 10) : (a.cp ?? 0);
  return whiteToMove ? s : -s;
}
