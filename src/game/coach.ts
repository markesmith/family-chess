import { Chess, type Move, type Square, type PieceSymbol, type Color } from 'chess.js';
import type { Analysis } from '../engine/stockfish';

/**
 * The coach turns engine output into plain-language explanations.
 * Stockfish says WHICH move is best; this module works out WHY by looking for
 * well-known themes: captures, forks, checks, development, king safety,
 * passed pawns and so on.
 */

export type Level = 'beginner' | 'intermediate' | 'advanced';

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};
export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export interface Explanation {
  /** Hint 1: the idea, without giving the move away. */
  idea: string;
  /** Hint 2: which piece to look at. */
  focus: string;
  /** Hint 3: the move and the full reasoning. */
  full: string;
  /** Short theme names, e.g. ["fork", "check"]. */
  themes: string[];
  move: Move;
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function allPieces(chess: Chess) {
  const out: { sq: Square; type: PieceSymbol; color: Color }[] = [];
  for (const row of chess.board()) for (const p of row) if (p) out.push({ sq: p.square, type: p.type, color: p.color });
  return out;
}

function isDefended(chess: Chess, sq: Square, by: Color) {
  return chess.attackers(sq, by).length > 0;
}

/** A piece is "loose" if attacked and either undefended or attacked by something cheaper. */
function isLoose(chess: Chess, sq: Square): boolean {
  const p = chess.get(sq);
  if (!p || p.type === 'k') return false;
  const attackers = chess.attackers(sq, other(p.color));
  if (!attackers.length) return false;
  if (!isDefended(chess, sq, p.color)) return true;
  return attackers.some((a) => VALUE[chess.get(a)!.type] < VALUE[p.type]);
}

function materialCount(chess: Chess) {
  return allPieces(chess).filter((p) => p.type !== 'k' && p.type !== 'p').length;
}

function isPassed(chess: Chess, sq: Square, color: Color) {
  const file = sq.charCodeAt(0);
  const rank = Number(sq[1]);
  for (const p of allPieces(chess)) {
    if (p.type !== 'p' || p.color === color) continue;
    const f = p.sq.charCodeAt(0);
    const r = Number(p.sq[1]);
    if (Math.abs(f - file) <= 1 && (color === 'w' ? r > rank : r < rank)) return false;
  }
  return true;
}

export function uciToMove(fen: string, uci: string): Move | null {
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  } catch {
    return null;
  }
}

export function pvToSan(fen: string, pv: string[], max = 6): string {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of pv.slice(0, max)) {
    try {
      const n = c.moveNumber();
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      const num = m.color === 'w' ? `${n}. ` : out.length === 0 ? `${n}... ` : '';
      out.push(`${num}${m.san}`);
    } catch {
      break;
    }
  }
  return out.join(' ');
}

export function describeScore(a: Analysis, whiteToMove: boolean): string {
  if (a.mate !== undefined) {
    const winner = (a.mate > 0) === whiteToMove ? 'White' : 'Black';
    return `${winner} can force checkmate in ${Math.abs(a.mate)}`;
  }
  const cp = (a.cp ?? 0) * (whiteToMove ? 1 : -1);
  const pawns = Math.abs(cp / 100).toFixed(1);
  if (Math.abs(cp) < 40) return 'The position is roughly equal';
  return `${cp > 0 ? 'White' : 'Black'} is better by about ${pawns} pawns`;
}

/** Explain why a move (normally the engine's best move) is good. */
export function explainMove(fen: string, uci: string, level: Level, analysis?: Analysis): Explanation | null {
  const before = new Chess(fen);
  const move = uciToMove(fen, uci);
  if (!move) return null;
  const after = new Chess(fen);
  after.move(move);
  const me = move.color;
  const them = other(me);
  const piece = PIECE_NAME[move.piece];
  const themes: string[] = [];
  const reasons: string[] = [];
  let idea = '';
  const simple = level === 'beginner';

  // 1. Checkmate
  if (after.isCheckmate()) {
    themes.push('checkmate');
    idea = simple
      ? 'There is a checkmate in one move! Look at every check you can give.'
      : 'A forced finish is available. Examine every check: which one leaves the king no escape square?';
    reasons.push(
      `${move.san} is checkmate. The king is attacked and has no safe square, no piece can block, and the checking ${piece} cannot be captured.`,
    );
  }

  // 2. Forced mate in a few
  if (!themes.length && analysis?.mate !== undefined && analysis.mate > 0 && analysis.mate <= 4) {
    themes.push('mating attack');
    idea = `You can force checkmate in ${analysis.mate}. Forcing moves (checks first, then captures, then threats) are the way in.`;
    reasons.push(
      `${move.san} starts a forced sequence: ${pvToSan(fen, analysis.pv, analysis.mate * 2 - 1)}. Each move leaves the opponent only bad choices.`,
    );
  }

  // 3. Captures
  if (move.captured) {
    const capName = PIECE_NAME[move.captured];
    const wasDefended = isDefended(before, move.to as Square, them);
    const recapturable = after.isAttacked(move.to as Square, them);
    if (move.isEnPassant()) {
      themes.push('en passant');
      reasons.push(`${move.san} captures en passant: the pawn that just moved two squares can be taken as if it moved one.`);
    } else if (!wasDefended || !recapturable) {
      themes.push('free material');
      idea ||= simple
        ? 'One of your opponent\'s pieces is not protected. Can you take it for free?'
        : 'Count attackers and defenders: something of your opponent\'s is insufficiently protected.';
      reasons.push(
        `${move.san} wins the ${capName} on ${move.to} for free — nothing can safely take back. Always check: "Is that piece defended?"`,
      );
    } else if (VALUE[move.captured] > VALUE[move.piece]) {
      themes.push('winning trade');
      idea ||= 'You can trade a cheaper piece for a more valuable one.';
      reasons.push(
        `${move.san} gives up a ${piece} (worth ${VALUE[move.piece]}) for a ${capName} (worth ${VALUE[move.captured]}). Even if they take back, you come out ahead.`,
      );
    } else {
      themes.push('exchange');
      reasons.push(
        `${move.san} trades pieces. ${simple ? 'Trading is good when it removes an attacker or when you are ahead in material.' : 'Exchanges help when they remove a key defender or attacker, or simplify into a winning endgame when ahead.'}`,
      );
    }
  }

  // 4. Forks and threats created by the moved piece
  const targets = allPieces(after).filter(
    (p) => p.color === them && after.attackers(p.sq, me).includes(move.to as Square),
  );
  const valuable = targets.filter(
    (t) => t.type === 'k' || VALUE[t.type] > VALUE[move.piece] || !isDefended(after, t.sq, them),
  );
  if (valuable.length >= 2 && !after.isCheckmate()) {
    themes.push('fork');
    const names = valuable.map((t) => `${PIECE_NAME[t.type]} on ${t.sq}`).join(' and ');
    idea ||= simple
      ? 'One of your pieces can attack two things at once. That is called a fork.'
      : 'Look for a double attack: one move that creates two threats the opponent cannot both meet.';
    reasons.push(
      `${move.san} is a fork: the ${piece} attacks the ${names} at the same time. The opponent can only save one.`,
    );
  } else if (valuable.length === 1 && valuable[0].type !== 'k' && !move.captured) {
    themes.push('threat');
    reasons.push(
      `${move.san} attacks the ${PIECE_NAME[valuable[0].type]} on ${valuable[0].sq}, so your opponent must spend a move dealing with it.`,
    );
  }

  // 5. Check
  if (after.inCheck() && !after.isCheckmate()) {
    themes.push('check');
    reasons.push(
      simple
        ? `${move.san} gives check, so your opponent must deal with the threat to the king before anything else.`
        : `${move.san} is check — a forcing move that limits the opponent's replies.`,
    );
  }

  // 6. Escaping an attack
  if (!move.captured && isLoose(before, move.from as Square)) {
    themes.push('rescue');
    idea ||= simple
      ? 'One of your pieces is in danger. Which one is under attack?'
      : 'Before your own plans, check what your opponent is threatening.';
    reasons.push(
      `Your ${piece} on ${move.from} was under attack and not safely protected. ${move.san} moves it to safety. Always ask "What is my opponent threatening?" before you move.`,
    );
  }

  // 7. Special moves
  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    themes.push('king safety');
    idea ||= simple
      ? 'Is your king safe? Think about tucking it away.'
      : 'Complete your development and secure the king before opening the position.';
    reasons.push(
      `${move.san} castles: the king moves to safety behind its pawns, and the rook comes towards the centre where it can join the game.`,
    );
  }
  if (move.promotion) {
    themes.push('promotion');
    idea ||= 'A pawn is ready to become a new piece.';
    reasons.push(`${move.san} promotes the pawn to a ${PIECE_NAME[move.promotion]}.`);
  }

  // 8. Phase-based principles
  const fullmove = before.moveNumber();
  const endgame = materialCount(before) <= 6;
  if (!themes.length && fullmove <= 12) {
    const backRank = me === 'w' ? '1' : '8';
    if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === backRank) {
      themes.push('development');
      idea ||= simple
        ? 'Bring a new piece into the game.'
        : 'In the opening, every move should develop a piece or fight for the centre.';
      reasons.push(
        `${move.san} develops your ${piece} from its starting square towards the centre, where it controls more squares. In the opening, get your knights and bishops out before moving the same piece twice.`,
      );
    } else if (move.piece === 'p' && ['d', 'e', 'c'].includes(move.from[0])) {
      themes.push('centre');
      idea ||= 'Fight for the centre squares d4, e4, d5 and e5.';
      reasons.push(
        `${move.san} claims space in the centre. Pieces placed behind central pawns have more room, and the opponent's pieces have less.`,
      );
    }
  }
  if (!themes.length && endgame && move.piece === 'k') {
    themes.push('active king');
    idea ||= 'In the endgame the king becomes a fighting piece. Bring it forward.';
    reasons.push(
      `${move.san} activates the king. With few pieces left there is little danger of checkmate, so the king should march towards the action — supporting pawns or attacking the opponent's.`,
    );
  }
  if (!themes.includes('promotion') && move.piece === 'p' && isPassed(after, move.to as Square, me) && (endgame || !themes.length)) {
    themes.push('passed pawn');
    idea ||= 'You have a passed pawn — no enemy pawn can stop it. "Passed pawns must be pushed."';
    reasons.push(
      `${move.san} advances a passed pawn: no enemy pawn can block or capture it, so it ties down your opponent's pieces as it nears promotion.`,
    );
  }

  // 9. Default: activity
  if (!reasons.length) {
    themes.push('improvement');
    idea = simple
      ? 'There are no captures or threats right now. Find your least active piece and give it a better square.'
      : 'No immediate tactics: improve your worst-placed piece, or stop your opponent\'s plan (prophylaxis).';
    reasons.push(
      `${move.san} quietly improves the position: the ${piece} on ${move.to} controls more useful squares than it did on ${move.from}.`,
    );
  }

  let full = reasons.join(' ');
  if (analysis && level !== 'beginner' && analysis.pv.length > 1) {
    full += ` Likely continuation: ${pvToSan(fen, analysis.pv, level === 'advanced' ? 8 : 4)}.`;
  }
  if (analysis && level === 'advanced') {
    full += ` Evaluation: ${describeScore(analysis, before.turn() === 'w')}.`;
  }

  const focus = simple
    ? `Look at your ${piece} on ${move.from}.`
    : `The key piece is your ${piece} on ${move.from}. Where can it go to ${themes.includes('fork') ? 'attack two targets' : themes.includes('rescue') ? 'be safe' : 'do the most'}?`;

  return { idea: idea || 'Think about what each of your pieces could do.', focus, full, themes, move };
}

export interface Review {
  grade: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  text: string;
  /** The better move, if the played move was a mistake. */
  better?: Move;
  /** The opponent's best reply, used to draw an arrow. */
  punish?: Move;
}

/**
 * Compare the player's move with the engine's choice and explain the difference.
 * `before` is the analysis of the position before the move (mover to play);
 * `after` is the analysis after it (opponent to play).
 */
export function reviewMove(fen: string, played: Move, before: Analysis, after: Analysis, level: Level): Review {
  const toPawns = (a: Analysis) =>
    a.mate !== undefined ? (a.mate > 0 ? 100 : -100) : (a.cp ?? 0) / 100;
  const bestScore = toPawns(before);
  const playedScore = -toPawns(after);
  const loss = Math.max(0, bestScore - playedScore);
  const playedUci = played.from + played.to + (played.promotion ?? '');

  if (playedUci === before.bestmove || loss < 0.3) {
    const ex = explainMove(fen, playedUci, level);
    const why = ex && !ex.themes.includes('improvement') ? ` ${ex.full}` : '';
    return { grade: playedUci === before.bestmove ? 'best' : 'good', text: `Good move!${why}` };
  }

  const grade: Review['grade'] = loss >= 3 ? 'blunder' : loss >= 1.2 ? 'mistake' : 'inaccuracy';
  const label = { inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' }[grade];
  const parts: string[] = [];

  const afterPos = new Chess(fen);
  afterPos.move(played);
  const punish = after.bestmove ? uciToMove(afterPos.fen(), after.bestmove) : null;
  if (after.mate !== undefined && after.mate > 0) {
    parts.push(`This allows your opponent to force checkmate${punish ? `, starting with ${punish.san}` : ''}. Check your king's escape squares and which enemy pieces can reach it.`);
  } else if (punish?.captured) {
    const lost = PIECE_NAME[punish.captured];
    const hanging = !afterPos.isAttacked(punish.to as Square, played.color) ? ' and nothing defends it' : '';
    parts.push(`Your opponent can reply ${punish.san}, taking your ${lost} on ${punish.to}${hanging}. Before each move, ask: "After my move, what can my opponent capture?"`);
  } else if (punish) {
    const ex = explainMove(afterPos.fen(), after.bestmove, level);
    if (ex && !ex.themes.includes('improvement')) {
      parts.push(`It lets your opponent play ${punish.san}: ${ex.full}`);
    }
  }

  const better = uciToMove(fen, before.bestmove);
  if (better) {
    const ex = explainMove(fen, before.bestmove, level, before);
    parts.push(`Better was ${better.san}. ${ex ? ex.full : ''}`);
  }
  if (level !== 'beginner') parts.push(`(This cost about ${loss >= 50 ? 'the game' : `${loss.toFixed(1)} pawns`}.)`);

  return { grade, text: `${label}. ${parts.join(' ')}`, better: better ?? undefined, punish: punish ?? undefined };
}
