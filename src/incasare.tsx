import { fmtSuma, optiuniPlata, type Suma } from './format';
import { saveRezervare } from './store';
import type { Rezervare } from './types';

/** Butoane „Am încasat" (câte unul pe variantă de plată) sau starea încasării, cu anulare. */
export function Incasare({ r }: { r: Rezervare }) {
  const { plata } = r;
  if (plata.stare === 'achitat') return null;

  const seteaza = (incasat: Suma | undefined) => saveRezervare({ ...r, plata: { ...plata, incasat } });

  if (plata.incasat) {
    return (
      <div class="actiuni">
        <span class="ok">Încasat: {fmtSuma(plata.incasat.suma, plata.incasat.moneda)} ✓</span>
        <button onClick={() => seteaza(undefined)}>Anulează</button>
      </div>
    );
  }

  const optiuni = optiuniPlata(plata);
  if (optiuni.length === 0) return null;
  return (
    <div class="actiuni">
      {optiuni.map((o) => (
        <button key={`${o.suma}${o.moneda}`} class="incaseaza" onClick={() => seteaza(o)}>
          Am încasat {fmtSuma(o.suma, o.moneda)}
        </button>
      ))}
    </div>
  );
}
