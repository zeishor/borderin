import { useState } from 'preact/hooks';
import { go } from '../router';
import { deleteCursa, newId, saveBilet, saveCursa, saveRezervare, useStore } from '../store';
import { arePlataIncasata, fmtMoment, fmtData, fmtSumaBilet, textCheltuieli, textDeIncasat, textIncasat, titluCursa, totalPasageri } from '../format';
import { Incasare } from '../incasare';
import { parseMesaje } from '../parser';
import { aplicaPeCursa, rezervareDinExtras } from '../importa';
import { Field, Screen } from '../ui';
import { linkZbor } from '../zbor';
import { NavButoane } from '../navbuton';
import { traseu } from '../traseu';
import type { Rezervare } from '../types';

function Sectiune(props: { titlu: string; lista: Rezervare[] }) {
  const sortate = [...props.lista].sort((a, b) => (a.ora ?? '').localeCompare(b.ora ?? ''));
  return (
    <section>
      <h2 class="day sectiune">
        {props.titlu} ({totalPasageri(sortate)} pax)
      </h2>
      {sortate.length === 0 && <p class="muted">Nimic aici.</p>}
      {sortate.map((r) => (
        <div key={r.id} class="rez">
          <button class="rez-top" onClick={() => go(`/rezervare/${r.id}`)}>
            <span class="rez-head">
              {r.ora && <span class="ora">{r.ora}</span>}
              <strong class="rez-nume">{r.nume || '(fără nume)'}</strong>
              <span class="chip">👥 {r.pasageri}</span>
            </span>
            {(r.zbor || r.orasZbor || r.eticheta) && (
              <span class="chips">
                {r.zbor && <span class="chip zbor">✈ {r.zbor}</span>}
                {r.orasZbor && <span class="chip">{r.orasZbor}</span>}
                {r.eticheta && <span class="chip">{r.eticheta}</span>}
              </span>
            )}
            {(r.preluare || r.lasare) && (
              <span class="ruta">
                <span class="ruta-linie" />
                <span class="ruta-text">{r.preluare || '?'}</span>
                <span class="ruta-text">{r.lasare || '?'}</span>
              </span>
            )}
            <span class={r.plata.stare === 'achitat' ? 'pill achitat' : 'pill de-incasat'}>
              {r.plata.stare === 'achitat' ? 'Achitat' : `De încasat ${textDeIncasat([r])}`}
            </span>
          </button>
          {r.zbor && linkZbor(r.zbor) && (
            <div class="actiuni">
              <a class="wa" href={linkZbor(r.zbor)} target="_blank" rel="noopener">
                ✈ Urmărește {r.zbor}
              </a>
            </div>
          )}
          <NavButoane preluare={r.preluare} lasare={r.lasare} />
          <Incasare r={r} />
        </div>
      ))}
    </section>
  );
}

export function CursaScreen({ id }: { id: string }) {
  const { curse, rezervari, masini, bilete } = useStore();
  const [adauga, setAdauga] = useState('');
  const cursa = curse.find((c) => c.id === id);
  if (!cursa) return <Screen title="Cursă" backTo="/"><p class="empty">Cursa nu există.</p></Screen>;

  const ale = rezervari.filter((r) => r.cursaId === id);
  const aleBilete = bilete.filter((b) => b.cursaId === id);
  const dus = ale.filter((r) => r.directie === 'dus');
  const retur = ale.filter((r) => r.directie === 'retur');
  const set = (patch: Partial<typeof cursa>) => saveCursa({ ...cursa, ...patch });

  async function adaugaMesaje() {
    const rezultat = parseMesaje(adauga);
    for (const e of rezultat.rezervari) await saveRezervare(rezervareDinExtras(id, e));
    await saveCursa(aplicaPeCursa(cursa!, rezultat));
    setAdauga('');
  }

  async function scaneaza(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const foto = input.files?.[0];
    input.value = '';
    if (!foto) return;
    const acum = Date.now();
    const bid = newId();
    await saveBilet({ id: bid, cursaId: id, creat: acum, modificat: acum, moneda: 'HUF', foto });
    go(`/bilet/${bid}`);
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
      <p class="muted">{traseu(cursa, ale).join(' → ')}</p>

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
        <strong>{textDeIncasat(ale)}</strong>
      </div>
      {arePlataIncasata(ale) && (
        <div class="total">
          <span>Încasat (de predat firmei)</span>
          <strong>{textIncasat(ale)}</strong>
        </div>
      )}

      <Sectiune titlu={`Dus: Timișoara → ${cursa.destinatie || '?'}`} lista={dus} />
      <Sectiune titlu={`Retur: ${cursa.destinatie || '?'} → Timișoara`} lista={retur} />

      <h2 class="day">Bilete aeroport</h2>
      {aleBilete.map((b) => (
        <button key={b.id} class="card" onClick={() => go(`/bilet/${b.id}`)}>
          <strong>{b.suma ? fmtSumaBilet(b.suma, b.moneda) : 'Bilet (sumă necitită)'}</strong>
          <span class="muted">
            {b.intrare ? fmtMoment(b.intrare) : '?'} → {b.iesire ? fmtMoment(b.iesire) : '?'}
          </span>
        </button>
      ))}
      <button class="primary" onClick={() => go(`/scaneaza/${id}`)}>
        Scanează bilet (automat)
      </button>
      <div class="row">
        <label class="btn grow">
          Fă poză biletului
          <input type="file" accept="image/*" capture="environment" hidden onChange={scaneaza} />
        </label>
        <label class="btn">
          Din galerie
          <input type="file" accept="image/*" hidden onChange={scaneaza} />
        </label>
      </div>
      {aleBilete.length > 0 && (
        <div class="total">
          <span>Cheltuieli de decontat</span>
          <strong>{textCheltuieli(aleBilete)}</strong>
        </div>
      )}

      <Field label="Adaugă mesaje în cursă">
        <textarea
          rows={5}
          value={adauga}
          placeholder="Lipește mesajele de la dispecer…"
          onInput={(e) => setAdauga(e.currentTarget.value)}
        />
      </Field>
      <button class="primary" disabled={!adauga.trim()} onClick={adaugaMesaje}>
        Adaugă mesajele
      </button>

      <Field label="Note">
        <textarea rows={3} value={cursa.note ?? ''} onInput={(e) => set({ note: e.currentTarget.value || undefined })} />
      </Field>

      <button class="danger" onClick={sterge}>
        Șterge cursa
      </button>
    </Screen>
  );
}
