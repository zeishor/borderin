import { go } from '../router';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '../store';
import { ETICHETE_STARE, interval, stari } from '../stare';
import { analizaCursa } from '../decontcursa';
import { areDeIncasat, arePlataIncasata, fmtData, textCheltuieli, textDeIncasat, textIncasat, titluCursa, totalPasageri } from '../format';
import { Screen } from '../ui';
import { traseu } from '../traseu';

export function ListaCurse() {
  const { curse, rezervari, masini, setari, bilete, deconturi, cheltuieli } = useStore();
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
            const an = analizaCursa(c, { rezervari: ale, bilete, deconturi, masini, setari, curse, cheltuieli });
            return (
              <button key={c.id} class={`card trip st-${st}${an.decontata ? ' decontata' : ''}${an.deDecontat ? ' de-decontat' : ''}`} onClick={() => go(`/cursa/${c.id}`)}>
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
                {/* Doar chip-uri cu informații: ce lipsește nu se afișează. */}
                <span class="chips">
                  {ale.length > 0 && <span class="chip">👥 {totalPasageri(ale)} pax</span>}
                  {ale.length > 0 && <span class="chip">📋 {ale.length} rezervări</span>}
                  {masina && <span class="chip">🚐 {masina.nume}</span>}
                  {c.plecare && <span class="chip">🕒 {c.plecare}</span>}
                  {c.sumaSofer !== undefined && <span class="chip">💰 {c.sumaSofer} lei</span>}
                  {an.deDecontat && st !== 'viitoare' && st !== 'urmatoarea' && <span class="chip decont-da">💼 De decontat</span>}
                  {an.decontata && <span class="chip decont-ok">💼 Decontată ✓</span>}
                  {c.locala && <span class="chip">📍 {an.inclusaInSalariu ? 'locală, în salariu' : 'locală'}</span>}
                  {an.cheltuieliToate.length > 0 && (
                    <span class="chip">🧾 {textCheltuieli(an.cheltuieliToate)}</span>
                  )}
                  {(c.spalari ?? 0) > 0 && <span class="chip spal-da">🧽 ×{c.spalari}</span>}
                </span>
                {ale.length > 0 && (
                  <span class="chips">
                    {areDeIncasat(ale) ? (
                      <span class="pill de-incasat">De încasat {textDeIncasat(ale)}</span>
                    ) : (
                      <span class="pill achitat">Achitat</span>
                    )}
                    {arePlataIncasata(ale) && <span class="pill incasat">Încasat {textIncasat(ale)}</span>}
                  </span>
                )}
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
