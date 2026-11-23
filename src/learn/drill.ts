import type { Drill, PieceLetter } from './basics';

/**
 * A tiny move generator for the beginner piece drills: one white piece,
 * black pawns that never move (targets), and optional white blockers.
 * There is no check or turn-taking — just how the piece moves.
 */

export interface DrillState {
  piece: PieceLetter;
  at: string;
  targets: Set<string>;
  goals: Set<string>;
  blockers: Set<string>;
  moves: number;
  promoted: boolean;
}

const FILES = 'abcdefgh';
const sq = (f: number, r: number) => (f >= 0 && f < 8 && r >= 0 && r < 8 ? FILES[f] + (r + 1) : null);
const fr = (s: string): [number, number] => [FILES.indexOf(s[0]), Number(s[1]) - 1];

export function startDrill(d: Drill): DrillState {
  return {
    piece: d.piece,
    at: d.from,
    targets: new Set(d.targets),
    goals: new Set(d.goals ?? []),
    blockers: new Set(d.blockers ?? []),
    moves: 0,
    promoted: false,
  };
}

export function drillDests(s: DrillState): string[] {
  const [f, r] = fr(s.at);
  const out: string[] = [];
  const free = (x: string) => !s.targets.has(x) && !s.blockers.has(x);
  const slide = (dirs: [number, number][]) => {
    for (const [df, dr] of dirs) {
      for (let i = 1; i < 8; i++) {
        const x = sq(f + df * i, r + dr * i);
        if (!x || s.blockers.has(x)) break;
        out.push(x);
        if (s.targets.has(x)) break;
      }
    }
  };
  const step = (deltas: [number, number][]) => {
    for (const [df, dr] of deltas) {
      const x = sq(f + df, r + dr);
      if (x && !s.blockers.has(x)) out.push(x);
    }
  };
  const ORTHO: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  switch (s.piece) {
    case 'R':
      slide(ORTHO);
      break;
    case 'B':
      slide(DIAG);
      break;
    case 'Q':
      slide([...ORTHO, ...DIAG]);
      break;
    case 'K':
      step([...ORTHO, ...DIAG]);
      break;
    case 'N':
      step([[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]]);
      break;
    case 'P': {
      const one = sq(f, r + 1);
      if (one && free(one)) {
        out.push(one);
        const two = sq(f, r + 2);
        if (r === 1 && two && free(two)) out.push(two);
      }
      for (const df of [-1, 1]) {
        const x = sq(f + df, r + 1);
        if (x && s.targets.has(x)) out.push(x);
      }
      break;
    }
  }
  return out;
}

/** Apply a move. Returns a short note when something special happens (capture, promotion). */
export function drillMove(s: DrillState, to: string): string | null {
  let note: string | null = null;
  if (s.targets.has(to)) {
    s.targets.delete(to);
    note = 'Captured!';
  }
  s.goals.delete(to);
  s.at = to;
  s.moves++;
  if (s.piece === 'P' && to[1] === '8') {
    s.piece = 'Q';
    s.promoted = true;
    note = 'Promoted! Your pawn reached the last row and became a queen.';
  }
  return note;
}

export function drillDone(s: DrillState) {
  return s.targets.size === 0 && s.goals.size === 0;
}

/** Board part of a FEN, for drawing the drill position. */
export function drillFen(s: DrillState): string {
  const grid: string[][] = Array.from({ length: 8 }, () => Array(8).fill(''));
  const put = (x: string, c: string) => {
    const [f, r] = fr(x);
    grid[7 - r][f] = c;
  };
  for (const t of s.targets) put(t, 'p');
  for (const b of s.blockers) put(b, 'P');
  put(s.at, s.piece);
  return grid
    .map((row) => {
      let out = '';
      let empty = 0;
      for (const c of row) {
        if (!c) empty++;
        else {
          if (empty) out += empty;
          empty = 0;
          out += c;
        }
      }
      return out + (empty || '');
    })
    .join('/');
}

/** Fewest moves to finish a drill (breadth-first search). Used to check the "best" numbers. */
export function solveDrill(d: Drill): number {
  const key = (s: DrillState) => `${s.piece}${s.at}|${[...s.targets].sort()}|${[...s.goals].sort()}`;
  let frontier = [startDrill(d)];
  const seen = new Set([key(frontier[0])]);
  for (let depth = 0; depth < 20; depth++) {
    const next: DrillState[] = [];
    for (const s of frontier) {
      if (drillDone(s)) return depth;
      for (const to of drillDests(s)) {
        const n: DrillState = { ...s, targets: new Set(s.targets), goals: new Set(s.goals) };
        drillMove(n, to);
        const k = key(n);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  return -1;
}
