import { useState } from 'preact/hooks';
import { CautaLocalitate } from '../cautalocalitate';
import { Fereastra } from '../fereastra';
import { norm } from '../preturi';
import { deleteLocalitate, newId, saveLocalitate, saveSetari, useStore } from '../store';
import { Field } from '../ui';

const numar = (v: string) => Math.max(0, Number(v.replace(',', '.')) || 0);

/** Fereastra „Prețuri": salariul de bază, spălătoria și suma pe cursă pentru fiecare localitate mamă, cu limitrofele ei. */
export function PreturiManager({ onClose }: { onClose: () => void }) {
  const { setari, localitati } = useStore();
  const mame = localitati.filter((l) => !l.mamaId).sort((a, b) => a.nume.localeCompare(b.nume, 'ro'));
  const limitrofe = (id: string) => localitati.filter((l) => l.mamaId === id).sort((a, b) => a.nume.localeCompare(b.nume, 'ro'));

  const [nume, setNume] = useState('');
  const [suma, setSuma] = useState('');
  const [deschisPentru, setDeschisPentru] = useState<string>();
  const [numeLimitrofa, setNumeLimitrofa] = useState('');
  const [mesaj, setMesaj] = useState('');

  const exista = (n: string) => localitati.some((l) => norm(l.nume) === norm(n));

  async function adaugaMama() {
    const n = nume.trim();
    if (!n || !suma.trim()) return setMesaj('Scrie localitatea și suma.');
    if (exista(n)) return setMesaj(`„${n}" există deja în listă.`);
    await saveLocalitate({ id: newId(), nume: n, sumaRon: numar(suma) });
    setNume('');
    setSuma('');
    setMesaj('');
  }

  async function adaugaLimitrofa(mamaId: string) {
    const n = numeLimitrofa.trim();
    if (!n) return;
    if (exista(n)) return setMesaj(`„${n}" există deja în listă.`);
    await saveLocalitate({ id: newId(), nume: n, mamaId });
    setNumeLimitrofa('');
    setDeschisPentru(undefined);
    setMesaj('');
  }

  return (
    <Fereastra titlu="Prețuri și salariu" onClose={onClose}>
      <h3 class="modal-sub">Salariu de bază</h3>
      <Field label="Lunar, în lei (nu se decontează)">
        <input
          type="number"
          min={0}
          value={setari.salariuBazaRon}
          onInput={(e) => saveSetari({ ...setari, salariuBazaRon: numar(e.currentTarget.value) })}
        />
      </Field>
      <p class="muted">Se adună cu cursele din lună în rezumatul din Decont, ca să știi cât ai luat în luna respectivă.</p>

      <h3 class="modal-sub">Spălătorie (decont)</h3>
      <Field label="Mașină mică, până la 4 locuri (lei)">
        <input
          type="number"
          min={0}
          value={setari.spalatorieMicaRon}
          onInput={(e) => saveSetari({ ...setari, spalatorieMicaRon: numar(e.currentTarget.value) })}
        />
      </Field>
      <Field label="Mașină mare, peste 4 locuri (lei)">
        <input
          type="number"
          min={0}
          value={setari.spalatorieMareRon}
          onInput={(e) => saveSetari({ ...setari, spalatorieMareRon: numar(e.currentTarget.value) })}
        />
      </Field>

      <h3 class="modal-sub">Suma pe cursă, pe localitate</h3>
      <p class="muted">
        Introdu localitățile mari (mame) cu suma lor. Localitățile mici din apropiere (limitrofe) se leagă de o mamă și iau
        aceeași sumă. Cursa ia suma celei mai scumpe opriri.
      </p>
      {mame.length === 0 && <p class="muted">Nicio localitate încă.</p>}
      {mame.map((m) => (
        <div class="mama" key={m.id}>
          <div class="row">
            <strong class="grow">{m.nume}</strong>
            <input
              class="narrow"
              type="number"
              min={0}
              aria-label={`Suma pentru ${m.nume}`}
              value={m.sumaRon ?? 0}
              onInput={(e) => saveLocalitate({ ...m, sumaRon: numar(e.currentTarget.value) })}
            />
            <span>lei</span>
            <button
              class="icon"
              aria-label={`Șterge ${m.nume}`}
              onClick={() => {
                const n = limitrofe(m.id).length;
                const extra = n ? ` și cele ${n} limitrofe ale ei` : '';
                if (confirm(`Ștergi ${m.nume}${extra}? Cursele deja salvate își păstrează suma.`)) deleteLocalitate(m.id);
              }}
            >
              ✕
            </button>
          </div>
          <div class="chips">
            {limitrofe(m.id).map((l) => (
              <span class="chip" key={l.id}>
                {l.nume}
                <button class="chip-x" aria-label={`Scoate ${l.nume}`} onClick={() => deleteLocalitate(l.id)}>
                  ✕
                </button>
              </span>
            ))}
            <button class="chip adauga" onClick={() => setDeschisPentru(deschisPentru === m.id ? undefined : m.id)}>
              ＋ limitrofă
            </button>
          </div>
          {deschisPentru === m.id && (
            <div class="row">
              <div class="grow">
                <CautaLocalitate valoare={numeLimitrofa} onInput={setNumeLimitrofa} />
              </div>
              <button onClick={() => adaugaLimitrofa(m.id)}>Adaugă</button>
            </div>
          )}
        </div>
      ))}

      <h3 class="modal-sub">Adaugă localitate mamă</h3>
      <CautaLocalitate valoare={nume} onInput={setNume} />
      <div class="row">
        <input
          class="grow"
          type="number"
          min={0}
          placeholder="Suma pe cursă (lei)"
          value={suma}
          onInput={(e) => setSuma(e.currentTarget.value)}
        />
        <button onClick={adaugaMama}>Adaugă</button>
      </div>
      {mesaj && <p class="muted">{mesaj}</p>}

      <button class="primary" onClick={onClose}>
        Gata
      </button>
    </Fereastra>
  );
}
