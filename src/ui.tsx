import type { ComponentChildren } from 'preact';
import { back, go, useRoute } from './router';

const TABURI = [
  { ruta: '/', icon: '🚐', nume: 'Curse' },
  { ruta: '/decont', icon: '💼', nume: 'Decont' },
  { ruta: '/setari', icon: '⚙️', nume: 'Setări' },
];

function Taburi() {
  const route = useRoute();
  return (
    <nav class="taburi">
      {TABURI.map((t) => (
        <button key={t.ruta} class={route === t.ruta ? 'tab activ' : 'tab'} onClick={() => go(t.ruta)}>
          <span class="tab-icon">{t.icon}</span>
          <span>{t.nume}</span>
        </button>
      ))}
    </nav>
  );
}

export function Screen(props: {
  title: string;
  backTo?: string;
  action?: ComponentChildren;
  /** Bara de jos cu cele trei secțiuni principale. */
  tabs?: boolean;
  /** Antet cu imaginea Borderin (logo + nume) în loc de titlu. */
  banner?: boolean;
  children: ComponentChildren;
}) {
  return (
    <div class={props.tabs ? 'screen cu-taburi' : 'screen'}>
      <header class={props.banner ? 'bar banner' : 'bar'}>
        {props.backTo !== undefined && (
          <button class="icon" aria-label="Înapoi" onClick={() => back(props.backTo)}>
            ←
          </button>
        )}
        {props.backTo === undefined && !props.banner && (
          <img class="logo" src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={36} height={36} />
        )}
        <h1 class={props.banner ? 'ascuns' : undefined}>{props.title}</h1>
        <div class="bar-action">{props.action}</div>
      </header>
      <main>{props.children}</main>
      {props.tabs && <Taburi />}
    </div>
  );
}

export function Field(props: { label: string; children: ComponentChildren }) {
  return (
    <label class="field">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
