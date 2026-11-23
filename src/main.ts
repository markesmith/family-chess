import 'chessground/assets/chessground.base.css';
import 'chessground/assets/chessground.brown.css';
import 'chessground/assets/chessground.cburnett.css';
import './styles.css';

import { renderComputer, renderLocal, renderOnline, renderOnlineLobby } from './game/play';
import { renderGuide, renderLearnHub, renderLesson } from './learn/view';
import { renderBasicsChapter, renderBasicsHub } from './learn/basics-view';
import { lessonById, type Phase } from './learn/lessons';
import { h } from './ui/dom';
import { normaliseCode } from './net/online';

type Cleanup = () => void;

const main = document.getElementById('app')!;
let cleanup: Cleanup = () => {};

function home(container: HTMLElement): Cleanup {
  const tile = (href: string, icon: string, title: string, text: string) =>
    h('a', { class: 'tile', href }, h('span', { class: 'tile-icon', 'aria-hidden': 'true' }, icon), h('strong', {}, title), h('span', {}, text));
  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      h('h1', { class: 'hero' }, 'Family Chess'),
      h('p', { class: 'lead' }, 'Play each other on your phones, practise against the computer, and learn the ideas behind good moves.'),
      h(
        'div',
        { class: 'tiles' },
        tile('#/online', '♞', 'Play online', 'Two devices, one game. Share a code or link.'),
        tile('#/local', '♟', 'Pass and play', 'Two players on this device.'),
        tile('#/computer', '♜', 'Play the computer', 'Four strengths, with a coach that explains.'),
        tile('#/learn/basics', '♙', 'First steps', 'Never played? Learn the rules and how each piece moves.'),
        tile('#/learn', '♛', 'Learn', 'Guides and lessons for the opening, middlegame and endgame.'),
      ),
      h(
        'p',
        { class: 'small muted install-tip' },
        'Tip: add this page to your home screen. iPhone: tap Share → "Add to Home Screen". Android: tap ⋮ → "Install app". It then opens full-screen, and training works offline.',
      ),
    ),
  );
  return () => {};
}

function route() {
  cleanup();
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b, c] = parts;
  document.body.dataset.route = a ?? 'home';
  window.scrollTo(0, 0);
  switch (a) {
    case undefined:
      cleanup = home(main);
      break;
    case 'local':
      cleanup = renderLocal(main);
      break;
    case 'computer':
      cleanup = renderComputer(main);
      break;
    case 'online':
      if ((b === 'host' || b === 'join') && c) cleanup = renderOnline(main, b === 'host' ? 'host' : 'guest', normaliseCode(c));
      else cleanup = renderOnlineLobby(main);
      break;
    case 'learn':
      if (b === 'basics') cleanup = c ? renderBasicsChapter(main, c) : renderBasicsHub(main);
      else if (b === 'guide' && c) cleanup = renderGuide(main, c as Phase);
      else if (b === 'lesson' && c) cleanup = renderLesson(main, c);
      else if (b === 'practice' && c) {
        const l = lessonById(c);
        cleanup = l?.practice
          ? renderComputer(main, {
              practice: true,
              startFen: l.practice.fen,
              title: l.practice.label,
              intro: `${l.title}: play this position against the computer. Use Hint if you get stuck.`,
            })
          : renderLearnHub(main);
      } else cleanup = renderLearnHub(main);
      break;
    default:
      location.hash = '#/';
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('.nav a')) {
    const target = link.getAttribute('href')!.replace(/^#\/?/, '');
    link.classList.toggle('active', target === (a ?? ''));
  }
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}
