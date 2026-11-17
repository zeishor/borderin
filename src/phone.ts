/** Cifrele numărului în format internațional, pentru wa.me. `07…` se consideră românesc. */
export function waDigits(numar: string): string {
  let d = numar.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return '40' + d.slice(1);
  return d;
}

export function waLink(numar: string): string {
  return `https://wa.me/${waDigits(numar)}`;
}
