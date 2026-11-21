import { useRef, useState } from 'preact/hooks';
import { CautaLocalitate } from '../cautalocalitate';
import { Fereastra } from '../fereastra';
import { celeMaiApropiate, useBazaLocalitati } from '../localitati';
import { norm } from '../preturi';
import { newId, saveLocalitate, useStore } from '../store';

/**
 * Popup-ul care apare când o oprire nu are sumă: șoferul spune cărei localități mari (mamă) îi corespunde.
 * `onGata` se apelează o singură dată, după orice alegere (inclusiv „sari peste").
 */
export function CereMama({ nume, onGata }: { nume: string; onGata: () => void }) {
  const { localitati } = useStore();
  const baza = useBazaLocalitati();
  const mame = localitati.filter((l) => !l.mamaId && l.sumaRon !== undefined);
  const apropiate = celeMaiApropiate(nume, mame, baza).slice(0, 2);
  const [numeMama, setNumeMama] = useState(nume);
  const [suma, setSuma] = useState('');
  const [eroare, setEroare] = useState('');
  const terminat = useRef(false);

  function gata() {
    if (terminat.current) return;
    terminat.current = true;
    onGata();
  }

  async function alege(mamaId: string) {
    await saveLocalitate({ id: newId(), nume, mamaId });
    gata();
  }

  async function mamaNoua() {
    const n = numeMama.trim();
    const s = Number(suma.replace(',', '.'));
    if (!n || !(s > 0)) return setEroare('Scrie localitatea mamă și o sumă mai mare ca 0.');
    let mama = localitati.find((l) => !l.mamaId && norm(l.nume) === norm(n));
    if (!mama) {
      mama = { id: newId(), nume: n, sumaRon: s };
      await saveLocalitate(mama);
    }
    if (norm(n) !== norm(nume)) await saveLocalitate({ id: newId(), nume, mamaId: mama.id });
    gata();
  }

  return (
    <Fereastra titlu={`Ce sumă are ${nume}?`} onClose={gata}>
      <p>
        Firma plătește o sumă fixă pe cursă, în funcție de zonă. Aplicația nu știe încă ce sumă corespunde localității{' '}
        <strong>{nume}</strong>. Spune-i <strong>localitatea mamă</strong>: o localitate mai mare, apropiată, a cărei sumă o aplică
        și aici.
      </p>
      <p class="muted">
        Exemple: Șilagiu → mamă Buziaș. Pecica → mamă Arad. Otopeni → mamă București. Se întreabă o singură dată: alegerea se
        ține minte.
      </p>

      {apropiate.length > 0 && (
        <>
          <h3 class="modal-sub">Cele mai apropiate</h3>
          {apropiate.map(({ mama, km }) => (
            <button key={mama.id} class="card" onClick={() => alege(mama.id)}>
              <strong>
                {mama.nume} · {mama.sumaRon} lei
              </strong>
              <span class="muted">la aprox. {Math.round(km)} km de {nume}</span>
            </button>
          ))}
        </>
      )}

      {mame.length > 0 && (
        <>
          <h3 class="modal-sub">Localități deja în listă</h3>
          <div class="chips">
            {mame.map((m) => (
              <button key={m.id} class="chip adauga" onClick={() => alege(m.id)}>
                {m.nume} · {m.sumaRon} lei
              </button>
            ))}
          </div>
        </>
      )}

      <h3 class="modal-sub">Localitate mamă nouă</h3>
      <CautaLocalitate valoare={numeMama} onInput={setNumeMama} />
      <div class="row">
        <input
          class="grow"
          inputMode="decimal"
          placeholder="Suma pe cursă (lei)"
          value={suma}
          onInput={(e) => setSuma(e.currentTarget.value)}
        />
        <button onClick={mamaNoua}>Salvează</button>
      </div>
      {eroare && <p class="muted">{eroare}</p>}

      <button onClick={gata}>Sari peste (fără sumă)</button>
    </Fereastra>
  );
}
