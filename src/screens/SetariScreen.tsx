import { useState } from 'preact/hooks';
import { deleteMasina, newId, saveMasina, saveSetari, useStore } from '../store';
import { Field, Screen } from '../ui';

export function SetariScreen() {
  const { masini, setari } = useStore();
  const [nume, setNume] = useState('');
  const [locuri, setLocuri] = useState(4);

  async function adauga() {
    if (!nume.trim()) return;
    await saveMasina({ id: newId(), nume: nume.trim(), locuri });
    setNume('');
  }

  return (
    <Screen title="Setări" backTo="/">
      <h2 class="day">Mașini</h2>
      {masini.length === 0 && <p class="muted">Nicio mașină adăugată.</p>}
      {masini.map((m) => (
        <div class="row" key={m.id}>
          <span class="grow">
            {m.nume} · {m.locuri} locuri
          </span>
          <button class="icon" aria-label={`Șterge ${m.nume}`} onClick={() => deleteMasina(m.id)}>
            ✕
          </button>
        </div>
      ))}
      <div class="row">
        <input placeholder="Nume / număr înmatriculare" value={nume} onInput={(e) => setNume(e.currentTarget.value)} />
        <input class="narrow" type="number" min={1} value={locuri} onInput={(e) => setLocuri(Number(e.currentTarget.value) || 1)} />
        <button onClick={adauga}>Adaugă</button>
      </div>

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
    </Screen>
  );
}
