// Copiază fișierele OCR (Tesseract) în public/tesseract, ca aplicația să le servească local
// (fără CDN, funcționează offline după prima folosire).
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'tesseract');
mkdirSync(out, { recursive: true });

const nm = join(root, 'node_modules');
cpSync(join(nm, 'tesseract.js', 'dist', 'worker.min.js'), join(out, 'worker.min.js'));
for (const f of ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']) {
  cpSync(join(nm, 'tesseract.js-core', `${f}.wasm.js`), join(out, `${f}.wasm.js`));
}
cpSync(
  join(nm, '@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'),
  join(out, 'eng.traineddata.gz'),
);
