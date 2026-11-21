import { useState } from 'preact/hooks';
import { Fereastra } from '../fereastra';
import { deleteMasina, newId, saveMasina, useStore } from '../store';

/** Fereastra „Manager mașini": lista mașinilor, adăugare și ștergere. Datele rămân în store, nu în fereastră. */
export function MasiniManager({ onClose }: { onClose: () => void }) {
  const { masini } = useStore();
  const [nume, setNume] = useState('');
  const [locuri, setLocuri] = useState(4);

  async function adauga() {
    if (!nume.trim()) return;
    await saveMasina({ id: newId(), nume: nume.trim(), locuri });
    setNume('');
  }

  return (
    <Fereastra titlu="Manager mașini" onClose={onClose}>
      {masini.length === 0 && <p class="muted">Nicio mașină adăugată.</p>}
      {masini.map((m) => (
        <div class="row" key={m.id}>
          <span class="grow">
            {m.nume} · {m.locuri} locuri
          </span>
          <button
            class="icon"
            aria-label={`Șterge ${m.nume}`}
            onClick={() => confirm(`Ștergi mașina ${m.nume}?`) && deleteMasina(m.id)}
          >
            ✕
          </button>
        </div>
      ))}

      <h3 class="modal-sub">Adaugă mașină</h3>
      <div class="row">
        <input placeholder="Nume / număr înmatriculare" value={nume} onInput={(e) => setNume(e.currentTarget.value)} />
        <input class="narrow" type="number" min={1} value={locuri} onInput={(e) => setLocuri(Number(e.currentTarget.value) || 1)} />
        <button onClick={adauga}>Adaugă</button>
      </div>
      <p class="muted">Numărul de locuri hotărăște suma de spălătorie: până la 4 mașină mică, peste 4 mașină mare.</p>

      <button class="primary" onClick={onClose}>
        Gata
      </button>
    </Fereastra>
  );
}
