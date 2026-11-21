import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/** Fereastră modală (dialog nativ): se închide cu ✕, Esc sau click pe fundal. */
export function Fereastra(props: { titlu: string; onClose: () => void; children: ComponentChildren }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      class="modal"
      onClose={props.onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="modal-corp">
        <div class="modal-cap">
          <h2>{props.titlu}</h2>
          <button class="icon" aria-label="Închide" onClick={props.onClose}>
            ✕
          </button>
        </div>
        {props.children}
      </div>
    </dialog>
  );
}
