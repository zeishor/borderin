import { useRoute } from './router';
import { useStore } from './store';
import { ListaCurse } from './screens/ListaCurse';
import { CursaNoua } from './screens/CursaNoua';
import { CursaScreen } from './screens/CursaScreen';
import { RezervareScreen } from './screens/RezervareScreen';
import { SetariScreen } from './screens/SetariScreen';
import { BiletScreen } from './screens/BiletScreen';
import { DecontScreen } from './screens/DecontScreen';
import { ScanScreen } from './screens/ScanScreen';
import { PlanScreen } from './screens/PlanScreen';
import { DecontIstoric } from './screens/DecontIstoric';
import { DecontLuna } from './screens/DecontLuna';

export function App() {
  useStore();
  const route = useRoute();

  if (route === '/cursa-noua') return <CursaNoua />;
  if (route === '/decont') return <DecontScreen />;
  if (route === '/decont-istoric') return <DecontIstoric />;
  if (route === '/decont-luna') return <DecontLuna />;
  const decontCursa = route.match(/^\/decont\/(.+)$/);
  if (decontCursa) return <DecontScreen preselect={decontCursa[1]} />;
  if (route === '/setari') return <SetariScreen />;
  const cursa = route.match(/^\/cursa\/(.+)$/);
  if (cursa) return <CursaScreen id={cursa[1]} />;
  const plan = route.match(/^\/plan\/(.+)$/);
  if (plan) return <PlanScreen id={plan[1]} />;
  const scan = route.match(/^\/scaneaza\/(.+)$/);
  if (scan) return <ScanScreen cursaId={scan[1]} />;
  const bilet = route.match(/^\/bilet\/(.+)$/);
  if (bilet) return <BiletScreen id={bilet[1]} />;
  const rez = route.match(/^\/rezervare\/(.+)$/);
  if (rez) return <RezervareScreen id={rez[1]} />;
  return <ListaCurse />;
}
