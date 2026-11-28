import { useState } from 'preact/hooks';
import { venitLuna } from '../decont';
import { azi, fmtSuma } from '../format';
import { incluseInSalariu } from '../locale';
import { useStore } from '../store';
import { Field, Screen } from '../ui';

const lei = (x: number) => fmtSuma(x, 'RON');

/** Cât ai de câștigat într-o lună: salariul de bază și cursele. Nu e un decont. */
export function DecontLuna() {
  const { curse, setari } = useStore();
  const [luna, setLuna] = useState(azi().slice(0, 7));
  const venit = venitLuna(curse, setari.salariuBazaRon, luna, incluseInSalariu(curse, setari.curseLocaleInclusePeLuna));

  return (
    <Screen title="Luna" backTo="/decont">
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
        <span>Total pe lună</span>
        <strong>{lei(venit.total)}</strong>
      </div>
      {venit.incluse > 0 && <p class="muted">{venit.incluse} curse locale sunt incluse în salariu și nu se adaugă.</p>}
      <p class="muted">Cursele se numără după data lor, decontate sau nu. Salariul de bază nu intră în decont.</p>
    </Screen>
  );
}
