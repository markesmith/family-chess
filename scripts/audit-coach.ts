/**
 * Audits the coach's explanations against the board.
 *
 * Plays practice games (Stockfish plus some random moves, to create the kind of
 * loose positions beginners reach), asks the coach to explain the best move in
 * each position from both sides, and checks every factual claim:
 *   - "for free"     → nothing can take the capturing piece back profitably
 *   - "to safety"    → the piece is not loose on its new square
 *   - "fork"/"threat"→ the attacking piece is not itself loose, and the targets are really attacked
 *
 * Run with: npm run audit-coach            (default 30 games)
 *           npm run audit-coach -- 80      (more games)
 */
import { createRequire } from 'node:module';
import { Chess, type Square } from 'chess.js';
import { explainMove, isLoose, type Explanation } from '../src/game/coach.ts';
import type { Analysis } from '../src/engine/stockfish.ts';

const require = createRequire(import.meta.url);
const loadEngine = require('stockfish');
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
async function analyse(fen: string, depth = 10): Promise<Analysis> {
  const a: Analysis = { bestmove: '', pv: [], depth: 0 };
  const done = waitFor(
    (l) => l.startsWith('bestmove'),
    (l) => {
      const cp = / score cp (-?\d+)/.exec(l);
      const mate = / score mate (-?\d+)/.exec(l);
      const pv = / pv (.+)$/.exec(l);
      if (cp) [a.cp, a.mate] = [Number(cp[1]), undefined];
      if (mate) [a.mate, a.cp] = [Number(mate[1]), undefined];
      if (pv) a.pv = pv[1].trim().split(/\s+/);
    },
  );
  send(`position fen ${fen}`);
  send(`go depth ${depth}`);
  a.bestmove = (await done).split(' ')[1];
  return a;
}

const games = Number(process.argv[2] ?? 30);
const issues: Record<string, string[]> = {};
const counts: Record<string, number> = {};
const flag = (theme: string, msg: string) => (issues[theme] ??= []).push(msg);

function audit(fen: string, ex: Explanation) {
  const after = new Chess(fen);
  after.move(ex.move);
  const to = ex.move.to as Square;
  const them = ex.move.color === 'w' ? 'b' : 'w';
  const where = `${fen} ${ex.move.san}`;
  for (const t of ex.themes) counts[t] = (counts[t] ?? 0) + 1;
  if (ex.themes.includes('free material') && after.attackers(to, them).length) {
    flag('free material', `${where}: claims "for free" but the ${ex.move.piece} on ${to} can be taken back`);
  }
  if (ex.full.includes('where nothing can attack it') && after.attackers(to, them).length) {
    flag('rescue', `${where}: claims nothing can attack ${to}, but something can`);
  }
  if (ex.full.includes('but it is protected') && (isLoose(after, to) || !after.attackers(to, ex.move.color).length)) {
    flag('protected', `${where}: claims the piece on ${to} is protected, but it can be won`);
  }
  if (ex.themes.includes('wins material') && isLoose(after, to)) {
    flag('wins material', `${where}: claims material is won, but the capturing piece is loose`);
  }
  if ((ex.themes.includes('fork') || ex.themes.includes('threat')) && isLoose(after, to) && !after.inCheck()) {
    flag(ex.themes.includes('fork') ? 'fork' : 'threat', `${where}: the attacking piece on ${to} can simply be taken`);
  }
}

const uciok = waitFor((l) => l === 'uciok');
send('uci');
await uciok;

let positions = 0;
for (let g = 0; g < games; g++) {
  const chess = new Chess();
  for (let ply = 0; ply < 60 && !chess.isGameOver(); ply++) {
    const fen = chess.fen();
    const a = await analyse(fen);
    for (const level of ['beginner', 'advanced'] as const) {
      const ex = explainMove(fen, a.bestmove, level, a);
      if (ex) audit(fen, ex);
      const exOpp = explainMove(fen, a.bestmove, level, a, 'opponent');
      if (exOpp) audit(fen, exOpp);
    }
    positions++;
    // Mostly good moves with some random ones, like a beginner game.
    const moves = chess.moves();
    const uci = Math.random() < 0.3 ? null : a.bestmove;
    if (uci) chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    else chess.move(moves[Math.floor(Math.random() * moves.length)]);
  }
  process.stdout.write('.');
}

console.log(`\n\nAudited ${positions} positions.`);
console.log('Themes used:', Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', '));
let total = 0;
for (const [theme, list] of Object.entries(issues)) {
  total += list.length;
  console.log(`\n✗ ${theme}: ${list.length} wrong claim(s)`);
  for (const m of [...new Set(list)].slice(0, 5)) console.log('   ', m);
}
console.log(total ? `\n${total} wrong claim(s) found.` : '\nNo wrong claims found.');
engine.terminate?.();
process.exit(total ? 1 : 0);
