/**
 * "First steps": a course for people who have never played chess.
 * It explains the board, each piece and the special rules, with simple
 * hands-on practice: capture all the pawns, or tap the named square.
 */

export type PieceLetter = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

/** Move one white piece to capture every black pawn (the pawns never move). */
export interface Drill {
  piece: PieceLetter;
  from: string;
  /** Black pawns to capture. */
  targets: string[];
  /** Squares the piece must reach (shown as green circles), e.g. the last row for a pawn. */
  goals?: string[];
  /** Your own pieces that get in the way (they cannot be captured). */
  blockers?: string[];
  /** The fewest moves needed — shown as a target to beat. */
  best: number;
  task: string;
}

export interface Diagram {
  fen: string;
  caption: string;
  arrows?: [string, string][];
  /** Squares to mark with a circle. */
  marks?: string[];
}

export interface Chapter {
  id: string;
  title: string;
  icon: string;
  summary: string;
  /** Short paragraphs, plain language. */
  text: string[];
  /** Quick-reference rules shown as a list. */
  keyPoints: string[];
  diagrams?: Diagram[];
  drills?: Drill[];
  /** Ask the student to tap named squares. */
  squareQuiz?: boolean;
  /** Interactive rules puzzles (lesson ids). */
  puzzles?: string[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'goal',
    title: 'The board and the goal',
    icon: '♔',
    summary: 'What chess is, how the board is set up, and how you win.',
    text: [
      'Chess is a game for two players: White and Black. Each player starts with 16 pieces: one king, one queen, two rooks, two bishops, two knights and eight pawns. White always moves first, then the players take turns, one move each.',
      'The goal is to trap the other player\'s king so that it cannot escape being captured. This is called CHECKMATE, and it wins the game. The king is never actually taken off the board.',
      'The board has 64 squares in 8 rows and 8 columns, alternating light and dark. Set it up so that each player has a LIGHT square in the bottom-right corner ("light on the right").',
      'Every square has a name. The columns (called files) are lettered a to h from left to right, and the rows (called ranks) are numbered 1 to 8 from White\'s side. So the bottom-left square is a1 and the square in the middle where White\'s king pawn often goes is e4. You will see these letters and numbers around the edge of the board.',
      'Setting up: the pawns fill the second row (White) and seventh row (Black). On the back row, from the corners inwards: rooks, then knights, then bishops. The queen goes on the remaining square of HER OWN COLOUR (white queen on a light square, black queen on a dark square), and the king goes next to her.',
    ],
    keyPoints: [
      'White moves first; then take turns.',
      'Light square in the bottom-right corner.',
      'Squares are named by column letter then row number: e4, a1, h8.',
      'Queen on her own colour; king beside her.',
      'Win by checkmating the opponent\'s king.',
    ],
    diagrams: [
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        caption: 'The starting position. Notice the white queen on d1 (a light square) and the black queen on d8 (a dark square).',
        marks: ['d1', 'd8'],
      },
    ],
    squareQuiz: true,
  },
  {
    id: 'rook',
    title: 'The rook',
    icon: '♖',
    summary: 'Moves in straight lines, up, down and sideways.',
    text: [
      'The rook (sometimes called a castle) moves in a straight line along a row or column — forwards, backwards, left or right — as many squares as you like, as long as nothing is in the way.',
      'Like every piece except the pawn, the rook CAPTURES the same way it moves: it lands on the square of an enemy piece, and that piece is removed from the board. Pieces can\'t jump over others (only the knight can).',
    ],
    keyPoints: ['Straight lines: up, down, left, right.', 'Any distance, but cannot jump.', 'Worth 5 points.'],
    diagrams: [
      {
        fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
        caption: 'A rook in the centre can reach 14 squares.',
        arrows: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4']],
      },
    ],
    drills: [
      { piece: 'R', from: 'a1', targets: ['a5', 'e5', 'e8'], best: 3, task: 'Capture all three black pawns with your rook.' },
      { piece: 'R', from: 'd4', targets: ['d7', 'g7', 'g2', 'b2'], best: 4, task: 'Capture all four pawns.' },
    ],
  },
  {
    id: 'bishop',
    title: 'The bishop',
    icon: '♗',
    summary: 'Moves diagonally, any distance.',
    text: [
      'The bishop moves diagonally, any number of squares, as long as nothing is in the way.',
      'Because it only moves diagonally, a bishop always stays on squares of the same colour. Each player has one "light-squared" bishop and one "dark-squared" bishop.',
    ],
    keyPoints: ['Diagonal lines only.', 'Always stays on its starting colour.', 'Worth 3 points.'],
    diagrams: [
      {
        fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
        caption: 'A bishop moves along the diagonals.',
        arrows: [['d4', 'h8'], ['d4', 'a1'], ['d4', 'a7'], ['d4', 'g1']],
      },
    ],
    drills: [
      { piece: 'B', from: 'c1', targets: ['e3', 'g5', 'd8'], best: 3, task: 'Capture all three pawns with your bishop.' },
      { piece: 'B', from: 'f1', targets: ['c4', 'f7', 'h5', 'e2'], best: 4, task: 'Capture all four pawns.' },
    ],
  },
  {
    id: 'queen',
    title: 'The queen',
    icon: '♕',
    summary: 'The most powerful piece: rook and bishop combined.',
    text: [
      'The queen can move in any straight line — along rows, columns or diagonals — any number of squares. She combines the moves of the rook and the bishop.',
      'Because she is so powerful, she is worth 9 points. Look after her: losing your queen usually loses the game.',
    ],
    keyPoints: ['Any direction, any distance.', 'Cannot jump.', 'Worth 9 points — the most valuable piece after the king.'],
    diagrams: [
      {
        fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
        caption: 'From the centre the queen can reach 27 squares.',
        arrows: [['d4', 'd8'], ['d4', 'h8'], ['d4', 'h4'], ['d4', 'g1'], ['d4', 'd1'], ['d4', 'a1'], ['d4', 'a4'], ['d4', 'a7']],
      },
    ],
    drills: [{ piece: 'Q', from: 'd1', targets: ['d5', 'h5', 'e8', 'a4'], best: 4, task: 'Capture all four pawns with your queen.' }],
  },
  {
    id: 'king',
    title: 'The king',
    icon: '♔',
    summary: 'The most important piece: one step in any direction.',
    text: [
      'The king moves one square in any direction: forwards, backwards, sideways or diagonally.',
      'The king is the piece you must protect. You are never allowed to move your king onto a square where it could be captured, and you can never leave it under attack.',
    ],
    keyPoints: ['One square in any direction.', 'Can never move into danger.', 'If it is trapped, the game is lost.'],
    diagrams: [
      {
        fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
        caption: 'The king can step to any of the 8 surrounding squares.',
        marks: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'],
      },
    ],
    drills: [{ piece: 'K', from: 'e1', targets: ['e2', 'f3', 'g3', 'h4'], best: 4, task: 'Walk your king to capture all four pawns.' }],
  },
  {
    id: 'knight',
    title: 'The knight',
    icon: '♘',
    summary: 'Jumps in an L-shape, and can jump over pieces.',
    text: [
      'The knight (the horse) moves in an "L" shape: two squares in a straight line, then one square to the side. Or think of it as one square straight then one diagonally outwards.',
      'The knight is the only piece that can JUMP over other pieces. It only captures on the square where it lands. Each time it moves, it lands on a square of the opposite colour.',
    ],
    keyPoints: ['L-shape: two then one.', 'Jumps over anything in between.', 'Worth 3 points.'],
    diagrams: [
      {
        fen: '8/8/8/8/3N4/8/8/8 w - - 0 1',
        caption: 'The eight squares a knight in the centre can jump to.',
        marks: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'],
      },
    ],
    drills: [
      {
        piece: 'N',
        from: 'b1',
        targets: ['c3', 'e4', 'f6'],
        blockers: ['a2', 'b2', 'c2', 'd2'],
        best: 3,
        task: 'Capture the pawns. Your own pawns are in the way — but the knight can jump over them.',
      },
      { piece: 'N', from: 'g1', targets: ['f3', 'g5', 'e6', 'c5'], best: 4, task: 'Capture all four pawns.' },
    ],
  },
  {
    id: 'pawn',
    title: 'The pawn',
    icon: '♙',
    summary: 'Moves forward, captures diagonally, and can become a queen.',
    text: [
      'Pawns move straight FORWARD one square at a time, and never backwards. On its very first move, a pawn may move forward two squares instead of one.',
      'Pawns are the only pieces that capture differently from the way they move: a pawn captures one square DIAGONALLY forward. A pawn is blocked if any piece is directly in front of it.',
      'When a pawn reaches the far side of the board it is PROMOTED: it turns into a queen, rook, bishop or knight — almost always a queen.',
    ],
    keyPoints: [
      'Forward one square (two on its first move).',
      'Captures one square diagonally forward.',
      'Reaching the last row = promotion.',
      'Worth 1 point.',
    ],
    diagrams: [
      {
        fen: '8/8/8/3p1p2/4P3/8/8/8 w - - 0 1',
        caption: 'The white pawn on e4 can capture either black pawn diagonally, or move forward to e5.',
        arrows: [['e4', 'd5'], ['e4', 'f5'], ['e4', 'e5']],
      },
    ],
    drills: [
      { piece: 'P', from: 'd2', targets: [], goals: ['d8'], best: 5, task: 'Walk your pawn to the far side (d8). Use the two-square first move.' },
      { piece: 'P', from: 'e2', targets: ['f4', 'g6'], goals: ['g8'], best: 6, task: 'Capture both pawns, then reach the last row to promote.' },
    ],
  },
  {
    id: 'capture',
    title: 'Capturing and piece values',
    icon: '⚖',
    summary: 'Which pieces are worth more, and how to trade.',
    text: [
      'To capture, move your piece onto a square occupied by an enemy piece; the enemy piece is removed. You can never capture your own pieces.',
      'Pieces have rough values, which help you decide whether a capture or a trade is good: pawn 1, knight 3, bishop 3, rook 5, queen 9. The king has no value because it can never be captured.',
      'Before you capture, ask: "Can my opponent take back?" Giving a knight (3) to win a pawn (1) is a bad trade. The score under the board in this app shows who is ahead in these points.',
    ],
    keyPoints: ['Pawn 1 · Knight 3 · Bishop 3 · Rook 5 · Queen 9.', 'Capture by landing on the enemy piece.', 'Check whether your piece can be taken back.'],
    puzzles: ['rules-capture-values'],
  },
  {
    id: 'check',
    title: 'Check and checkmate',
    icon: '✚',
    summary: 'Attacking the king, escaping, and winning.',
    text: [
      'When a king is attacked, it is in CHECK. The player in check must get out of it on their very next move. There are three ways: (1) MOVE the king to a safe square, (2) BLOCK the attack by putting a piece in between, or (3) CAPTURE the attacking piece.',
      'If there is no way out of check, it is CHECKMATE and the game is over. You don\'t have to say "check" out loud, and this app will never let you make an illegal move.',
    ],
    keyPoints: ['Check = the king is attacked.', 'Escape by moving, blocking or capturing.', 'No escape = checkmate = game over.'],
    puzzles: ['rules-check-capture', 'rules-check-block', 'rules-check-move', 'rules-checkmate'],
  },
  {
    id: 'special',
    title: 'Special moves',
    icon: '★',
    summary: 'Castling, promotion and en passant.',
    text: [
      'CASTLING lets you move your king to safety and bring a rook into play in one move. The king moves two squares towards a rook, and the rook jumps to the other side of the king. You may castle only if neither piece has moved yet, nothing is between them, and the king is not in check and does not pass through or land on an attacked square.',
      'PROMOTION: a pawn that reaches the last row becomes a queen, rook, bishop or knight.',
      'EN PASSANT: if a pawn moves two squares and lands right beside an enemy pawn, that enemy pawn may capture it as if it had moved only one square — but only on the very next move.',
    ],
    keyPoints: ['Castling: king two squares, rook jumps over.', 'Promotion: pawn becomes a new piece.', 'En passant: special pawn capture, next move only.'],
    puzzles: ['rules-castle-kingside', 'rules-castle-check', 'rules-promotion', 'rules-en-passant'],
  },
  {
    id: 'endings',
    title: 'How a game ends',
    icon: '⚑',
    summary: 'Wins, draws, and the stalemate trap.',
    text: [
      'A game is WON by checkmate, or when the opponent resigns (gives up).',
      'A game is DRAWN (nobody wins) in several ways: STALEMATE — the player to move is not in check but has no legal move; neither side has enough pieces left to checkmate (for example, king against king); the same position appears three times; 50 moves pass by each player without a capture or pawn move; or the players agree to a draw.',
      'Stalemate is the classic trap for beginners: when you are winning, make sure your opponent always has a legal move unless you are giving checkmate.',
    ],
    keyPoints: ['Win: checkmate or resignation.', 'Draw: stalemate, too few pieces, repetition, 50-move rule, or agreement.', 'When winning, avoid stalemate!'],
    diagrams: [
      {
        fen: 'k7/8/1Q6/8/8/8/8/K7 b - - 0 1',
        caption: 'Stalemate: it is Black\'s move, the black king is NOT in check, but every square it could go to is attacked. The game is a draw — White threw away a win.',
        marks: ['a7', 'b7', 'b8'],
      },
    ],
  },
];

export function chapterById(id: string) {
  return CHAPTERS.find((c) => c.id === id);
}
