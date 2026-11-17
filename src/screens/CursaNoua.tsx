import { useMemo, useState } from 'preact/hooks';
import { go } from '../router';
import { newId, saveCursa, saveRezervare } from '../store';
import { azi } from '../format';
import { parseMesaje } from '../parser';
import { aplicaPeCursa, rezervareDinExtras } from '../importa';
import { Field, Screen } from '../ui';

export function CursaNoua() {
  const [text, setText] = useState('');
  const [dataManual, setDataManual] = useState<string>();
  const [destinatieManuala, setDestinatieManuala] = useState<string>();

  const rezultat = useMemo(() => parseMesaje(text), [text]);
  const data = dataManual ?? rezultat.data ?? azi();
  const destinatie = destinatieManuala ?? rezultat.destinatie ?? 'Budapesta';

  async function creeaza() {
    const acum = Date.now();
    const id = newId();
    const cursa = aplicaPeCursa({ id, creat: acum, modificat: acum, data, destinatie }, rezultat);
    await saveCursa(cursa);
    for (const e of rezultat.rezervari) await saveRezervare(rezervareDinExtras(id, e));
    go(`/cursa/${id}`);
  }

  return (
    <Screen title="Cursă nouă" backTo="/">
      <Field label="Lipește mesajele (unul sau mai multe)">
        <textarea
          rows={10}
          value={text}
          placeholder="Lipește aici mesajele de la dispecer…"
          onInput={(e) => setText(e.currentTarget.value)}
        />
      </Field>
      {text.trim() && (
        <p class="muted">
          Am găsit {rezultat.rezervari.length} rezervări
          {rezultat.plecare ? `, plecare ${rezultat.plecare}` : ''}
          {rezultat.retur ? `, retur ${rezultat.retur}` : ''}.
        </p>
      )}
      <Field label="Data">
        <input type="date" value={data} onInput={(e) => setDataManual(e.currentTarget.value)} />
      </Field>
      <Field label="Destinația">
        <input
          list="destinatii"
          value={destinatie}
          onInput={(e) => setDestinatieManuala(e.currentTarget.value)}
        />
        <datalist id="destinatii">
          <option value="Budapesta" />
          <option value="Arad" />
        </datalist>
      </Field>
      <button class="primary" onClick={creeaza} disabled={!data}>
        Creează cursa
      </button>
    </Screen>
  );
}
