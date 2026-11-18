import { render } from 'preact';
import { App } from './App';
import { initStore } from './store';
import { aplicaTema } from './tema';
import './styles.css';

aplicaTema();

initStore().then(() => render(<App />, document.getElementById('app')!));
