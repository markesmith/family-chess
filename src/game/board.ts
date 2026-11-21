import { Chess, type Move, type Square } from 'chess.js';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key, Color as CgColor } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { askPromotion } from '../ui/promotion';

export type Side = 'white' | 'black';
/** Who may move pieces on this board by hand. */
export type Control = Side | 'both' | 'none';

export interface BoardOptions {
  fen?: string;
  orientation?: Side;
  control: Control;
  /** Called after a move is made by hand on the board (already applied). */
  onUserMove?: (move: Move) => void;
  /** Return false to reject a hand move (e.g. a lesson checking the answer). Called before applying. */
  validate?: (move: Move) => boolean;
}

export function toSide(c: 'w' | 'b'): Side {
  return c === 'w' ? 'white' : 'black';
}

export function uciOf(m: Move): string {
  return m.from + m.to + (m.promotion ?? '');
}

/**
 * Wraps chess.js (the rules) and chessground (the board you see and touch)
 * so they always agree.
 */
export class Board {
  readonly chess: Chess;
  readonly cg: Api;
  private control: Control;
  private opts: BoardOptions;
  private onResize = () => document.body.dispatchEvent(new Event('chessground.resize'));
  private ro?: ResizeObserver;

  constructor(el: HTMLElement, opts: BoardOptions) {
    this.opts = opts;
    this.chess = new Chess(opts.fen);
    this.control = opts.control;
    this.cg = Chessground(el, {
      fen: this.chess.fen(),
      orientation: opts.orientation ?? 'white',
      coordinates: true,
      animation: { enabled: true, duration: 180 },
      highlight: { lastMove: true, check: true },
      premovable: { enabled: false },
      draggable: { enabled: true, showGhost: true },
      selectable: { enabled: true },
      movable: { free: false, showDests: true, events: { after: (o, d) => void this.handleUserMove(o, d) } },
      drawable: { enabled: true, visible: true },
    });
    this.sync();
    window.addEventListener('resize', this.onResize);
    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => this.cg.redrawAll());
      this.ro.observe(el);
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.ro?.disconnect();
    this.cg.destroy();
  }

  get turn(): Side {
    return toSide(this.chess.turn());
  }

  setControl(c: Control) {
    this.control = c;
    this.sync();
  }

  setOrientation(side: Side) {
    this.cg.set({ orientation: side });
  }

  flip() {
    this.cg.toggleOrientation();
  }

  get orientation(): Side {
    return this.cg.state.orientation;
  }

  load(fen: string) {
    this.chess.load(fen);
    this.sync();
  }

  /** Replay a list of SAN/UCI moves from a starting FEN. */
  loadMoves(startFen: string | undefined, moves: string[]) {
    this.chess.reset();
    if (startFen) this.chess.load(startFen);
    for (const m of moves) this.applyNotation(m);
    this.sync();
  }

  /** Apply a move given as SAN ("Nf3") or UCI ("g1f3"). Returns the move or null if illegal. */
  play(notation: string): Move | null {
    const m = this.applyNotation(notation);
    if (m) this.sync(m);
    return m;
  }

  undo(): Move | null {
    const m = this.chess.undo();
    this.sync();
    return m;
  }

  setShapes(shapes: DrawShape[]) {
    this.cg.setAutoShapes(shapes);
  }

  clearShapes() {
    this.cg.setAutoShapes([]);
  }

  private applyNotation(n: string): Move | null {
    try {
      if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(n)) {
        return this.chess.move({ from: n.slice(0, 2), to: n.slice(2, 4), promotion: n[4] ?? undefined });
      }
      return this.chess.move(n);
    } catch {
      return null;
    }
  }

  private async handleUserMove(orig: Key, dest: Key) {
    const piece = this.chess.get(orig as Square);
    let promotion: string | undefined;
    if (piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1')) {
      promotion = await askPromotion(toSide(piece.color));
      if (!promotion) {
        this.sync();
        return;
      }
    }
    // Check the move against a scratch copy first so a lesson can reject it.
    const probe = new Chess(this.chess.fen());
    let candidate: Move;
    try {
      candidate = probe.move({ from: orig, to: dest, promotion });
    } catch {
      this.sync();
      return;
    }
    if (this.opts.validate && !this.opts.validate(candidate)) {
      this.sync();
      return;
    }
    const move = this.chess.move({ from: orig, to: dest, promotion });
    this.sync(move);
    this.opts.onUserMove?.(move);
  }

  private dests(): Map<Key, Key[]> {
    const map = new Map<Key, Key[]>();
    if (this.chess.isGameOver()) return map;
    for (const m of this.chess.moves({ verbose: true })) {
      const list = map.get(m.from as Key) ?? [];
      list.push(m.to as Key);
      map.set(m.from as Key, list);
    }
    return map;
  }

  /** Push the chess.js state to the visible board. */
  sync(last?: Move) {
    const turn = this.turn;
    const canMove = this.control === 'both' || this.control === turn;
    const hist = this.chess.history({ verbose: true });
    const lm = last ?? hist[hist.length - 1];
    this.cg.set({
      fen: this.chess.fen(),
      turnColor: turn as CgColor,
      check: this.chess.inCheck() ? (turn as CgColor) : false,
      lastMove: lm ? [lm.from as Key, lm.to as Key] : undefined,
      movable: {
        color: canMove ? (turn as CgColor) : undefined,
        dests: canMove ? this.dests() : new Map(),
      },
    });
  }
}

export function gameResult(chess: Chess): string | null {
  if (chess.isCheckmate()) {
    return `Checkmate — ${chess.turn() === 'w' ? 'Black' : 'White'} wins`;
  }
  if (chess.isStalemate()) return 'Draw by stalemate';
  if (chess.isInsufficientMaterial()) return 'Draw — not enough pieces left to checkmate';
  if (chess.isThreefoldRepetition()) return 'Draw by threefold repetition';
  if (chess.isDraw()) return 'Draw by the 50-move rule';
  return null;
}
