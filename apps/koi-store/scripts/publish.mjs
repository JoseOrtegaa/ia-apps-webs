import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../', import.meta.url));
const target = fileURLToPath(new URL('../../../docs/koi-store/', import.meta.url));
// Solo reemplaza la salida de Koi Store; preserva las demás apps.
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const file of ['index.html', 'style.css', 'app.js', 'projects.js', 'assets']) {
  cpSync(`${source}/${file}`, `${target}/${file}`, { recursive: true });
}
console.log('Koi Store publicado en docs/koi-store/');
