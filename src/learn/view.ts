import { Chess, type Move } from 'chess.js';
import { Chessground } from 'chessground';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { Board, toSide } from '../game/board';
import { explainMove, uciToMove, PIECE_NAME } from '../game/coach';
import { getEngine } from '../engine/stockfish';
import { h } from '../ui/dom';
import { completedLessons, getSettings, markLessonDone, saveSettings } from '../ui/settings';
import { GUIDES } from './guides';
import { LESSONS, lessonById, lessonsFor, type Lesson, type Phase, type Tier } from './lessons';
import { CHAPTERS } from './basics';

type Cleanup = () => void;

const TIERS: Tier[] = ['beginner', 'intermediate', 'advanced'];
const TIER_LABEL: Record<Tier, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const PHASES: Phase[] = ['opening', 'middlegame', 'endgame'];

function tierBadge(t: Tier) {
  return h('span', { class: `badge ${t}` }, TIER_LABEL[t]);
}

function levelPicker(onChange: (t: Tier) => void) {
  const current = getSettings().level;
  return h(
    'div',
    { class: 'seg', role: 'radiogroup', 'aria-label': 'Your level' },
    ...TIERS.map((t) =>
      h(
        'label',
        {},
        h('input', {
          type: 'radio',
          name: 'mylevel',
          value: t,
          checked: t === current,
          onchange: () => {
            saveSettings({ level: t });
            onChange(t);
          },
        }),
        h('span', {}, TIER_LABEL[t]),
      ),
    ),
  );
}

function miniBoard(fen: string, arrows: [string, string][] = [], orientation: 'white' | 'black' = 'white') {
  const el = h('div', { class: 'mini-board' });
  const shapes: DrawShape[] = arrows.map(([a, b]) => ({ orig: a as Key, dest: b as Key, brush: 'green' }));
  requestAnimationFrame(() => {
    const cg = Chessground(el, { fen, viewOnly: true, coordinates: false, orientation, drawable: { enabled: false } });
    cg.setAutoShapes(shapes);
  });
  return el;
}

/* ------------------------------------------------------------------ */
/* Hub                                                                 */
/* ------------------------------------------------------------------ */

export function renderLearnHub(container: HTMLElement): Cleanup {
  const done = completedLessons();
  const draw = () => {
    const level = getSettings().level;
    container.replaceChildren(
      h(
        'div',
        { class: 'page' },
        h('h1', {}, 'Learn'),
        h(
          'p',
          { class: 'lead' },
          'A game of chess has three phases. Read the guide for each phase, then try the lessons: each one asks you to find a move and explains the strategy behind it.',
        ),
        h(
          'a',
          { class: 'card first-steps', href: '#/learn/basics' },
          h('span', { class: 'tile-icon', 'aria-hidden': 'true' }, '♙'),
          h(
            'span',
            {},
            h('strong', {}, 'New to chess? Start with First steps'),
            h('span', { class: 'muted' }, 'The board, how every piece moves, check, checkmate and the special rules — with practice on the board.'),
          ),
        ),
        h('div', { class: 'level-row' }, h('span', {}, 'My level:'), levelPicker(() => draw())),
        h(
          'div',
          { class: 'phase-grid' },
          ...PHASES.map((p) => {
            const g = GUIDES[p];
            const lessons = lessonsFor(p);
            const doneCount = lessons.filter((l) => done.has(l.id)).length;
            return h(
              'section',
              { class: 'card phase-card' },
              h('h2', {}, g.title),
              h('p', { class: 'muted' }, g.tagline),
              h('a', { class: 'btn', href: `#/learn/guide/${p}` }, `Read the ${p} guide`),
              h('h3', {}, `Lessons · ${doneCount}/${lessons.length} done`),
              h(
                'ul',
                { class: 'lesson-list' },
                ...lessons
                  .slice()
                  .sort((a, b) => Number(b.tier === level) - Number(a.tier === level) || TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
                  .map((l) =>
                    h(
                      'li',
                      { class: l.tier === level ? 'mine' : '' },
                      h(
                        'a',
                        { href: `#/learn/lesson/${l.id}` },
                        h('span', { class: 'tick', 'aria-label': done.has(l.id) ? 'done' : 'not done' }, done.has(l.id) ? '✓' : ''),
                        h('span', { class: 'lesson-name' }, l.title, h('small', {}, l.summary)),
                        tierBadge(l.tier),
                      ),
                    ),
                  ),
              ),
            );
          }),
        ),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'Practise against the computer'),
          h(
            'p',
            {},
            'Play a full game with the coach switched on. After each of your moves it tells you whether it was good, and if not, what your opponent can now do and which move was better — and why. Use the Hint button for three levels of help.',
          ),
          h('a', { class: 'btn primary', href: '#/computer' }, 'Play with the coach'),
        ),
      ),
    );
  };
  draw();
  return () => {};
}

/* ------------------------------------------------------------------ */
/* Phase guide                                                          */
/* ------------------------------------------------------------------ */

export function renderGuide(container: HTMLElement, phase: Phase): Cleanup {
  const g = GUIDES[phase];
  if (!g) {
    location.hash = '#/learn';
    return () => {};
  }
  let tier = getSettings().level;
  const body = h('div', { class: 'principles' });
  const tabs = h('div', { class: 'tabs', role: 'tablist' });

  const drawTabs = () => {
    tabs.replaceChildren(
      ...TIERS.map((t) =>
        h(
          'button',
          {
            class: `tab ${t === tier ? 'active' : ''}`,
            role: 'tab',
            'aria-selected': t === tier ? 'true' : 'false',
            onclick: () => {
              tier = t;
              drawTabs();
              drawBody();
            },
          },
          TIER_LABEL[t],
        ),
      ),
    );
  };
  const drawBody = () => {
    body.replaceChildren(
      ...g.levels[tier].map((p, i) =>
        h(
          'article',
          { class: 'principle card' },
          h('h3', {}, `${i + 1}. ${p.title}`),
          h('p', {}, h('strong', {}, 'What: '), p.what),
          h('p', {}, h('strong', {}, 'Why: '), p.why),
          p.example
            ? h('figure', {}, miniBoard(p.example.fen, p.example.arrows, p.example.orientation), h('figcaption', {}, p.example.caption))
            : null,
        ),
      ),
      h(
        'div',
        { class: 'card' },
        h('h3', {}, `${TIER_LABEL[tier]} lessons for the ${phase}`),
        h(
          'ul',
          { class: 'lesson-list' },
          ...lessonsFor(phase, tier).map((l) =>
            h('li', {}, h('a', { href: `#/learn/lesson/${l.id}` }, h('span', { class: 'lesson-name' }, l.title, h('small', {}, l.summary)))),
          ),
        ),
        lessonsFor(phase, tier).length ? null : h('p', { class: 'muted' }, 'More lessons for this level are coming.'),
      ),
    );
  };
  drawTabs();
  drawBody();

  container.replaceChildren(
    h(
      'div',
      { class: 'page' },
      h('a', { class: 'back', href: '#/learn' }, '← Learn'),
      h('h1', {}, g.title),
      h('p', { class: 'lead' }, g.overview),
      h('p', { class: 'when' }, h('strong', {}, 'When: '), g.when),
      tabs,
      body,
      h(
        'section',
        { class: 'card reading' },
        h('h3', {}, 'Sources and further reading'),
        h('ul', {}, ...g.furtherReading.map((r) => h('li', {}, r))),
      ),
    ),
  );
  return () => {};
}

/* ------------------------------------------------------------------ */
/* Interactive lesson                                                   */
/* ------------------------------------------------------------------ */

export function renderLesson(container: HTMLElement, id: string): Cleanup {
  const lesson = lessonById(id);
  if (!lesson) {
    location.hash = '#/learn';
    return () => {};
  }
  const start = new Chess(lesson.fen);
  const studentSide = toSide(start.turn());
  let stepIdx = 0;
  let hintStep = 0;
  let finished = false;
  let alive = true;
  const engine = getEngine();

  const boardEl = h('div', { class: 'board' });
  const feedback = h('div', { class: 'coach', hidden: true, 'aria-live': 'polite' });
  const progress = h('div', { class: 'step-progress' });
  const hintBtn = h('button', { class: 'btn primary' }, 'Hint') as HTMLButtonElement;
  const endBox = h('div', { class: 'end-box', hidden: true });

  // Rules puzzles from the First steps course link back to their chapter.
  const basicsChapter = lesson.phase === 'basics' ? CHAPTERS.find((c) => c.puzzles?.includes(lesson.id)) : undefined;
  const backHref = basicsChapter ? `#/learn/basics/${basicsChapter.id}` : `#/learn/guide/${lesson.phase}`;
  const backLabel = basicsChapter ? basicsChapter.title : GUIDES[lesson.phase as Phase].title;

  container.replaceChildren(
    h(
      'div',
      { class: 'play' },
      h('div', { class: 'board-col' }, h('div', { class: 'board-wrap' }, boardEl)),
      h(
        'aside',
        { class: 'panel' },
        h('a', { class: 'back', href: backHref }, `← ${backLabel}`),
        h('h1', { class: 'panel-title' }, lesson.title),
        h('div', { class: 'badges' }, basicsChapter ? h('span', { class: 'badge beginner' }, 'First steps') : tierBadge(lesson.tier), basicsChapter ? null : h('span', { class: 'badge' }, GUIDES[lesson.phase as Phase].title.replace('The ', ''))),
        h('p', { class: 'intro' }, lesson.intro),
        progress,
        h(
          'div',
          { class: 'actions' },
          hintBtn,
          h('button', { class: 'btn', onclick: () => restart() }, 'Start again'),
        ),
        feedback,
        endBox,
        h('p', { class: 'source small muted' }, 'Source: ', lesson.source),
      ),
    ),
  );

  const board = new Board(boardEl, {
    fen: lesson.fen,
    orientation: studentSide,
    control: studentSide,
    validate: (m) => check(m),
  });

  function say(html: string, kind: 'info' | 'good' | 'warn' | 'bad' = 'info') {
    feedback.hidden = false;
    feedback.className = `coach ${kind}`;
    feedback.innerHTML = html;
  }
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

  function drawProgress() {
    const n = lesson!.steps.length;
    progress.textContent = finished ? 'Lesson complete' : n > 1 ? `Move ${stepIdx + 1} of ${n} — ${studentSide === 'white' ? 'White' : 'Black'} to play` : `${studentSide === 'white' ? 'White' : 'Black'} to play`;
    hintBtn.disabled = finished;
    hintBtn.textContent = hintStep === 0 ? 'Hint' : hintStep < 3 ? `Another hint (${hintStep}/3)` : 'Show answer again';
  }

  function accepted(m: Move): boolean {
    const step = lesson!.steps[stepIdx];
    return step.accept.includes(m.san) || (step.accept.includes('#') && m.san.endsWith('#'));
  }

  function answerMove(): Move | null {
    const step = lesson!.steps[stepIdx];
    const c = new Chess(board.chess.fen());
    for (const a of step.accept) {
      if (a === '#') {
        const mate = c.moves({ verbose: true }).find((m) => m.san.endsWith('#'));
        if (mate) return mate;
      } else {
        try {
          return new Chess(board.chess.fen()).move(a);
        } catch {
          /* next */
        }
      }
    }
    return null;
  }

  /** Called before a student's move is applied. Returns true to let it through. */
  function check(m: Move): boolean {
    if (finished) return false;
    const step = lesson!.steps[stepIdx];
    if (accepted(m)) {
      window.setTimeout(() => onCorrect(m), 0);
      return true;
    }
    board.clearShapes();
    const special = step.wrong?.[m.san] ?? step.notIt?.[m.san];
    if (special) {
      say(`<strong>${esc(m.san)}?</strong> ${esc(special)} Try again.`, step.notIt?.[m.san] ? 'warn' : 'bad');
      return false;
    }
    if (lesson!.rulesOnly) {
      // Rules puzzles: any other legal move is fine chess-wise, it just isn't the rule being taught.
      say(`<strong>${esc(m.san)}</strong> is a legal move. ${esc(lesson!.otherGood ?? step.hints[0])} Try again.`, 'warn');
      return false;
    }
    say(`<strong>${esc(m.san)}</strong> — let me check that…`, 'info');
    void judge(m);
    return false;
  }

  /** For moves the lesson didn't anticipate, ask the engine whether it's sound. */
  async function judge(m: Move) {
    const fen = m.before;
    const [before, after] = await Promise.all([
      engine.analyse(fen, { depth: 10 }),
      engine.analyse(m.after, { depth: 10 }),
    ]);
    if (!alive || board.chess.fen() !== fen) return;
    const pawns = (a: typeof before) => (a.mate !== undefined ? (a.mate > 0 ? 100 : -100) : (a.cp ?? 0) / 100);
    const loss = pawns(before) + pawns(after);
    const keepsWin = pawns(before) > 3 && -pawns(after) > 3;
    if (loss < 0.4 || keepsWin) {
      say(`<strong>${esc(m.san)}</strong> is a sound move. ${esc(lesson!.otherGood ?? "But it isn't the idea this lesson is about.")} Try again.`, 'warn');
      return;
    }
    const reply = uciToMove(m.after, after.bestmove);
    let why = '';
    if (after.mate !== undefined && after.mate > 0) why = `Your opponent could then force checkmate${reply ? `, starting with ${reply.san}` : ''}.`;
    else if (reply?.captured) why = `Your opponent could answer ${reply.san}, winning your ${PIECE_NAME[reply.captured]}.`;
    else if (reply) {
      const ex = explainMove(m.after, after.bestmove, getSettings().level);
      if (ex && !ex.themes.includes('improvement')) why = `Your opponent could answer ${reply.san}: ${ex.full}`;
    }
    if (!why) why = lesson!.steps[stepIdx].hints[0];
    say(`<strong>Not quite: ${esc(m.san)}.</strong> ${esc(why)} Try again.`, 'bad');
    if (reply) board.setShapes([{ orig: reply.from as Key, dest: reply.to as Key, brush: 'red' }]);
  }

  function onCorrect(m: Move) {
    const step = lesson!.steps[stepIdx];
    board.clearShapes();
    say(`<strong>${esc(m.san)} — correct!</strong> ${esc(step.explain)}`, 'good');
    hintStep = 0;
    const last = stepIdx === lesson!.steps.length - 1;
    if (last || !step.reply) return complete();
    board.setControl('none');
    drawProgress();
    window.setTimeout(() => {
      if (!alive) return;
      const r = board.play(step.reply!);
      stepIdx++;
      board.setControl(studentSide);
      if (r) {
        const note = step.replyNote ? ` ${esc(step.replyNote)}` : '';
        feedback.innerHTML += `<p class="reply">Your opponent replies <strong>${esc(r.san)}</strong>.${note} Your move.</p>`;
      }
      drawProgress();
    }, 900);
  }

  function complete() {
    finished = true;
    board.setControl('none');
    markLessonDone(lesson!.id);
    const idx = LESSONS.findIndex((l) => l.id === lesson!.id);
    const next = nextLesson(lesson!, idx);
    endBox.hidden = false;
    endBox.replaceChildren(
      h('h2', {}, 'Lesson complete'),
      h(
        'div',
        { class: 'actions' },
        lesson!.practice
          ? h('a', { class: 'btn primary', href: `#/learn/practice/${lesson!.id}` }, lesson!.practice.label)
          : null,
        next ? h('a', { class: lesson!.practice ? 'btn' : 'btn primary', href: `#/learn/lesson/${next.id}` }, `Next: ${next.title}`) : null,
        basicsChapter
          ? h('a', { class: 'btn', href: backHref }, `Back to: ${basicsChapter.title}`)
          : h('a', { class: 'btn', href: '#/learn' }, 'All lessons'),
      ),
    );
    drawProgress();
  }

  function hint() {
    if (finished) return;
    const step = lesson!.steps[stepIdx];
    hintStep = Math.min(3, hintStep + 1);
    say(`<strong>Hint ${hintStep}:</strong> ${esc(step.hints[hintStep - 1])}`, 'info');
    if (hintStep === 2) {
      board.setShapes((step.focus ?? []).map((s) => ({ orig: s as Key, brush: 'yellow' })));
    } else if (hintStep === 3) {
      const ans = answerMove();
      if (ans) board.setShapes([{ orig: ans.from as Key, dest: ans.to as Key, brush: 'green' }]);
    } else board.clearShapes();
    drawProgress();
  }
  hintBtn.addEventListener('click', hint);

  function restart() {
    stepIdx = 0;
    hintStep = 0;
    finished = false;
    endBox.hidden = true;
    board.load(lesson!.fen);
    board.setControl(studentSide);
    board.clearShapes();
    feedback.hidden = true;
    drawProgress();
  }

  drawProgress();
  return () => {
    alive = false;
    board.destroy();
  };
}

function nextLesson(current: Lesson, idx: number): Lesson | undefined {
  if (current.phase === 'basics') {
    const ch = CHAPTERS.find((c) => c.puzzles?.includes(current.id));
    const list = ch?.puzzles ?? [];
    const nextId = list[list.indexOf(current.id) + 1];
    return nextId ? lessonById(nextId) : undefined;
  }
  // Prefer the next lesson in the same phase, then the next in the list.
  return LESSONS.slice(idx + 1).find((l) => l.phase === current.phase) ?? LESSONS[idx + 1];
}
