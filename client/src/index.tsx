import { render } from 'solid-js/web';
import { App } from './App';
import { installLocalBaleMock } from './services/bale-mock';
import { registerServiceWorker } from './services/registerServiceWorker';
import './styles/global.scss';

installLocalBaleMock();
registerServiceWorker();
render(() => <App />, document.getElementById('root')!);
