// Inputs keep a plain value ("12500.5") in state and show it formatted ("12,500.5").

const MAX_DECIMALS = 2;

// Turns whatever was typed or pasted into a plain number string, keeping an unfinished "12." as typed.
export function normalizeNumberInput(text: string): string {
  let s = text.replace(/[^0-9.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');

  const hasDot = dot !== -1;
  let [int, dec] = s.split('.');
  int = int.replace(/^0+(?=\d)/, '');
  if (hasDot && int === '') int = '0';
  if (!hasDot) return int;
  return `${int}.${(dec ?? '').slice(0, MAX_DECIMALS)}`;
}

export function formatNumberDisplay(plain: string): string {
  if (plain === '') return '';
  const [int, dec] = plain.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec === undefined ? grouped : `${grouped}.${dec}`;
}
