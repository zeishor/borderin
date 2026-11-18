import { go } from '../router';
import { useStore } from '../store';
import { arePlataIncasata, fmtData, textDeIncasat, textIncasat, titluCursa, totalPasageri } from '../format';
import { Screen } from '../ui';

export function ListaCurse() {
  const { curse, rezervari, masini } = useStore();
  const sortate = [...curse].sort((a, b) => b.data.localeCompare(a.data) || b.creat - a.creat);

  const grupuri: { data: string; curse: typeof curse }[] = [];
  for (const c of sortate) {
    const g = grupuri[grupuri.length - 1];
    if (g && g.data === c.data) g.curse.push(c);
    else grupuri.push({ data: c.data, curse: [c] });
  }

  return (
    <Screen title="Borderin" tabs>
      {grupuri.length === 0 && (
        <p class="empty">Nicio cursă încă. Apasă „Cursă nouă” și lipește mesajele de la dispecer.</p>
      )}
      {grupuri.map((g) => (
        <section key={g.data}>
          <h2 class="day">{fmtData(g.data)}</h2>
          {g.curse.map((c) => {
            const ale = rezervari.filter((r) => r.cursaId === c.id);
            const masina = masini.find((m) => m.id === c.masinaId);
            return (
              <button key={c.id} class="card trip" onClick={() => go(`/cursa/${c.id}`)}>
                <strong class="trip-titlu">{titluCursa(c)}</strong>
                <span class="chips">
                  <span class="chip">👥 {totalPasageri(ale)} pax</span>
                  <span class="chip">📋 {ale.length} rezervări</span>
                  <span class="chip">🚐 {masina ? masina.nume : 'fără mașină'}</span>
                  {c.plecare && <span class="chip">🕒 {c.plecare}</span>}
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
