import { useState } from 'preact/hooks';
import { cauta, useBazaLocalitati } from './localitati';

/** Câmp cu căutare în baza de localități: scrii câteva litere și alegi din listă (fără diacritice). Merge și cu text liber. */
export function CautaLocalitate(props: {
  valoare: string;
  onInput: (text: string) => void;
  placeholder?: string;
}) {
  const baza = useBazaLocalitati();
  const [ascuns, setAscuns] = useState(false);
  const sugestii = ascuns ? [] : cauta(props.valoare, baza);

  return (
    <div class="cauta">
      <input
        value={props.valoare}
        placeholder={props.placeholder ?? 'Caută localitatea…'}
        onInput={(e) => {
          setAscuns(false);
          props.onInput(e.currentTarget.value);
        }}
      />
      {sugestii.length > 0 && (
        <div class="cauta-lista">
          {sugestii.map((s) => (
            <button
              key={`${s.nume}-${s.judet}-${s.lat}`}
              onClick={() => {
                props.onInput(s.nume);
                setAscuns(true);
              }}
            >
              {s.nume} <span class="muted">{s.judet}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
