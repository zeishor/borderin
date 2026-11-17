import { useEffect, useMemo, useState } from 'preact/hooks';
import { back } from '../router';
import { deleteBilet, saveBilet, useStore } from '../store';
import { parseBilet } from '../bilet';
import { recunoasteText } from '../ocr';
import { Field, Screen } from '../ui';
import type { Bilet, MonedaBilet } from '../types';

export function BiletScreen({ id }: { id: string }) {
  const { bilete } = useStore();
  const b = bilete.find((x) => x.id === id);
  const [progres, setProgres] = useState<number | null>(null);
  const [eroare, setEroare] = useState<string>();
  const url = useMemo(() => (b?.foto ? URL.createObjectURL(b.foto) : undefined), [b?.foto]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  // Prima deschidere după scanare: citește poza și completează ce lipsește.
  useEffect(() => {
    if (b && b.foto && b.textOcr === undefined && progres === null) citeste(b);
  }, [b?.id]);

  if (!b) return <Screen title="Bilet" backTo="/"><p class="empty">Biletul nu există.</p></Screen>;
  const bilet = b;

  async function citeste(curent: Bilet) {
    if (!curent.foto) return;
    setEroare(undefined);
    setProgres(0);
    try {
      const text = await recunoasteText(curent.foto, setProgres);
      const x = parseBilet(text);
      await saveBilet({
        ...curent,
        textOcr: text,
        suma: curent.suma ?? x.suma,
        moneda: curent.suma === undefined && x.moneda ? x.moneda : curent.moneda,
        intrare: curent.intrare ?? x.intrare,
        iesire: curent.iesire ?? x.iesire,
        numar: curent.numar ?? x.numar,
      });
    } catch (e) {
      setEroare(e instanceof Error ? e.message : String(e));
    } finally {
      setProgres(null);
    }
  }

  const set = (patch: Partial<Bilet>) => saveBilet({ ...bilet, ...patch });

  async function sterge() {
    if (confirm('Ștergi biletul?')) {
      await deleteBilet(bilet.id);
      back(`/cursa/${bilet.cursaId}`);
    }
  }

  return (
    <Screen title="Bilet aeroport" backTo={`/cursa/${bilet.cursaId}`}>
      {url && <img class="poza" src={url} alt="Poza biletului" />}
      {progres !== null && <p class="muted">Citesc biletul… {Math.round(progres * 100)}%</p>}
      {eroare && <p class="eroare">Nu am putut citi biletul: {eroare}</p>}

      <div class="grid">
        <Field label="Sumă">
          <input
            type="number"
            min={0}
            value={bilet.suma ?? ''}
            onInput={(e) => set({ suma: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value) })}
          />
        </Field>
        <Field label="Monedă">
          <select value={bilet.moneda} onChange={(e) => set({ moneda: e.currentTarget.value as MonedaBilet })}>
            <option value="HUF">HUF (Ft)</option>
            <option value="EUR">EUR</option>
            <option value="RON">RON</option>
          </select>
        </Field>
        <Field label="Intrare">
          <input type="datetime-local" value={bilet.intrare ?? ''} onInput={(e) => set({ intrare: e.currentTarget.value || undefined })} />
        </Field>
        <Field label="Ieșire">
          <input type="datetime-local" value={bilet.iesire ?? ''} onInput={(e) => set({ iesire: e.currentTarget.value || undefined })} />
        </Field>
      </div>
      <Field label="Număr bilet">
        <input value={bilet.numar ?? ''} onInput={(e) => set({ numar: e.currentTarget.value || undefined })} />
      </Field>

      {bilet.foto && (
        <button onClick={() => citeste(bilet)} disabled={progres !== null} style="margin-top:12px;width:100%">
          Citește din nou
        </button>
      )}

      {bilet.textOcr !== undefined && (
        <details>
          <summary>Textul citit din poză</summary>
          <pre>{bilet.textOcr || '(nimic)'}</pre>
        </details>
      )}

      <button class="danger" onClick={sterge}>
        Șterge biletul
      </button>
    </Screen>
  );
}
