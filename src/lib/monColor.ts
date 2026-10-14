const PALETTE = ['#75420E', '#553B08', '#8a5a2a', '#6b4f2a', '#9c6b3f'];

// A subject's colour: the one Gú picked (meta.color) when there is one, else derived from the name
// (stable hash). Shared by the subject swatch and the book spines on Home, so both always match.
// (Its own module since the lint cleanup: a component file that also exports helpers defeats
// Vite's fast refresh.)
export function monColor(name: string, explicit?: string): string {
  if (explicit) return explicit;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
