import { useRoute } from './router';
import { useStore } from './store';
import { ListaCurse } from './screens/ListaCurse';
import { CursaNoua } from './screens/CursaNoua';
import { CursaScreen } from './screens/CursaScreen';
import { RezervareScreen } from './screens/RezervareScreen';
import { SetariScreen } from './screens/SetariScreen';

export function App() {
  useStore();
  const route = useRoute();

  if (route === '/cursa-noua') return <CursaNoua />;
  if (route === '/setari') return <SetariScreen />;
  const cursa = route.match(/^\/cursa\/(.+)$/);
  if (cursa) return <CursaScreen id={cursa[1]} />;
  const rez = route.match(/^\/rezervare\/(.+)$/);
  if (rez) return <RezervareScreen id={rez[1]} />;
  return <ListaCurse />;
}
