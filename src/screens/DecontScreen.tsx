import { useState } from 'preact/hooks';
import { calculeazaSold, impartire, monedeNecesareCurs, restDePredat, textImpartire } from '../decont';
import { analizaCursa, type AnalizaCursa } from '../decontcursa';
import { citesteCurs, cursPentru, inRon } from '../curs';
import { azi, fmtData, fmtSuma, textBani, titluCursa } from '../format';
import { newId, saveDecont, useStore } from '../store';
import { Field, Screen } from '../ui';
import { MONEDE, zero } from '../monede';
import { stari } from '../stare';
import { go } from '../router';
import type { Cursuri, Moneda, MonedaBilet, MonedaCurs } from '../types';

const rotunjeste = (x: number) => Math.round(x * 100) / 100;
const lei = (x: number) => fmtSuma(rotunjeste(x), 'RON');

/** Un rând din bon: eticheta în stânga, suma în dreapta. */
function Rand(props: { nume: string; suma: string; titlu?: boolean }) {
  return (
    <div class={props.titlu ? 'bon-rand titlu' : 'bon-rand'}>
      <span>{props.nume}</span>
      <span>{props.suma}</span>
    </div>
  );
}

/** O cursă în lista de alegere: ce intră din ea la partea ta și cât ai încasat. */
function RandCursa(props: { a: AnalizaCursa; bifat: boolean; onComuta: () => void; cursuri: Cursuri }) {
  const { a, cursuri } = props;
  const parte = calculeazaSold({
    curse: a.sumaCursa,
    spalatorii: a.spalari.suma,
    bilete: [...a.bilete, ...a.cheltuieli],
    predat: zero(),
    cursuri,
  }).deLuat;
  const faraSuma = !a.inclusaInSalariu && !((a.cursa.sumaSofer ?? 0) > 0);
  return (
    <label class="row cursa-decont">
      <input type="checkbox" style="width:auto;min-height:0" checked={props.bifat} onChange={props.onComuta} />
      <span class="grow">
        <strong>
          {titluCursa(a.cursa)} · {fmtData(a.cursa.data)}
        </strong>
        <span class="linie muted">
          Partea ta {lei(parte)}
          {textBani(a.incasat) !== '—' ? ` · încasat ${textBani(a.incasat)}` : ''}
        </span>
        {a.inclusaInSalariu && <span class="linie muted">📍 Locală, inclusă în salariu</span>}
        {faraSuma && <span class="linie aviz">Cursă fără sumă</span>}
      </span>
    </label>
  );
}

export function DecontScreen({ preselect }: { preselect?: string }) {
  const { rezervari, bilete, curse, deconturi, masini, setari, cheltuieli } = useStore();
  const [data, setData] = useState(azi());
  const [bifate, setBifate] = useState<Record<string, boolean>>({});
  const [alege, setAlege] = useState(false);
  const [cuMaruntis, setCuMaruntis] = useState(false);
  const [maruntis, setMaruntis] = useState<Partial<Record<Moneda, string>>>({});
  const [predaVechi, setPredaVechi] = useState(false);
  const [note, setNote] = useState('');
  const [cursuriScrise, setCursuriScrise] = useState<Partial<Record<MonedaCurs, string>>>({});

  const rest = restDePredat(rezervari, deconturi);
  const ctx = { rezervari, bilete, deconturi, masini, setari, curse, cheltuieli };
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

  // Bani rămași la tine din deconturi trecute (mărunțiș): nu țin de nicio cursă nedecontată.
  const vechi = zero();
  for (const m of MONEDE) vechi[m] = Math.max(rest[m] - analize.reduce((t, a) => t + a.incasat[m], 0), 0);
  const areVechi = MONEDE.some((m) => vechi[m] > 0);

  // Total încasat: banii de la cursele alese (cel mult cât ai la tine).
  const incasat = zero();
  for (const m of MONEDE) {
    const aleCurselor = alese.reduce((t, a) => t + a.incasat[m], 0);
    incasat[m] = Math.max(Math.min(Math.max(rest[m], 0), aleCurselor + (predaVechi ? vechi[m] : 0)), 0);
  }
  const tinut = zero();
  for (const m of MONEDE) {
    const scris = cuMaruntis ? Number(maruntis[m]?.replace(',', '.')) || 0 : 0;
    tinut[m] = Math.min(Math.max(scris, 0), incasat[m]);
  }
  // Banii care intră efectiv în acest decont.
  const predat = zero();
  for (const m of MONEDE) predat[m] = rotunjeste(incasat[m] - tinut[m]);

  const bileteAlese = alese.flatMap((a) => a.bilete);
  const cheltuieliAlese = alese.flatMap((a) => a.cheltuieli);
  const sumaLei = (lista: { suma?: number; moneda: MonedaBilet }[]) =>
    lista.reduce((t, x) => t + (x.suma ? (inRon(x.suma, x.moneda, cursuri) ?? 0) : 0), 0);
  const sumaCurse = alese.reduce((t, a) => t + a.sumaCursa, 0);
  const sumaSpal = alese.reduce((t, a) => t + a.spalari.suma, 0);
  const platite = [...bileteAlese, ...cheltuieliAlese];
  const sold = calculeazaSold({ curse: sumaCurse, spalatorii: sumaSpal, bilete: platite, predat, cursuri });
  const necesare = monedeNecesareCurs(incasat, platite) as MonedaCurs[];
  const lipsaCurs = necesare.filter((m) => cursuri[m] === undefined);
  const rezultat = impartire(predat, sold.deLuat, cursuri);
  const totalIncasat = calculeazaSold({ curse: 0, spalatorii: 0, bilete: [], predat: incasat, cursuri }).predat;
  const faraSuma = alese.filter((a) => !a.inclusaInSalariu && !((a.cursa.sumaSofer ?? 0) > 0)).length;
  const listaDeschisa = alege || alese.length === 0;
  const nuPoateInchide = alese.length === 0 || lipsaCurs.length > 0;

  async function inchide() {
    if (nuPoateInchide) return;
    if (!confirm(`Închizi decontul pentru ${alese.length} ${alese.length === 1 ? 'cursă' : 'curse'}?\n${textImpartire(rezultat)}`)) return;
    const cursuriFolosite: Cursuri = {};
    for (const m of necesare) cursuriFolosite[m] = cursPentru(m, cursuri);
    const spal = alese.filter((a) => a.spalari.nr > 0);
    await saveDecont({
      id: newId(),
      creat: Date.now(),
      data,
      predat,
      pastrat: MONEDE.some((m) => tinut[m] > 0) ? tinut : undefined,
      bilete: bileteAlese.map((b) => b.id),
      cheltuieli: cheltuieliAlese.length ? cheltuieliAlese.map((x) => x.id) : undefined,
      spalatorii: spal.length ? spal.map((a) => ({ cursaId: a.cursa.id, nr: a.spalari.nr, suma: a.spalari.suma })) : undefined,
      // Toate cursele alese intră în decont, și cele fără sumă (suma 0): așa banii încasați la ele nu se mai cer a doua oară.
      curse: alese.map((a) => ({ cursaId: a.cursa.id, suma: a.sumaCursa })),
      cursuri: necesare.length ? cursuriFolosite : undefined,
      soldRon: sold.sold,
      rezultat,
      note: note.trim() || undefined,
    });
    go('/decont-istoric');
  }

  const legaturi = (
    <div class="row">
      <button class="grow" onClick={() => go('/decont-istoric')}>
        🗂 Deconturi făcute
      </button>
      <button class="grow" onClick={() => go('/decont-luna')}>
        📅 Luna
      </button>
    </div>
  );

  if (analize.length === 0) {
    return (
      <Screen title="Decont" tabs backTo={preselect ? `/cursa/${preselect}` : undefined}>
        <p class="empty">Nimic de decontat acum.</p>
        {areVechi && <p class="muted">Ai la tine mărunțiș din deconturile trecute: {textBani(vechi)}.</p>}
        {legaturi}
      </Screen>
    );
  }

  return (
    <Screen title="Decont" tabs backTo={preselect ? `/cursa/${preselect}` : undefined}>
      <button class="row alege-curse" aria-expanded={listaDeschisa} onClick={() => setAlege(!alege)}>
        <span class="grow">
          Curse în decont: <strong>{alese.length}</strong> din {analize.length}
        </span>
        <span class="alege-text">{listaDeschisa ? 'Gata' : 'Alege'}</span>
      </button>
      {listaDeschisa &&
        analize.map((a) => (
          <RandCursa
            key={a.cursa.id}
            a={a}
            cursuri={cursuri}
            bifat={bifata(a.cursa.id)}
            onComuta={() => {
              setAlege(true);
              setBifate({ ...bifate, [a.cursa.id]: !bifata(a.cursa.id) });
            }}
          />
        ))}

      {alese.length > 0 && (
        <>
          {faraSuma > 0 && (
            <p class="aviz">
              {faraSuma === 1 ? 'O cursă nu are sumă' : `${faraSuma} curse nu au sumă`}: nu intră în partea ta.
            </p>
          )}

          <div class="bon">
            <Rand titlu nume="Total încasat" suma={lipsaCurs.length ? '—' : lei(totalIncasat)} />
            {MONEDE.filter((m) => incasat[m] > 0).map((m) => (
              <Rand
                key={m}
                nume={m === 'RON' ? 'Lei' : `${fmtSuma(incasat[m], m)}${cursuri[m] ? ` (curs ${cursuri[m]!.toLocaleString('ro-RO')})` : ''}`}
                suma={m === 'RON' ? lei(incasat[m]) : cursuri[m] ? lei(incasat[m] * cursuri[m]!) : '—'}
              />
            ))}

            <hr />
            <Rand titlu nume="Partea ta" suma={lipsaCurs.length ? '—' : `− ${lei(sold.deLuat)}`} />
            {sumaCurse > 0 && <Rand nume={`Curse (${alese.filter((a) => a.sumaCursa > 0).length})`} suma={lei(sumaCurse)} />}
            {bileteAlese.length > 0 && <Rand nume="Parcare" suma={lei(sumaLei(bileteAlese))} />}
            {sumaSpal > 0 && <Rand nume="Spălătorie" suma={lei(sumaSpal)} />}
            {cheltuieliAlese.length > 0 && <Rand nume="Alte cheltuieli" suma={lei(sumaLei(cheltuieliAlese))} />}

            {MONEDE.some((m) => tinut[m] > 0) && (
              <>
                <hr />
                <Rand titlu nume="Ții ca mărunțiș" suma={`− ${textBani(tinut)}`} />
              </>
            )}

            {lipsaCurs.length > 0 ? (
              <p class="aviz">Scrie cursul pentru {lipsaCurs.join(', ')} ca să iasă rezultatul.</p>
            ) : (
              <div class={rezultat.primeste > 0 ? 'bon-rezultat luat' : 'bon-rezultat'}>
                {rezultat.primeste > 0 ? (
                  <>
                    <span>Mai ai de luat</span>
                    <strong>{lei(rezultat.primeste)}</strong>
                  </>
                ) : MONEDE.some((m) => rezultat.preda[m] > 0) ? (
                  <>
                    <span>De predat</span>
                    <strong>{textBani(rezultat.preda)}</strong>
                  </>
                ) : (
                  <span>Nimic de predat, nimic de luat</span>
                )}
              </div>
            )}
          </div>

          {necesare.length > 0 && (
            <div class="grid">
              {necesare.map((m) => (
                <Field key={m} label={`Curs: 1 ${m} = … lei`}>
                  <input
                    inputMode="decimal"
                    placeholder="curs necunoscut"
                    value={cursuriScrise[m] ?? (setari.cursuri[m] !== undefined ? String(setari.cursuri[m]) : '')}
                    onInput={(e) => setCursuriScrise({ ...cursuriScrise, [m]: e.currentTarget.value })}
                  />
                </Field>
              ))}
            </div>
          )}

          {areVechi && (
            <label class="row">
              <input type="checkbox" style="width:auto;min-height:0" checked={predaVechi} onChange={() => setPredaVechi(!predaVechi)} />
              <span class="grow">Adaug și mărunțișul ținut data trecută ({textBani(vechi)})</span>
            </label>
          )}

          {MONEDE.some((m) => incasat[m] > 0) && (
            <>
              <button class="link" onClick={() => setCuMaruntis(!cuMaruntis)}>
                {cuMaruntis ? 'Renunță la mărunțiș' : 'Țin ceva ca mărunțiș'}
              </button>
              {cuMaruntis && (
                <div class="grid">
                  {MONEDE.filter((m) => incasat[m] > 0).map((m) => (
                    <Field key={m} label={`Mărunțiș (${m})`}>
                      <input
                        inputMode="decimal"
                        placeholder="0"
                        value={maruntis[m] ?? ''}
                        onInput={(e) => setMaruntis({ ...maruntis, [m]: e.currentTarget.value })}
                      />
                    </Field>
                  ))}
                </div>
              )}
            </>
          )}

          <div class="grid">
            <Field label="Data">
              <input type="date" value={data} onInput={(e) => setData(e.currentTarget.value || azi())} />
            </Field>
            <Field label="Notă (opțional)">
              <input value={note} onInput={(e) => setNote(e.currentTarget.value)} />
            </Field>
          </div>
          <button class="primary" disabled={nuPoateInchide} onClick={inchide}>
            Închide decontul
          </button>
        </>
      )}

      {legaturi}
    </Screen>
  );
}
