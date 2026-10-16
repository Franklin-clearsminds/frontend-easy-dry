/**
 * Comprueba que el index.html compilado funciona con una Content-Security-Policy estricta: sin scripts en línea ni manejadores
 * `onload=`/`onclick=`, que la política bloquearía. Se corre después de `ng build` (`node scripts/verificar-csp.mjs`).
 */
import { existsSync, readFileSync } from 'node:fs';

const ruta = new URL('../dist/frontend-easy-dry/browser/index.html', import.meta.url);
if (!existsSync(ruta)) {
  console.error('No existe dist/frontend-easy-dry/browser/index.html: compila primero con `ng build`.');
  process.exit(2);
}
const html = readFileSync(ruta, 'utf8');
const problemas = [];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!/\bsrc=/.test(m[1]) && m[2].trim()) problemas.push(`Script en línea: ${m[2].trim().slice(0, 60)}…`);
}
for (const m of html.matchAll(/\son(?:load|click|error|submit|change|focus|blur|mouse\w+|key\w+)\s*=\s*"[^"]*"/gi)) problemas.push(`Manejador en línea: ${m[0].trim()}`);
if (/javascript:/i.test(html)) problemas.push('Hay una dirección javascript:');

if (problemas.length) {
  console.error(`index.html no es compatible con la CSP:\n - ${problemas.join('\n - ')}`);
  process.exit(1);
}
console.log('index.html compatible con la CSP (sin scripts ni manejadores en línea).');
