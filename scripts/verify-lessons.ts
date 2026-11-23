/**
 * Checks every lesson against Stockfish:
 *  - each position and move is legal;
 *  - every accepted answer is (close to) the best move;
 *  - every move listed under "wrong" really is clearly worse;
 *  - scripted replies are legal.
 *
 * Run with: npm run verify-lessons
 */
import { createRequire } from 'node:module';
import { Chess } from 'chess.js';
import { LESSONS } from '../src/learn/lessons.ts';

const require = createRequire(import.meta.url);
const loadEngine = require('stockfish');

type Eval = { score: number; best: string };

let listeners: ((l: string) => void)[] = [];
const engine = loadEngine('lite-single', (line: string) => listeners.forEach((f) => f(line)));
const send = (c: string) => engine.processCommand(c);

function waitFor(pred: (l: string) => boolean, onLine?: (l: string) => void): Promise<string> {
  return new Promise((res) => {
    const f = (l: string) => {
      onLine?.(l);
      if (pred(l)) {
        listeners = listeners.filter((x) => x !== f);
        res(l);
      }
    };
    listeners.push(f);
  });
}

/** Score (pawns) from the side to move's point of view. Mate = ±100. */
async function evaluate(fen: string, depth = 18): Promise<Eval> {
  const c = new Chess(fen);
  if (c.isCheckmate()) return { score: -100, best: '' };
  if (c.isDraw() || c.isStalemate()) return { score: 0, best: '' };
  let score = 0;
  const done = waitFor(
    (l) => l.startsWith('bestmove'),
    (l) => {
      const cp = / score cp (-?\d+)/.exec(l);
      const mate = / score mate (-?\d+)/.exec(l);
      if (cp) score = Number(cp[1]) / 100;
      if (mate) score = Number(mate[1]) > 0 ? 100 : -100;
    },
  );
  send(`position fen ${fen}`);
  send(`go depth ${depth}`);
  const line = await done;
  return { score, best: line.split(' ')[1] };
}

/** Score of a move from the mover's point of view. */
async function moveScore(fen: string, san: string): Promise<number> {
  const c = new Chess(fen);
  c.move(san);
  const e = await evaluate(c.fen());
  return -e.score;
}

function san(fen: string, uci: string) {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
  } catch {
    return uci;
  }
}

let problems = 0;
const warn = (msg: string) => {
  problems++;
  console.log(`  ✗ ${msg}`);
};

const uciok = waitFor((l) => l === 'uciok');
send('uci');
await uciok;
const readyok = waitFor((l) => l === 'readyok');
send('isready');
await readyok;

for (const lesson of LESSONS) {
  console.log(`\n${lesson.id} — ${lesson.title}`);
  const chess = new Chess();
  try {
    chess.load(lesson.fen);
  } catch (e) {
    warn(`bad FEN: ${(e as Error).message}`);
    continue;
  }
  if (lesson.practice) {
    try {
      new Chess(lesson.practice.fen);
    } catch {
      warn('bad practice FEN');
    }
  }
  for (const [i, step] of lesson.steps.entries()) {
    const fen = chess.fen();
    // Rules puzzles only need legal answers, so skip the engine for them.
    const best = lesson.rulesOnly ? { score: 0, best: '' } : await evaluate(fen);
    if (!lesson.rulesOnly) console.log(`  step ${i + 1}: engine best ${san(fen, best.best)} (${best.score.toFixed(2)})`);
    let firstAccepted: string | null = null;
    if (step.accept.includes('#')) {
      const mates = chess.moves().filter((m) => {
        const c = new Chess(fen);
        c.move(m);
        return c.isCheckmate();
      });
      if (!mates.length) warn('no checkmate available');
      else console.log(`    mates: ${mates.join(', ')}`);
      firstAccepted = mates[0] ?? null;
    }
    for (const a of step.accept.filter((x) => x !== '#')) {
      if (!chess.moves().includes(a)) {
        warn(`accepted move ${a} is illegal (legal: ${chess.moves().join(' ')})`);
        continue;
      }
      if (lesson.rulesOnly) {
        console.log(`    accept ${a}: legal ✓`);
        firstAccepted ??= a;
        continue;
      }
      const s = await moveScore(fen, a);
      const loss = best.score - s;
      const ok = best.score >= 50 ? s >= 50 : loss <= 0.6;
      console.log(`    accept ${a}: ${s.toFixed(2)} ${ok ? '✓' : ''}`);
      if (!ok) warn(`accepted move ${a} loses ${loss.toFixed(2)} vs best ${san(fen, best.best)}`);
      firstAccepted ??= a;
    }
    for (const w of Object.keys(step.wrong ?? {})) {
      if (!chess.moves().includes(w)) {
        warn(`"wrong" move ${w} is illegal`);
        continue;
      }
      if (lesson.rulesOnly) continue;
      const s = await moveScore(fen, w);
      const acceptedBest = firstAccepted ? await moveScore(fen, firstAccepted) : best.score;
      const gap = acceptedBest - s;
      const clearlyWorse = gap >= 0.8 || (acceptedBest >= 50 && s < 50);
      console.log(`    wrong ${w}: ${s.toFixed(2)} ${clearlyWorse ? '✓' : ''}`);
      if (!clearlyWorse) warn(`"wrong" move ${w} is only ${gap.toFixed(2)} worse`);
    }
    for (const n of Object.keys(step.notIt ?? {})) {
      if (!chess.moves().includes(n)) warn(`"notIt" move ${n} is illegal`);
    }
    if (!firstAccepted) continue;
    chess.move(firstAccepted);
    if (step.reply) {
      if (!chess.moves().includes(step.reply)) {
        warn(`reply ${step.reply} is illegal (legal: ${chess.moves().join(' ')})`);
        break;
      }
      chess.move(step.reply);
    } else if (i < lesson.steps.length - 1) {
      warn('step has no reply but more steps follow');
    }
  }
}

// First steps drills: the "best" move counts must match an exhaustive search.
const { CHAPTERS } = await import('../src/learn/basics.ts');
const { solveDrill } = await import('../src/learn/drill.ts');
console.log('\nFirst steps drills');
for (const c of CHAPTERS) {
  for (const d of c.drills ?? []) {
    const n = solveDrill(d);
    if (n !== d.best) warn(`${c.id}: drill from ${d.from} says best ${d.best}, search finds ${n}`);
  }
  for (const pid of c.puzzles ?? []) if (!LESSONS.some((l) => l.id === pid)) warn(`${c.id}: unknown puzzle ${pid}`);
}

console.log(problems ? `\n${problems} problem(s) found.` : '\nAll lessons verified.');
engine.terminate?.();
process.exit(problems ? 1 : 0);
