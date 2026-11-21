import { h } from './dom';

function pieceEl(role: string, color: string) {
  // chessground styles custom <piece> elements with the piece images
  const el = document.createElement('piece');
  el.className = `${role} ${color}`;
  return el;
}

/** Ask which piece a pawn becomes. Resolves to 'q' | 'r' | 'b' | 'n', or undefined if cancelled. */
export function askPromotion(color: 'white' | 'black'): Promise<string | undefined> {
  return new Promise((resolve) => {
    const pick = (v?: string) => {
      overlay.remove();
      resolve(v);
    };
    const pieces: [string, string][] = [
      ['q', 'queen'],
      ['r', 'rook'],
      ['b', 'bishop'],
      ['n', 'knight'],
    ];
    const overlay = h(
      'div',
      { class: 'overlay', onclick: (e: Event) => e.target === overlay && pick() },
      h(
        'div',
        { class: 'modal promo', role: 'dialog', 'aria-label': 'Choose promotion piece' },
        h('h2', {}, 'Promote your pawn to…'),
        h(
          'div',
          { class: 'promo-choices cg-wrap' },
          ...pieces.map(([k, role]) =>
            h(
              'button',
              { class: 'promo-btn', 'aria-label': role, onclick: () => pick(k) },
              pieceEl(role, color),
            ),
          ),
        ),
      ),
    );
    document.body.append(overlay);
  });
}
