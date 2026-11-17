import { back } from '../router';
import { deleteRezervare, saveRezervare, useStore } from '../store';
import { waLink } from '../phone';
import { Field, Screen } from '../ui';
import type { Directie, Moneda, Plata, Rezervare, StarePlata, Telefon } from '../types';

export function RezervareScreen({ id }: { id: string }) {
  const { rezervari } = useStore();
  const r = rezervari.find((x) => x.id === id);
  if (!r) return <Screen title="Rezervare" backTo="/"><p class="empty">Rezervarea nu există.</p></Screen>;

  const set = (patch: Partial<Rezervare>) => saveRezervare({ ...r, ...patch });
  const setPlata = (patch: Partial<Plata>) => set({ plata: { ...r.plata, ...patch } });
  const setTel = (i: number, patch: Partial<Telefon>) =>
    set({ telefoane: r.telefoane.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const text = (k: 'zbor' | 'preluare' | 'lasare' | 'observatii' | 'eticheta') => ({
    value: r[k] ?? '',
    onInput: (e: Event) => set({ [k]: (e.currentTarget as HTMLInputElement).value || undefined }),
  });

  async function sterge() {
    if (confirm('Ștergi rezervarea?')) {
      await deleteRezervare(id);
      back(`/cursa/${r!.cursaId}`);
    }
  }

  return (
    <Screen title={r.nume || 'Rezervare'} backTo={`/cursa/${r.cursaId}`}>
      <Field label="Nume">
        <input value={r.nume} onInput={(e) => set({ nume: e.currentTarget.value })} />
      </Field>

      <div class="grid">
        <Field label="Direcție">
          <select value={r.directie} onChange={(e) => set({ directie: e.currentTarget.value as Directie })}>
            <option value="dus">Dus</option>
            <option value="retur">Retur</option>
          </select>
        </Field>
        <Field label="Pasageri">
          <input type="number" min={1} value={r.pasageri} onInput={(e) => set({ pasageri: Number(e.currentTarget.value) || 1 })} />
        </Field>
        <Field label="Ora">
          <input type="time" value={r.ora ?? ''} onInput={(e) => set({ ora: e.currentTarget.value || undefined })} />
        </Field>
        <Field label="Zbor / oraș">
          <input {...text('zbor')} />
        </Field>
      </div>

      <h2 class="day">Telefoane</h2>
      {r.telefoane.map((t, i) => (
        <div class="row phone" key={i}>
          <input placeholder="Număr" value={t.numar} onInput={(e) => setTel(i, { numar: e.currentTarget.value })} />
          <input placeholder="Etichetă" value={t.eticheta ?? ''} onInput={(e) => setTel(i, { eticheta: e.currentTarget.value || undefined })} />
          {t.numar.trim() && (
            <a class="wa" href={waLink(t.numar)} target="_blank" rel="noopener">
              WhatsApp
            </a>
          )}
          <button class="icon" aria-label="Șterge numărul" onClick={() => set({ telefoane: r.telefoane.filter((_, j) => j !== i) })}>
            ✕
          </button>
        </div>
      ))}
      <button onClick={() => set({ telefoane: [...r.telefoane, { numar: '' }] })}>+ Număr</button>

      <Field label="Preluare">
        <input {...text('preluare')} />
      </Field>
      <Field label="Lăsare">
        <input {...text('lasare')} />
      </Field>
      <Field label="Observații">
        <textarea rows={3} {...text('observatii')} />
      </Field>
      <Field label="Etichetă din mesaj">
        <input {...text('eticheta')} />
      </Field>

      <h2 class="day">Plată</h2>
      <div class="grid">
        <Field label="Stare">
          <select value={r.plata.stare} onChange={(e) => setPlata({ stare: e.currentTarget.value as StarePlata })}>
            <option value="de_incasat">De încasat</option>
            <option value="achitat">Achitat</option>
          </select>
        </Field>
        <Field label="Metodă (cash, OP…)">
          <input value={r.plata.metoda ?? ''} onInput={(e) => setPlata({ metoda: e.currentTarget.value || undefined })} />
        </Field>
        <Field label="Sumă">
          <input
            type="number"
            min={0}
            value={r.plata.suma ?? ''}
            onInput={(e) => setPlata({ suma: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value) })}
          />
        </Field>
        <Field label="Monedă">
          <select value={r.plata.moneda} onChange={(e) => setPlata({ moneda: e.currentTarget.value as Moneda })}>
            <option value="EUR">EUR</option>
            <option value="RON">RON</option>
          </select>
        </Field>
      </div>
      <Field label="Preț scris în mesaj">
        <input value={r.plata.notaPret ?? ''} onInput={(e) => setPlata({ notaPret: e.currentTarget.value || undefined })} />
      </Field>

      {r.textOriginal && (
        <details>
          <summary>Mesajul original</summary>
          <pre>{r.textOriginal}</pre>
        </details>
      )}

      <button class="danger" onClick={sterge}>
        Șterge rezervarea
      </button>
    </Screen>
  );
}
