import { useState } from 'preact/hooks';
import { bileteNedecontate, restDePredat, totalBilete, totalPredat } from '../decont';
import { azi, fmtData, fmtMoment, fmtSuma, fmtSumaBilet, incasat, textBani, titluCursa } from '../format';
import { deleteDecont, newId, saveDecont, useStore } from '../store';
import { Field, Screen } from '../ui';
import type { Bilet, MonedaBilet } from '../types';

function textBilete(b: Bilet[]): string {
  const t = totalBilete(b);
  const parti = (['HUF', 'EUR', 'RON'] as MonedaBilet[]).filter((m) => t[m]).map((m) => fmtSumaBilet(t[m]!, m));
  return parti.length ? parti.join(' + ') : '—';
}

export function DecontScreen() {
  const { rezervari, bilete, curse, deconturi } = useStore();
  const [data, setData] = useState(azi());
  const [excluse, setExcluse] = useState<string[]>([]);
  const [eur, setEur] = useState<string>();
  const [ron, setRon] = useState<string>();
  const [note, setNote] = useState('');

  const rest = restDePredat(rezervari, deconturi);
  const nedecontate = bileteNedecontate(bilete, deconturi).sort((a, b) => (b.iesire ?? '').localeCompare(a.iesire ?? ''));
  const alese = nedecontate.filter((b) => !excluse.includes(b.id));
  const valEur = eur ?? String(Math.max(rest.EUR, 0));
  const valRon = ron ?? String(Math.max(rest.RON, 0));
  const predatEur = Number(valEur) || 0;
  const predatRon = Number(valRon) || 0;
  const gol = predatEur <= 0 && predatRon <= 0 && alese.length === 0;
  const depasit = predatEur > rest.EUR || predatRon > rest.RON;

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
      predat: { EUR: predatEur, RON: predatRon },
      bilete: alese.map((b) => b.id),
      note: note.trim() || undefined,
    });
    setExcluse([]);
    setEur(undefined);
    setRon(undefined);
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
        <strong>{textBani({ RON: Math.max(rest.RON, 0), EUR: Math.max(rest.EUR, 0) })}</strong>
      </div>
      <div class="total">
        <span>Bilete nedecontate ({nedecontate.length})</span>
        <strong>{textBilete(nedecontate)}</strong>
      </div>

      <h2 class="day">Decont nou</h2>
      <Field label="Data">
        <input type="date" value={data} onInput={(e) => setData(e.currentTarget.value || azi())} />
      </Field>

      <h2 class="day">Bani predați</h2>
      <div class="grid">
        <Field label={`EUR (rest: ${fmtSuma(Math.max(rest.EUR, 0), 'EUR')})`}>
          <input type="number" min={0} value={valEur} onInput={(e) => setEur(e.currentTarget.value)} />
        </Field>
        <Field label={`RON (rest: ${fmtSuma(Math.max(rest.RON, 0), 'RON')})`}>
          <input type="number" min={0} value={valRon} onInput={(e) => setRon(e.currentTarget.value)} />
        </Field>
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
