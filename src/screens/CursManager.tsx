import { useState } from 'preact/hooks';
import { citesteCurs, MONEDE_CURS } from '../curs';
import { Fereastra } from '../fereastra';
import { saveSetari, useStore } from '../store';
import type { MonedaCurs } from '../types';

/** Fereastra „Curs valutar": cât valorează 1 unitate din fiecare monedă, în lei. */
export function CursManager({ onClose }: { onClose: () => void }) {
  const { setari } = useStore();
  const [text, setText] = useState<Partial<Record<MonedaCurs, string>>>(() =>
    Object.fromEntries(MONEDE_CURS.map((m) => [m, setari.cursuri[m] !== undefined ? String(setari.cursuri[m]) : ''])),
  );

  function schimba(m: MonedaCurs, valoare: string) {
    setText({ ...text, [m]: valoare });
    const cursuri = { ...setari.cursuri };
    const c = citesteCurs(valoare);
    if (c === undefined) delete cursuri[m];
    else cursuri[m] = c;
    saveSetari({ ...setari, cursuri });
  }

  return (
    <Fereastra titlu="Curs valutar" onClose={onClose}>
      <p class="muted">
        Firma plătește doar în lei. Cursul se folosește la decont: încasările, biletele și cheltuielile în valută se transformă în lei.
        La fiecare decont îl poți ajusta.
      </p>
      {MONEDE_CURS.map((m) => (
        <div class="row" key={m}>
          <span class="curs-eticheta">1 {m} =</span>
          <input
            class="grow"
            inputMode="decimal"
            placeholder="curs necunoscut"
            value={text[m] ?? ''}
            onInput={(e) => schimba(m, e.currentTarget.value)}
          />
          <span class="curs-eticheta">lei</span>
        </div>
      ))}
      <p class="muted">Ex.: 1 EUR = 5,5 lei. Pentru forinți e un număr mic, de exemplu 1 HUF = 0,0135 lei.</p>
      <button class="primary" onClick={onClose}>
        Gata
      </button>
    </Fereastra>
  );
}
