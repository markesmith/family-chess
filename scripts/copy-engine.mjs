// Copies the single-threaded "lite" Stockfish build into public/engine so it is
// served as a static file. This build needs no special server headers, so it
// works on GitHub Pages.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'stockfish');
const dest = join(root, 'public', 'engine');
mkdirSync(dest, { recursive: true });
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  copyFileSync(join(src, 'bin', f), join(dest, f));
}
copyFileSync(join(src, 'Copying.txt'), join(dest, 'COPYING-stockfish.txt'));
console.log('Stockfish engine copied to public/engine');
