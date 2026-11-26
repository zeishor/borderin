import { getAll, put, STORES, type StoreName } from './db';
import { initStore } from './store';

const FORMAT = 'borderin-backup';

type Inreg = { id: string; foto?: Blob | string; orsCheie?: string };
type Fisier = { format: typeof FORMAT; versiune: 1; exportat: string; date: Record<string, Inreg[]> };

function inBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

async function dinBase64(s: string): Promise<Blob> {
  return (await fetch(s)).blob();
}

/** Toate datele din telefon, ca JSON (pozele biletelor ca data URL). */
export async function exporta(): Promise<Blob> {
  const date: Fisier['date'] = {};
  for (const s of STORES) {
    const lista = await getAll<Inreg>(s);
    date[s] = await Promise.all(
      lista.map(async (x) => (x.foto instanceof Blob ? { ...x, foto: await inBase64(x.foto) } : x)),
    );
    // Cheia serviciului de rute e secretă: fișierul de backup poate ajunge la altcineva.
    if (s === 'setari') date[s] = date[s].map(({ orsCheie: _, ...x }) => x);
  }
  const fisier: Fisier = { format: FORMAT, versiune: 1, exportat: new Date().toISOString(), date };
  return new Blob([JSON.stringify(fisier)], { type: 'application/json' });
}

export function numeFisierBackup(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `borderin-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/** Citește un fișier de backup și îl verifică, fără să scrie nimic. Aruncă o eroare cu mesaj clar. */
export function citesteBackup(text: string): Fisier {
  let f: Fisier;
  try {
    f = JSON.parse(text);
  } catch {
    throw new Error('Fișierul nu e un JSON valid.');
  }
  if (f?.format !== FORMAT || typeof f.date !== 'object' || f.date === null) {
    throw new Error('Nu e un fișier de backup Borderin.');
  }
  for (const s of STORES) {
    const lista = f.date[s];
    if (lista !== undefined && (!Array.isArray(lista) || lista.some((x) => !x || typeof x.id !== 'string'))) {
      throw new Error(`Datele „${s}” din fișier sunt stricate.`);
    }
  }
  return f;
}

/** Adaugă înregistrările din backup; cele cu același id se suprascriu, restul rămân. Întoarce câte s-au scris. */
export async function importa(f: Fisier): Promise<number> {
  let n = 0;
  for (const s of STORES) {
    for (const x of f.date[s] ?? []) {
      let val = typeof x.foto === 'string' ? { ...x, foto: await dinBase64(x.foto) } : x;
      if (s === 'setari') {
        // Backup-ul nu conține cheia de rute; o păstrez pe cea de pe telefon.
        const veche = (await getAll<Inreg>('setari')).find((y) => y.id === val.id);
        if (veche?.orsCheie) val = { orsCheie: veche.orsCheie, ...val };
      }
      await put(s as StoreName, val);
      n++;
    }
  }
  await initStore();
  return n;
}
