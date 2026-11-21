import { useState } from 'preact/hooks';
import { saveSetari, useStore } from '../store';
import { CursManager } from './CursManager';
import { PreturiManager } from './PreturiManager';
import { MasiniManager } from './MasiniManager';
import { Field, Screen } from '../ui';
import { salveazaTema, TEME, temaAleasa, type Tema } from '../tema';
import { NAVIGATII, navigatieAleasa, salveazaNavigatie, type Navigatie } from '../nav';
import { citesteBackup, exporta, importa, numeFisierBackup } from '../backup';
import { salveazaTracker, TRACKERE, trackerAles, type Tracker } from '../zbor';

export function SetariScreen() {
  const { masini, setari } = useStore();
  const [masiniDeschis, setMasiniDeschis] = useState(false);
  const [cursDeschis, setCursDeschis] = useState(false);
  const [preturiDeschis, setPreturiDeschis] = useState(false);
  const [tema, setTema] = useState<Tema>(temaAleasa());
  const [nav, setNav] = useState<Navigatie>(navigatieAleasa());
  const [tracker, setTracker] = useState<Tracker>(trackerAles());

  const [mesajBackup, setMesajBackup] = useState('');

  async function descarcaBackup() {
    const url = URL.createObjectURL(await exporta());
    const a = document.createElement('a');
    a.href = url;
    a.download = numeFisierBackup();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setMesajBackup('Backup descărcat.');
  }

  async function incarcaBackup(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const fisier = input.files?.[0];
    input.value = '';
    if (!fisier) return;
    try {
      const f = citesteBackup(await fisier.text());
      if (!confirm('Adaug datele din backup? Înregistrările cu același id se suprascriu, restul rămân.')) return;
      setMesajBackup(`Importate ${await importa(f)} înregistrări.`);
    } catch (err) {
      setMesajBackup(err instanceof Error ? err.message : 'Importul a eșuat.');
    }
  }

  return (
    <Screen title="Setări" tabs>
      <h2 class="day">Mașini</h2>
      <div class="row">
        <span class="grow muted">
          {masini.length === 0 ? 'Nicio mașină adăugată.' : `${masini.length} ${masini.length === 1 ? 'mașină' : 'mașini'}`}
        </span>
        <button onClick={() => setMasiniDeschis(true)}>🚐 Manager mașini</button>
      </div>
      {masiniDeschis && <MasiniManager onClose={() => setMasiniDeschis(false)} />}

      <h2 class="day">Bani</h2>
      <div class="row">
        <button class="grow" onClick={() => setPreturiDeschis(true)}>
          💰 Prețuri și salariu
        </button>
        <button class="grow" onClick={() => setCursDeschis(true)}>
          💱 Curs valutar
        </button>
      </div>
      {preturiDeschis && <PreturiManager onClose={() => setPreturiDeschis(false)} />}
      {cursDeschis && <CursManager onClose={() => setCursDeschis(false)} />}

      <h2 class="day">Backup date</h2>
      <p class="muted">Datele stau doar în telefon. Descarcă din când în când un backup și păstrează-l în altă parte.</p>
      <div class="row">
        <button onClick={descarcaBackup}>Descarcă backup</button>
        <label class="btn">
          Importă backup
          <input type="file" accept="application/json,.json" hidden onChange={incarcaBackup} />
        </label>
      </div>
      {mesajBackup && <p class="muted">{mesajBackup}</p>}

      <h2 class="day">Aspect</h2>
      <Field label="Temă">
        <select
          value={tema}
          onChange={(e) => {
            const t = e.currentTarget.value as Tema;
            setTema(t);
            salveazaTema(t);
          }}
        >
          {TEME.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nume}
            </option>
          ))}
        </select>
      </Field>

      <h2 class="day">Navigație</h2>
      <Field label="Navighează cu">
        <select
          value={nav}
          onChange={(e) => {
            const n = e.currentTarget.value as Navigatie;
            setNav(n);
            salveazaNavigatie(n);
          }}
        >
          {NAVIGATII.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nume}
            </option>
          ))}
        </select>
      </Field>

      <h2 class="day">Urmărire zbor</h2>
      <Field label="Urmărește zborul cu">
        <select
          value={tracker}
          onChange={(e) => {
            const t = e.currentTarget.value as Tracker;
            setTracker(t);
            salveazaTracker(t);
          }}
        >
          {TRACKERE.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nume}
            </option>
          ))}
        </select>
      </Field>
      <p class="muted">Se deschide ca link; dacă aplicația e instalată, telefonul o poate deschide direct pe ea.</p>

      <h2 class="day">Cursă „extra”</h2>
      <Field label="Prag (ore, durata totală a cursei)">
        <input
          type="number"
          min={1}
          step={0.5}
          value={setari.pragExtraOre}
          onInput={(e) => saveSetari({ ...setari, pragExtraOre: Number(e.currentTarget.value) || 1 })}
        />
      </Field>
      <Field label="Durata drumului înapoi spre Timișoara (ore)">
        <input
          type="number"
          min={0}
          step={0.5}
          value={setari.drumInapoiOre}
          onInput={(e) => saveSetari({ ...setari, drumInapoiOre: Number(e.currentTarget.value) || 0 })}
        />
      </Field>
      <p class="muted">Calculul „extra” se adaugă într-o etapă următoare; setările se păstrează de pe acum.</p>

      <h2 class="day">Despre</h2>
      <p class="muted">
        Baza de localități: © GeoNames (geonames.org), licență{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">
          CC BY 4.0
        </a>
        .
      </p>
    </Screen>
  );
}
