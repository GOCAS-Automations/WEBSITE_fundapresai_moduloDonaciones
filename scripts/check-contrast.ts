/**
 * Verifica el contraste WCAG 2.x de cada combinación texto/fondo que usa el sitio.
 * Uso:  npm run check:contrast   (sale con código 1 si alguna combinación no cumple)
 *
 * Mantener sincronizado con los tokens de app/globals.css.
 */

const C = {
  purple: "#5f2c85",
  purpleDark: "#4a2168",
  purpleSoft: "#f3edf8",
  periwinkle: "#7186be",
  orange: "#e95620",
  terracotta: "#e27945",
  pink: "#eebec5",
  cream: "#fcf1dd",
  ink: "#2b2233",
  inkMuted: "#544a5c",
  white: "#ffffff",
  gray: "#f5f5f7",
  amberBg: "#fff4d6",
  amberInk: "#6b4300",
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// min: 7 = AAA (texto de lectura), 4.5 = AA (texto normal), 3 = AA texto grande / elementos no textuales.
const checks: { uso: string; fg: string; bg: string; min: number }[] = [
  { uso: "Texto de lectura (ink) sobre blanco", fg: C.ink, bg: C.white, min: 7 },
  { uso: "Texto de lectura (ink) sobre gris iOS", fg: C.ink, bg: C.gray, min: 7 },
  { uso: "Texto de lectura (ink) sobre crema", fg: C.ink, bg: C.cream, min: 7 },
  { uso: "Texto de lectura (ink) sobre rosa", fg: C.ink, bg: C.pink, min: 7 },
  { uso: "Texto secundario (ink-muted) sobre blanco", fg: C.inkMuted, bg: C.white, min: 7 },
  { uso: "Texto secundario (ink-muted) sobre gris iOS", fg: C.inkMuted, bg: C.gray, min: 7 },
  { uso: "Texto secundario (ink-muted) sobre crema", fg: C.inkMuted, bg: C.cream, min: 7 },
  { uso: "Títulos y enlaces morados sobre blanco", fg: C.purple, bg: C.white, min: 7 },
  { uso: "Títulos y enlaces morados sobre gris iOS", fg: C.purple, bg: C.gray, min: 7 },
  { uso: "Títulos y enlaces morados sobre crema", fg: C.purple, bg: C.cream, min: 7 },
  { uso: "Morado sobre morado suave (botón secundario hover)", fg: C.purple, bg: C.purpleSoft, min: 7 },
  { uso: "Botón primario: blanco sobre morado", fg: C.white, bg: C.purple, min: 7 },
  { uso: "Botón primario hover: blanco sobre morado oscuro", fg: C.white, bg: C.purpleDark, min: 7 },
  { uso: "Etiqueta: morado oscuro sobre rosa", fg: C.purpleDark, bg: C.pink, min: 4.5 },
  { uso: "Aviso ámbar del panel", fg: C.amberInk, bg: C.amberBg, min: 4.5 },
  { uso: "Anillo de foco morado sobre blanco (no textual)", fg: C.purple, bg: C.white, min: 3 },
  { uso: "Ícono periwinkle sobre blanco (no textual)", fg: C.periwinkle, bg: C.white, min: 3 },
  { uso: "Barra de avance morada sobre su riel rosa (no textual)", fg: C.purple, bg: C.pink, min: 3 },
];

// Combinaciones PROHIBIDAS (se listan para documentar por qué).
const prohibidas: { uso: string; fg: string; bg: string }[] = [
  { uso: "Blanco sobre naranja (botón naranja)", fg: C.white, bg: C.orange },
  { uso: "Naranja como texto sobre blanco", fg: C.orange, bg: C.white },
  { uso: "Terracota como texto sobre crema", fg: C.terracotta, bg: C.cream },
  { uso: "Periwinkle como texto sobre blanco", fg: C.periwinkle, bg: C.white },
];

let fail = 0;
for (const c of checks) {
  const r = ratio(c.fg, c.bg);
  const ok = r >= c.min;
  if (!ok) fail++;
  console.log(`${ok ? "OK  " : "FALLA"} ${r.toFixed(2).padStart(5)}:1 (mín ${c.min})  ${c.uso}`);
}
console.log("\nNo usar (texto pequeño):");
for (const c of prohibidas) console.log(`      ${ratio(c.fg, c.bg).toFixed(2).padStart(5)}:1  ${c.uso}`);
if (fail) {
  console.error(`\n${fail} combinación(es) no cumplen.`);
  process.exit(1);
}
