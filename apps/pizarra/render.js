import { bounds, isPath, allBounds, strokeParts } from './model.js';
import { layoutText, maximumFontSize } from './text-layout.js';
export const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attributes = {}, text) {
  const element = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}
export function pathData(points, smooth) {
  if (points.length === 1) return `M${points[0].x} ${points[0].y}l.01 0`;
  let result = `M${points[0].x} ${points[0].y}`;
  if (!smooth || points.length < 3) return result + points.slice(1).map(p => `L${p.x} ${p.y}`).join('');
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i], next = points[i + 1];
    result += `Q${p.x} ${p.y} ${(p.x + next.x) / 2} ${(p.y + next.y) / 2}`;
  }
  const last = points.at(-1); return result + `L${last.x} ${last.y}`;
}
let measureContext;
const measuredWidths = new Map(), textLayouts = new WeakMap(), textMaximums = new WeakMap();
export function measureLabel(text, size) {
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d');
    if (measureContext) measureContext.font = '500 100px Arial';
  }
  if (!measuredWidths.has(text)) {
    if (measuredWidths.size > 2048) measuredWidths.clear();
    measuredWidths.set(text, measureContext ? measureContext.measureText(text).width : Array.from(text).length * 60);
  }
  return measuredWidths.get(text) * size / 100;
}
export function textMetrics(item) {
  if (!textLayouts.has(item)) textLayouts.set(item, layoutText(item, measureLabel));
  return textLayouts.get(item);
}
export function textSizeLimit(item) {
  if (!textMaximums.has(item)) textMaximums.set(item, maximumFontSize(item, measureLabel));
  return textMaximums.get(item);
}
function addText(parent, item) {
  const { box, size, lines, lineHeight } = textMetrics(item);
  const leftAligned = ['text', 'sticky'].includes(item.kind);
  const clipId = `text-clip-${item.id}`;
  const clip = svg('clipPath', { id: clipId, clipPathUnits: 'userSpaceOnUse' });
  clip.append(svg('rect', { x: box.x, y: box.y, width: box.w, height: box.h }));
  const defs = svg('defs'); defs.append(clip); parent.append(defs);
  const text = svg('text', { fill: item.kind === 'sticky' ? '#5c4e2f' : item.color, stroke: 'none',
    'font-family': 'Arial, sans-serif', 'font-size': size, 'font-weight': 500,
    'text-anchor': leftAligned ? 'start' : 'middle', 'clip-path': `url(#${clipId})` });
  const startY = box.y + (box.h - lines.length * lineHeight) / 2 + size;
  lines.forEach((line, i) => text.append(svg('tspan', {
    x: leftAligned ? box.x : box.x + box.w / 2, y: startY + i * lineHeight,
  }, line)));
  parent.append(text);
}
export function renderItem(item) {
  const group = svg('g', { 'data-id': item.id, opacity: item.opacity, fill: 'none', stroke: item.color, 'stroke-width': item.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  group.append(svg('title', {}, isPath(item) ? 'Trazo' : item.text || item.kind));
  if (isPath(item)) {
    group.append(svg('path', { d: strokeParts(item).map(points => pathData(points, item.smooth)).join('') }));
    if (item.type === 'arrow' && item.points.length > 1) {
      const tip = item.points.at(-1), prev = item.points.at(-2), angle = Math.atan2(tip.y - prev.y, tip.x - prev.x), size = Math.max(14, item.width * 3);
      group.append(svg('path', { d: `M${tip.x - Math.cos(angle - .48) * size} ${tip.y - Math.sin(angle - .48) * size}L${tip.x} ${tip.y}L${tip.x - Math.cos(angle + .48) * size} ${tip.y - Math.sin(angle + .48) * size}` }));
    }
    return group;
  }
  const { x, y, w, h, kind } = item, tint = `${item.color}0d`;
  // All artwork uses a shared 180 × 130 reference box. Text uses its real world size.
  const artwork = svg('g', { transform: `translate(${x} ${y}) scale(${w / 180} ${h / 130})`, 'data-artwork': kind });
  group.append(artwork);
  const shape = (tag, attrs) => artwork.append(svg(tag, attrs));
  if (kind === 'rect') shape('rect', { x: 0, y: 0, width: 180, height: 130, rx: 14, fill: '#fffefa' });
  if (kind === 'ellipse') shape('ellipse', { cx: 90, cy: 65, rx: 90, ry: 65, fill: '#fffefa' });
  if (kind === 'diamond') shape('path', { d: 'M90 0L180 65L90 130L0 65Z', fill: '#fffefa' });
  if (kind === 'sticky') {
    shape('path', { d: 'M0 0H180V110L160 130H0Z', fill: '#fff0ac', stroke: '#dfcb7c', 'stroke-width': 1 });
    shape('path', { d: 'M160 130V110H180', fill: '#f2d878', stroke: '#dfcb7c', 'stroke-width': 1 });
  }
  if (kind === 'database') {
    shape('path', { d: 'M0 20V110C0 136 180 136 180 110V20', fill: '#fffefa' });
    shape('ellipse', { cx: 90, cy: 20, rx: 90, ry: 20, fill: tint });
    shape('path', { d: 'M0 95C0 122 180 122 180 95' });
  }
  if (kind === 'folder') {
    shape('path', { d: 'M0 20V8Q0 0 8 0H72L94 20H172Q180 20 180 28V130H0Z', fill: '#fffefa' });
    shape('rect', { x: 0, y: 32, width: 180, height: 98, rx: 8, fill: tint });
  }
  if (kind === 'document') {
    shape('path', { d: 'M0 0H152L180 28V130H0Z', fill: '#fffefa' });
    shape('path', { d: 'M152 0V28H180M20 102H160M20 114H130', opacity: .35 });
  }
  if (kind === 'server') {
    for (let i = 0; i < 2; i++) {
      shape('rect', { x: 12, y: 6 + i * 34, width: 156, height: 28, rx: 6, fill: '#fffefa' });
      shape('circle', { cx: 26, cy: 20 + i * 34, r: 3, fill: item.color, stroke: 'none' });
      shape('path', { d: `M42 ${20 + i * 34}H156`, opacity: .4 });
    }
  }
  if (kind === 'actor') {
    shape('circle', { cx: 90, cy: 27, r: 22, fill: tint });
    shape('path', { d: 'M28 128V92C28 51 152 51 152 92V128Z', fill: '#fffefa' });
  }
  addText(group, item);
  return group;
}
export function renderSelection(layer, item, zoom) {
  layer.replaceChildren(); if (!item) return;
  const b = bounds(item), pad = 7/zoom;
  layer.append(svg('rect',{x:b.x-pad,y:b.y-pad,width:b.w+pad*2,height:b.h+pad*2,rx:5/zoom,fill:'none',stroke:'#367762','stroke-width':1.5/zoom,'stroke-dasharray':`${5/zoom} ${4/zoom}`}));
  if (!isPath(item)) layer.append(svg('rect',{'data-resize':true,x:b.x+b.w-7/zoom,y:b.y+b.h-7/zoom,width:14/zoom,height:14/zoom,rx:3/zoom,fill:'#fff',stroke:'#367762','stroke-width':2/zoom}));
}
export function exportSVG(items) {
  const b=allBounds(items), margin=40;
  const root=svg('svg',{xmlns:NS,viewBox:`${b.x-margin} ${b.y-margin} ${b.w+margin*2} ${b.h+margin*2}`,width:b.w+margin*2,height:b.h+margin*2});
  root.append(svg('rect',{x:b.x-margin,y:b.y-margin,width:b.w+margin*2,height:b.h+margin*2,fill:'#fffefa'}));
  items.forEach(item=>root.append(renderItem(item)));
  return { source:new XMLSerializer().serializeToString(root),width:b.w+margin*2,height:b.h+margin*2 };
}
