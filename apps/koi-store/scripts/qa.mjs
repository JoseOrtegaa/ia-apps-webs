// npm install --no-save --package-lock=false playwright (solo para QA).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.DEMO_URL || 'http://127.0.0.1:8173/ia-apps-webs/koi-store/';
const out = process.env.QA_OUTPUT || '/tmp/koi-store-qa';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  ...(process.env.QA_PROXY ? { proxy: { server: process.env.QA_PROXY } } : {}),
  args: ['--no-sandbox', '--no-zygote', '--disable-dev-shm-usage'],
});
try {
for (const width of [1440, 390, 320]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'es-ES', ignoreHTTPSErrors: !!process.env.QA_PROXY });
  const page = await context.newPage();
  const errors = [], external = [], failed = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(url).origin) external.push(request.url()); });
  page.on('response', response => { if (response.status() >= 400) failed.push(response.url()); });
  assert.equal((await page.goto(url, { waitUntil: 'networkidle' })).status(), 200);
  await page.locator('.project').last().waitFor();
  assert.equal(await page.locator('.project').count(), 3);
  for (const img of await page.locator('.thumbnail').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(el => el.decode());
    assert.ok(await img.evaluate(el => el.naturalWidth > 0 && !!el.alt));
  }
  await page.evaluate(() => scrollTo(0, 0));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${out}/${width}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Juegos', exact: true }).click();
  assert.equal(await page.locator('.project').count(), 2);
  await page.locator('#search').fill('ACCIÓN');
  assert.equal(await page.locator('.project').count(), 1);
  assert.match(await page.locator('.project h3').innerText(), /Survivor/);
  await page.getByRole('button', { name: 'Apps', exact: true }).click();
  assert.equal(await page.locator('.project').count(), 0);
  assert.ok(await page.locator('#empty').isVisible());
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
  assert.equal(await page.locator('.project').count(), 1);
  await page.locator('#search').fill('archivos dispositivo');
  assert.equal(await page.locator('.project').count(), 1);
  await page.locator('#search').fill('noexiste');
  await page.getByRole('button', { name: 'Ver todos los proyectos' }).click();
  assert.equal(await page.locator('.project').count(), 3);
  assert.equal(await page.locator('[data-filter=todos]').getAttribute('aria-pressed'), 'true');
  await page.locator('#search').fill('  ferret   jump  ');
  assert.equal(await page.locator('.project').count(), 1);
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
  const links = await page.locator('.open-project').evaluateAll(els => els.map(el => ({ url: el.href, label: el.getAttribute('aria-label') })));
  assert.equal(new Set(links.map(l => l.url)).size, 3);
  assert.ok(links.every(l => l.url.startsWith('https://joseortegaa.github.io/') && l.label));
  await page.reload({ waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').textContent(), 'Saltar al catálogo');
  assert.equal(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator(':focus').getAttribute('id'), 'catalogo');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator(':focus').getAttribute('data-filter'), 'todos');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.project').count(), 2);
  assert.equal(await page.locator(':focus').getAttribute('data-filter'), 'juego');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.project').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failed, []);
  console.log(`PASS ${width}px: imágenes, filtros combinados, búsqueda normalizada, vacío, teclado, foco, recarga, movimiento reducido, sin overflow/errores/terceros.`);
  await context.close();
}
} finally { await browser.close(); }
