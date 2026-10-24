import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../', import.meta.url));
const target = fileURLToPath(new URL('../../../docs/pizarra/', import.meta.url));
mkdirSync(target, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'model.js', 'text-layout.js', 'viewport.js', 'render.js', 'icons.js', 'favicon.svg']) {
  cpSync(`${source}/${file}`, `${target}/${file}`);
}
console.log('Pizarra publicada en docs/pizarra/');
