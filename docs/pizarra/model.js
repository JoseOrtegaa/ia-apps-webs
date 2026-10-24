export const COLORS = ['#252b29', '#db4c46', '#2e805b', '#3c73d8', '#edc448', '#e98c36'];
export const KINDS = ['rect', 'ellipse', 'diamond', 'sticky', 'database', 'folder', 'document', 'server', 'actor', 'text'];
export const LIMITS = { items: 1500, points: 150000, file: 4 * 1024 * 1024 };
export const uid = () => globalThis.crypto?.randomUUID?.() || `p${Date.now()}${Math.random().toString(36).slice(2)}`;
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const minSize = kind => ({ w: kind === 'text' ? 80 : 100, h: ({ database:100, folder:75, document:90, server:115, actor:130, sticky:80, text:40 })[kind] || 70 });
export const FONT = { min: 6, max: 256 };
export const defaultFontSize = kind => kind === 'text' ? 24 : kind === 'diamond' ? 16 : 18;
export const fontSizeFor = item => item.fontSize ?? defaultFontSize(item.kind);
export function resizedObject(item, width, height) {
  const minimum = minSize(item.kind);
  const w = clamp(width, minimum.w, 2000), h = clamp(height, minimum.h, 2000);
  const scale = Math.min(w / item.w, h / item.h);
  return { ...item, w, h, fontSize: clamp(fontSizeFor(item) * scale, FONT.min, FONT.max) };
}
export const isPath = item => ['stroke', 'line', 'arrow'].includes(item.type);
export const emptyBoard = () => ({ version: 1, title: 'Mi pizarra', items: [] });
export function segmentDistance(p, a, b) {
  const length2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  const t = length2 ? clamp(((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / length2, 0, 1) : 0;
  return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
// Iterative Ramer–Douglas–Peucker: bounded stack even for long handwriting.
export function simplify(points, tolerance = 1) {
  if (points.length < 3) return points;
  const keep = new Set([0, points.length - 1]), stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maximum = tolerance, index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(points[i], points[first], points[last]);
      if (d > maximum) { maximum = d; index = i; }
    }
    if (index >= 0) { keep.add(index); stack.push([first, index], [index, last]); }
  }
  return [...keep].sort((a, b) => a - b).map(i => points[i]);
}
export function finishStroke(points, smooth, zoom = 1) {
  if (!smooth || points.length < 3) return { points, straight: false };
  const start = points[0], end = points.at(-1), direct = distance(start, end);
  const length = points.slice(1).reduce((sum, p, i) => sum + distance(p, points[i]), 0);
  const deviation = Math.max(...points.map(p => segmentDistance(p, start, end)));
  // Only snap a clearly intended straight line. Small letters and curves stay freehand.
  if (direct * zoom > 65 && length / direct < 1.55 && deviation < Math.min(10 / zoom, direct * .065)) {
    return { points: [start, end], straight: true };
  }
  const filtered = points.map((p, i) => i === 0 || i === points.length - 1 ? p : {
    x: (points[i - 1].x + 2 * p.x + points[i + 1].x) / 4,
    y: (points[i - 1].y + 2 * p.y + points[i + 1].y) / 4,
  });
  return { points: simplify(filtered, .65 / zoom), straight: false };
}
export function bounds(item) {
  if (!isPath(item)) return { x: item.x, y: item.y, w: item.w, h: item.h };
  const xs = item.points.map(p => p.x), ys = item.points.map(p => p.y);
  const margin = item.type === 'arrow' ? Math.max(14, item.width * 3) : item.width / 2;
  const x = Math.min(...xs) - margin, y = Math.min(...ys) - margin;
  return { x, y, w: Math.max(...xs) - x + margin, h: Math.max(...ys) - y + margin };
}
export function allBounds(items) {
  if (!items.length) return { x: 0, y: 0, w: 800, h: 600 };
  const boxes = items.map(bounds), x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return { x, y, w: Math.max(...boxes.map(b => b.x + b.w)) - x, h: Math.max(...boxes.map(b => b.y + b.h)) - y };
}
export function hitTest(item, p, tolerance = 8) {
  if (isPath(item)) {
    if (item.points.length === 1) return distance(p, item.points[0]) <= tolerance + item.width / 2;
    return item.points.some((point, i) => i && segmentDistance(p, item.points[i - 1], point) <= tolerance + item.width / 2);
  }
  return p.x >= item.x - tolerance && p.x <= item.x + item.w + tolerance && p.y >= item.y - tolerance && p.y <= item.y + item.h + tolerance;
}
export function translated(item, dx, dy) {
  return isPath(item) ? { ...item, points: item.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } : { ...item, x: item.x + dx, y: item.y + dy };
}
// Split vector strokes at exact circle intersections; erased portions remain editable gaps.
export function eraseStroke(item, center, radius) {
  const r = radius + item.width / 2, points = item.points;
  if (points.length === 1) return distance(points[0], center) <= r ? [] : [item];
  const pieces = []; let current = [], changed = false;
  const flush = () => { if (current.length) pieces.push(current); current = []; };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const A = dx * dx + dy * dy, B = 2 * ((a.x - center.x) * dx + (a.y - center.y) * dy);
    const C = (a.x - center.x) ** 2 + (a.y - center.y) ** 2 - r * r, D = B * B - 4 * A * C;
    const ts = [0, 1];
    if (A && D > 0) for (const t of [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)]) if (t > 0 && t < 1) ts.push(t);
    ts.sort((u, v) => u - v);
    for (let j = 1; j < ts.length; j++) {
      const point = t => ({ x: a.x + dx * t, y: a.y + dy * t });
      if (distance(point((ts[j - 1] + ts[j]) / 2), center) < r) { changed = true; flush(); }
      else { if (!current.length) current.push(point(ts[j - 1])); current.push(point(ts[j])); }
    }
  }
  flush();
  if (!changed) return [item];
  return pieces.map((piece, i) => ({ ...item, id: i ? uid() : item.id, type: 'stroke', smooth: false, points: piece }));
}
export function validateBoard(value) {
  const bad = () => { throw new Error('El archivo no es una pizarra válida de Koi.'); };
  const num = (v, min = -1000000, max = 1000000) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  if (!value || value.version !== 1 || typeof value.title !== 'string' || !Array.isArray(value.items) || value.items.length > LIMITS.items) bad();
  let count = 0;
  const items = value.items.map(item => {
    if (!item || !COLORS.includes(item.color) || !num(item.width, .1, 160) || !num(item.opacity, .05, 1)) bad();
    const base = { id: uid(), type: item.type, color: item.color, width: item.width, opacity: item.opacity };
    if (isPath(item)) {
      if (!Array.isArray(item.points) || !item.points.length || item.points.length > 12000 || (count += item.points.length) > LIMITS.points) bad();
      return { ...base, smooth: !!item.smooth, points: item.points.map(p => { if (!p || !num(p.x) || !num(p.y)) bad(); return { x: p.x, y: p.y }; }) };
    }
    if (item.type !== 'object' || !KINDS.includes(item.kind) || !num(item.x) || !num(item.y) || !num(item.w, 24, 2000) || !num(item.h, 24, 2000) || typeof item.text !== 'string' || item.text.length > 500) bad();
    if (item.fontSize !== undefined && !num(item.fontSize, FONT.min, FONT.max)) bad();
    return { ...base, fontSize: item.fontSize ?? defaultFontSize(item.kind), kind: item.kind, x: item.x, y: item.y, w: Math.max(minSize(item.kind).w,item.w), h: Math.max(minSize(item.kind).h,item.h), text: item.text };
  });
  return { version: 1, title: value.title.slice(0, 80) || 'Mi pizarra', items };
}
export class History {
  constructor(board) { this.entries = [JSON.stringify(board)]; this.index = 0; }
  push(board) {
    const next = JSON.stringify(board);
    if (this.entries[this.index] === next) return false;
    this.entries = this.entries.slice(0, this.index + 1); this.entries.push(next);
    while (this.entries.length > 40 || (this.entries.length > 2 && this.entries.reduce((n, s) => n + s.length, 0) > 12000000)) this.entries.shift();
    this.index = this.entries.length - 1; return true;
  }
  undo() { return this.index > 0 ? JSON.parse(this.entries[--this.index]) : null; }
  redo() { return this.index < this.entries.length - 1 ? JSON.parse(this.entries[++this.index]) : null; }
}
export function createObject(kind, x, y, color = COLORS[0]) {
  const labels = { database: 'Base de datos', folder: 'Recursos', document: 'Documento', server: 'Servidor', actor: 'Jugador', sticky: 'Una idea por aquí', rect: 'Proceso', ellipse: 'Inicio', diamond: '¿Qué pasa si…?', text: 'Escribe una idea' };
  return { id: uid(), type: 'object', kind, fontSize: defaultFontSize(kind), x, y, w: kind === 'text' ? 280 : 180, h: kind === 'text' ? 60 : kind === 'sticky' ? 160 : 130, color, opacity: 1, width: 2, text: labels[kind] };
}
export function exampleBoard() {
  const board = { version: 1, title: 'La aventura empieza aquí', items: [] };
  const object = (kind, x, y, w, h, text, color = COLORS[0]) => { const item = { ...createObject(kind, x, y, color), w, h, text }; board.items.push(item); };
  const arrow = (x, y, x2, y2) => board.items.push({ id: uid(), type: 'arrow', points: [{x,y},{x:x2,y:y2}], color: COLORS[2], width: 2.5, opacity: 1 });
  object('text', 80, 30, 640, 70, 'Una gran aventura.\nUna idea a la vez.', COLORS[2]);
  object('text', 80, 120, 500, 36, 'EL BUCLE DE NUESTRO JUEGO', COLORS[0]);
  object('actor', 80, 230, 145, 150, 'Jugador');
  object('rect', 310, 240, 190, 125, 'Explorar\nel mundo', COLORS[2]);
  object('diamond', 590, 225, 180, 155, '¿Misión\ncompletada?', COLORS[3]);
  arrow(237, 303, 297, 303); arrow(512, 303, 578, 303); arrow(790, 303, 850, 303);
  object('database', 865, 235, 180, 140, 'Progreso', COLORS[2]);
  object('sticky', 100, 470, 230, 180, 'El jugador debe entender\nqué hacer sin leer\nun tutorial enorme.');
  object('folder', 440, 490, 190, 135, 'Arte + sonidos', COLORS[3]);
  object('document', 770, 475, 190, 150, 'Misiones', COLORS[0]);
  object('text', 365, 415, 480, 50, '¿Y si empezamos con un misterio?', COLORS[1]);
  return board;
}
