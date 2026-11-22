// Vaultbreaker: Midnight Heist — the hand-in program (Node 22, stdlib only).
// The game itself is the static files under game/ (index.html plus ES
// modules; no libraries, no network requests), and this program hands it in:
// it copies game/ and screenshots/ next to this file into the output
// directory and writes output/dossier.json, the summary the judge reads,
// using the vendored make.fun library.
//
// Play it locally first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (from the kit's reference/gate.json): only
// text_max_bytes shapes the dossier text; the rest refuse an entry the
// scorer would refuse — more than 4 screenshots or one over 256 KiB, more
// than 993 files in game/ or 48 MiB of game files in all, or a path under
// game/ over 1000 bytes.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(source, target) {
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

// Count the files under a directory, so the log below says what went in.
function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(path) : 1;
  }
  return total;
}

mkdirSync(outDir, { recursive: true });
copyTree(join(here, 'game'), join(outDir, 'game'));
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_LIMITS));

// A bad hand-in is cheap to catch here and expensive at the deadline: the
// scorer refuses more than 4 screenshots or any one over 256 KiB, so say
// what went in and fail loudly instead of handing in a short set.
const shots = readdirSync(join(outDir, 'screenshots')).sort();
if (shots.length === 0) throw new Error('no screenshots: put 3 or 4 in screenshots/ first');
for (const shot of shots) {
  const bytes = statSync(join(outDir, 'screenshots', shot)).size;
  if (bytes > DOSSIER_LIMITS.screenshots.max_bytes) {
    throw new Error(`screenshot ${shot} is ${bytes} bytes, over the 256 KiB cap`);
  }
}
console.log(`Vaultbreaker handed in: ${outDir}/dossier.json`);
console.log(`  game files: ${countFiles(join(outDir, 'game'))}, screenshots: ${shots.join(', ')}`);
