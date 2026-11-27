import { useState } from 'preact/hooks';
import { saveCursa, useStore } from '../store';
import { Field, Screen } from '../ui';
import { fmtData } from '../format';
import { incarcaLocalitati } from '../localitati';
import { linkNavigatie } from '../nav';
import { IN_UNGARIA, oreZbor } from '../ore';
import { norm } from '../preturi';
import { waLink } from '../phone';
import { planifica } from '../planifica';
import {
  AEROPORT, GRANITA, START, calculeazaOrar, cheiePereche, durata, inMinute, linkRuta, opririDinRezervari, oraDin,
} from '../ruta';
import type { PlanPreluare } from '../types';

export function PlanScreen({ id }: { id: string }) {
  const { curse, rezervari, setari } = useStore();
  const [lucreaza, setLucreaza] = useState(false);
  const [eroare, setEroare] = useState('');
  const cursa = curse.find((c) => c.id === id);
  if (!cursa) return <Screen title="Plan de preluare" backTo="/"><p class="empty">Cursa nu există.</p></Screen>;

  const ale = rezervari.filter((r) => r.cursaId === id);
  const plan = cursa.plan;
  const actuale = opririDinRezervari(ale);
  const schimbat =
    !!plan && actuale.map((o) => o.cheie).sort().join('|') !== plan.opriri.map((o) => o.cheie).sort().join('|');
  const setPlan = (p: PlanPreluare) => saveCursa({ ...cursa, plan: p });

  async function calculeaza() {
    setLucreaza(true);
    setEroare('');
    try {
      await setPlan(await planifica(ale, setari, await incarcaLocalitati(), cursa!.plan));
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Calculul a eșuat.');
    } finally {
      setLucreaza(false);
    }
  }

  // Zborul cel mai devreme, în ora României.
  const zboruri = oreZbor(ale);
  const fus = IN_UNGARIA.test(norm(cursa.destinatie)) ? setari.diferentaFusOre * 60 : 0;
  const zbor = zboruri.length ? Math.min(...zboruri) + fus : undefined;
  const tinta = zbor === undefined ? undefined : zbor - setari.oreInainteZbor * 60;
  // Fără oră scrisă, ieșirea se alege ca să ajungi la aeroport la timp.
  const iesireCalculata =
    plan && tinta !== undefined ? Math.floor((tinta - durata(plan, GRANITA, AEROPORT)) / 5) * 5 : undefined;
  const iesire = plan?.iesire ? inMinute(plan.iesire) : iesireCalculata;
  const orar = plan && iesire !== undefined ? calculeazaOrar(plan, iesire, setari.minutePreluare, setari.minuteGranita) : undefined;

  function muta(i: number, pas: number) {
    const opriri = [...plan!.opriri];
    [opriri[i], opriri[i + pas]] = [opriri[i + pas], opriri[i]];
    setPlan({ ...plan!, opriri });
  }

  /** Durata unui drum, cu posibilitatea de a o corecta. Funcție, nu componentă: câmpul nu se recreează. */
  function drum(a: string, b: string) {
    const k = cheiePereche(a, b);
    const corectata = plan!.corectii[k] !== undefined;
    return (
      <div class="drum">
        ↓ drum
        <input
          type="number"
          inputMode="numeric"
          min={0}
          aria-label="Minute de drum"
          value={durata(plan!, a, b)}
          onChange={(e) => {
            const corectii = { ...plan!.corectii };
            const v = e.currentTarget.value;
            if (v === '') delete corectii[k];
            else corectii[k] = Math.max(0, Number(v) || 0);
            setPlan({ ...plan!, corectii });
          }}
        />
        min{corectata ? ' (corectat)' : ''}
      </div>
    );
  }

  const mesaj = (ora: number, adresa: string) =>
    `Bună ziua! Sunt șoferul dumneavoastră. Data cursei: ${fmtData(cursa.data)}. Vă preiau la ora ${oraDin(ora)} de la ${adresa}. Mulțumesc!`;
  const start = setari.adresaPornire || 'Timisoara';

  return (
    <Screen title="Plan de preluare" backTo={`/cursa/${id}`}>
      {!setari.adresaPornire && <p class="muted">Completează în Setări punctul de plecare; acum ruta pornește din centrul Timișoarei.</p>}
      <button class="primary" disabled={lucreaza} onClick={calculeaza}>
        {lucreaza ? 'Calculez…' : plan ? 'Recalculează ruta' : 'Calculează ruta'}
      </button>
      {eroare && <p class="aviz">{eroare}</p>}
      {!setari.orsCheie && <p class="muted">Fără cheie openrouteservice (Setări), duratele sunt doar estimate din distanțe.</p>}
      {schimbat && <p class="aviz">Rezervările s-au schimbat. Recalculează ruta.</p>}

      {plan && (
        <>
          {plan.estimat && <p class="aviz">Durate estimate din linie dreaptă. Verifică-le înainte să le anunți.</p>}
          <Field label="Ies din țară la">
            <input type="time" value={plan.iesire ?? ''} onInput={(e) => setPlan({ ...plan, iesire: e.currentTarget.value || undefined })} />
          </Field>
          {!plan.iesire && iesire !== undefined && (
            <p class="muted">
              Calculată din zbor: ieșire la {oraDin(iesire)}, ca să ajungi cu {setari.oreInainteZbor} h înainte.
            </p>
          )}
          {iesire === undefined && <p class="muted">Nicio oră de zbor în rezervări. Scrie la ce oră vrei să ieși din țară.</p>}

          {orar && (
            <div class="total">
              <span>Pleci de acasă</span>
              <strong>{oraDin(orar.plecare)}</strong>
            </div>
          )}
          {orar && orar.plecare >= 0 && cursa.plecare !== oraDin(orar.plecare) && (
            <button class="link" onClick={() => saveCursa({ ...cursa, plecare: oraDin(orar.plecare) })}>
              Pune {oraDin(orar.plecare)} ca oră de plecare a cursei
            </button>
          )}
          <p class="muted">
            {start}
            {plan.startAprox ? ' (poziție aproximativă)' : ''}
            {plan.startGasit ? ` · găsit: ${plan.startGasit}` : ''}
          </p>

          {plan.opriri.map((salvata, i) => {
            // Numele, telefonul și numărul de pasageri vin din rezervările de acum.
            const o = { ...salvata, ...actuale.find((x) => x.cheie === salvata.cheie) };
            const ora = orar?.opriri[i].ora;
            return (
              <div key={o.cheie}>
                {drum(i ? plan.opriri[i - 1].cheie : START, o.cheie)}
                <div class="card oprire">
                  <div class="row">
                    <strong class="ora-oprire">{ora === undefined ? '—' : oraDin(ora)}</strong>
                    <span class="grow">
                      {o.nume.join(', ') || 'Fără nume'} · {o.pasageri} pax
                    </span>
                    <button aria-label="Mută mai devreme" disabled={i === 0} onClick={() => muta(i, -1)}>
                      ↑
                    </button>
                    <button aria-label="Mută mai târziu" disabled={i === plan.opriri.length - 1} onClick={() => muta(i, 1)}>
                      ↓
                    </button>
                  </div>
                  <span class="muted">{o.adresa}</span>
                  {o.aprox && <span class="chip aprox">⚠ poziție aproximativă</span>}
                  {!plan.estimat && (
                    <span class="muted gasit">{o.gasit ? `Găsit pe hartă: ${o.gasit}` : 'Negăsit pe hartă: folosesc centrul localității.'}</span>
                  )}
                  <div class="actiuni">
                    {o.telefon && ora !== undefined && (
                      <a class="wa" href={`${waLink(o.telefon)}?text=${encodeURIComponent(mesaj(ora, o.adresa))}`} target="_blank" rel="noopener">
                        💬 Anunță ora
                      </a>
                    )}
                    <a class="wa" href={linkNavigatie(o.adresa)} target="_blank" rel="noopener">
                      🧭 Navighează
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          {drum(plan.opriri[plan.opriri.length - 1].cheie, GRANITA)}
          {orar && (
            <>
              <div class="total">
                <span>La graniță ({setari.punctGranita || 'Nadlac'})</span>
                <strong>{oraDin(orar.granita)}</strong>
              </div>
              <div class="total">
                <span>Ieși din țară (+{setari.minuteGranita} min)</span>
                <strong>{oraDin(orar.iesire)}</strong>
              </div>
            </>
          )}
          {drum(GRANITA, AEROPORT)}
          {orar && (
            <div class={tinta !== undefined && orar.aeroport > tinta + 5 ? 'total sold-predat' : 'total'}>
              <span>Aeroport Budapesta (ora Ungariei)</span>
              <strong>{oraDin(orar.aeroport - fus)}</strong>
            </div>
          )}
          {orar && zbor !== undefined && (
            <p class="muted">
              Primul zbor: {oraDin(zbor - fus)}. {zbor >= orar.aeroport ? 'Ajungi' : 'Întârzii: ajungi'} cu{' '}
              {Math.round((Math.abs(zbor - orar.aeroport) / 60) * 10) / 10} h {zbor >= orar.aeroport ? 'înainte' : 'după decolare'}.
            </p>
          )}

          <a
            class="wa"
            href={linkRuta(start, plan.opriri.map((o) => o.adresa), `${setari.punctGranita || 'Nadlac'}, Romania`)}
            target="_blank"
            rel="noopener"
          >
            🗺 Verifică ruta în Google Maps (cu trafic)
          </a>
          <p class="muted">Pe telefon, browserul poate arăta doar primele 3 opriri; aplicația Google Maps primește mai multe.</p>
        </>
      )}
    </Screen>
  );
}
