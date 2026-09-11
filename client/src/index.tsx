import { render } from 'solid-js/web';
import { App } from './App';
import { installLocalBaleMock } from './services/bale-mock';
import { registerServiceWorker } from './services/registerServiceWorker';
import './styles/global.scss';

installLocalBaleMock();
registerServiceWorker();

// Long-press / right-click save is a website tell.
document.addEventListener('contextmenu', (event) => {
  const target = event.target;
  if (target instanceof Element && target.closest('input, textarea')) return;
  event.preventDefault();
});

render(() => <App />, document.getElementById('root')!);
