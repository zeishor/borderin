import { useState } from 'preact/hooks';
import { go } from '../router';
import { deleteCursa, saveCursa, saveRezervare, useStore } from '../store';
import { fmtData, textIncasat, titluCursa } from '../format';
import { parseMesaje } from '../parser';
import { Field, Screen } from '../ui';
import { rezervareNoua } from './CursaNoua';
import type { Directie, Rezervare } from '../types';

function Sectiune(props: { titlu: string; lista: Rezervare[] }) {
  const sortate = [...props.lista].sort((a, b) => (a.ora ?? '').localeCompare(b.ora ?? ''));
  return (
    <section>
      <h2 class="day">
        {props.titlu} ({sortate.length})
      </h2>
      {sortate.length === 0 && <p class="muted">Nimic aici.</p>}
      {sortate.map((r) => (
        <button key={r.id} class="card" onClick={() => go(`/rezervare/${r.id}`)}>
          <strong>
            {r.ora ? `${r.ora} · ` : ''}
            {r.nume || '(fără nume)'}
          </strong>
          <span class="muted">
            {r.pasageri} pax{r.zbor ? ` · ${r.zbor}` : ''}
            {r.eticheta ? ` · ${r.eticheta}` : ''}
          </span>
          <span>{r.plata.stare === 'achitat' ? 'Achitat' : `De încasat: ${textIncasat([r])}`}</span>
        </button>
      ))}
    </section>
  );
}

export function CursaScreen({ id }: { id: string }) {
  const { curse, rezervari, masini } = useStore();
  const [adauga, setAdauga] = useState('');
  const cursa = curse.find((c) => c.id === id);
  if (!cursa) return <Screen title="Cursă" backTo="/"><p class="empty">Cursa nu există.</p></Screen>;

  const ale = rezervari.filter((r) => r.cursaId === id);
  const dus = ale.filter((r) => r.directie === 'dus');
  const retur = ale.filter((r) => r.directie === 'retur');
  const set = (patch: Partial<typeof cursa>) => saveCursa({ ...cursa, ...patch });

  async function adaugaMesaje(directie: Directie) {
    for (const e of parseMesaje(adauga)) await saveRezervare(rezervareNoua(id, { ...e, directie }));
    setAdauga('');
  }

  async function sterge() {
    if (confirm('Ștergi cursa și toate rezervările ei?')) {
      await deleteCursa(id);
      go('/');
    }
  }

  return (
    <Screen title={titluCursa(cursa)} backTo="/">
      <p class="muted">{fmtData(cursa.data)}</p>

      <div class="grid">
        <Field label="Destinația">
          <input value={cursa.destinatie} onInput={(e) => set({ destinatie: e.currentTarget.value })} />
        </Field>
        <Field label="Mașina">
          <select value={cursa.masinaId ?? ''} onChange={(e) => set({ masinaId: e.currentTarget.value || undefined })}>
            <option value="">—</option>
            {masini.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nume} ({m.locuri} locuri)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plecare din Timișoara">
          <input type="time" value={cursa.plecare ?? ''} onInput={(e) => set({ plecare: e.currentTarget.value || undefined })} />
        </Field>
        <Field label="Retur de la">
          <input type="time" value={cursa.retur ?? ''} onInput={(e) => set({ retur: e.currentTarget.value || undefined })} />
        </Field>
      </div>

      <div class="total">
        <span>De încasat</span>
        <strong>{textIncasat(ale)}</strong>
      </div>

      <Sectiune titlu={`Dus: Timișoara → ${cursa.destinatie || '?'}`} lista={dus} />
      <Sectiune titlu={`Retur: ${cursa.destinatie || '?'} → Timișoara`} lista={retur} />

      <Field label="Adaugă mesaje în cursă">
        <textarea
          rows={5}
          value={adauga}
          placeholder="Lipește mesajele de la dispecer…"
          onInput={(e) => setAdauga(e.currentTarget.value)}
        />
      </Field>
      <div class="row">
        <button class="primary" disabled={!adauga.trim()} onClick={() => adaugaMesaje('dus')}>
          Adaugă la dus
        </button>
        <button class="primary" disabled={!adauga.trim()} onClick={() => adaugaMesaje('retur')}>
          Adaugă la retur
        </button>
      </div>

      <Field label="Note">
        <textarea rows={3} value={cursa.note ?? ''} onInput={(e) => set({ note: e.currentTarget.value || undefined })} />
      </Field>

      <button class="danger" onClick={sterge}>
        Șterge cursa
      </button>
    </Screen>
  );
}
