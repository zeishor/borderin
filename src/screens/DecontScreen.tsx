import { useState } from 'preact/hooks';
import { bileteNedecontate, restDePredat, totalBilete, totalPredat } from '../decont';
import { azi, fmtData, fmtMoment, fmtSuma, fmtSumaBilet, incasat, textBani, titluCursa } from '../format';
import { deleteDecont, newId, saveDecont, useStore } from '../store';
import { Field, Screen } from '../ui';
import { MONEDE, zero } from '../monede';
import { pretSpalare, spalariNedecontate } from '../spalatorie';
import type { Bilet, Moneda, MonedaBilet } from '../types';

function textBilete(b: Bilet[]): string {
  const t = totalBilete(b);
  const parti = (['HUF', 'EUR', 'RON'] as MonedaBilet[]).filter((m) => t[m]).map((m) => fmtSumaBilet(t[m]!, m));
  return parti.length ? parti.join(' + ') : '—';
}

export function DecontScreen() {
  const { rezervari, bilete, curse, deconturi, masini, setari } = useStore();
  const [data, setData] = useState(azi());
  const [excluse, setExcluse] = useState<string[]>([]);
  const [scrise, setScrise] = useState<Partial<Record<Moneda, string>>>({});
  const [note, setNote] = useState('');
  const [excluseSpal, setExcluseSpal] = useState<string[]>([]);

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
  const gol = MONEDE.every((m) => predat[m] <= 0) && alese.length === 0 && spalAlese.length === 0;
  const depasit = MONEDE.some((m) => predat[m] > rest[m]);

  function comuta(id: string) {
    setExcluse(excluse.includes(id) ? excluse.filter((x) => x !== id) : [...excluse, id]);
  }

  async function inregistreaza() {
    if (gol) return;
    if (depasit && !confirm('Predai mai mult decât ai încasat. Continui?')) return;
    await saveDecont({
      id: newId(),
      creat: Date.now(),
      data,
      predat,
      bilete: alese.map((b) => b.id),
      spalatorii: spalAlese.length ? spalAlese.map((x) => ({ cursaId: x.cursa.id, nr: x.nr, suma: x.suma })) : undefined,
      note: note.trim() || undefined,
    });
    setExcluse([]);
    setExcluseSpal([]);
    setScrise({});
    setNote('');
  }

  async function sterge(id: string) {
    if (confirm('Anulezi decontul? Banii și biletele revin ca nepredate / nedecontate.')) await deleteDecont(id);
  }

  const titluCursaDe = (id: string) => {
    const c = curse.find((x) => x.id === id);
    return c ? `${titluCursa(c)} · ${fmtData(c.data)}` : 'cursă ștearsă';
  };
  const istoric = [...deconturi].sort((a, b) => b.creat - a.creat);

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
        <span>Bilete nedecontate ({nedecontate.length})</span>
        <strong>{textBilete(nedecontate)}</strong>
      </div>

      <div class="total">
        <span>Spălătorie nedecontată ({nrSpal(spalatorii)})</span>
        <strong>{fmtSuma(sumaSpal(spalatorii), 'RON')}</strong>
      </div>

      <h2 class="day">Decont nou</h2>
      <Field label="Data">
        <input type="date" value={data} onInput={(e) => setData(e.currentTarget.value || azi())} />
      </Field>

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
      <p class="muted">Poți lăsa mai puțin decât restul: diferența rămâne de predat data viitoare.</p>

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
              {x.nr} × spălare · {fmtSuma(x.suma, 'RON')}
            </strong>
            <br />
            <span class="muted">{titluCursaDe(x.cursa.id)}</span>
          </span>
        </label>
      ))}
      {spalAlese.length > 0 && <p class="muted">Total spălătorie aleasă: {fmtSuma(sumaSpal(spalAlese), 'RON')}</p>}

      <Field label="Notă (opțional)">
        <input value={note} onInput={(e) => setNote(e.currentTarget.value)} />
      </Field>
      <button class="primary" disabled={gol} onClick={inregistreaza}>
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
              <br />
              <span class="muted">
                {d.bilete.length} bilete{bd.length ? ` · ${textBilete(bd)}` : ''}
                {d.spalatorii?.length
                  ? ` · ${d.spalatorii.reduce((n, s) => n + s.nr, 0)} spălări · ${fmtSuma(d.spalatorii.reduce((t, s) => t + s.suma, 0), 'RON')}`
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
