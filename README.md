# Family Chess

A chess game that runs in any web browser — iPhone, Android, tablet or computer — built for playing with family and for learning the game properly.

- **Play online:** two devices, one game. Start a game, share the 6-character code or link, and play.
- **Pass and play:** two players on one device, with an option to turn the board for each player.
- **Play the computer:** Stockfish at four strengths (Beginner, Intermediate, Advanced, Master), with a coach that comments on each of your moves and a three-step hint ladder (the idea → where to look → the move and why).
- **Learn:** guides to the three phases of the game — opening, middlegame and endgame — at Beginner, Intermediate and Advanced level, plus interactive lessons that explain the strategy behind each move.

It installs like an app (Add to Home Screen) and works offline, except live online games.

## Running it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints. The `--host` flag means phones on the same Wi-Fi can open the "Network" address too.

## Publishing on GitHub Pages

1. Create a repository on GitHub and push this code to its `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` now builds and publishes the site to `https://<your-username>.github.io/<repository-name>/`.

## How it is built

| Part | Library | Licence |
| --- | --- | --- |
| Rules | [chess.js](https://github.com/jhlywa/chess.js) | BSD-2-Clause |
| Board | [chessground](https://github.com/lichess-org/chessground) | GPL-3.0 |
| Engine | [Stockfish](https://stockfishchess.org) via [stockfish.js](https://github.com/nmrugg/stockfish.js) (lite, single-threaded build — no special server headers needed) | GPL-3.0 |
| Online play | [PeerJS](https://peerjs.com) (WebRTC, device to device) | MIT |
| Build | [Vite](https://vite.dev) + TypeScript | MIT |

### Online play

GitHub Pages only serves files, so the two devices connect directly to each other using WebRTC. PeerJS's free public server is used only for the initial handshake. The host keeps the full move list and resends it whenever the other player reconnects. Some school or workplace networks block direct connections; mobile data or home Wi-Fi usually works. To use your own PeerJS server, set `localStorage["fc.peerServer"]` to e.g. `{"host":"peer.example.com","port":443,"path":"/","secure":true}`.

### The coach

Stockfish decides *which* move is best. `src/game/coach.ts` works out *why*, by detecting themes: checkmate, free material, winning trades, forks, threats, checks, pieces under attack, castling, development, central control, king activity and passed pawns. After each of your moves it compares your move with the engine's choice and explains what your opponent can now do.

### Lessons

Lessons live in `src/learn/lessons.ts` and the phase guides in `src/learn/guides.ts`. Every lesson answer is checked against Stockfish:

```bash
npm run verify-lessons
```

This confirms that each accepted move is (near) best, that each move flagged as wrong really is clearly worse, and that every position and reply is legal.

## Sources

Training content draws on public-domain and openly licensed material: J. R. Capablanca, *Chess Fundamentals* (1921); Aron Nimzowitsch, *My System* (1925); F.-A. D. Philidor, *Analyse du jeu des Échecs* (1749/1777); classic historical games; Wikibooks *Chess* (CC BY-SA); and the Lichess open databases (CC0). Each lesson names its source.

## Licence

GPL-3.0-or-later (required because chessground and Stockfish are GPL). See `LICENSE`.
