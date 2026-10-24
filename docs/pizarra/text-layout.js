import { clamp, FONT, fontSizeFor, minSize } from './model.js';

// A rectangle wholly inside each object's artwork, in world coordinates.
export function textBox(item) {
  const boxes = {
    rect: [.08, .12, .84, .76], ellipse: [.16, .20, .68, .60],
    diamond: [.25, .26, .50, .48], sticky: [.10, .10, .80, .72],
    database: [.08, .36, .84, .33], folder: [.08, .37, .84, .50],
    document: [.10, .26, .80, .40], server: [.10, .67, .80, .25],
    actor: [.26, .70, .48, .22], text: [0, 0, 1, 1],
  };
  const [x, y, w, h] = boxes[item.kind] || boxes.rect;
  return { x: item.x + item.w * x, y: item.y + item.h * y, w: item.w * w, h: item.h * h };
}
export const approximateWidth = (text, size) => Array.from(text).length * size * .6;
export function wrapText(text, width, size, measure = approximateWidth) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) { lines.push(''); continue; }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of Array.from(word)) {
        if (line && measure(line + character, size) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}
export function maximumFontSize(item, measure = approximateWidth, ceiling = FONT.max) {
  const box = textBox(item);
  const fits = size => {
    const lines = wrapText(item.text, box.w, size, measure);
    return lines.length * size * 1.3 <= box.h && lines.every(line => measure(line, size) <= box.w);
  };
  if (!fits(FONT.min)) return FONT.min;
  if (fits(ceiling)) return ceiling;
  let low = FONT.min, high = ceiling;
  for (let i = 0; i < 16; i++) { const mid = (low + high) / 2; if (fits(mid)) low = mid; else high = mid; }
  return Math.floor(low * 10) / 10;
}
export function layoutText(item, measure = approximateWidth) {
  const box = textBox(item), requested = fontSizeFor(item);
  const size = Math.min(requested, maximumFontSize(item, measure, requested));
  const allLines = wrapText(item.text, box.w, size, measure);
  const lines = allLines.slice(0, Math.max(1, Math.floor(box.h / (size * 1.3))));
  const truncated = lines.length < allLines.length || lines.some(line => measure(line, size) > box.w);
  if (truncated) {
    let last = lines.at(-1);
    while (last && measure(last + '…', size) > box.w) last = Array.from(last).slice(0, -1).join('');
    lines[lines.length - 1] = last + '…';
  }
  return { box, size, lines, lineHeight: size * 1.3, truncated };
}
// Standalone text can grow with the chosen font; shape labels stay within their shape.
export function sizeFreeText(item, measure = approximateWidth) {
  const size = fontSizeFor(item), minimum = minSize('text');
  const w = clamp(Math.max(item.w, measure('W', size) + 2), minimum.w, 2000);
  const lines = wrapText(item.text, w, size, measure);
  return { ...item, w, h: clamp(Math.ceil(lines.length * size * 1.3 + 2), minimum.h, 2000) };
}
