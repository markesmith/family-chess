import { Chess, type Move } from 'chess.js';
import type { Key } from 'chessground/types';
import { Board, gameResult, toSide, uciOf, type Side } from './board';
import { explainMove, reviewMove, type Level } from './coach';
import { getEngine, LEVELS, type Analysis } from '../engine/stockfish';
import { OnlineSession, newCode, shareLink, type Msg } from '../net/online';
import { dialog, h, storageDel, storageGet, storageSet, toast } from '../ui/dom';
import { getSettings } from '../ui/settings';

type Cleanup = () => void;

interface Layout {
  root: HTMLElement;
  boardEl: HTMLElement;
  topLabel: HTMLElement;
  bottomLabel: HTMLElement;
  status: HTMLElement;
  coach: HTMLElement;
  moves: HTMLElement;
  actions: HTMLElement;
  extra: HTMLElement;
}

function layout(container: HTMLElement, title: string): Layout {
  const boardEl = h('div', { class: 'board' });
  const topLabel = h('div', { class: 'player-label' });
  const bottomLabel = h('div', { class: 'player-label' });
  const status = h('div', { class: 'status', role: 'status', 'aria-live': 'polite' });
  const coach = h('div', { class: 'coach', hidden: true, 'aria-live': 'polite' });
  const moves = h('ol', { class: 'moves', 'aria-label': 'Moves played' });
  const actions = h('div', { class: 'actions' });
  const extra = h('div', { class: 'extra' });
  const root = h(
    'div',
    { class: 'play' },
    h('div', { class: 'board-col' }, topLabel, h('div', { class: 'board-wrap' }, boardEl), bottomLabel),
    h('aside', { class: 'panel' }, h('h1', { class: 'panel-title' }, title), status, actions, coach, extra, moves),
  );
  container.replaceChildren(root);
  return { root, boardEl, topLabel, bottomLabel, status, coach, moves, actions, extra };
}

function renderMoves(el: HTMLElement, chess: Chess) {
  const hist = chess.history();
  el.replaceChildren();
  const startBlack = chess.history({ verbose: true })[0]?.color === 'b';
  const list = startBlack ? ['…', ...hist] : hist;
  for (let i = 0; i < list.length; i += 2) {
    el.append(h('li', {}, h('span', { class: 'mv' }, list[i]), h('span', { class: 'mv' }, list[i + 1] ?? '')));
  }
  el.scrollTop = el.scrollHeight;
}

function labels(l: Layout, board: Board, names: Record<Side, string>) {
  const bottom = board.orientation;
  const top: Side = bottom === 'white' ? 'black' : 'white';
  const turn = board.turn;
  l.bottomLabel.replaceChildren(h('span', { class: `dot ${bottom}` }), names[bottom]);
  l.topLabel.replaceChildren(h('span', { class: `dot ${top}` }), names[top]);
  l.bottomLabel.classList.toggle('to-move', turn === bottom && !board.chess.isGameOver());
  l.topLabel.classList.toggle('to-move', turn === top && !board.chess.isGameOver());
}

function btn(label: string, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  return h('button', { class: cls, onclick: onClick }, label);
}

function showCoach(l: Layout, html: string, kind: 'info' | 'good' | 'warn' | 'bad' = 'info') {
  l.coach.hidden = false;
  l.coach.className = `coach ${kind}`;
  l.coach.innerHTML = html;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/* ------------------------------------------------------------------ */
/* Pass-and-play on one device                                         */
/* ------------------------------------------------------------------ */

const LOCAL_KEY = 'fc.local.v1';

export function renderLocal(container: HTMLElement): Cleanup {
  const l = layout(container, 'Two players, one device');
  const saved = storageGet<{ moves: string[]; autoFlip: boolean }>(LOCAL_KEY, { moves: [], autoFlip: false });
  let autoFlip = saved.autoFlip;
  const names: Record<Side, string> = { white: 'White', black: 'Black' };

  const board = new Board(l.boardEl, { control: 'both', onUserMove: () => after() });
  board.loadMoves(undefined, saved.moves);
  if (autoFlip) board.setOrientation(board.turn);

  function save() {
    storageSet(LOCAL_KEY, { moves: board.chess.history(), autoFlip });
  }

  function after() {
    save();
    if (autoFlip && !board.chess.isGameOver()) window.setTimeout(() => board.setOrientation(board.turn), 350);
    refresh();
  }

  function refresh() {
    const res = gameResult(board.chess);
    l.status.textContent = res ?? `${board.turn === 'white' ? 'White' : 'Black'} to move${board.chess.inCheck() ? ' — check!' : ''}`;
    renderMoves(l.moves, board.chess);
    window.setTimeout(() => labels(l, board, names), 0);
  }

  const flipToggle = h('input', { type: 'checkbox', checked: autoFlip }) as HTMLInputElement;
  flipToggle.addEventListener('change', () => {
    autoFlip = flipToggle.checked;
    if (autoFlip) board.setOrientation(board.turn);
    save();
    refresh();
  });

  l.actions.append(
    btn('New game', async () => {
      if (board.chess.history().length && (await dialog('New game?', 'Start a new game? The current game will be lost.', [
        { label: 'Cancel', value: 'no' },
        { label: 'New game', value: 'yes', primary: true },
      ])) !== 'yes') return;
      board.loadMoves(undefined, []);
      board.setOrientation('white');
      after();
    }),
    btn('Undo', () => {
      board.undo();
      after();
    }),
    btn('Flip board', () => {
      board.flip();
      refresh();
    }),
  );
  l.extra.append(h('label', { class: 'toggle' }, flipToggle, ' Turn the board for each player'));
  refresh();
  return () => board.destroy();
}

/* ------------------------------------------------------------------ */
/* Against the computer, with the coach                                */
/* ------------------------------------------------------------------ */

const CPU_KEY = 'fc.cpu.v1';

interface CpuSaved {
  moves: string[];
  level: string;
  player: Side;
  startFen?: string;
  coach: boolean;
  title?: string;
}

export interface CpuStart {
  startFen?: string;
  player?: Side;
  title?: string;
  /** Practice games from lessons don't overwrite the main saved game. */
  practice?: boolean;
  intro?: string;
}

export function renderComputer(container: HTMLElement, start?: CpuStart): Cleanup {
  const settings = getSettings();
  const coachLevel: Level = settings.level;
  const saveKey = start?.practice ? `${CPU_KEY}.practice` : CPU_KEY;
  let state: CpuSaved = start?.practice
    ? { moves: [], level: settings.opponent, player: start.player ?? 'white', startFen: start.startFen, coach: true, title: start.title }
    : storageGet<CpuSaved>(CPU_KEY, { moves: [], level: settings.opponent, player: 'white', coach: true });

  const l = layout(container, start?.title ?? 'Play the computer');
  const engine = getEngine();
  let gen = 0; // bumps on undo/new game so stale engine replies are ignored
  let thinking = false;
  let hintStep = 0;
  let analysisCache = new Map<string, Promise<Analysis>>();

  const board = new Board(l.boardEl, {
    control: state.player,
    orientation: state.player,
    onUserMove: (m) => void onPlayerMove(m),
  });

  const analyse = (fen: string) => {
    let p = analysisCache.get(fen);
    if (!p) {
      p = engine.analyse(fen, { depth: 11 });
      analysisCache.set(fen, p);
    }
    return p;
  };

  function names(): Record<Side, string> {
    const cpu = `Computer (${LEVELS[state.level]?.label ?? state.level})`;
    return state.player === 'white' ? { white: 'You', black: cpu } : { white: cpu, black: 'You' };
  }

  function save() {
    storageSet(saveKey, { ...state, moves: board.chess.history() });
  }

  function refresh() {
    const res = gameResult(board.chess);
    if (res) l.status.textContent = res;
    else if (thinking) l.status.textContent = 'Computer is thinking…';
    else l.status.textContent = `Your move${board.chess.inCheck() ? ' — you are in check!' : ''}`;
    hintBtn.textContent = hintStep === 0 ? 'Hint' : hintStep < 3 ? `Another hint (${hintStep}/3)` : 'Hint (3/3)';
    hintBtn.disabled = !!res || thinking || board.turn !== state.player;
    renderMoves(l.moves, board.chess);
    labels(l, board, names());
  }

  async function onPlayerMove(m: Move) {
    const myGen = gen;
    hintStep = 0;
    board.clearShapes();
    save();
    thinking = true;
    board.setControl('none');
    refresh();

    const fenBefore = m.before;
    if (state.coach) {
      const [before, after] = await Promise.all([analyse(fenBefore), analyse(board.chess.fen())]);
      if (myGen !== gen) return;
      const r = reviewMove(fenBefore, m, before, after, coachLevel);
      const kind = r.grade === 'best' || r.grade === 'good' ? 'good' : r.grade === 'inaccuracy' ? 'warn' : 'bad';
      showCoach(l, `<strong>Coach:</strong> ${esc(r.text)}`, kind);
      if (r.better && kind !== 'good') {
        board.setShapes([{ orig: r.better.from as Key, dest: r.better.to as Key, brush: 'green' }]);
      }
    }
    await computerMove(myGen);
  }

  async function computerMove(myGen: number) {
    if (board.chess.isGameOver()) return finish();
    thinking = true;
    board.setControl('none');
    refresh();
    const fen = board.chess.fen();
    const lv = LEVELS[state.level] ?? LEVELS.beginner;
    let uci: string;
    const legal = board.chess.moves({ verbose: true });
    if (lv.strength.randomness && Math.random() < lv.strength.randomness) {
      await new Promise((r) => setTimeout(r, 400));
      const caps = legal.filter((x) => x.captured);
      // Even the easiest level usually takes a free piece if one is offered.
      const pool = caps.length && Math.random() < 0.6 ? caps : legal;
      uci = uciOf(pool[Math.floor(Math.random() * pool.length)]);
    } else {
      uci = await engine.chooseMove(fen, lv.strength);
    }
    if (myGen !== gen) return;
    const shapesBefore = board.cg.state.drawable.autoShapes;
    board.play(uci);
    board.setShapes(shapesBefore);
    thinking = false;
    board.setControl(state.player);
    save();
    refresh();
    if (board.chess.isGameOver()) return finish();
    if (state.coach) void analyse(board.chess.fen()); // warm up the hint
  }

  function finish() {
    thinking = false;
    board.setControl('none');
    refresh();
    const res = gameResult(board.chess);
    if (res) {
      const youWon = board.chess.isCheckmate() && board.turn !== state.player;
      showCoach(
        l,
        `<strong>${esc(res)}.</strong> ${youWon ? 'Well played! ' : ''}Try replaying the game in your head: where did the balance change?`,
        youWon ? 'good' : 'info',
      );
    }
  }

  async function hint() {
    if (board.turn !== state.player || thinking) return;
    const fen = board.chess.fen();
    hintBtn.disabled = true;
    l.status.textContent = 'Coach is thinking…';
    const a = await analyse(fen);
    if (fen !== board.chess.fen()) return;
    const ex = explainMove(fen, a.bestmove, coachLevel, a);
    hintStep = Math.min(3, hintStep + 1);
    if (!ex) return refresh();
    if (hintStep === 1) {
      showCoach(l, `<strong>Hint 1 — the idea:</strong> ${esc(ex.idea)}`);
      board.clearShapes();
    } else if (hintStep === 2) {
      showCoach(l, `<strong>Hint 2 — where to look:</strong> ${esc(ex.focus)}`);
      board.setShapes([{ orig: ex.move.from as Key, brush: 'yellow' }]);
    } else {
      showCoach(l, `<strong>Hint 3 — the move:</strong> ${esc(ex.full)}`);
      board.setShapes([{ orig: ex.move.from as Key, dest: ex.move.to as Key, brush: 'green' }]);
    }
    refresh();
  }

  function undo() {
    if (!board.chess.history().length) return;
    gen++;
    thinking = false;
    hintStep = 0;
    board.undo();
    if (board.turn !== state.player && board.chess.history().length) board.undo();
    board.clearShapes();
    l.coach.hidden = true;
    board.setControl(state.player);
    save();
    refresh();
    if (board.turn !== state.player) void computerMove(gen);
  }

  async function newGame() {
    const form = h('div', { class: 'form' });
    const levelSel = h(
      'div',
      { class: 'choice-list' },
      ...Object.entries(LEVELS).map(([k, v]) =>
        h(
          'label',
          { class: 'choice' },
          h('input', { type: 'radio', name: 'lvl', value: k, checked: k === state.level }),
          h('span', {}, h('strong', {}, v.label), h('small', {}, v.blurb)),
        ),
      ),
    );
    const colourSel = h(
      'div',
      { class: 'seg' },
      ...(['white', 'black', 'random'] as const).map((c) =>
        h(
          'label',
          {},
          h('input', { type: 'radio', name: 'col', value: c, checked: c === state.player }),
          h('span', {}, c === 'random' ? 'Random' : c === 'white' ? 'White' : 'Black'),
        ),
      ),
    );
    const coachBox = h('input', { type: 'checkbox', checked: state.coach }) as HTMLInputElement;
    form.append(
      h('h3', {}, 'Computer strength'),
      levelSel,
      h('h3', {}, 'Play as'),
      colourSel,
      h('label', { class: 'toggle' }, coachBox, ' Coach comments on each of my moves'),
    );
    const ok = await dialog('New game', form, [
      { label: 'Cancel', value: 'no' },
      { label: 'Start', value: 'yes', primary: true },
    ]);
    if (ok !== 'yes') return;
    const lvl = (form.querySelector('input[name=lvl]:checked') as HTMLInputElement)?.value ?? 'beginner';
    let col = (form.querySelector('input[name=col]:checked') as HTMLInputElement)?.value ?? 'white';
    if (col === 'random') col = Math.random() < 0.5 ? 'white' : 'black';
    gen++;
    state = { ...state, moves: [], level: lvl, player: col as Side, coach: coachBox.checked };
    restart();
  }

  function restart() {
    thinking = false;
    hintStep = 0;
    analysisCache = new Map();
    board.loadMoves(state.startFen, []);
    board.setOrientation(state.player);
    board.setControl(state.player);
    board.clearShapes();
    l.coach.hidden = true;
    save();
    refresh();
    if (board.turn !== state.player) void computerMove(gen);
    else if (state.coach) void analyse(board.chess.fen());
  }

  const hintBtn = btn('Hint', () => void hint(), 'btn primary');
  const coachToggle = h('input', { type: 'checkbox', checked: state.coach }) as HTMLInputElement;
  coachToggle.addEventListener('change', () => {
    state.coach = coachToggle.checked;
    if (!state.coach) l.coach.hidden = true;
    save();
  });

  l.actions.append(
    hintBtn,
    btn('Take back', undo),
    btn(start?.practice ? 'Restart' : 'New game', () => (start?.practice ? (gen++, restart()) : void newGame())),
    btn('Flip board', () => {
      board.flip();
      refresh();
    }),
  );
  l.extra.append(h('label', { class: 'toggle' }, coachToggle, ' Coach comments on my moves'));

  board.loadMoves(state.startFen, state.moves);
  if (start?.intro) showCoach(l, esc(start.intro));
  refresh();
  if (!board.chess.isGameOver() && board.turn !== state.player) void computerMove(gen);
  else if (state.coach) void analyse(board.chess.fen());

  if (!start?.practice && !storageGet<CpuSaved | null>(CPU_KEY, null)) void newGame();

  return () => {
    gen++;
    board.destroy();
  };
}

/* ------------------------------------------------------------------ */
/* Online: two devices                                                 */
/* ------------------------------------------------------------------ */

const ONLINE_KEY = 'fc.online.v1';

interface OnlineSaved {
  role: 'host' | 'guest';
  code: string;
  moves: string[];
  hostColor: Side;
  result?: string;
}

export function renderOnlineLobby(container: HTMLElement): Cleanup {
  const saved = storageGet<OnlineSaved | null>(ONLINE_KEY, null);
  const input = h('input', {
    class: 'code-input',
    inputmode: 'text',
    autocapitalize: 'characters',
    autocomplete: 'off',
    maxlength: 7,
    placeholder: 'ABC123',
    'aria-label': 'Game code',
  }) as HTMLInputElement;
  const join = () => {
    const code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return toast('Game codes are 6 letters or numbers.');
    location.hash = `#/online/join/${code}`;
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && join());
  container.replaceChildren(
    h(
      'div',
      { class: 'page narrow' },
      h('h1', {}, 'Play online'),
      h('p', { class: 'lead' }, 'Play on two phones, tablets or computers. One person starts a game and shares the code or link; the other joins.'),
      saved && !saved.result
        ? h(
            'div',
            { class: 'card' },
            h('h2', {}, 'Game in progress'),
            h('p', {}, `Code ${saved.code} · ${saved.moves.length} moves played`),
            h('a', { class: 'btn primary', href: `#/online/${saved.role}/${saved.code}` }, 'Resume game'),
          )
        : null,
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'Start a new game'),
        h('p', {}, 'You get a code to share. You play White; the board flips for the other player.'),
        btn('Start game', () => (location.hash = `#/online/host/${newCode()}`), 'btn primary'),
      ),
      h(
        'div',
        { class: 'card' },
        h('h2', {}, 'Join a game'),
        h('p', {}, 'Type the code from the other player, or simply open the link they sent you.'),
        h('div', { class: 'row' }, input, btn('Join', join, 'btn primary')),
      ),
      h(
        'p',
        { class: 'small muted' },
        'Moves travel directly between the two devices. Both need an internet connection. Some workplace or school networks block direct connections; mobile data or home Wi-Fi usually works.',
      ),
    ),
  );
  return () => {};
}

export function renderOnline(container: HTMLElement, role: 'host' | 'guest', code: string): Cleanup {
  const prev = storageGet<OnlineSaved | null>(ONLINE_KEY, null);
  let st: OnlineSaved =
    prev && prev.code === code && prev.role === role ? prev : { role, code, moves: [], hostColor: 'white' };

  const l = layout(container, 'Online game');
  const mySide = (): Side => (role === 'host' ? st.hostColor : st.hostColor === 'white' ? 'black' : 'white');
  const board = new Board(l.boardEl, {
    control: 'none',
    orientation: mySide(),
    onUserMove: (m) => {
      net.send({ t: 'move', uci: uciOf(m), ply: board.chess.history().length - 1 });
      after();
    },
  });
  board.loadMoves(undefined, st.moves);
  let connected = false;
  let statusDetail = '';

  const net = new OnlineSession(role, code);

  function save() {
    st.moves = board.chess.history();
    storageSet(ONLINE_KEY, st);
  }

  function after() {
    const res = gameResult(board.chess);
    if (res) st.result = res;
    save();
    refresh();
  }

  function refresh() {
    const me = mySide();
    board.setControl(connected && !st.result && board.turn === me ? me : 'none');
    let s: string;
    if (st.result) s = st.result;
    else if (!connected) s = statusDetail || (role === 'host' ? 'Waiting for the other player to join…' : 'Connecting…');
    else s = board.turn === me ? `Your move${board.chess.inCheck() ? ' — check!' : ''}` : "Opponent's move";
    l.status.textContent = s;
    renderMoves(l.moves, board.chess);
    labels(l, board, me === 'white' ? { white: 'You', black: 'Opponent' } : { white: 'Opponent', black: 'You' });
    shareBox.hidden = connected;
    resignBtn.disabled = !connected || !!st.result;
    newBtn.hidden = !st.result || role !== 'host';
  }

  function sendState() {
    net.send({ t: 'state', moves: board.chess.history(), hostColor: st.hostColor, result: st.result });
  }

  net.onGuestJoined = () => sendState();
  net.onStatus = (s, detail) => {
    connected = s === 'connected';
    statusDetail = detail ?? '';
    if (connected) toast('Connected!');
    refresh();
  };
  net.onMessage = async (m: Msg) => {
    switch (m.t) {
      case 'state':
        if (role === 'guest') {
          st.hostColor = m.hostColor;
          st.result = m.result;
          board.loadMoves(undefined, m.moves);
          board.setOrientation(mySide());
          after();
        }
        break;
      case 'sync-req':
        if (role === 'host') sendState();
        break;
      case 'move': {
        if (m.ply !== board.chess.history().length) {
          if (role === 'guest') net.send({ t: 'sync-req' });
          else sendState();
          break;
        }
        if (!board.play(m.uci)) {
          if (role === 'guest') net.send({ t: 'sync-req' });
          else sendState();
          break;
        }
        after();
        break;
      }
      case 'resign':
        st.result = `${m.side === 'white' ? 'White' : 'Black'} resigned — ${m.side === 'white' ? 'Black' : 'White'} wins`;
        after();
        break;
      case 'newgame':
        st = { ...st, moves: [], hostColor: m.hostColor, result: undefined };
        board.loadMoves(undefined, []);
        board.setOrientation(mySide());
        after();
        toast('New game started');
        break;
      case 'undo-req': {
        const ans = await dialog('Take back?', 'Your opponent asks to take back their last move.', [
          { label: 'No', value: 'no' },
          { label: 'Allow', value: 'yes', primary: true },
        ]);
        if (ans === 'yes') {
          board.undo();
          st.result = undefined;
          after();
          net.send({ t: 'undo-ok' });
          if (role === 'host') sendState();
        } else net.send({ t: 'undo-no' });
        break;
      }
      case 'undo-ok':
        board.undo();
        st.result = undefined;
        after();
        break;
      case 'undo-no':
        toast('Take-back declined');
        break;
    }
  };

  const link = shareLink(code);
  const shareBox = h(
    'div',
    { class: 'share' },
    h('p', {}, role === 'host' ? 'Send this code or link to the other player:' : 'Joining game:'),
    h('div', { class: 'code' }, code),
    role === 'host'
      ? h(
          'div',
          { class: 'row' },
          btn('Share link', async () => {
            try {
              if (navigator.share) await navigator.share({ title: 'Join my chess game', text: `Join my chess game — code ${code}`, url: link });
              else {
                await navigator.clipboard.writeText(link);
                toast('Link copied');
              }
            } catch {
              /* user cancelled */
            }
          }, 'btn primary'),
          btn('Copy link', async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast('Link copied');
            } catch {
              prompt('Copy this link:', link);
            }
          }),
        )
      : null,
  );

  const resignBtn = btn('Resign', async () => {
    const ok = await dialog('Resign?', 'Are you sure you want to resign this game?', [
      { label: 'Cancel', value: 'no' },
      { label: 'Resign', value: 'yes', primary: true },
    ]);
    if (ok !== 'yes') return;
    const side = mySide();
    net.send({ t: 'resign', side });
    st.result = `${side === 'white' ? 'White' : 'Black'} resigned — ${side === 'white' ? 'Black' : 'White'} wins`;
    after();
  });
  const newBtn = btn('New game (swap colours)', () => {
    st = { ...st, moves: [], result: undefined, hostColor: st.hostColor === 'white' ? 'black' : 'white' };
    board.loadMoves(undefined, []);
    board.setOrientation(mySide());
    net.send({ t: 'newgame', hostColor: st.hostColor });
    after();
  }, 'btn primary');

  l.actions.append(
    resignBtn,
    btn('Ask to take back', () => {
      const hist = board.chess.history({ verbose: true });
      const last = hist[hist.length - 1];
      if (!last || toSide(last.color) !== mySide()) return toast('You can only take back your own last move.');
      net.send({ t: 'undo-req' });
      toast('Asked your opponent…');
    }),
    btn('Flip board', () => {
      board.flip();
      refresh();
    }),
    newBtn,
    btn('Leave game', async () => {
      const ok = await dialog('Leave game?', 'You can come back to this game later from the Online page while it is unfinished.', [
        { label: 'Stay', value: 'no' },
        { label: 'Leave', value: 'yes', primary: true },
      ]);
      if (ok === 'yes') {
        if (st.result) storageDel(ONLINE_KEY);
        location.hash = '#/';
      }
    }),
  );
  l.extra.append(shareBox);
  save();
  refresh();

  return () => {
    net.close();
    board.destroy();
  };
}
