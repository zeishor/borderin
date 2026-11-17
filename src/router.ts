import { useEffect, useState } from 'preact/hooks';

function current(): string {
  return location.hash.replace(/^#/, '') || '/';
}

export function useRoute(): string {
  const [route, setRoute] = useState(current());
  useEffect(() => {
    const on = () => setRoute(current());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(path: string): void {
  location.hash = path;
}

export function back(fallback = '/'): void {
  if (history.length > 1) history.back();
  else go(fallback);
}
