import { useState } from 'preact/hooks';
import { CereMama } from './screens/CereMama';
import { calculeazaSuma, necunoscute, norm, type PretCalculat } from './preturi';
import { getState } from './store';

/**
 * Calculul sumei unei curse, cu întrebări pentru opririle fără preț.
 * `element` se pune în ecran; `calculeaza(opriri)` întreabă pe rând fiecare oprire necunoscută și apoi întoarce suma.
 */
export function useCerePret() {
  const [cerere, setCerere] = useState<{ nume: string; resolve: () => void }>();

  const intreaba = (nume: string) => new Promise<void>((resolve) => setCerere({ nume, resolve }));

  async function calculeaza(opriri: string[]): Promise<PretCalculat> {
    const sarite = new Set<string>();
    for (;;) {
      const lipsa = necunoscute(opriri, getState().localitati).find((o) => !sarite.has(norm(o)));
      if (!lipsa) break;
      await intreaba(lipsa);
      sarite.add(norm(lipsa)); // dacă a fost lăsată fără sumă, nu o mai întrebăm în acest calcul
    }
    return calculeazaSuma(opriri, getState().localitati);
  }

  const element = cerere ? (
    <CereMama
      key={cerere.nume}
      nume={cerere.nume}
      onGata={() => {
        cerere.resolve();
        setCerere(undefined);
      }}
    />
  ) : null;

  return { element, calculeaza };
}
