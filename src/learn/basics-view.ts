import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { h } from '../ui/dom';
import { completedLessons, markLessonDone } from '../ui/settings';
import { CHAPTERS, chapterById, type Chapter, type Diagram, type Drill } from './basics';
import { drillDests, drillDone, drillFen, drillMove, startDrill, type DrillState } from './drill';
import { lessonById } from './lessons';

type Cleanup = () => void;

const chapterDoneKey = (id: string) => `basics:${id}`;

function diagramBoard(d: Diagram) {
  const el = h('div', { class: 'mini-board' });
  const shapes: DrawShape[] = [
    ...(d.arrows ?? []).map(([a, b]) => ({ orig: a as Key, dest: b as Key, brush: 'green' })),
    ...(d.marks ?? []).map((m) => ({ orig: m as Key, brush: 'green' })),
  ];
  requestAnimationFrame(() => {
    const cg = Chessground(el, { fen: d.fen, viewOnly: true, coordinates: false, drawable: { enabled: false } });
    cg.setAutoShapes(shapes);
  });
  return h('figure', { class: 'diagram' }, el, h('figcaption', {}, d.caption));
}

/* ------------------------------------------------------------------ */
/* Course overview                                                      */
/* ------------------------------------------------------------------ */

export function renderBasicsHub(container: HTMLElement): Cleanup {
  const done = completedLessons();
  const firstUndone = CHAPTERS.find((c) => !done.has(chapterDoneKey(c.id))) ?? CHAPTERS[0];
  container.replaceChildren(
    h(
      'div',
      { class: 'page narrow' },
      h('a', { class: 'back', href: '#/learn' }, '← Learn'),
      h('h1', {}, 'First steps'),
      h(
        'p',
        { class: 'lead' },
        'Never played chess before? Start here. In about an hour you will learn how every piece moves, the special rules, and how to win — with a little practice on the board after each part.',
      ),
      h('a', { class: 'btn primary', href: `#/learn/basics/${firstUndone.id}` }, done.size ? 'Continue' : 'Start the course'),
      h(
        'ol',
        { class: 'chapter-list' },
        ...CHAPTERS.map((c) =>
          h(
            'li',
            {},
            h(
              'a',
              { href: `#/learn/basics/${c.id}` },
              h('span', { class: 'chapter-icon', 'aria-hidden': 'true' }, c.icon),
              h('span', { class: 'lesson-name' }, c.title, h('small', {}, c.summary)),
              h('span', { class: 'tick', 'aria-label': done.has(chapterDoneKey(c.id)) ? 'done' : 'not done' }, done.has(chapterDoneKey(c.id)) ? '✓' : ''),
            ),
          ),
        ),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'After the course'),
        h(
          'p',
          {},
          'Play a few games against the computer on Beginner, with the coach switched on — it explains every move. Then try the Beginner lessons in the opening, middlegame and endgame.',
        ),
        h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/computer' }, 'Play the computer'), h('a', { class: 'btn', href: '#/learn' }, 'Beginner lessons')),
      ),
    ),
  );
  return () => {};
}

/* ------------------------------------------------------------------ */
/* One chapter                                                          */
/* ------------------------------------------------------------------ */

export function renderBasicsChapter(container: HTMLElement, id: string): Cleanup {
  const chapter = chapterById(id);
  if (!chapter) {
    location.hash = '#/learn/basics';
    return () => {};
  }
  const idx = CHAPTERS.indexOf(chapter);
  const next = CHAPTERS[idx + 1];
  const cleanups: Cleanup[] = [];
  const doneLessons = completedLessons();

  const practice: Node[] = [];
  if (chapter.squareQuiz) {
    const q = squareQuiz();
    cleanups.push(q.cleanup);
    practice.push(h('section', { class: 'card' }, h('h2', {}, 'Practice: find the square'), q.el));
  }
  if (chapter.drills?.length) {
    const d = drillRunner(chapter);
    cleanups.push(d.cleanup);
    practice.push(h('section', { class: 'card' }, h('h2', {}, 'Practice'), d.el));
  }
  if (chapter.puzzles?.length) {
    practice.push(
      h(
        'section',
        { class: 'card' },
        h('h2', {}, 'Try it on the board'),
        h('p', { class: 'muted' }, 'Each puzzle explains a rule, then asks you to make the move.'),
        h(
          'ul',
          { class: 'lesson-list' },
          ...chapter.puzzles.map((pid) => {
            const l = lessonById(pid)!;
            return h(
              'li',
              {},
              h(
                'a',
                { href: `#/learn/lesson/${pid}` },
                h('span', { class: 'tick' }, doneLessons.has(pid) ? '✓' : ''),
                h('span', { class: 'lesson-name' }, l.title, h('small', {}, l.summary)),
              ),
            );
          }),
        ),
      ),
    );
  }

  const finish = h(
    'div',
    { class: 'chapter-nav' },
    h(
      'button',
      {
        class: 'btn primary',
        onclick: () => {
          markLessonDone(chapterDoneKey(chapter.id));
          location.hash = next ? `#/learn/basics/${next.id}` : '#/learn/basics';
        },
      },
      next ? `Done — next: ${next.title}` : 'Done — finish the course',
    ),
    h('a', { class: 'btn', href: '#/learn/basics' }, 'All chapters'),
  );

  container.replaceChildren(
    h(
      'div',
      { class: 'page narrow basics' },
      h('a', { class: 'back', href: '#/learn/basics' }, '← First steps'),
      h('p', { class: 'muted small' }, `Chapter ${idx + 1} of ${CHAPTERS.length}`),
      h('h1', {}, h('span', { class: 'chapter-icon', 'aria-hidden': 'true' }, chapter.icon), ' ', chapter.title),
      ...chapter.text.map((t) => h('p', {}, t)),
      ...(chapter.diagrams ?? []).map(diagramBoard),
      h('div', { class: 'key-points' }, h('h2', {}, 'Remember'), h('ul', {}, ...chapter.keyPoints.map((k) => h('li', {}, k)))),
      ...practice,
      finish,
    ),
  );
  return () => cleanups.forEach((c) => c());
}

/* ------------------------------------------------------------------ */
/* Piece drills: capture all the pawns                                  */
/* ------------------------------------------------------------------ */

function drillRunner(chapter: Chapter) {
  const drills = chapter.drills!;
  let i = 0;
  let state: DrillState;
  const boardEl = h('div', { class: 'board' });
  const wrap = h('div', { class: 'board-wrap drill-board' }, boardEl);
  const task = h('p', { class: 'task' });
  const status = h('p', { class: 'drill-status', 'aria-live': 'polite' });
  const buttons = h('div', { class: 'actions' });
  let cg: Api | null = null;

  const draw = () => {
    const done = drillDone(state);
    cg!.set({
      fen: drillFen(state),
      turnColor: 'white',
      lastMove: undefined,
      movable: { color: done ? undefined : 'white', dests: done ? new Map() : new Map([[state.at as Key, drillDests(state) as Key[]]]) },
    });
    cg!.setAutoShapes([...state.goals].map((g) => ({ orig: g as Key, brush: 'green' })));
  };

  const load = () => {
    const d: Drill = drills[i];
    state = startDrill(d);
    task.textContent = `Exercise ${i + 1} of ${drills.length}: ${d.task}`;
    status.textContent = `Moves: 0 · Can you do it in ${d.best}?`;
    status.className = 'drill-status';
    buttons.replaceChildren(h('button', { class: 'btn', onclick: load }, 'Start again'));
    draw();
    // The instruction text above the board can change height and shift the board;
    // re-measure it so taps land on the right squares.
    requestAnimationFrame(() => cg?.redrawAll());
  };

  const onMove = (_orig: Key, dest: Key) => {
    const note = drillMove(state, dest);
    const d = drills[i];
    if (drillDone(state)) {
      const perfect = state.moves <= d.best;
      status.className = 'drill-status good';
      status.textContent = perfect
        ? `${note ?? ''} Done in ${state.moves} moves — perfect!`.trim()
        : `${note ?? ''} Done in ${state.moves} moves. It can be done in ${d.best} — try again to beat it, or carry on.`.trim();
      buttons.replaceChildren(
        h('button', { class: 'btn', onclick: load }, 'Try again'),
        i < drills.length - 1
          ? h('button', { class: 'btn primary', onclick: () => { i++; load(); } }, 'Next exercise')
          : h('span', { class: 'muted' }, 'All exercises done — scroll down to continue.'),
      );
    } else {
      status.className = 'drill-status';
      status.textContent = `${note ? note + ' ' : ''}Moves: ${state.moves} · ${state.targets.size} pawn${state.targets.size === 1 ? '' : 's'} left${state.goals.size ? ` · reach the green circle` : ''}`;
    }
    draw();
  };

  requestAnimationFrame(() => {
    cg = Chessground(boardEl, {
      coordinates: true,
      animation: { enabled: true, duration: 180 },
      movable: { free: false, showDests: true, events: { after: onMove } },
      premovable: { enabled: false },
      drawable: { enabled: false },
      highlight: { lastMove: false, check: false },
    });
    load();
  });

  return {
    el: h('div', { class: 'drill' }, task, wrap, status, buttons),
    cleanup: () => cg?.destroy(),
  };
}

/* ------------------------------------------------------------------ */
/* Square quiz: tap the named square                                    */
/* ------------------------------------------------------------------ */

function squareQuiz() {
  const ROUNDS = 6;
  const boardEl = h('div', { class: 'board' });
  const wrap = h('div', { class: 'board-wrap drill-board' }, boardEl);
  const prompt = h('p', { class: 'task' });
  const status = h('p', { class: 'drill-status', 'aria-live': 'polite' });
  const again = h('button', { class: 'btn', hidden: true }, 'Play again');
  let cg: Api | null = null;
  let target = '';
  let round = 0;
  let right = 0;

  const pick = () => {
    const files = 'abcdefgh';
    let s: string;
    do s = files[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
    while (s === target);
    target = s;
    prompt.innerHTML = `Round ${round + 1} of ${ROUNDS}: tap the square <strong class="square-name">${target}</strong>`;
    requestAnimationFrame(() => cg?.redrawAll());
  };
  const restart = () => {
    round = 0;
    right = 0;
    again.hidden = true;
    status.textContent = 'Letters along the bottom are columns, numbers up the side are rows.';
    status.className = 'drill-status';
    cg?.setAutoShapes([]);
    pick();
  };
  again.addEventListener('click', restart);

  const onTap = (e: PointerEvent) => {
    if (!cg || round >= ROUNDS) return;
    const key = cg.getKeyAtDomPos([e.clientX, e.clientY]);
    if (!key) return;
    const ok = key === target;
    if (ok) right++;
    cg.setAutoShapes([{ orig: target as Key, brush: 'green' }, ...(ok ? [] : [{ orig: key as Key, brush: 'red' }])]);
    status.className = `drill-status ${ok ? 'good' : 'bad'}`;
    status.textContent = ok ? `Yes — that's ${target}!` : `That was ${key}. ${target} is circled in green: column ${target[0]}, row ${target[1]}.`;
    round++;
    if (round >= ROUNDS) {
      prompt.textContent = `You found ${right} of ${ROUNDS} squares.`;
      again.hidden = false;
    } else pick();
  };

  requestAnimationFrame(() => {
    cg = Chessground(boardEl, {
      fen: '8/8/8/8/8/8/8/8',
      coordinates: true,
      movable: { color: undefined },
      draggable: { enabled: false },
      drawable: { enabled: false },
    });
    boardEl.addEventListener('pointerdown', onTap);
    restart();
  });

  return {
    el: h('div', { class: 'drill' }, prompt, wrap, status, again),
    cleanup: () => {
      boardEl.removeEventListener('pointerdown', onTap);
      cg?.destroy();
    },
  };
}
