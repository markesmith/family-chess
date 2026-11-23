/**
 * Interactive lessons. Each lesson is a position plus one or more steps.
 * In each step the student must find a move that shows the lesson's idea.
 *
 * Every position and answer is checked against Stockfish by
 * `npm run verify-lessons`, so the "right" answers are genuinely good moves.
 *
 * Moves are written in SAN (standard algebraic notation), e.g. "Nf3", "O-O", "exd5".
 * The special value "#" accepts any checkmating move.
 */

export type Phase = 'opening' | 'middlegame' | 'endgame';
export type Tier = 'beginner' | 'intermediate' | 'advanced';

export interface LessonStep {
  /** Moves that complete the step. */
  accept: string[];
  /** Explanations for tempting wrong moves. */
  wrong?: Record<string, string>;
  /** Sound moves that are not this lesson's idea, with an explanation. */
  notIt?: Record<string, string>;
  /** Hint ladder: 1 the idea, 2 where to look, 3 the answer with its reason. */
  hints: [string, string, string];
  /** Squares to highlight with hint 2. */
  focus?: string[];
  /** Shown after the correct move: WHY it works. */
  explain: string;
  /** The opponent's reply (SAN) before the next step, if any. */
  reply?: string;
  /** A note about the reply, e.g. why the opponent chose it. */
  replyNote?: string;
}

export interface Lesson {
  id: string;
  /** 'basics' = a rules puzzle from the First steps course. */
  phase: Phase | 'basics';
  /** Teaches a rule rather than the best move: the checker only confirms the answers are legal. */
  rulesOnly?: boolean;
  tier: Tier;
  title: string;
  /** One line for the lesson list. */
  summary: string;
  /** The principle, shown before the student moves. */
  intro: string;
  fen: string;
  steps: LessonStep[];
  /** Where the idea comes from. */
  source: string;
  /** Message when the student plays a sound move that isn't the lesson's idea. */
  otherGood?: string;
  /** Offer a practice game against the computer from this position afterwards. */
  practice?: { fen: string; label: string };
}

const MAIN_LESSONS: Lesson[] = [
  /* ---------------------------- OPENING ---------------------------- */
  {
    id: 'centre',
    phase: 'opening',
    tier: 'beginner',
    title: 'Claim the centre',
    summary: 'Why good games start with a pawn in the middle of the board.',
    intro:
      'The four centre squares — d4, e4, d5 and e5 — are the most important on the board. A piece in the centre can reach both sides quickly; a piece on the edge cannot. Your first move should put a pawn in the centre and open lines for your bishops and queen. You are White. Make your first move.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    steps: [
      {
        accept: ['e4', 'd4'],
        notIt: {
          a4: 'Edge pawn moves do nothing for the centre and give your opponent a free hand there.',
          h4: 'Edge pawn moves do nothing for the centre and weaken the squares near your king.',
          Na3: 'A knight on the edge controls only four squares. "A knight on the rim is dim."',
          Nh3: 'A knight on the edge controls only four squares. "A knight on the rim is dim."',
          f3: 'This takes the f3 square away from your knight and weakens your king.',
          g4: 'This weakens the squares around where your king will live.',
        },
        hints: [
          'Which squares matter most at the start of the game?',
          'Look at your d-pawn and your e-pawn.',
          'Play e4 (or d4): the pawn takes a centre square and opens a path for your bishop and queen.',
        ],
        focus: ['d2', 'e2'],
        explain:
          'A pawn in the centre controls two key squares and opens a diagonal for your bishop (and for the queen after e4). Capablanca, in Chess Fundamentals, stresses that early moves should develop pieces quickly towards the centre — a central pawn makes that possible.',
      },
    ],
    otherGood:
      'That is a respected opening move used by masters — it controls the centre from a distance. For this lesson, put a pawn right on a centre square.',
    source: 'J. R. Capablanca, Chess Fundamentals (1921) — public domain',
  },
  {
    id: 'scholars-mate',
    phase: 'opening',
    tier: 'beginner',
    title: 'Stop the early queen attack',
    summary: "Defend f7 against the famous four-move 'Scholar's Mate'.",
    intro:
      "White has brought the queen out early to h5, and together with the bishop on c4 it attacks your f7 pawn. Only your king defends f7. If you ignore it, Qxf7 is checkmate. You are Black. Find a move that stops the threat.",
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    steps: [
      {
        accept: ['g6', 'Qe7', 'Qf6'],
        wrong: {
          Nf6: "Nf6 attacks the queen, but it doesn't stop the threat: Qxf7 is checkmate. Always ask first: what is my opponent threatening?",
          Nd4: 'This makes a threat of your own, but Qxf7 is checkmate first.',
          d6: 'This opens a line for your bishop but leaves f7 to fall: Qxf7 is checkmate.',
          a6: 'This ignores the threat: Qxf7 is checkmate.',
        },
        hints: [
          'Before making plans, ask: "What is my opponent threatening?" Count the attackers on f7.',
          'The queen on h5 and bishop on c4 both aim at f7. Can you block the queen, defend f7, or chase the queen?',
          'Play g6: it blocks the queen\'s line to f7 and attacks the queen, which must move away.',
        ],
        focus: ['f7', 'h5', 'c4'],
        explain:
          'You stopped the mate. 3...g6 is the most natural: it attacks the queen and prepares Bg7. (3...Qe7 also defends f7 by guarding it directly.) If White continues 4.Qf3, aiming at f7 again, 4...Nf6 blocks the line and develops a piece. An early queen raid usually wastes time — you will be the one ahead in development.',
      },
    ],
    otherGood: 'That move does not deal with the threat on f7 directly. Look at f7 again.',
    source: "Classic opening trap, discussed in most beginner texts (e.g. Wikibooks: Chess, CC BY-SA)",
  },
  {
    id: 'castle',
    phase: 'opening',
    tier: 'beginner',
    title: 'Castle your king to safety',
    summary: 'Tuck the king away and bring the rook into play in one move.',
    intro:
      "You have developed your knight and bishop, and your opponent has done the same. Your king is still in the centre, where lines will open as pawns are exchanged. Castling moves the king to safety and brings a rook towards the centre — two jobs in one move. You are White. Find the move.",
    fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq - 0 6',
    steps: [
      {
        accept: ['O-O'],
        hints: [
          'Where is your king safest once the centre opens up?',
          'Your king and the rook on h1 have a clear path between them.',
          'Castle kingside: O-O. The king goes to g1 behind its pawns, and the rook comes to f1.',
        ],
        focus: ['e1', 'h1'],
        explain:
          'Castling is the only move that moves two pieces at once. The king is now sheltered by the f2, g2 and h2 pawns, and the rook on f1 is ready to come to e1 to support a later d3–d4 break. A useful habit: castle early, usually within the first ten moves.',
      },
    ],
    otherGood:
      'That move is reasonable, but your king is still in the centre. Make your king safe first, then make plans.',
    source: 'General opening principles; Capablanca, Chess Fundamentals (1921)',
  },
  {
    id: 'legal-trap',
    phase: 'opening',
    tier: 'intermediate',
    title: "Légal's Mate: when a pin isn't a pin",
    summary: 'A queen sacrifice that punishes a lazy opening move.',
    intro:
      'Black\'s bishop on g4 pins your knight on f3 to your queen. But this is only a "relative" pin: the knight CAN move, it just exposes the queen. Black\'s last move, ...g6, wasted time and left the e5 pawn and the f7 square weak. You are White. Find the startling capture.',
    fen: 'rn1qkbnr/ppp2p1p/3p2p1/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5',
    steps: [
      {
        accept: ['Nxe5'],
        hints: [
          'A pin to the king is absolute, but a pin to the queen is not. What if you simply ignore it?',
          'Your knight on f3 can capture something.',
          'Nxe5! It "abandons" the queen — but if Black takes it, your bishop, knights and the weak f7 square combine for checkmate.',
        ],
        focus: ['f3', 'e5'],
        explain:
          'Nxe5 wins a pawn whatever happens. The best Black can do is 5...dxe5 6.Qxg4, and White is simply a pawn up with a lead in development. But greed is punished…',
        reply: 'Bxd1',
        replyNote: 'Black grabs the queen.',
      },
      {
        accept: ['Bxf7+'],
        hints: [
          'Use checks: the king has very few safe squares.',
          'Your bishop on c4 can capture with check.',
          'Bxf7+ forces the king forward, because Kxf7 is impossible — the knight on e5 guards f7.',
        ],
        focus: ['c4', 'f7'],
        explain: 'Bxf7+ is protected by the knight on e5, so the king must step forward to e7.',
        reply: 'Ke7',
      },
      {
        accept: ['#'],
        hints: [
          'Every escape square near the king is already covered. One more check finishes it.',
          'Your knight on c3 has not moved yet.',
          'Nd5# — the knight covers e7, and every flight square is covered by your bishop, the other knight or Black\'s own pieces.',
        ],
        focus: ['c3'],
        explain:
          "Checkmate with three minor pieces against a whole army. Named after Kermur Sire de Légal (Paris, c. 1750). The lesson: a 'pin' to the queen is not absolute, and falling behind in development can be fatal.",
      },
    ],
    otherGood: 'That move is fine, but there is a far more forcing idea. Look at what the pinned knight can capture.',
    source: 'Légal vs Saint Brie, Paris c. 1750 (historical game, public domain)',
  },
  {
    id: 'queens-gambit',
    phase: 'opening',
    tier: 'intermediate',
    title: "Queen's Gambit: don't chase the pawn",
    summary: 'Why White need not hurry to win back the c4 pawn.',
    intro:
      "After 1.d4 d5 2.c4 dxc4, Black has taken your c-pawn: the Queen's Gambit Accepted. It isn't a real sacrifice. Black's pawn on c4 is hard to keep, and by taking it Black gave up the centre. The masters' approach is to develop calmly, take the centre and win the pawn back later. You are White. Choose your plan.",
    fen: 'rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
    steps: [
      {
        accept: ['e3', 'e4', 'Nf3'],
        notIt: {
          'Qa4+': 'Qa4+ wins the pawn back at once, but brings the queen out early where it can be chased. There is no hurry: develop first.',
        },
        wrong: {
          b3: 'b3 tries to undermine c4 immediately, but after ...cxb3 your queenside pawns are broken. Develop instead.',
          a4: 'This stops ...b5, but does nothing for development or the centre.',
        },
        hints: [
          "Black gave up a central pawn. What does that let you do in the centre?",
          'Your e-pawn and your kingside knight are ready to play. Your f1 bishop would love to recapture on c4.',
          'Play e3 (or e4 or Nf3): the bishop on f1 can now take back on c4, and you will control the centre.',
        ],
        focus: ['e2', 'g1', 'f1'],
        explain:
          'Good. After e3, the bishop on f1 attacks c4, so Black would have to weaken the queenside with ...b5 to hold the pawn, and a4 then breaks up that chain. The principle: in the opening, development and the centre usually matter more than a single pawn.',
      },
    ],
    otherGood: 'Reasonable, but focus on the centre and on freeing your f1 bishop to take back on c4.',
    source: "Queen's Gambit theory; Wikibooks: Chess Opening Theory (CC BY-SA)",
  },
  {
    id: 'french-chain',
    phase: 'opening',
    tier: 'advanced',
    title: 'Attack the base of the pawn chain',
    summary: "Nimzowitsch's pawn-chain rule in the French Defence.",
    intro:
      "In the French Defence Advance Variation, White's pawns on d4 and e5 form a chain pointing at your kingside. Nimzowitsch taught that a pawn chain should be attacked at its BASE — the rearmost pawn — because the pawns in front depend on it. You are Black. Strike at the chain.",
    fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3',
    steps: [
      {
        accept: ['c5'],
        notIt: {
          f6: '...f6 attacks the head of the chain (e5). It is a valid idea later, but Nimzowitsch\'s rule says start at the base: d4.',
          Nc6: 'Developing, but the key idea is a pawn strike. Pieces work best once the pawn break is under way.',
        },
        hints: [
          'Which White pawn supports the whole chain?',
          "The base of White's chain is on d4. Which of your pawns can attack it?",
          '...c5! It hits d4, the base of the chain. If d4 falls or is exchanged, e5 loses its support.',
        ],
        focus: ['d4', 'c7'],
        explain:
          "...c5 is the thematic move in every French Defence. Black will add pressure on d4 with ...Nc6 and ...Qb6. If White ever plays dxc5, the e5 pawn loses its protector. Nimzowitsch called this attacking the chain at its 'base' (My System, 1925).",
      },
    ],
    otherGood: 'A playable move, but it does not challenge the pawn chain. Find the pawn strike.',
    source: 'Aron Nimzowitsch, My System (1925) — chapter on pawn chains',
  },

  /* --------------------------- MIDDLEGAME --------------------------- */
  {
    id: 'free-piece',
    phase: 'middlegame',
    tier: 'beginner',
    title: 'Take what is undefended',
    summary: 'Spot a piece that nobody protects.',
    intro:
      "Before every move, look at your opponent's pieces and ask: \"Is anything undefended?\" A piece that is attacked but not protected can be taken for free. You are White. Black's last move left something loose.",
    fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P2b/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 6',
    steps: [
      {
        accept: ['Nxh4'],
        wrong: {
          Nxe5: 'The e5 pawn is defended by the knight on c6: after Nxe5 Nxe5 you lose your knight for a pawn.',
          'Bxf7+': 'After Bxf7+ Rxf7 (or Kxf7) you have given a bishop for a pawn.',
        },
        hints: [
          "Check each of Black's pieces: which are attacked, and which are defended?",
          'Look at the black bishop on h4 and your knight on f3.',
          'Nxh4 wins a whole bishop: nothing Black has can take back on h4.',
        ],
        focus: ['h4', 'f3'],
        explain:
          "The bishop on h4 was attacked by your knight and defended by nothing — the queen's diagonal to h4 is blocked by Black's own knight on f6. Grandmasters do this check on every move: \"What can I take? What can my opponent take?\"",
      },
    ],
    otherGood: 'A sensible move, but something is being given away for free. Look again.',
    source: 'Core tactical principle; Lichess puzzle theme "hanging piece" (CC0 puzzle database)',
  },
  {
    id: 'knight-fork',
    phase: 'middlegame',
    tier: 'beginner',
    title: 'The knight fork',
    summary: 'Attack the king and the queen with one move.',
    intro:
      'A fork is one piece attacking two at once. Knights are the best forkers because their jumps are hard to see coming. When a fork includes a check, the opponent must save the king and lose the other piece. You are White.',
    fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
    steps: [
      {
        accept: ['Ne7+'],
        hints: [
          "The black king and queen are both on the back rank. Can one piece attack both?",
          'Your knight on d5 can jump to a square attacking g8 and c8.',
          'Ne7+ checks the king AND attacks the queen. After the king moves, Nxc8 wins the queen.',
        ],
        focus: ['d5', 'g8', 'c8'],
        explain:
          'From e7 the knight attacks both g8 (the king) and c8 (the queen). Black must answer the check first.',
        reply: 'Kf8',
      },
      {
        accept: ['Nxc8'],
        hints: ['Collect the prize.', 'The queen on c8 is still attacked.', 'Nxc8 wins the queen.'],
        focus: ['e7', 'c8'],
        explain:
          'You won the queen for nothing. A useful pattern to remember: a knight attacks squares of the opposite colour to the one it stands on, so to fork two pieces they both need to be on the same colour.',
      },
    ],
    otherGood: 'That move is fine but misses a big win. Look for one move that attacks two black pieces.',
    source: 'Lichess puzzle theme "fork" (CC0 puzzle database)',
  },
  {
    id: 'skewer',
    phase: 'middlegame',
    tier: 'beginner',
    title: 'The skewer',
    summary: 'Check the king and win the piece behind it.',
    intro:
      'A skewer is like a pin turned round: you attack a valuable piece, it moves away, and you capture the piece behind it. When the front piece is the king, it MUST move. You are White.',
    fen: '4q3/pp6/8/4k3/8/8/5PPP/R5K1 w - - 0 1',
    steps: [
      {
        accept: ['Re1+'],
        hints: [
          'The black king and queen stand on the same line. Which line?',
          'Your rook on a1 can reach the e-file.',
          'Re1+! The king must leave the e-file, and then the rook takes the queen on e8.',
        ],
        focus: ['a1', 'e5', 'e8'],
        explain: 'The rook checks along the e-file. The king has to step aside, exposing the queen behind it.',
        reply: 'Kd4',
      },
      {
        accept: ['Rxe8'],
        hints: ['The line is open now.', 'Look down the e-file.', 'Rxe8 wins the queen.'],
        focus: ['e1', 'e8'],
        explain:
          'Skewers and pins work along lines, so they are weapons for the long-range pieces: rooks, bishops and queens. Whenever two enemy pieces stand on the same line, look for a skewer or pin.',
      },
    ],
    otherGood: "Look for a check that lines up Black's king with the piece behind it.",
    source: 'Lichess puzzle theme "skewer" (CC0 puzzle database)',
  },
  {
    id: 'back-rank',
    phase: 'middlegame',
    tier: 'beginner',
    title: 'Back-rank checkmate',
    summary: "Exploit a king trapped behind its own pawns.",
    intro:
      "Black's king is boxed in by its own pawns on f7, g7 and h7. If a rook or queen reaches the back rank with nothing to block or capture it, that is checkmate. This is one of the most common ways games are decided. You are White.",
    fen: '6k1/1b3ppp/8/8/8/8/r4PPP/3R2K1 w - - 0 1',
    steps: [
      {
        accept: ['#'],
        hints: [
          'Where can the black king go if it is checked along the 8th rank?',
          'Your rook on d1 has a clear path up the d-file.',
          'Rd8# — the king cannot escape because its own pawns block f7, g7 and h7.',
        ],
        focus: ['d1', 'd8'],
        explain:
          "Checkmate! The defence against this is to make 'luft' (air) for the king — a pawn move such as ...h6 gives the king an escape square. Check your own back rank in every game.",
      },
    ],
    otherGood: 'Look for checkmate in one move.',
    source: 'Lichess puzzle theme "back rank mate" (CC0 puzzle database)',
  },
  {
    id: 'discovered-attack',
    phase: 'middlegame',
    tier: 'intermediate',
    title: 'Discovered attack',
    summary: 'Move one piece to unleash another.',
    intro:
      'Your bishop on d3 is standing between your queen and the black queen on d8. If the bishop moves, your queen attacks d8. When the moving piece ALSO makes a threat — especially check — the opponent cannot answer both. You are White.',
    fen: '3q2k1/5ppp/8/8/8/3B4/5PPP/3Q2K1 w - - 0 1',
    steps: [
      {
        accept: ['Bxh7+'],
        hints: [
          'Your queen is "hidden" behind one of your own pieces. What is it looking at?',
          'Move the bishop on d3 with check.',
          'Bxh7+! The bishop checks the king and uncovers your queen\'s attack on d8.',
        ],
        focus: ['d3', 'd1', 'd8'],
        explain:
          'Black must deal with the check, so the black queen is lost. The bishop is sacrificed, but you win a queen for it.',
        reply: 'Kxh7',
      },
      {
        accept: ['Qxd8'],
        hints: ['Collect the queen.', 'The d-file is open now.', 'Qxd8 wins the queen.'],
        focus: ['d1', 'd8'],
        explain:
          'Discovered attacks are among the most powerful tactics because two pieces attack at once. The front piece is free to go anywhere — ideally with check or a capture.',
      },
    ],
    otherGood: 'A decent move, but you can win the black queen by force.',
    source: 'Lichess puzzle theme "discovered attack" (CC0 puzzle database)',
  },
  {
    id: 'open-file',
    phase: 'middlegame',
    tier: 'intermediate',
    title: 'Rooks belong on open files',
    summary: 'Put your rooks where the lines are open.',
    intro:
      'An open file is a column with no pawns on it. A rook on an open file can travel all the way into the enemy position, especially to the 7th rank. Here the d-file and e-file are both open. You are White. Activate a rook.',
    fen: 'r4rk1/pp3ppp/2p5/8/8/2P5/PP3PPP/R4RK1 w - - 0 15',
    steps: [
      {
        accept: ['Rad1', 'Rfd1', 'Rfe1', 'Rae1'],
        hints: [
          'Which of your pieces is doing nothing right now?',
          'Your rooks are on a1 and f1. Which files have no pawns?',
          'Put a rook on the d- or e-file (e.g. Rfd1): it controls the file and can later invade on the 7th rank.',
        ],
        focus: ['a1', 'f1', 'd1', 'e1'],
        explain:
          'The rook now controls an open file. Nimzowitsch described the goal: occupy the open file, then penetrate to the 7th rank, where the rook attacks pawns and confines the enemy king. If Black contests the file, doubling your rooks usually wins it.',
      },
    ],
    otherGood:
      'That is not a bad move, but your rooks are still passive. In positions like this, activating the rooks comes first.',
    source: 'Aron Nimzowitsch, My System (1925) — chapter on open files',
  },
  {
    id: 'greek-gift',
    phase: 'middlegame',
    tier: 'advanced',
    title: 'The Greek Gift sacrifice',
    summary: 'The classic bishop sacrifice on h7 to attack the castled king.',
    intro:
      "The 'Greek Gift' is Bxh7+, sacrificing a bishop to rip open the king's shelter. It works when: (1) your bishop reaches h7, (2) your knight can jump to g5, (3) your queen can join on the h-file, and (4) Black has no knight on f6 to defend h7. Your e5 pawn has kept the knight away from f6. You are White.",
    fen: 'r4rk1/pbqn1ppp/1p2p3/3pP3/3P4/2PB1N2/PP3PPP/R2Q1RK1 w - - 0 12',
    steps: [
      {
        accept: ['Bxh7+'],
        hints: [
          "The black king's shelter has a weak point that only the king defends.",
          'Your bishop on d3 points straight at h7.',
          'Bxh7+! After Kxh7, Ng5+ and Qh5 create unstoppable mating threats.',
        ],
        focus: ['d3', 'h7'],
        explain: 'The bishop is sacrificed to drag the king out. Now bring the knight with check.',
        reply: 'Kxh7',
        replyNote: 'Accepting is critical; declining with ...Kh8 leaves White a pawn up with an attack anyway.',
      },
      {
        accept: ['Ng5+'],
        hints: ['Keep giving checks so Black has no time to defend.', 'Your knight on f3.', 'Ng5+ — the knight checks and supports the queen arriving on h7.'],
        focus: ['f3', 'g5'],
        explain: 'Ng5+ forces the king to choose. Retreating to g8 is the most common reply.',
        reply: 'Kg8',
      },
      {
        accept: ['Qh5'],
        hints: ['One more piece joins the attack.', 'Your queen on d1 can reach the h-file.', 'Qh5! threatens Qh7 checkmate.'],
        focus: ['d1', 'h5', 'h7'],
        explain:
          'Qh5 threatens Qh7#. Black can only delay it by giving up material, e.g. ...Rfe8 Qxf7+ or ...Nf6 exf6. This pattern was already known to Gioachino Greco in the early 1600s, hence the name "Greek" gift.',
      },
    ],
    otherGood: 'Solid, but there is a famous sacrifice here. Check the four conditions in the introduction.',
    source: 'Gioachino Greco, manuscript c. 1619 (public domain); pattern described in many attacking manuals',
  },

  /* ----------------------------- ENDGAME ----------------------------- */
  {
    id: 'queen-mate',
    phase: 'endgame',
    tier: 'beginner',
    title: 'Checkmate with king and queen',
    summary: 'Finish the game when you have the extra queen.',
    intro:
      "With king and queen against a lone king, you must use BOTH pieces: the queen alone cannot checkmate. Drive the enemy king to the edge, bring your king close, then deliver mate. Here the work is done — your king guards the key squares. You are White. Mate in one.",
    fen: '5k2/Q7/5K2/8/8/8/8/8 w - - 0 1',
    steps: [
      {
        accept: ['#'],
        notIt: {
          'Qe7+': 'That is check, but the king escapes to g8. Look for a move that covers every square.',
          'Qg7+': 'That is check, but the king escapes to e8. Look for a move that covers every square.',
        },
        hints: [
          'Which squares can the black king move to? Your king already covers e7, f7 and g7.',
          'Your queen needs to check along the back rank, or on f7 where your king protects it.',
          'Qf7# (or Qa8#): the king is in check and every flight square is covered.',
        ],
        focus: ['a7', 'f8'],
        explain:
          "Checkmate. Watch out for stalemate in these endings: if the lone king has no legal move and is NOT in check, the game is a draw. Try the practice game to mate from scratch.",
      },
    ],
    otherGood: 'Look for checkmate in one move.',
    practice: { fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', label: 'Practice: mate with king and queen' },
    source: 'Capablanca, Chess Fundamentals (1921), ch. 1 "First principles: endings"',
  },
  {
    id: 'rook-mate',
    phase: 'endgame',
    tier: 'beginner',
    title: 'Checkmate with king and rook',
    summary: 'The king and rook squeeze the enemy king to the edge.',
    intro:
      "King and rook can force checkmate, but only on the edge of the board, and your king must help by standing opposite the enemy king. Here your king on g6 already faces the black king on g8. You are White. Mate in one.",
    fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1',
    steps: [
      {
        accept: ['#'],
        hints: [
          'Your king covers f7, g7 and h7. What is left?',
          'The rook can check along the back rank.',
          'Ra8# — the rook covers the whole 8th rank and your king covers the 7th.',
        ],
        focus: ['a1', 'a8'],
        explain:
          'This is the basic mating pattern: the kings face each other (the "opposition") and the rook checks along the edge. In the practice game, use the rook to cut the king off rank by rank, then bring your king up.',
      },
    ],
    otherGood: 'Look for checkmate in one move.',
    practice: { fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', label: 'Practice: mate with king and rook' },
    source: 'Capablanca, Chess Fundamentals (1921), ch. 1',
  },
  {
    id: 'king-first',
    phase: 'endgame',
    tier: 'intermediate',
    title: 'King first: the key squares',
    summary: 'In king-and-pawn endings, lead with the king, not the pawn.',
    intro:
      'With king and pawn against king, the result depends on the KINGS. Your king wins if it reaches a "key square": for a pawn on its starting rank, these are the three squares two ranks in front of it (here d4, e4 and f4). Pushing the pawn too early lets the enemy king block it. You are White.',
    fen: '8/8/4k3/8/8/3K4/4P3/8 w - - 0 1',
    steps: [
      {
        accept: ['Ke4', 'Kd4'],
        wrong: {
          e4: 'The pawn has rushed ahead of the king. Now its key squares are d6, e6 and f6 — and the black king is already on e6. This is a draw.',
          e3: 'The pawn moves before the king has reached a key square. Black answers ...Kd5 and blocks the way: a draw.',
          Ke3: 'Your king did not reach a key square. Black takes the opposition with ...Ke5 (kings facing each other, White to move) and holds the draw.',
          Kc3: 'This walks away from the key squares. Black\'s king comes to e5 or d5 and holds the draw.',
        },
        hints: [
          'In this ending, the king leads and the pawn follows.',
          'The key squares for your e2 pawn are d4, e4 and f4. Your king on d3 can reach one right now.',
          'Ke4 (or Kd4): your king stands on a key square, so the win is guaranteed.',
        ],
        focus: ['d3', 'd4', 'e4', 'f4'],
        explain:
          'Your king occupies a key square, so White wins whatever Black does: the king will escort the pawn, and the e2 pawn can make a waiting move (e2-e3) to win the "opposition" when needed. Opposition means the kings face each other with one square between them; the side NOT to move holds it.',
      },
    ],
    otherGood: 'That move keeps the win, but the lesson is to put your king on a key square.',
    practice: { fen: '8/8/4k3/8/8/3K4/4P3/8 w - - 0 1', label: 'Practice: win this ending against the computer' },
    source: 'Key squares and opposition: Capablanca, Chess Fundamentals (1921); standard endgame theory',
  },
  {
    id: 'lucena',
    phase: 'endgame',
    tier: 'advanced',
    title: 'The Lucena position: build a bridge',
    summary: "The most important winning technique in rook endings.",
    intro:
      "Your pawn is on b7, one step from queening, but your king on b8 is in the way, and Black's rook keeps checking. The winning method is to 'build a bridge': bring your rook to the 4th rank so it can block the checks. First, push the black king one file further away. You are White.",
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    steps: [
      {
        accept: ['Rd1+'],
        hints: [
          'Before your king leaves b8, push the black king further away.',
          'Your rook can check on the d-file.',
          'Rd1+ forces the king to e7, so it can no longer reach c7.',
        ],
        focus: ['c1', 'd1', 'd8'],
        explain: 'The black king is driven to the e-file, two files from your pawn.',
        reply: 'Ke7',
      },
      {
        accept: ['Rd4'],
        hints: [
          "Prepare a shelter for your king against the coming checks.",
          'Your rook goes to the 4th rank.',
          'Rd4! — the "bridge". Later the rook will block a check on b4.',
        ],
        focus: ['d1', 'd4'],
        explain: 'The rook stands on the 4th rank, ready to interpose. Now the king can come out.',
        reply: 'Ra1',
      },
      {
        accept: ['Kc7'],
        hints: ['Now walk the king out.', 'Step out towards c7.', 'Kc7 — Black starts checking.'],
        focus: ['b8', 'c7'],
        explain: 'The king leaves the queening square; Black must check.',
        reply: 'Rc1+',
      },
      {
        accept: ['Kb6'],
        hints: ['Walk down towards your rook.', 'Head for b6.', 'Kb6 keeps approaching the bridge.'],
        focus: ['b6'],
        explain: 'The king approaches the 4th rank where the rook waits.',
        reply: 'Rb1+',
      },
      {
        accept: ['Kc6'],
        hints: ['Sidestep the check.', 'c6 is the right square.', 'Kc6 — keep coming.'],
        focus: ['c6'],
        explain: 'One more check is coming.',
        reply: 'Rc1+',
      },
      {
        accept: ['Kb5'],
        hints: ['Step down to the 5th rank.', 'b5.', 'Kb5 — now the bridge can block.'],
        focus: ['b5'],
        explain: 'The king is right above the bridge.',
        reply: 'Rb1+',
      },
      {
        accept: ['Rb4'],
        hints: ['Block the check with the bridge.', 'Your rook on d4.', 'Rb4! blocks — no more checks, and the pawn queens.'],
        focus: ['d4', 'b4'],
        explain:
          'The bridge is built: the checks are over and b8=Q follows. This position is named after Luis Ramírez de Lucena (1497), although it was first published by Alessandro Salvio in 1634. Every serious player knows it by heart.',
      },
    ],
    otherGood: 'That move may also win, but practise the standard method: check, build the bridge, then walk the king out.',
    source: 'Lucena position — Salvio (1634); standard rook-endgame theory',
  },
  {
    id: 'philidor',
    phase: 'endgame',
    tier: 'advanced',
    title: 'The Philidor defence: hold the draw',
    summary: 'How the weaker side draws rook-and-pawn against rook.',
    intro:
      "You are a pawn down in a rook ending. White threatens to bring the king to f6 or d6 and mate you on the back rank. Philidor's method: keep your king in front of the pawn and put your rook on your 3rd rank (here the 6th) so White's king cannot advance. When White pushes the pawn to that rank, swing the rook behind and check from a distance. You are Black.",
    fen: '4k3/1R6/8/4PK2/8/8/r7/8 b - - 0 1',
    steps: [
      {
        accept: ['Ra6'],
        hints: [
          "Stop White's king from reaching the 6th rank.",
          'Your rook belongs on the 6th rank — your third rank.',
          'Ra6! The white king cannot come to f6 or e6.',
        ],
        focus: ['a2', 'a6'],
        explain:
          'The rook guards the 6th rank like a wall. White can only make progress by advancing the pawn to e6 — which gives up the shelter the pawn provided.',
        reply: 'e6',
        replyNote: 'White pushes, hoping to make progress.',
      },
      {
        accept: ['Ra1'],
        wrong: {
          Rb6: 'The rook must stay active. Now is the time to go behind and check.',
        },
        hints: [
          "The pawn on e6 no longer shields White's king from checks.",
          "Send your rook far away, to the 1st rank.",
          'Ra1! — next comes Rf1+ and endless checks from behind; the white king has nowhere to hide.',
        ],
        focus: ['a6', 'a1'],
        explain:
          'Draw! The white king cannot escape the checks from behind without leaving the pawn. François-André Danican Philidor published this defence in 1777; it is the foundation of rook-endgame defence.',
      },
    ],
    otherGood: 'That might hold too, but learn the standard method: rook on the third rank, then checks from behind.',
    source: "F.-A. D. Philidor, Analyse du jeu des Échecs (1777) — public domain",
  },
];

/* ------------------- FIRST STEPS: rules puzzles ------------------- */
/* These teach the rules themselves, so the answer need not be the strongest move. */

export const RULE_LESSONS: Lesson[] = [
  {
    id: 'rules-capture-values',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Which piece to take?',
    summary: 'Use the piece values to choose the best capture.',
    intro:
      'Your rook on d4 can capture the black pawn on a4 or the black queen on d8. Remember the values: pawn 1, rook 5, queen 9. Which capture gains you the most?',
    fen: '3qk3/8/8/8/p2R4/8/8/4K3 w - - 0 1',
    steps: [
      {
        accept: ['Rxd8+'],
        wrong: { Rxa4: 'That wins a pawn (worth 1), but the queen (worth 9) was also there for the taking.' },
        hints: ['Count the value of each piece you could take.', 'Look straight up the d-file.', 'Rxd8+ takes the queen.'],
        focus: ['d4', 'd8', 'a4'],
        explain:
          'You took the queen, worth 9. The black king can take your rook back (Kxd8), but you swapped a rook (5) for a queen (9), so you are 4 points ahead.',
      },
    ],
    source: 'Standard piece values',
  },
  {
    id: 'rules-check-capture',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Out of check: capture the attacker',
    summary: 'One of three ways to escape check.',
    intro:
      'Your king on e1 is in CHECK: the black rook on e4 attacks it. When you are in check you must get out of it straight away. There are three ways: move the king, block the attack, or capture the attacking piece. Here, capture it with your knight.',
    fen: '4k3/8/8/8/4r3/2N5/8/4K3 w - - 0 1',
    steps: [
      {
        accept: ['Nxe4'],
        hints: [
          'Which of your pieces can reach the rook on e4?',
          'Your knight on c3 jumps in an L-shape.',
          'Nxe4: the knight captures the rook, and the check is gone.',
        ],
        focus: ['c3', 'e4'],
        explain:
          'The knight captured the rook, so nothing attacks your king any more — and you won a rook. Capturing the attacker is often the best way out of check.',
      },
    ],
    otherGood: 'That also gets you out of check, but this lesson asks you to capture the attacking rook.',
    source: 'Rules of chess (FIDE Laws of Chess, article 3)',
  },
  {
    id: 'rules-check-block',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Out of check: block the attack',
    summary: 'Put a piece in the way.',
    intro:
      'The black rook on e5 is checking your king along the e-file. You can block the check by putting one of your pieces on a square in between. Use your bishop.',
    fen: '4k3/8/8/4r3/8/3B4/8/4K3 w - - 0 1',
    steps: [
      {
        accept: ['Be2', 'Be4'],
        hints: [
          'Which squares lie between the rook and your king?',
          'e2, e3 and e4 are in between. Your bishop on d3 moves diagonally.',
          'Be2 blocks the check, and your king protects the bishop there.',
        ],
        focus: ['d3', 'e2', 'e4'],
        explain:
          'The bishop now stands between the rook and the king, so the king is no longer in check. Tip: block with a piece that is protected (on e2 the king guards it), or the opponent may simply capture it.',
      },
    ],
    otherGood: 'That gets out of check too, but this lesson asks you to block with the bishop.',
    source: 'Rules of chess (FIDE Laws of Chess, article 3)',
  },
  {
    id: 'rules-check-move',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Out of check: move the king',
    summary: 'Step to a safe square.',
    intro:
      'The black rook on a1 is checking your king along the first row. Nothing can capture it or block it, so the king must move to a square that is not attacked.',
    fen: '7k/8/8/8/8/8/8/r3K3 w - - 0 1',
    steps: [
      {
        accept: ['Kd2', 'Ke2', 'Kf2'],
        hints: [
          'Which squares around your king are NOT on the first row?',
          'The rook controls the whole first row. Move up.',
          'Ke2 (or Kd2/Kf2) steps off the attacked row.',
        ],
        focus: ['e1', 'd2', 'e2', 'f2'],
        explain:
          'The king moved off the attacked row. The board will never let you make a move that leaves your king in check — that is against the rules.',
      },
    ],
    source: 'Rules of chess (FIDE Laws of Chess, article 3)',
  },
  {
    id: 'rules-checkmate',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Checkmate wins the game',
    summary: 'Give check so that there is no escape.',
    intro:
      'CHECKMATE is check with no way out: the king cannot move to safety, the attack cannot be blocked, and the attacker cannot be captured. Checkmate ends the game. Your king on b6 is guarding a7 and b7. Find a queen move that checkmates the black king on a8.',
    fen: 'k7/8/1K6/8/8/8/8/7Q w - - 0 1',
    steps: [
      {
        accept: ['#'],
        hints: [
          'The black king is in the corner. Which squares can it still reach?',
          'b8 is the only free square. Your queen can check along the top row.',
          'Qh8# — the queen checks along the 8th row and covers b8; your king covers a7 and b7.',
        ],
        focus: ['h1', 'h8', 'b8'],
        explain:
          'Checkmate! The king is attacked and has nowhere to go. That is how you win a game of chess — you never actually capture the king.',
      },
    ],
    otherGood: 'Look for a move that gives check AND leaves the king no escape square.',
    source: 'Rules of chess (FIDE Laws of Chess, articles 1 and 5)',
  },
  {
    id: 'rules-castle-kingside',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Castling',
    summary: 'The special move that moves the king and a rook together.',
    intro:
      'CASTLING is the only move in which two pieces move at once. The king moves TWO squares towards a rook, and that rook jumps over to the square next to the king. To castle, drag your king two squares to the right, from e1 to g1.',
    fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
    steps: [
      {
        accept: ['O-O'],
        hints: [
          'Move the king, not the rook.',
          'Drag the king from e1 two squares towards the rook on h1.',
          'King to g1: the rook automatically jumps to f1.',
        ],
        focus: ['e1', 'g1', 'h1'],
        explain:
          'You castled "kingside". The king is tucked safely in the corner and the rook has come towards the centre. Castling towards the a-file rook (king to c1) is called "queenside" castling.',
      },
    ],
    otherGood: 'That move is allowed, but try castling: move the king two squares to the right.',
    source: 'Rules of chess (FIDE Laws of Chess, article 3.8)',
  },
  {
    id: 'rules-castle-check',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: "When you can't castle",
    summary: 'You may not castle through an attacked square.',
    intro:
      'You can only castle if: neither the king nor that rook has moved yet; there are no pieces between them; your king is not in check; and the king does not pass through or land on an attacked square. Here the black bishop on c4 attacks f1, so kingside castling is not allowed. Castle on the other side (king to c1).',
    fen: '4k3/8/8/8/2b5/8/PPP2PPP/R3K2R w KQ - 0 1',
    steps: [
      {
        accept: ['O-O-O'],
        hints: [
          'Kingside castling would take the king across f1, which the bishop attacks.',
          'Castle towards the rook on a1 instead.',
          'Move the king from e1 to c1: the rook jumps to d1.',
        ],
        focus: ['e1', 'c1', 'f1', 'c4'],
        explain:
          'Queenside castling: the king goes to c1 and the rook to d1. Notice that the board did not let you castle kingside — it would have taken your king through an attacked square.',
      },
    ],
    otherGood: 'Try castling: move the king two squares towards the a1 rook.',
    source: 'Rules of chess (FIDE Laws of Chess, article 3.8)',
  },
  {
    id: 'rules-promotion',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'Pawn promotion',
    summary: 'A pawn that reaches the far side becomes a new piece.',
    intro:
      'When a pawn reaches the last row it must be PROMOTED: it turns into a queen, rook, bishop or knight of your choice. You can have more than one queen! Move your pawn to e8 and choose the queen.',
    fen: '8/4P3/8/k7/8/8/8/7K w - - 0 1',
    steps: [
      {
        accept: ['e8=Q'],
        notIt: {
          'e8=R': 'Allowed, but a queen is worth more (9) than a rook (5). Almost always choose the queen.',
          'e8=B': 'Allowed, but a queen is worth more (9) than a bishop (3). Almost always choose the queen.',
          'e8=N': 'Allowed — very occasionally a knight is right — but usually choose the queen.',
        },
        hints: [
          'Your pawn is one step from the far side.',
          'Move the pawn from e7 to e8, then pick a piece.',
          'e8=Q — the pawn becomes a queen.',
        ],
        focus: ['e7', 'e8'],
        explain:
          'Your pawn is now a queen, the most powerful piece. This is why pawns matter so much in the endgame: each one is a queen in waiting.',
      },
    ],
    source: 'Rules of chess (FIDE Laws of Chess, article 3.7)',
  },
  {
    id: 'rules-en-passant',
    phase: 'basics',
    tier: 'beginner',
    rulesOnly: true,
    title: 'En passant',
    summary: 'The unusual pawn capture.',
    intro:
      'Black has just moved a pawn two squares, from d7 to d5, landing right beside your pawn on e5. For ONE move only, your pawn may capture it "en passant" (French for "in passing"): move diagonally to d6, as if Black\'s pawn had moved only one square.',
    fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
    steps: [
      {
        accept: ['exd6'],
        hints: [
          "The black pawn skipped past d6. Your pawn can capture it as if it had stopped there.",
          'Move your e5 pawn diagonally to d6.',
          'exd6 en passant: the black pawn on d5 disappears.',
        ],
        focus: ['e5', 'd6', 'd5'],
        explain:
          'You captured en passant: your pawn moved to d6 and the black pawn on d5 was removed. This is only possible on the very next move after the two-square pawn move.',
      },
    ],
    otherGood: 'That move is allowed, but try the special capture: pawn from e5 to d6.',
    source: 'Rules of chess (FIDE Laws of Chess, article 3.7)',
  },
];

export function lessonsFor(phase: Phase, tier?: Tier) {
  return LESSONS.filter((l) => l.phase === phase && (!tier || l.tier === tier));
}

export function lessonById(id: string) {
  return LESSONS.find((l) => l.id === id);
}

export const LESSONS: Lesson[] = [...MAIN_LESSONS, ...RULE_LESSONS];
