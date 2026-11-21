import { useState } from 'preact/hooks';
import { calculeazaSold, monedeNecesareCurs, restDePredat, totalBilete, totalPredat, venitLuna } from '../decont';
import { analizaCursa, soldCurse, type AnalizaCursa } from '../decontcursa';
import { citesteCurs, cursPentru, inRon } from '../curs';
import { azi, fmtData, fmtSuma, fmtSumaBilet, incasat, textBani, titluCursa } from '../format';
import { deleteDecont, newId, saveDecont, useStore } from '../store';
import { Field, Screen } from '../ui';
import { MONEDE, zero } from '../monede';
import { stari } from '../stare';
import { incluseInSalariu } from '../locale';
import type { Bilet, Cursuri, Moneda, MonedaBilet, MonedaCurs } from '../types';

const lei = (x: number) => fmtSuma(x, 'RON');

function textBilete(b: Bilet[]): string {
  const t = totalBilete(b);
  const parti = (['HUF', 'EUR', 'RON'] as MonedaBilet[]).filter((m) => t[m]).map((m) => fmtSumaBilet(t[m]!, m));
  return parti.length ? parti.join(' + ') : '—';
}

/** Rezultatul decontului într-o singură propoziție: de primit sau de predat. */
export function textSold(sold: number): string {
  if (sold > 0) return `De primit de la firmă: ${lei(sold)}`;
  if (sold < 0) return `De predat firmei: ${lei(-sold)}`;
  return 'Decont echilibrat: nu primești și nu predai nimic';
}

/** Un bilet cu suma lui și, pentru valută, echivalentul în lei: „Parcare 40 € (≈ 220 lei)". */
function textBiletLei(b: Bilet, cursuri: Cursuri): string {
  if (!b.suma) return 'Parcare (sumă necitită)';
  const ron = b.moneda !== 'RON' ? inRon(b.suma, b.moneda, cursuri) : undefined;
  return `Parcare ${fmtSumaBilet(b.suma, b.moneda)}${ron !== undefined ? ` (≈ ${lei(Math.round(ron * 100) / 100)})` : ''}`;
}

function textMonede(t: Record<Moneda, number>): string {
  return textBani(t);
}

function RandCursa(props: {
  a: AnalizaCursa;
  bifat: boolean;
  onComuta: () => void;
  cursuri: Cursuri;
  titlu: string;
}) {
  const { a, cursuri } = props;
  const r = soldCurse([a], cursuri);
  return (
    <label class="row cursa-decont">
      <input type="checkbox" style="width:auto;min-height:0" checked={props.bifat} onChange={props.onComuta} />
      <span class="grow">
        <strong>{props.titlu}</strong>
        <br />
        {a.sumaCursa > 0 && <span class="linie">Cursă {lei(a.sumaCursa)}</span>}
        {a.inclusaInSalariu && <span class="linie">📍 Cursă locală: inclusă în salariu, nu se decontează</span>}
        {!a.inclusaInSalariu && a.sumaCursa === 0 && (a.cursa.sumaSofer ?? 0) === 0 && (
          <span class="linie">💼 Cursă: fără sumă încă (o poți seta oricând în ecranul cursei)</span>
        )}
        {a.bilete.map((b) => (
          <span class="linie" key={b.id}>
            🅿️ {textBiletLei(b, cursuri)}
          </span>
        ))}
        {a.spalari.nr > 0 && (
          <span class="linie">
            🧽 Spălătorie ×{a.spalari.nr} · {lei(a.spalari.suma)}
          </span>
        )}
        <span class="linie rezumat">
          De luat {lei(r.deLuat)}
          {textMonede(a.incasat) !== '—' ? ` · Încasat ${textMonede(a.incasat)}` : ''}
          {r.lipsa.length === 0 && textMonede(a.incasat) !== '—' ? ` → ${textSold(r.sold)}` : ''}
        </span>
      </span>
    </label>
  );
}

export function DecontScreen({ preselect }: { preselect?: string }) {
  const { rezervari, bilete, curse, deconturi, masini, setari } = useStore();
  const [data, setData] = useState(azi());
  const [bifate, setBifate] = useState<Record<string, boolean>>({});
  const [pastrat, setPastrat] = useState<Partial<Record<Moneda, string>>>({});
  const [note, setNote] = useState('');
  const [cursuriScrise, setCursuriScrise] = useState<Partial<Record<MonedaCurs, string>>>({});
  const [luna, setLuna] = useState(azi().slice(0, 7));

  const rest = restDePredat(rezervari, deconturi);
  const ctx = { rezervari, bilete, deconturi, masini, setari, curse };
  const stare = stari(curse, setari, Date.now());

  // Cursele cu ceva de decontat, cele mai noi primele.
  const analize = curse
    .map((c) => analizaCursa(c, ctx))
    .filter((a) => a.deDecontat)
    .sort((a, b) => b.cursa.data.localeCompare(a.cursa.data));
  // Cursele terminate sunt bifate de la început; dacă vii dintr-o cursă, doar ea.
  const bifata = (id: string) => bifate[id] ?? (preselect ? id === preselect : stare.get(id) === 'terminata');
  const alese = analize.filter((a) => bifata(a.cursa.id));

  // Cursurile pentru acest decont: cele din Setări, ajustabile aici.
  const cursuri: Cursuri = { ...setari.cursuri };
  for (const [m, t] of Object.entries(cursuriScrise) as [MonedaCurs, string][]) {
    const c = citesteCurs(t);
    if (c === undefined) delete cursuri[m];
    else cursuri[m] = c;
  }

  // Banii încasați la cursele alese; de predat = ce ai încasat la ele (cel mult ce ai la tine) minus ce păstrezi.
  const incasatAlese = zero();
  for (const a of alese) for (const m of MONEDE) incasatAlese[m] += a.incasat[m];
  const pastratNr = zero();
  for (const m of MONEDE) pastratNr[m] = Math.max(Number(pastrat[m]?.replace(',', '.')) || 0, 0);
  const predat = zero();
  for (const m of MONEDE) predat[m] = Math.max(Math.min(Math.max(rest[m], 0), incasatAlese[m]) - pastratNr[m], 0);

  const bileteAlese = alese.flatMap((a) => a.bilete);
  const sumaCurse = alese.reduce((t, a) => t + a.sumaCursa, 0);
  const sumaSpal = alese.reduce((t, a) => t + a.spalari.suma, 0);
  const sold = calculeazaSold({ curse: sumaCurse, spalatorii: sumaSpal, bilete: bileteAlese, predat, cursuri });
  const necesare = monedeNecesareCurs(predat, bileteAlese) as MonedaCurs[];
  const vizibile = MONEDE.filter((m) => incasatAlese[m] > 0 || pastratNr[m] > 0 || pastrat[m] !== undefined);
  const nuPoateInregistra = alese.length === 0 || sold.lipsa.length > 0;

  async function inregistreaza() {
    if (nuPoateInregistra) return;
    const cursuriFolosite: Cursuri = {};
    for (const m of necesare) cursuriFolosite[m] = cursPentru(m, cursuri);
    const spal = alese.filter((a) => a.spalari.nr > 0);
    // Toate cursele alese intră în decont, și cele fără sumă (suma 0): așa banii încasați la ele nu se mai cer a doua oară.
    const curseDec = alese;
    await saveDecont({
      id: newId(),
      creat: Date.now(),
      data,
      predat,
      pastrat: MONEDE.some((m) => pastratNr[m] > 0) ? pastratNr : undefined,
      bilete: bileteAlese.map((b) => b.id),
      spalatorii: spal.length ? spal.map((a) => ({ cursaId: a.cursa.id, nr: a.spalari.nr, suma: a.spalari.suma })) : undefined,
      curse: curseDec.map((a) => ({ cursaId: a.cursa.id, suma: a.sumaCursa })),
      cursuri: necesare.length ? cursuriFolosite : undefined,
      soldRon: sold.sold,
      note: note.trim() || undefined,
    });
    setBifate({});
    setPastrat({});
    setCursuriScrise({});
    setNote('');
  }

  async function sterge(id: string) {
    if (confirm('Anulezi decontul? Cursele, biletele, spălările și banii revin ca nedecontate / nepredate.')) await deleteDecont(id);
  }

  const titluDe = (id: string) => {
    const c = curse.find((x) => x.id === id);
    return c ? `${titluCursa(c)} · ${fmtData(c.data)}` : 'cursă ștearsă';
  };
  const istoric = [...deconturi].sort((a, b) => b.creat - a.creat);
  const venit = venitLuna(curse, setari.salariuBazaRon, luna, incluseInSalariu(curse, setari.curseLocaleInclusePeLuna));
  const deLuatTotal = analize.reduce((t, a) => t + soldCurse([a], setari.cursuri).deLuat, 0);

  return (
    <Screen title="Decont" tabs backTo={preselect ? `/cursa/${preselect}` : undefined}>
      <div class="total">
        <span>Ți se cuvine pentru {analize.length} curse nedecontate</span>
        <strong>{lei(Math.round(deLuatTotal * 100) / 100)}</strong>
      </div>
      <div class="total">
        <span>Ai la tine, de predat</span>
        <strong>{textBani(MONEDE.reduce((t, m) => ({ ...t, [m]: Math.max(rest[m], 0) }), zero()))}</strong>
      </div>
      <div class="total">
        <span>Încasat / predat până acum</span>
        <strong>
          {textBani(incasat(rezervari))} / {textBani(totalPredat(deconturi))}
        </strong>
      </div>

      <h2 class="day">Luna</h2>
      <Field label="Luna">
        <input type="month" value={luna} onInput={(e) => setLuna(e.currentTarget.value || azi().slice(0, 7))} />
      </Field>
      <div class="total">
        <span>Salariu de bază</span>
        <strong>{lei(venit.salariu)}</strong>
      </div>
      <div class="total">
        <span>Curse ({venit.nr})</span>
        <strong>{lei(venit.curse)}</strong>
      </div>
      <div class="total">
        <span>Total luna aceasta</span>
        <strong>{lei(venit.total)}</strong>
      </div>
      {venit.incluse > 0 && (
        <p class="muted">{venit.incluse} curse locale sunt incluse în salariu și nu se adaugă.</p>
      )}
      <p class="muted">Cursele se numără după data lor, decontate sau nu. Salariul de bază nu se decontează.</p>

      <h2 class="day">Decont nou</h2>
      <Field label="Data">
        <input type="date" value={data} onInput={(e) => setData(e.currentTarget.value || azi())} />
      </Field>

      <h2 class="day">
        Curse ({alese.length} din {analize.length})
      </h2>
      <p class="muted">
        Pentru fiecare cursă se decontează tot odată: suma cursei, parcarea și spălătoria. Ce adaugi după decont apare din nou aici.
      </p>
      {analize.length === 0 && <p class="muted">Nimic de decontat acum.</p>}
      {analize.map((a) => (
        <RandCursa
          key={a.cursa.id}
          a={a}
          cursuri={cursuri}
          titlu={titluDe(a.cursa.id)}
          bifat={bifata(a.cursa.id)}
          onComuta={() => setBifate({ ...bifate, [a.cursa.id]: !bifata(a.cursa.id) })}
        />
      ))}

      {necesare.length > 0 && (
        <>
          <h2 class="day">Curs pentru acest decont</h2>
          <div class="grid">
            {necesare.map((m) => (
              <Field key={m} label={`1 ${m} = … lei`}>
                <input
                  inputMode="decimal"
                  placeholder="curs necunoscut"
                  value={cursuriScrise[m] ?? (setari.cursuri[m] !== undefined ? String(setari.cursuri[m]) : '')}
                  onInput={(e) => setCursuriScrise({ ...cursuriScrise, [m]: e.currentTarget.value })}
                />
              </Field>
            ))}
          </div>
          <p class="muted">Cursul din Setări, ajustabil doar pentru acest decont.</p>
        </>
      )}

      {alese.length > 0 && (
        <>
          <h2 class="day">Rezultat</h2>
          <div class={sold.sold >= 0 ? 'total sold-primit mare' : 'total sold-predat mare'}>
            <span>{sold.lipsa.length ? 'Rezultat necalculat (lipsește un curs)' : textSold(sold.sold)}</span>
          </div>
          {sold.lipsa.length > 0 && (
            <p class="muted">Lipsește cursul pentru {sold.lipsa.join(', ')}. Completează-l mai sus sau în Setări → Curs valutar.</p>
          )}

          <div class="calcul">
            <p class="calcul-titlu">Cum s-a calculat</p>
            <p>
              <strong>1. Ți se cuvine de la firmă: {lei(sold.deLuat)}</strong>
            </p>
            <ul>
              {sumaCurse > 0 && <li>Curse ({alese.filter((a) => a.sumaCursa > 0).length}): {lei(sumaCurse)}</li>}
              {bileteAlese.length > 0 && <li>Parcare ({bileteAlese.length} bilete): {lei(Math.round((sold.deLuat - sumaCurse - sumaSpal) * 100) / 100)}</li>}
              {sumaSpal > 0 && <li>Spălătorie: {lei(sumaSpal)}</li>}
            </ul>
            <p>
              <strong>2. Ai încasat tu de la clienți: {textBani(predat) === '—' ? 'nimic de predat' : textBani(predat)}</strong>
              {sold.predat > 0 && textBani(predat) !== lei(sold.predat) ? ` (= ${lei(sold.predat)} la curs)` : ''}
              <br />
              <span class="muted">Banii ăștia îi predai firmei, deci se scad din ce ți se cuvine.</span>
            </p>
            <p>
              <strong>3. Diferența: {lei(sold.deLuat)} − {lei(sold.predat)} = {lei(sold.sold)}</strong>
            </p>
          </div>

          {vizibile.length > 0 && (
            <>
              <h3 class="modal-sub">Păstrez la mine (rest, alte cheltuieli)</h3>
              <div class="grid">
                {vizibile.map((m) => (
                  <Field key={m} label={`${m} (încasat: ${fmtSuma(incasatAlese[m], m)})`}>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={pastrat[m] ?? ''}
                      onInput={(e) => setPastrat({ ...pastrat, [m]: e.currentTarget.value })}
                    />
                  </Field>
                ))}
              </div>
              <p class="muted">Suma păstrată nu se predă acum: rămâne la tine și apare data viitoare la „Ai la tine".</p>
            </>
          )}
        </>
      )}

      <Field label="Notă (opțional)">
        <input value={note} onInput={(e) => setNote(e.currentTarget.value)} />
      </Field>
      <button class="primary" disabled={nuPoateInregistra} onClick={inregistreaza}>
        Înregistrează decontul
      </button>

      {istoric.length > 0 && <h2 class="day">Deconturi făcute</h2>}
      {istoric.map((d) => {
        const bd = bilete.filter((b) => d.bilete.includes(b.id));
        return (
          <div class="row card-wrap" key={d.id}>
            <span class="grow">
              <strong>{fmtData(d.data)}</strong>
              <br />
              <span>Predat: {textBani(d.predat)}</span>
              {d.pastrat && (
                <>
                  <br />
                  <span class="muted">Păstrat la tine: {textBani(d.pastrat)}</span>
                </>
              )}
              {d.soldRon !== undefined && (
                <>
                  <br />
                  <span>{textSold(d.soldRon)}</span>
                </>
              )}
              <br />
              <span class="muted">
                {d.curse?.length ? `${d.curse.length} curse · ${lei(d.curse.reduce((t, c) => t + c.suma, 0))} · ` : ''}
                {d.bilete.length} bilete{bd.length ? ` · ${textBilete(bd)}` : ''}
                {d.spalatorii?.length
                  ? ` · ${d.spalatorii.reduce((n, s) => n + s.nr, 0)} spălări · ${lei(d.spalatorii.reduce((t, s) => t + s.suma, 0))}`
                  : ''}
                {d.note ? ` · ${d.note}` : ''}
              </span>
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
