import { fmtSuma, optiuniPlata, type Suma } from './format';
import { saveRezervare } from './store';
import type { ExtraPlata, Rezervare } from './types';

/**
 * Butoane „Am încasat" (câte unul pe variantă de plată) sau starea încasării, cu anulare.
 * Restanțele (sume extra peste preț) au butoane separate, evidențiate, ca să nu se piardă.
 */
export function Incasare({ r }: { r: Rezervare }) {
  const { plata } = r;

  const seteaza = (incasat: Suma | undefined) => saveRezervare({ ...r, plata: { ...plata, incasat } });
  const schimbaExtra = (i: number, f: (x: ExtraPlata) => ExtraPlata | undefined) =>
    saveRezervare({
      ...r,
      plata: { ...plata, extra: (plata.extra ?? []).flatMap((x, j) => (j === i ? (f(x) ? [f(x)!] : []) : [x])) },
    });

  const optiuni = plata.stare === 'achitat' || plata.incasat ? [] : optiuniPlata(plata);

  return (
    <>
      {plata.stare !== 'achitat' && plata.incasat && (
        <div class="actiuni">
          <span class="ok">Încasat: {fmtSuma(plata.incasat.suma, plata.incasat.moneda)} ✓</span>
          <button onClick={() => seteaza(undefined)}>Anulează</button>
        </div>
      )}
      {optiuni.length > 0 && (
        <div class="actiuni">
          {optiuni.map((o) => (
            <button key={`${o.suma}${o.moneda}`} class="incaseaza" onClick={() => seteaza(o)}>
              Am încasat {fmtSuma(o.suma, o.moneda)}
            </button>
          ))}
        </div>
      )}
      {(plata.extra ?? []).map((x, i) => (
        <div class="actiuni" key={`${x.suma}${x.moneda}${i}`}>
          {x.incasat ? (
            <>
              <span class="ok">
                Încasat {x.nota ?? 'extra'}: {fmtSuma(x.incasat.suma, x.incasat.moneda)} ✓
              </span>
              <button onClick={() => schimbaExtra(i, (e) => ({ ...e, incasat: undefined }))}>Anulează</button>
            </>
          ) : (
            <>
              <button
                class="incaseaza extra"
                onClick={() => schimbaExtra(i, (e) => ({ ...e, incasat: { suma: e.suma, moneda: e.moneda } }))}
              >
                ⚠ Am încasat {x.nota ?? 'extra'} {fmtSuma(x.suma, x.moneda)}
              </button>
              <button
                aria-label="Nu e sumă extra"
                title="Nu e sumă extra: scoate"
                onClick={() => confirm(`Scoți ${fmtSuma(x.suma, x.moneda)} (${x.nota ?? 'extra'}) din această rezervare?`) && schimbaExtra(i, () => undefined)}
              >
                ✕
              </button>
            </>
          )}
        </div>
      ))}
    </>
  );
}
