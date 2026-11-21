import { useState } from 'preact/hooks';
import {
  bileteNedecontate,
  calculeazaSold,
  curseNedecontate,
  monedeNecesareCurs,
  restDePredat,
  totalBilete,
  totalPredat,
  venitLuna,
} from '../decont';
import { citesteCurs, cursPentru } from '../curs';
import { azi, fmtData, fmtMoment, fmtSuma, fmtSumaBilet, incasat, textBani, titluCursa } from '../format';
import { deleteDecont, newId, saveDecont, useStore } from '../store';
import { Field, Screen } from '../ui';
import { MONEDE, zero } from '../monede';
import { pretSpalare, spalariNedecontate } from '../spalatorie';
import { stari } from '../stare';
import type { Bilet, Cursuri, Moneda, MonedaBilet, MonedaCurs } from '../types';

function textBilete(b: Bilet[]): string {
  const t = totalBilete(b);
  const parti = (['HUF', 'EUR', 'RON'] as MonedaBilet[]).filter((m) => t[m]).map((m) => fmtSumaBilet(t[m]!, m));
  return parti.length ? parti.join(' + ') : '—';
}

const lei = (x: number) => fmtSuma(x, 'RON');

/** Rezultatul decontului într-o singură propoziție: de primit sau de predat. */
function textSold(sold: number): string {
  if (sold > 0) return `De primit de la firmă: ${lei(sold)}`;
  if (sold < 0) return `De predat firmei: ${lei(-sold)}`;
  return 'Decont echilibrat: nu primești și nu predai nimic';
}

export function DecontScreen() {
  const { rezervari, bilete, curse, deconturi, masini, setari } = useStore();
  const [data, setData] = useState(azi());
  const [excluse, setExcluse] = useState<string[]>([]);
  const [scrise, setScrise] = useState<Partial<Record<Moneda, string>>>({});
  const [note, setNote] = useState('');
  const [excluseSpal, setExcluseSpal] = useState<string[]>([]);
  const [bifate, setBifate] = useState<Record<string, boolean>>({});
  const [cursuriScrise, setCursuriScrise] = useState<Partial<Record<MonedaCurs, string>>>({});
  const [luna, setLuna] = useState(azi().slice(0, 7));

  const rest = restDePredat(rezervari, deconturi);
  const nedecontate = bileteNedecontate(bilete, deconturi).sort((a, b) => (b.iesire ?? '').localeCompare(a.iesire ?? ''));
  const alese = nedecontate.filter((b) => !excluse.includes(b.id));
  const valoare = (m: Moneda) => scrise[m] ?? String(Math.max(rest[m], 0));
  const predat = zero();
  for (const m of MONEDE) predat[m] = Number(valoare(m)) || 0;
  // EUR și RON se arată mereu; GBP/CHF doar când au fost încasate sau predate.
  const vizibile = MONEDE.filter((m) => m === 'EUR' || m === 'RON' || rest[m] !== 0 || scrise[m] !== undefined);

  const spalatorii = curse
    .map((c) => {
      const nr = spalariNedecontate(c, deconturi);
      return { cursa: c, nr, suma: nr * pretSpalare(masini.find((m) => m.id === c.masinaId), setari) };
    })
    .filter((x) => x.nr > 0)
    .sort((a, b) => b.cursa.data.localeCompare(a.cursa.data));
  const spalAlese = spalatorii.filter((x) => !excluseSpal.includes(x.cursa.id));
  const sumaSpal = (l: typeof spalatorii) => l.reduce((t, x) => t + x.suma, 0);
  const nrSpal = (l: typeof spalatorii) => l.reduce((t, x) => t + x.nr, 0);

  const stare = stari(curse, setari, Date.now());
  const curseDe = curseNedecontate(curse, deconturi).sort((a, b) => b.data.localeCompare(a.data));
  // Cursele terminate sunt bifate de la început; cele în curs sau viitoare le bifezi tu.
  const bifata = (id: string) => bifate[id] ?? stare.get(id) === 'terminata';
  const curseAlese = curseDe.filter((c) => bifata(c.id));
  const sumaCurse = curseAlese.reduce((t, c) => t + (c.sumaSofer ?? 0), 0);

  // Cursurile pentru acest decont: cele din Setări, ajustabile aici.
  const cursuri: Cursuri = { ...setari.cursuri };
  for (const [m, t] of Object.entries(cursuriScrise) as [MonedaCurs, string][]) {
    const c = citesteCurs(t);
    if (c === undefined) delete cursuri[m];
    else cursuri[m] = c;
  }
  const necesare = monedeNecesareCurs(predat, alese) as MonedaCurs[];
  const sold = calculeazaSold({ curse: sumaCurse, spalatorii: sumaSpal(spalAlese), bilete: alese, predat, cursuri });

  const gol = MONEDE.every((m) => predat[m] <= 0) && alese.length === 0 && spalAlese.length === 0 && curseAlese.length === 0;
  const depasit = MONEDE.some((m) => predat[m] > rest[m]);
  const nuPoateInregistra = gol || sold.lipsa.length > 0;

  function comuta(id: string) {
    setExcluse(excluse.includes(id) ? excluse.filter((x) => x !== id) : [...excluse, id]);
  }

  async function inregistreaza() {
    if (nuPoateInregistra) return;
    if (depasit && !confirm('Predai mai mult decât ai încasat. Continui?')) return;
    const cursuriFolosite: Cursuri = {};
    for (const m of necesare) cursuriFolosite[m] = cursPentru(m, cursuri);
    await saveDecont({
      id: newId(),
      creat: Date.now(),
      data,
      predat,
      bilete: alese.map((b) => b.id),
      spalatorii: spalAlese.length ? spalAlese.map((x) => ({ cursaId: x.cursa.id, nr: x.nr, suma: x.suma })) : undefined,
      curse: curseAlese.length ? curseAlese.map((c) => ({ cursaId: c.id, suma: c.sumaSofer ?? 0 })) : undefined,
      cursuri: necesare.length ? cursuriFolosite : undefined,
      soldRon: sold.sold,
      note: note.trim() || undefined,
    });
    setExcluse([]);
    setExcluseSpal([]);
    setBifate({});
    setCursuriScrise({});
    setScrise({});
    setNote('');
  }

  async function sterge(id: string) {
    if (confirm('Anulezi decontul? Banii, biletele, spălările și cursele revin ca nepredate / nedecontate.')) await deleteDecont(id);
  }

  const titluCursaDe = (id: string) => {
    const c = curse.find((x) => x.id === id);
    return c ? `${titluCursa(c)} · ${fmtData(c.data)}` : 'cursă ștearsă';
  };
  const istoric = [...deconturi].sort((a, b) => b.creat - a.creat);
  const venit = venitLuna(curse, setari.salariuBazaRon, luna);

  return (
    <Screen title="Decont" tabs>
      <div class="total">
        <span>Încasat în total</span>
        <strong>{textBani(incasat(rezervari))}</strong>
      </div>
      <div class="total">
        <span>Predat până acum</span>
        <strong>{textBani(totalPredat(deconturi))}</strong>
      </div>
      <div class="total">
        <span>De predat la firmă</span>
        <strong>{textBani(MONEDE.reduce((t, m) => ({ ...t, [m]: Math.max(rest[m], 0) }), zero()))}</strong>
      </div>
      <div class="total">
        <span>Curse nedecontate ({curseDe.length})</span>
        <strong>{lei(curseDe.reduce((t, c) => t + (c.sumaSofer ?? 0), 0))}</strong>
      </div>
      <div class="total">
        <span>Bilete nedecontate ({nedecontate.length})</span>
        <strong>{textBilete(nedecontate)}</strong>
      </div>
      <div class="total">
        <span>Spălătorie nedecontată ({nrSpal(spalatorii)})</span>
        <strong>{lei(sumaSpal(spalatorii))}</strong>
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
      <p class="muted">Cursele se numără după data lor, decontate sau nu. Salariul de bază nu se decontează.</p>

      <h2 class="day">Decont nou</h2>
      <Field label="Data">
        <input type="date" value={data} onInput={(e) => setData(e.currentTarget.value || azi())} />
      </Field>

      <h2 class="day">Curse decontate ({curseAlese.length} din {curseDe.length})</h2>
      {curseDe.length === 0 && <p class="muted">Nicio cursă cu sumă nedecontată.</p>}
      {curseDe.map((c) => (
        <label class="row" key={c.id}>
          <input
            type="checkbox"
            style="width:auto;min-height:0"
            checked={bifata(c.id)}
            onChange={() => setBifate({ ...bifate, [c.id]: !bifata(c.id) })}
          />
          <span class="grow">
            <strong>{lei(c.sumaSofer ?? 0)}</strong>
            <br />
            <span class="muted">{titluCursaDe(c.id)}</span>
          </span>
        </label>
      ))}
      {curseAlese.length > 0 && <p class="muted">Total curse alese: {lei(sumaCurse)}</p>}

      <h2 class="day">Bani predați</h2>
      <div class="grid">
        {vizibile.map((m) => (
          <Field key={m} label={`${m} (rest: ${fmtSuma(Math.max(rest[m], 0), m)})`}>
            <input
              type="number"
              min={0}
              value={valoare(m)}
              onInput={(e) => setScrise({ ...scrise, [m]: e.currentTarget.value })}
            />
          </Field>
        ))}
      </div>
      <p class="muted">
        Poți lăsa mai puțin decât restul: diferența rămâne de predat data viitoare. Valuta predată se transformă în lei la curs.
      </p>

      <h2 class="day">Bilete decontate ({alese.length} din {nedecontate.length})</h2>
      {nedecontate.length === 0 && <p class="muted">Niciun bilet nedecontat.</p>}
      {nedecontate.map((b) => (
        <label class="row" key={b.id}>
          <input
            type="checkbox"
            style="width:auto;min-height:0"
            checked={!excluse.includes(b.id)}
            onChange={() => comuta(b.id)}
          />
          <span class="grow">
            <strong>{b.suma ? fmtSumaBilet(b.suma, b.moneda) : 'sumă?'}</strong>
            <br />
            <span class="muted">
              {b.iesire ? `${fmtMoment(b.iesire)} · ` : ''}
              {titluCursaDe(b.cursaId)}
            </span>
          </span>
        </label>
      ))}
      {alese.length > 0 && <p class="muted">Total bilete alese: {textBilete(alese)}</p>}

      <h2 class="day">
        Spălătorie ({spalAlese.length} din {spalatorii.length})
      </h2>
      {spalatorii.length === 0 && <p class="muted">Nicio spălare nedecontată.</p>}
      {spalatorii.map((x) => (
        <label class="row" key={x.cursa.id}>
          <input
            type="checkbox"
            style="width:auto;min-height:0"
            checked={!excluseSpal.includes(x.cursa.id)}
            onChange={() =>
              setExcluseSpal(
                excluseSpal.includes(x.cursa.id) ? excluseSpal.filter((i) => i !== x.cursa.id) : [...excluseSpal, x.cursa.id],
              )
            }
          />
          <span class="grow">
            <strong>
              {x.nr} × spălare · {lei(x.suma)}
            </strong>
            <br />
            <span class="muted">{titluCursaDe(x.cursa.id)}</span>
          </span>
        </label>
      ))}
      {spalAlese.length > 0 && <p class="muted">Total spălătorie aleasă: {lei(sumaSpal(spalAlese))}</p>}

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

      <h2 class="day">Rezultat</h2>
      <div class="total">
        <span>De luat de la firmă</span>
        <strong>{lei(sold.deLuat)}</strong>
      </div>
      <div class="total">
        <span>Predat (valoare în lei)</span>
        <strong>{lei(sold.predat)}</strong>
      </div>
      <div class={sold.sold >= 0 ? 'total sold-primit' : 'total sold-predat'}>
        <span>{textSold(sold.sold)}</span>
      </div>
      {sold.lipsa.length > 0 && (
        <p class="muted">Lipsește cursul pentru {sold.lipsa.join(', ')}. Completează-l mai sus sau în Setări → Curs valutar.</p>
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
