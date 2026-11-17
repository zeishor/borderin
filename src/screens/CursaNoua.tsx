import { useState } from 'preact/hooks';
import { go } from '../router';
import { newId, saveCursa, saveRezervare } from '../store';
import { azi } from '../format';
import { parseMesaje } from '../parser';
import { Field, Screen } from '../ui';
import type { Rezervare } from '../types';

export function rezervareNoua(cursaId: string, extras: Partial<Rezervare>): Rezervare {
  const acum = Date.now();
  return {
    id: newId(),
    cursaId,
    creat: acum,
    modificat: acum,
    directie: 'dus',
    nume: '',
    telefoane: [],
    pasageri: 1,
    plata: { stare: 'de_incasat', moneda: 'EUR' },
    ...extras,
  };
}

export function CursaNoua() {
  const [text, setText] = useState('');
  const [data, setData] = useState(azi());
  const [destinatie, setDestinatie] = useState('Budapesta');

  async function creeaza() {
    const acum = Date.now();
    const id = newId();
    await saveCursa({ id, creat: acum, modificat: acum, data, destinatie });
    for (const e of parseMesaje(text)) await saveRezervare(rezervareNoua(id, e));
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
      <Field label="Data">
        <input type="date" value={data} onInput={(e) => setData(e.currentTarget.value)} />
      </Field>
      <Field label="Destinația">
        <input
          list="destinatii"
          value={destinatie}
          onInput={(e) => setDestinatie(e.currentTarget.value)}
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
