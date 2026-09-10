import { render } from 'solid-js/web';
import { App } from './App';
import { installLocalBaleMock } from './services/bale-mock';
import './styles/global.scss';

installLocalBaleMock();
render(() => <App />, document.getElementById('root')!);
