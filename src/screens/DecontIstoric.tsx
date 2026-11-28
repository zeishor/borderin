import { textImpartire } from '../decont';
import { fmtData, fmtSuma, textBani } from '../format';
import { deleteDecont, useStore } from '../store';
import { Screen } from '../ui';
import type { Decont } from '../types';

const lei = (x: number) => fmtSuma(x, 'RON');

/** Rezultatul unui decont; cele vechi au doar diferența în lei. */
function textRezultat(d: Decont): string | undefined {
  if (d.rezultat) return textImpartire(d.rezultat);
  if (d.soldRon === undefined) return undefined;
  if (d.soldRon > 0) return `Mai aveai de luat: ${lei(d.soldRon)}`;
  if (d.soldRon < 0) return `De predat: ${lei(-d.soldRon)}`;
  return 'Nimic de predat, nimic de luat';
}

function cate(n: number, una: string, multe: string): string {
  return n === 1 ? `1 ${una}` : `${n} ${multe}`;
}

export function DecontIstoric() {
  const { deconturi } = useStore();
  const istoric = [...deconturi].sort((a, b) => b.creat - a.creat);

  async function sterge(id: string) {
    if (confirm('Anulezi decontul? Cursele, biletele, spălările și banii revin ca nedecontate.')) await deleteDecont(id);
  }

  return (
    <Screen title="Deconturi făcute" backTo="/decont">
      {istoric.length === 0 && <p class="empty">Niciun decont încă.</p>}
      {istoric.map((d) => {
        const continut = [
          d.curse?.length ? cate(d.curse.length, 'cursă', 'curse') : '',
          d.bilete.length ? cate(d.bilete.length, 'bilet', 'bilete') : '',
          d.cheltuieli?.length ? cate(d.cheltuieli.length, 'cheltuială', 'cheltuieli') : '',
          d.spalatorii?.length ? cate(d.spalatorii.reduce((n, s) => n + s.nr, 0), 'spălare', 'spălări') : '',
          d.note ?? '',
        ].filter(Boolean);
        return (
          <div class="row card-wrap" key={d.id}>
            <span class="grow">
              <strong>{fmtData(d.data)}</strong>
              <span class="linie">{textRezultat(d)}</span>
              <span class="linie muted">Încasări în decont: {textBani(d.predat)}</span>
              {d.pastrat && <span class="linie muted">Mărunțiș ținut: {textBani(d.pastrat)}</span>}
              <span class="linie muted">{continut.join(' · ')}</span>
            </span>
            <button class="icon" aria-label="Anulează decontul" onClick={() => sterge(d.id)}>
              ✕
            </button>
          </div>
        );
      })}
    </Screen>
  );
}
