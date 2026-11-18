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
  children: ComponentChildren;
}) {
  return (
    <div class={props.tabs ? 'screen cu-taburi' : 'screen'}>
      <header class="bar">
        {props.backTo !== undefined && (
          <button class="icon" aria-label="Înapoi" onClick={() => back(props.backTo)}>
            ←
          </button>
        )}
        <h1>{props.title}</h1>
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
