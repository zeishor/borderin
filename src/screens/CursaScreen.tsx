import { useState } from 'preact/hooks';
import { go } from '../router';
import { deleteCheltuiala, deleteCursa, newId, saveBilet, saveCheltuiala, saveCursa, saveRezervare, useStore } from '../store';
import { arePlataIncasata, fmtMoment, fmtData, fmtSumaBilet, textCheltuieli, textDeIncasat, textIncasat, titluCursa, totalPasageri } from '../format';
import { Incasare } from '../incasare';
import { parseMesaje } from '../parser';
import { IN_UNGARIA, oreSugerate } from '../ore';
import { aplicaPeCursa, rezervareDinExtras } from '../importa';
import { Field, Screen } from '../ui';
import { linkZbor } from '../zbor';
import { NavButoane } from '../navbuton';
import { traseu } from '../traseu';
import { useCerePret } from '../cerepret';
import { aplicaPret, norm, opririCursa, SURSA_MANUALA } from '../preturi';
import { pretSpalare, spalariDecontate } from '../spalatorie';
import { analizaCursa, soldCurse } from '../decontcursa';
import { textSold } from './DecontScreen';
import { inRon } from '../curs';
import { statusLocala } from '../locale';
import type { MonedaBilet, Rezervare } from '../types';

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
            {r.plata.stare === 'achitat' && textDeIncasat([r]) !== '—' && (
              <span class="pill de-incasat">Restanță {textDeIncasat([r])}</span>
            )}
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
  const { curse, rezervari, masini, bilete, setari, deconturi, cheltuieli } = useStore();
  const [adauga, setAdauga] = useState('');
  const [descriere, setDescriere] = useState('');
  const [sumaNoua, setSumaNoua] = useState('');
  const [monedaNoua, setMonedaNoua] = useState<MonedaBilet>('RON');
  const [fotoNoua, setFotoNoua] = useState<File>();
  const { element, calculeaza } = useCerePret();
  const cursa = curse.find((c) => c.id === id);
  if (!cursa) return <Screen title="Cursă" backTo="/"><p class="empty">Cursa nu există.</p></Screen>;

  const ale = rezervari.filter((r) => r.cursaId === id);
  const aleBilete = bilete.filter((b) => b.cursaId === id);
  const dus = ale.filter((r) => r.directie === 'dus');
  const retur = ale.filter((r) => r.directie === 'retur');
  const sugerat = oreSugerate(ale, setari, cursa.destinatie);
  const set = (patch: Partial<typeof cursa>) => saveCursa({ ...cursa, ...patch });

  const masina = masini.find((m) => m.id === cursa.masinaId);
  const spalari = cursa.spalari ?? 0;
  const pret = pretSpalare(masina, setari);
  const decontate = spalariDecontate(id, deconturi);
  const analiza = analizaCursa(cursa, { rezervari, bilete, deconturi, masini, setari, curse, cheltuieli });
  const locala = statusLocala(curse, cursa, setari.curseLocaleInclusePeLuna);
  const rezultat = soldCurse([analiza], setari.cursuri);
  const fmtLei = (x: number) => `${Math.round(x * 100) / 100} lei`;

  async function adaugaCheltuiala() {
    const suma = Number(sumaNoua.replace(',', '.'));
    if (!(suma > 0)) return;
    const acum = Date.now();
    await saveCheltuiala({
      id: newId(),
      cursaId: id,
      creat: acum,
      modificat: acum,
      descriere: descriere.trim(),
      suma,
      moneda: monedaNoua,
      foto: fotoNoua,
    });
    setDescriere('');
    setSumaNoua('');
    setFotoNoua(undefined);
  }

  async function recalculeaza() {
    await saveCursa(aplicaPret(cursa!, await calculeaza(opririCursa(cursa!, ale))));
  }

  async function adaugaMesaje() {
    const rezultat = parseMesaje(adauga);
    const noi = rezultat.rezervari.map((e) => rezervareDinExtras(id, e));
    for (const r of noi) await saveRezervare(r);
    let actualizata = aplicaPeCursa(cursa!, rezultat, [...ale, ...noi], setari);
    // Opriri noi pot schimba suma, dar o sumă scrisă manual nu se atinge.
    if (actualizata.sumaSursa !== SURSA_MANUALA) {
      actualizata = aplicaPret(actualizata, await calculeaza(opririCursa(actualizata, [...ale, ...noi])));
    }
    await saveCursa(actualizata);
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
        <Field label="Suma pentru șofer (lei)">
          <input
            type="number"
            min={0}
            value={cursa.sumaSofer ?? ''}
            onInput={(e) => {
              const v = Number(e.currentTarget.value);
              set(v > 0 ? { sumaSofer: v, sumaSursa: SURSA_MANUALA } : { sumaSofer: undefined, sumaSursa: SURSA_MANUALA });
            }}
          />
        </Field>
        <button onClick={recalculeaza}>Recalculează din prețuri</button>
      </div>
      <p class="muted">
        {cursa.sumaSursa === SURSA_MANUALA ? 'Introdusă manual.' : (cursa.sumaSursa ?? 'Nicio sumă încă.')}
      </p>
      {element}

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
          {!cursa.plecare && sugerat.plecare && (
            <button class="link" onClick={() => set({ plecare: sugerat.plecare })}>
              Propus din zbor: {sugerat.plecare} · aplică
            </button>
          )}
        </Field>
        <Field label="Retur de la">
          <input type="time" value={cursa.retur ?? ''} onInput={(e) => set({ retur: e.currentTarget.value || undefined })} />
          {!cursa.retur && sugerat.retur && (
            <button class="link" onClick={() => set({ retur: sugerat.retur })}>
              Propus din preluare: {sugerat.retur} · aplică
            </button>
          )}
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

      {dus.some((r) => r.preluare) && IN_UNGARIA.test(norm(cursa.destinatie)) && (
        <button class="primary" onClick={() => go(`/plan/${id}`)}>
          🗺 Plan de preluare
        </button>
      )}

      <Sectiune titlu={`Dus: Timișoara → ${cursa.destinatie || '?'}`} lista={dus} />
      <Sectiune titlu={`Retur: ${cursa.destinatie || '?'} → Timișoara`} lista={retur} />

      <h2 class="day">Spălătorie</h2>
      <div class="row">
        <button class="primary grow" disabled={!masina} onClick={() => set({ spalari: spalari + 1 })}>
          🧽 Spălătorie{spalari > 0 ? ` ×${spalari}` : ''}
        </button>
        {spalari > decontate && (
          <button aria-label="Scade o spălare" onClick={() => set({ spalari: spalari - 1 || undefined })}>
            −1
          </button>
        )}
      </div>
      <p class="muted">
        {!masina
          ? 'Alege mașina cursei ca să se știe ce sumă se decontează.'
          : pret > 0
            ? `${pret} lei la fiecare spălare${spalari > 0 ? ` · în total ${pret * spalari} lei` : ''}${decontate > 0 ? ` · ${decontate} deja decontate` : ''}`
            : 'Suma pentru spălătorie nu e setată (Setări).'}
      </p>

      <h2 class="day">Decont</h2>
      <div class="decont-cursa">
        <span class="linie">
          💼 Cursă:{' '}
          {analiza.inclusaInSalariu
            ? `${fmtLei(cursa.sumaSofer ?? 0)} · inclusă în salariu`
            : analiza.sumaCursa > 0
              ? fmtLei(analiza.sumaCursa)
              : (cursa.sumaSofer ?? 0) > 0
                ? `${fmtLei(cursa.sumaSofer ?? 0)} (decontată)`
                : 'fără sumă încă'}
        </span>
        <span class="linie">
          🅿️ Bilet parcare:{' '}
          {aleBilete.length > 0
            ? aleBilete
                .map((b) => {
                  const ron = b.suma && b.moneda !== 'RON' ? inRon(b.suma, b.moneda, setari.cursuri) : undefined;
                  return `${b.suma ? fmtSumaBilet(b.suma, b.moneda) : 'sumă necitită'}${ron !== undefined ? ` (≈ ${fmtLei(ron)})` : ''}`;
                })
                .join(' + ')
            : cursa.faraBilet
              ? 'fără bilet'
              : 'încă nu e adăugat'}
        </span>
        {analiza.cheltuieliToate.length > 0 && (
          <span class="linie">
            🧾 Cheltuieli extra: {textCheltuieli(analiza.cheltuieliToate)}
          </span>
        )}
        <span class="linie">
          🧽 Spălătorie: {spalari > 0 ? `×${spalari} · ${fmtLei(pret * spalari)}` : 'nu'}
        </span>
        {analiza.deDecontat && (
          <span class="linie rezumat">
            De luat {fmtLei(rezultat.deLuat)}
            {analiza.incasat.EUR + analiza.incasat.RON + analiza.incasat.GBP + analiza.incasat.CHF > 0 && rezultat.lipsa.length === 0
              ? ` · ${textSold(rezultat.sold)}`
              : ''}
          </span>
        )}
        {analiza.decontata && <span class="linie ok">✓ Decontată</span>}
      </div>
      <label class="row">
        <input
          type="checkbox"
          style="width:auto;min-height:0"
          checked={!!cursa.locala}
          onChange={(e) => set({ locala: e.currentTarget.checked || undefined })}
        />
        <span>Cursă locală (poate fi inclusă în salariu)</span>
      </label>
      {locala && (
        <p class="muted">
          {locala.inclusa
            ? `📍 A ${locala.rang}-a cursă locală din lună, din ${setari.curseLocaleInclusePeLuna} incluse în salariu: nu se decontează (banii încasați se predau ca de obicei).`
            : setari.curseLocaleInclusePeLuna > 0
              ? `📍 A ${locala.rang}-a cursă locală din lună; doar primele ${setari.curseLocaleInclusePeLuna} sunt incluse în salariu, deci aceasta se decontează.`
              : '📍 Nicio cursă locală inclusă în salariu: setează numărul în Setări → Prețuri și salariu.'}
        </p>
      )}
      {aleBilete.length === 0 && (
        <label class="row">
          <input
            type="checkbox"
            style="width:auto;min-height:0"
            checked={!!cursa.faraBilet}
            onChange={(e) => set({ faraBilet: e.currentTarget.checked || undefined })}
          />
          <span>Fără bilet de parcare la această cursă</span>
        </label>
      )}
      <button class="primary" disabled={!analiza.deDecontat} onClick={() => go(`/decont/${id}`)}>
        Decontează această cursă
      </button>
      <p class="muted">Decontul nu se blochează dacă lipsește ceva: poți adăuga biletul sau spălarea și după.</p>

      <h2 class="day">Cheltuieli extra</h2>
      {analiza.cheltuieliToate.length === 0 && <p class="muted">Nicio cheltuială extra la această cursă.</p>}
      {analiza.cheltuieliToate.map((x) => (
        <div class="row" key={x.id}>
          <span class="grow">
            🧾 {x.descriere || 'Cheltuială'} · <strong>{fmtSumaBilet(x.suma, x.moneda)}</strong>
            {x.foto && (
              <>
                {' '}
                <button class="chip adauga" onClick={() => window.open(URL.createObjectURL(x.foto!), '_blank')}>
                  📷 bon
                </button>
              </>
            )}
            {!analiza.cheltuieli.some((c) => c.id === x.id) && <span class="muted"> · decontată</span>}
          </span>
          <button
            class="icon"
            aria-label="Șterge cheltuiala"
            onClick={() => confirm(`Ștergi cheltuiala „${x.descriere || 'fără descriere'}"?`) && deleteCheltuiala(x.id)}
          >
            ✕
          </button>
        </div>
      ))}
      <div class="row">
        <input class="grow" placeholder="Descriere (ex. taxă de drum)" value={descriere} onInput={(e) => setDescriere(e.currentTarget.value)} />
      </div>
      <div class="row">
        <input
          class="grow"
          inputMode="decimal"
          placeholder="Suma"
          value={sumaNoua}
          onInput={(e) => setSumaNoua(e.currentTarget.value)}
        />
        <select class="narrow-select" value={monedaNoua} onChange={(e) => setMonedaNoua(e.currentTarget.value as MonedaBilet)}>
          <option value="RON">lei</option>
          <option value="EUR">€</option>
          <option value="HUF">Ft</option>
        </select>
        <label class="btn">
          {fotoNoua ? '📷 ✓' : '📷'}
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFotoNoua(e.currentTarget.files?.[0] ?? undefined)} />
        </label>
        <button onClick={adaugaCheltuiala} disabled={!(Number(sumaNoua.replace(',', '.')) > 0)}>
          Adaugă
        </button>
      </div>
      <p class="muted">Se decontează odată cu cursa. Poza bonului e opțională.</p>

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
