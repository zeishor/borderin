import { linkNavigatie, locuri } from './nav';

/** Butoane „Navighează" pentru preluare și lăsare; câte unul pe oprire. */
export function NavButoane({ preluare, lasare }: { preluare?: string; lasare?: string }) {
  const tinte = [
    ...locuri(preluare).map((l) => ({ eticheta: 'Preluare', loc: l })),
    ...locuri(lasare).map((l) => ({ eticheta: 'Lăsare', loc: l })),
  ];
  const nr = (e: string) => tinte.filter((t) => t.eticheta === e).length;
  const vazute: Record<string, number> = {};
  if (!tinte.length) return null;
  return (
    <div class="actiuni">
      {tinte.map((t) => {
        const i = (vazute[t.eticheta] = (vazute[t.eticheta] ?? 0) + 1);
        const nume = nr(t.eticheta) > 1 ? `${t.eticheta} ${i}` : t.eticheta;
        return (
          <a key={`${t.eticheta}${i}`} class="wa" href={linkNavigatie(t.loc)} target="_blank" rel="noopener">
            🧭 {nume}
          </a>
        );
      })}
    </div>
  );
}
