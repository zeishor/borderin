import { go } from '../router';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '../store';
import { ETICHETE_STARE, interval, stari } from '../stare';
import { arePlataIncasata, fmtData, textDeIncasat, textIncasat, titluCursa, totalPasageri } from '../format';
import { Screen } from '../ui';
import { traseu } from '../traseu';

export function ListaCurse() {
  const { curse, rezervari, masini, setari } = useStore();
  const [acum, setAcum] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAcum(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stare = stari(curse, setari, acum);
  const start = (c: (typeof curse)[number]) => interval(c, setari).start;
  // Întâi ce urmează (în curs și viitoare, cea mai apropiată sus), apoi cursele terminate, cele mai noi sus.
  const active = curse.filter((c) => stare.get(c.id) !== 'terminata').sort((a, b) => start(a) - start(b));
  const terminate = curse.filter((c) => stare.get(c.id) === 'terminata').sort((a, b) => start(b) - start(a));

  const grupe = (lista: typeof curse) => {
    const grupuri: { data: string; curse: typeof curse }[] = [];
    for (const c of lista) {
      const g = grupuri[grupuri.length - 1];
      if (g && g.data === c.data) g.curse.push(c);
      else grupuri.push({ data: c.data, curse: [c] });
    }
    return grupuri;
  };
  const grupuri = [
    ...grupe(active).map((g) => ({ ...g, cheie: `a${g.data}`, separator: undefined as string | undefined })),
    ...grupe(terminate).map((g, i) => ({ ...g, cheie: `t${g.data}`, separator: i === 0 ? 'Terminate' : undefined })),
  ];

  return (
    <Screen title="Borderin" tabs banner>
      {grupuri.length === 0 && (
        <p class="empty">Nicio cursă încă. Apasă „Cursă nouă” și lipește mesajele de la dispecer.</p>
      )}
      {grupuri.map((g) => (
        <section key={g.cheie}>
          {g.separator && <h2 class="day separator">{g.separator}</h2>}
          <h2 class="day">{fmtData(g.data)}</h2>
          {g.curse.map((c) => {
            const ale = rezervari.filter((r) => r.cursaId === c.id);
            const masina = masini.find((m) => m.id === c.masinaId);
            const st = stare.get(c.id) ?? 'viitoare';
            return (
              <button key={c.id} class={`card trip st-${st}`} onClick={() => go(`/cursa/${c.id}`)}>
                <span class="trip-cap">
                  <strong class="trip-titlu">{titluCursa(c)}</strong>
                  <span class={`stare-eticheta st-${st}`}>{ETICHETE_STARE[st]}</span>
                </span>
                <span class="traseu">
                  {traseu(c, ale).map((oras, i, t) => (
                    <span key={i} class={i === 0 ? 'stop prima' : i === t.length - 1 ? 'stop ultima' : 'stop'}>
                      <span class="stop-dot" />
                      <span class="stop-nume">{oras}</span>
                    </span>
                  ))}
                </span>
                <span class="chips">
                  <span class="chip">👥 {totalPasageri(ale)} pax</span>
                  <span class="chip">📋 {ale.length} rezervări</span>
                  <span class="chip">🚐 {masina ? masina.nume : 'fără mașină'}</span>
                  {c.plecare && <span class="chip">🕒 {c.plecare}</span>}
                  {st !== 'viitoare' && st !== 'urmatoarea' && (
                    <span class={(c.spalari ?? 0) > 0 ? 'chip spal-da' : 'chip spal-nu'}>
                      🧽 {(c.spalari ?? 0) > 0 ? `✓ ×${c.spalari}` : '✗'}
                    </span>
                  )}
                </span>
                <span class="chips">
                  <span class="pill de-incasat">De încasat {textDeIncasat(ale)}</span>
                  {arePlataIncasata(ale) && <span class="pill incasat">Încasat {textIncasat(ale)}</span>}
                </span>
              </button>
            );
          })}
        </section>
      ))}
      <button class="fab" onClick={() => go('/cursa-noua')}>
        + Cursă nouă
      </button>
    </Screen>
  );
}
