import { projects } from './projects.js';
const grid = document.querySelector('#projects');
const search = document.querySelector('#search');
const filters = [...document.querySelectorAll('[data-filter]')];
const empty = document.querySelector('#empty');
const clear = document.querySelector('#clear-search');
let category = 'todos';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
function card(project, index) {
  const article = element('article', 'project');
  article.dataset.id = project.id;
  const cover = element('div', 'cover');
  const img = element('img', 'thumbnail');
  img.src = project.thumbnail; img.alt = project.alt;
  img.width = 960; img.height = 720;
  img.loading = index === 0 ? 'eager' : 'lazy'; img.decoding = 'async';
  cover.append(img);
  if (project.status === 'testing' || project.status === 'unavailable') {
    cover.append(element('span', 'badge', project.status === 'testing' ? 'En pruebas' : 'No disponible'));
  }
  const body = element('div', 'card-body');
  body.append(element('p', 'category', project.type === 'juego' ? 'JUEGO' : 'APP'));
  const title = element('h3', '', project.name); title.id = `title-${project.id}`;
  article.setAttribute('aria-labelledby', title.id);
  body.append(title, element('p', 'description', project.description));
  const tags = element('ul', 'tags'); tags.setAttribute('aria-label', 'Etiquetas');
  for (const tag of project.tags) tags.append(element('li', '', tag));
  body.append(tags);
  if (project.status === 'unavailable') {
    body.append(element('p', 'unavailable', 'No disponible por ahora'));
  } else {
    const link = element('a', 'open-project', project.type === 'juego' ? 'Jugar' : 'Abrir app');
    link.href = project.url;
    link.setAttribute('aria-label', `${project.type === 'juego' ? 'Jugar a' : 'Abrir app'} ${project.name}`);
    link.insertAdjacentHTML('beforeend', arrow);
    body.append(link);
  }
  article.append(cover, body); return article;
}
function render() {
  const terms = normalize(search.value).split(/\s+/).filter(Boolean);
  const matches = [...projects].sort((a,b) => a.order - b.order).filter(project => {
    const text = normalize([project.name, project.description, ...project.tags].join(' '));
    return (category === 'todos' || category === project.type) && terms.every(term => text.includes(term));
  });
  grid.replaceChildren(...matches.map(card));
  empty.hidden = matches.length > 0;
  grid.hidden = matches.length === 0;
  clear.hidden = search.value.length === 0;
  document.querySelector('#result-count').textContent = `${matches.length} ${matches.length === 1 ? 'proyecto' : 'proyectos'}`;
  for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === category));
}
filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; render(); }));
search.addEventListener('input', render);
clear.addEventListener('click', () => { search.value = ''; render(); search.focus(); });
document.querySelector('#reset').addEventListener('click', () => { category = 'todos'; search.value = ''; render(); search.focus(); });
render();
