import type { ComponentChildren } from 'preact';
import { back } from './router';

export function Screen(props: {
  title: string;
  backTo?: string;
  action?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <div class="screen">
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
