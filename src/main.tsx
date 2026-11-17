import { render } from 'preact';
import { App } from './App';
import { initStore } from './store';
import './styles.css';

initStore().then(() => render(<App />, document.getElementById('app')!));
