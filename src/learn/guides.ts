import type { Phase, Tier } from './lessons';

/**
 * Written guides to each phase of the game, at three levels.
 * Each principle states WHAT to do and WHY it works — the reasoning matters
 * more than memorising moves.
 */

export interface Principle {
  title: string;
  what: string;
  why: string;
  /** Optional example position (FEN) with a caption. */
  example?: { fen: string; caption: string; arrows?: [string, string][]; orientation?: 'white' | 'black' };
}

export interface PhaseGuide {
  phase: Phase;
  title: string;
  tagline: string;
  overview: string;
  /** When the phase starts and ends. */
  when: string;
  levels: Record<Tier, Principle[]>;
  furtherReading: string[];
}

export const GUIDES: Record<Phase, PhaseGuide> = {
  opening: {
    phase: 'opening',
    title: 'The opening',
    tagline: 'Get your pieces out, fight for the centre, and keep your king safe.',
    overview:
      'The opening is the first phase of the game. Both players race to bring their pieces into play. Nobody wins in the opening, but many games are lost there by falling behind in development or walking into a trap.',
    when: 'Roughly the first 10–15 moves, until both sides have developed most of their pieces and castled.',
    levels: {
      beginner: [
        {
          title: 'Control the centre',
          what: 'Start with a centre pawn (e4 or d4 for White; ...e5 or ...d5 for Black) and aim your pieces at the four centre squares.',
          why: 'A piece in the centre reaches more squares and can switch quickly to either side. A knight on e4 attacks 8 squares; on a1 it attacks only 2.',
          example: {
            fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
            caption: 'After 1.e4 e5 2.Nf3: both sides have a pawn in the centre, and White\'s knight attacks e5.',
            arrows: [['f3', 'e5']],
          },
        },
        {
          title: 'Develop knights and bishops first',
          what: 'Bring out your knights and bishops before your queen and rooks. Try not to move the same piece twice.',
          why: 'Every move in the opening should add a new piece to the fight. If your opponent has four pieces in play and you have two, they can attack where you cannot defend. Knights before bishops is a useful habit, because it is usually clearer where knights belong.',
        },
        {
          title: "Don't bring your queen out too early",
          what: 'Keep the queen at home for the first few moves.',
          why: 'The queen is your most valuable piece, so when it comes out early, your opponent can attack it with minor pieces and develop at the same time — gaining "tempo" (time) at your expense.',
        },
        {
          title: 'Castle early',
          what: 'Castle (usually kingside) within the first ten moves or so.',
          why: 'The centre is where the fighting happens, and the king in the centre gets caught as pawns exchange and files open. Castling puts the king behind a wall of pawns and brings a rook towards the centre.',
        },
        {
          title: 'Protect f7 / f2',
          what: 'Watch the pawn next to your king (f7 for Black, f2 for White) in the opening.',
          why: 'At the start it is defended only by the king, so it is the target of quick attacks such as Scholar\'s Mate (Bc4 + Qh5 or Qf3, aiming at f7).',
        },
      ],
      intermediate: [
        {
          title: 'Understand the ideas behind openings, not just the moves',
          what: 'For each opening you play, learn its typical plans and pawn structures. For example, in the Italian Game White aims for c3 and d4; in the Queen\'s Gambit White pressures Black\'s d5 pawn.',
          why: 'Memorised moves run out quickly, usually when your opponent plays something different. Knowing the plan tells you what to do next on your own.',
        },
        {
          title: 'Tempo and development lead',
          what: 'Count developed pieces. If you are ahead in development, open the position (exchange pawns, open files). If behind, keep it closed until you catch up.',
          why: 'Open lines favour the side with more active pieces. This is why gambits work: a pawn is given to gain time.',
        },
        {
          title: 'Pawn breaks',
          what: 'Each pawn structure has typical "breaks" — pawn moves that challenge the opponent\'s centre (e.g. ...c5 or ...f6 in the French Defence, c4 in Queen\'s Gambit positions).',
          why: 'Pawn breaks open lines for your pieces and decide where the middlegame will be fought. Choosing the right break is the bridge between opening and middlegame.',
        },
        {
          title: 'Know the classic traps',
          what: "Learn traps such as Scholar's Mate, Légal's Mate and the Fishing Pole, both to use and to avoid.",
          why: 'Traps teach the patterns that decide real games: weak f7, pins that are not absolute, and the danger of grabbing material while behind in development.',
        },
      ],
      advanced: [
        {
          title: 'Build a repertoire that fits your style',
          what: 'Choose openings that lead to middlegames you enjoy and understand: open tactical positions (e.g. 1.e4 e5, Sicilian) or slower strategic ones (e.g. Queen\'s Gambit, Caro-Kann).',
          why: 'You will play better in positions you understand. A small, deeply understood repertoire beats a broad, shallow one.',
        },
        {
          title: 'Move-order subtleties',
          what: 'The same position can be reached by different move orders, and each gives the opponent different options. Learn which order avoids lines you dislike.',
          why: 'Strong players use move order to steer the game into territory they prefer and to dodge sharp responses.',
        },
        {
          title: 'Study model games, not just theory',
          what: 'For each opening, play through annotated master games that continue into the middlegame and endgame.',
          why: 'Opening theory tells you where pieces go; model games show what to do with them afterwards. Opening databases (such as the free Lichess database) show which plans succeed at your level.',
        },
      ],
    },
    furtherReading: [
      'J. R. Capablanca, Chess Fundamentals (1921) — public domain, available on Project Gutenberg',
      'Wikibooks: Chess Opening Theory — free, CC BY-SA',
      'Lichess chess-openings dataset — free (CC0), names every common opening with its ECO code',
    ],
  },

  middlegame: {
    phase: 'middlegame',
    title: 'The middlegame',
    tagline: 'Make a plan, spot the tactics, attack and defend.',
    overview:
      'The middlegame begins once the pieces are developed. This is where most games are decided, by tactics (short, forcing sequences that win material or checkmate) and strategy (long-term plans based on the position). "Attack and defence" happens here.',
    when: 'From the end of development until enough pieces are exchanged that the kings can safely come out (the endgame).',
    levels: {
      beginner: [
        {
          title: 'Know what the pieces are worth',
          what: 'Pawn 1, knight 3, bishop 3, rook 5, queen 9. The king is priceless.',
          why: 'Before every exchange, count. Giving a rook (5) for a knight (3) loses two points. These values are a guide; activity and king safety can change them.',
        },
        {
          title: 'Check, captures, threats — every move',
          what: 'Before you move, look at all checks, captures and threats — for you AND for your opponent.',
          why: 'Most games between developing players are decided by a piece left undefended or a simple tactic missed. This habit, used by strong players, catches almost all of them.',
        },
        {
          title: 'The basic tactics',
          what: 'Learn the fork (one piece attacks two), the pin (a piece cannot move without exposing something behind it), the skewer (a pin in reverse) and the discovered attack (moving one piece reveals an attack by another).',
          why: 'These patterns appear in nearly every game. Once you know them by sight, you will spot them quickly — in your games and in your opponent\'s.',
          example: {
            fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
            caption: 'A knight fork: Ne7+ attacks the king and the queen at the same time.',
            arrows: [['d5', 'e7']],
          },
        },
        {
          title: "Protect your king's back rank",
          what: 'Once castled, give your king an escape square ("luft") with a pawn move such as h3 when you have time.',
          why: 'A king trapped behind its own pawns can be checkmated by a single rook or queen on the back rank.',
        },
      ],
      intermediate: [
        {
          title: 'Make a plan from the pawn structure',
          what: 'Look at the pawns: they move slowly and set the character of the position. Attack on the side where your pawns point; place pieces where the opponent\'s pawns can\'t chase them.',
          why: 'Pawns cannot move backwards, so their weaknesses are permanent. Isolated, doubled and backward pawns are targets; passed pawns are strengths.',
        },
        {
          title: 'Open files and outposts',
          what: 'Put rooks on open files. Put knights on outposts — squares in the enemy half that no enemy pawn can attack.',
          why: 'A rook on an open file can invade the 7th rank. A knight on an outpost cannot be driven away and dominates the board.',
        },
        {
          title: 'Attacking the castled king',
          what: 'Attack when you have more pieces near the enemy king than they have defending it. Typical weapons: pawn storms, sacrifices on h7/h6, and opening lines towards the king.',
          why: 'An attack succeeds through numbers. Count attackers against defenders before committing.',
        },
        {
          title: 'Defending calmly',
          what: 'When under attack, trade off the attacker\'s most dangerous pieces, bring defenders over, and look for counter-attack in the centre.',
          why: 'Each exchange reduces the attack. Steinitz taught that a well-placed defence can hold, and that the attacker who overreaches can be punished.',
        },
      ],
      advanced: [
        {
          title: 'Prophylaxis',
          what: 'Before carrying out your own plan, ask "What does my opponent want?" and stop it.',
          why: "Nimzowitsch made prophylaxis a central idea of positional play: preventing the opponent's best plan is often stronger than pursuing your own.",
        },
        {
          title: 'Positional sacrifices',
          what: 'Sometimes give material for lasting advantages: a passed pawn, a dominant piece, or a broken enemy king position.',
          why: 'Material is only one factor. Long-term advantages often outweigh a pawn or the exchange (rook for minor piece).',
        },
        {
          title: 'Calculation technique',
          what: 'List candidate moves first, then calculate each one in turn, considering the opponent\'s most forcing replies. Evaluate the final position honestly.',
          why: 'A structured method avoids the common error of calculating one line deeply while missing a better move entirely.',
        },
        {
          title: 'Converting an advantage',
          what: 'When ahead, simplify: trade pieces (not pawns), reduce counterplay, and head for a winning endgame.',
          why: 'The fewer pieces left, the more an extra pawn or piece counts, and the fewer tricks the opponent has.',
        },
      ],
    },
    furtherReading: [
      'Aron Nimzowitsch, My System (1925) — open files, outposts, pawn chains, prophylaxis',
      'Wilhelm Steinitz, The Modern Chess Instructor (1889) — the foundations of positional play',
      'Lichess puzzle database — free (CC0) tactics puzzles sorted by theme and rating',
      'Research by A. de Groot and by W. Chase & H. Simon shows that strong players recognise patterns rather than calculate everything — so practise tactics often',
    ],
  },

  endgame: {
    phase: 'endgame',
    title: 'The endgame',
    tagline: 'Activate your king, push passed pawns, and know the key positions.',
    overview:
      'The endgame arrives when most pieces have been exchanged. The king, safe now, becomes a strong attacking piece, and pawns become potential queens. Many endgames are won or drawn by precise technique that can be learnt once and used for life.',
    when: 'When few pieces remain — typically when queens are off and each side has a rook or minor pieces plus pawns.',
    levels: {
      beginner: [
        {
          title: 'The basic checkmates',
          what: 'Learn to checkmate with king and queen against king, and king and rook against king.',
          why: 'If you win material, you must be able to finish the game. Both mates use the same idea: drive the enemy king to the edge, then bring your own king close.',
          example: {
            fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1',
            caption: 'King and rook: with the kings facing each other, Ra8 is checkmate.',
            arrows: [['a1', 'a8']],
          },
        },
        {
          title: 'Activate your king',
          what: 'In the endgame, march your king towards the centre and the pawns.',
          why: 'With the queens gone there is little danger of mate. In the endgame the king has roughly the fighting power of a minor piece or more, so leaving it at home is like playing a piece down.',
        },
        {
          title: 'Passed pawns must be pushed',
          what: 'A passed pawn has no enemy pawns in front of it or on the files next to it. Advance it, with support.',
          why: 'A passed pawn threatens to become a queen, so it ties down the enemy pieces that must stop it.',
        },
        {
          title: 'Beware stalemate',
          what: 'When winning, make sure the enemy king always has a legal move unless you are delivering checkmate.',
          why: 'If the side to move is not in check but has no legal moves, the game is a draw — a common way to throw away a won game.',
        },
      ],
      intermediate: [
        {
          title: 'Opposition and key squares',
          what: 'In king and pawn endings, the kings "face off". The side that does NOT have to move holds the opposition. Get your king to the key squares in front of your pawn.',
          why: 'Who wins a king-and-pawn ending is decided by the kings\' positions, not the pawn. Knowing key squares tells you instantly whether a position is won.',
          example: {
            fen: '8/8/4k3/8/4K3/8/4P3/8 b - - 0 1',
            caption: 'White\'s king is on e4, a key square for the e2 pawn. White wins whoever moves.',
          },
        },
        {
          title: 'Rook endings: rooks behind passed pawns',
          what: 'Place rooks behind passed pawns — your own (to push them) or the opponent\'s (to stop them).',
          why: 'A rook behind a pawn gains scope as the pawn advances; a rook in front of it loses scope. This rule, often attributed to Tarrasch, guides most rook endings.',
        },
        {
          title: 'The Lucena and Philidor positions',
          what: 'Learn the Lucena (how to win rook and pawn against rook) and the Philidor (how to draw it).',
          why: 'Rook endings are the most common endings in practice, and nearly all of them reduce to these two positions.',
        },
      ],
      advanced: [
        {
          title: 'Triangulation and zugzwang',
          what: 'Zugzwang means any move worsens your position. Triangulation is a three-move king manoeuvre that "loses a move" to hand the obligation to move to your opponent.',
          why: 'In tight king-and-pawn endings, being able to pass the move is often the only way to win.',
        },
        {
          title: 'Fortresses',
          what: 'A fortress is a defensive setup the stronger side cannot break, even with extra material.',
          why: 'Knowing fortresses lets you save lost-looking positions — and avoid letting the opponent build one.',
        },
        {
          title: 'Check with tablebases',
          what: 'Endgame tablebases give perfect play for all positions with up to 7 pieces. Use them (e.g. the free Lichess tablebase) to check your analysis.',
          why: 'They settle questions with certainty and often reveal surprising wins and draws.',
        },
      ],
    },
    furtherReading: [
      'J. R. Capablanca, Chess Fundamentals (1921) — starts with endings, which Capablanca considered the right way to learn',
      'F.-A. D. Philidor, Analyse du jeu des Échecs (1749; 2nd ed. 1777) — public domain',
      'Lichess tablebase — free, perfect play for endings with up to 7 pieces',
    ],
  },
};
