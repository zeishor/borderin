// Generează public/localitati.json din fișierele GeoNames (https://download.geonames.org/export/dump/, licență CC BY 4.0).
// Folosire: node scripts/build-localitati.mjs RO.txt admin1CodesASCII.txt [HU.txt]
//   RO.txt  — din RO.zip: toate locurile din România (se păstrează doar localitățile, clasa P)
//   HU.txt  — opțional: din HU.zip; se păstrează doar orașele de peste 50.000 de locuitori
import { readFileSync, writeFileSync } from 'node:fs';

const [ro, admin, hu] = process.argv.slice(2);
if (!ro || !admin) {
  console.error('Folosire: node scripts/build-localitati.mjs RO.txt admin1CodesASCII.txt [HU.txt]');
  process.exit(1);
}

const judete = new Map();
for (const linie of readFileSync(admin, 'utf8').split('\n')) {
  const [cod, nume] = linie.split('\t');
  if (cod && cod.startsWith('RO.')) judete.set(cod.slice(3), nume.replace(/ County$/, ''));
  if (cod && cod.startsWith('HU.')) judete.set(cod, nume);
}

// GeoNames scrie ş/ţ cu sedilă; în română se folosesc ș/ț cu virgulă dedesubt.
const virgula = (t) => t.replace(/ş/g, 'ș').replace(/Ş/g, 'Ș').replace(/ţ/g, 'ț').replace(/Ţ/g, 'Ț');

function citeste(fisier, prefix, minPop) {
  const rez = [];
  for (const linie of readFileSync(fisier, 'utf8').split('\n')) {
    const c = linie.split('\t');
    if (c.length < 15 || c[6] !== 'P') continue; // doar localități
    const pop = Number(c[14]) || 0;
    if (pop < minPop) continue;
    const judet = prefix === 'RO' ? (judete.get(c[10]) ?? '') : 'Ungaria';
    rez.push([virgula(c[1]), c[2], judet, Number(Number(c[4]).toFixed(3)), Number(Number(c[5]).toFixed(3)), pop]);
  }
  return rez;
}

const lista = [...citeste(ro, 'RO', 0), ...(hu ? citeste(hu, 'HU', 50000) : [])];
writeFileSync(new URL('../public/localitati.json', import.meta.url), JSON.stringify({ v: 1, l: lista }));
console.log(`${lista.length} localități scrise în public/localitati.json`);
