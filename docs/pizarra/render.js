import { bounds, isPath, allBounds } from './model.js';
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
function addText(parent, item, x, y, width, height, fontSize = 18, anchor = 'middle') {
  const maxChars = Math.max(4, Math.floor(width / (fontSize * .56)));
  const lines = [];
  for (const paragraph of item.text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      if ((line + ' ' + word).trim().length > maxChars && line) { lines.push(line); line = ''; }
      if (word.length > maxChars) {
        if (line) { lines.push(line); line = ''; }
        for (let i = 0; i < word.length; i += maxChars) { const piece = word.slice(i, i + maxChars); if (piece.length === maxChars) lines.push(piece); else line = piece; }
      } else line = (line + ' ' + word).trim();
    }
    lines.push(line);
  }
  const maxLines = Math.max(1, Math.floor(height / (fontSize * 1.35))), visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) visible[visible.length - 1] = visible.at(-1).slice(0, Math.max(1, maxChars - 1)) + '…';
  const startY = y + (height - visible.length * fontSize * 1.35) / 2 + fontSize;
  const text = svg('text', { fill: item.kind === 'sticky' ? '#5c4e2f' : item.color, stroke: 'none', 'font-family': 'Arial, sans-serif', 'font-size': fontSize, 'font-weight': item.kind === 'text' ? 500 : 500, 'text-anchor': anchor });
  visible.forEach((line, i) => text.append(svg('tspan', { x, y: startY + i * fontSize * 1.35 }, line)));
  parent.append(text);
}
export function renderItem(item) {
  const group = svg('g', { 'data-id': item.id, opacity: item.opacity, fill: 'none', stroke: item.color, 'stroke-width': item.width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  group.append(svg('title', {}, isPath(item) ? 'Trazo' : item.text || item.kind));
  if (isPath(item)) {
    group.append(svg('path', { d: pathData(item.points, item.smooth) }));
    if (item.type === 'arrow' && item.points.length > 1) {
      const tip = item.points.at(-1), prev = item.points.at(-2), angle = Math.atan2(tip.y - prev.y, tip.x - prev.x), size = Math.max(14, item.width * 3);
      group.append(svg('path', { d: `M${tip.x - Math.cos(angle - .48) * size} ${tip.y - Math.sin(angle - .48) * size}L${tip.x} ${tip.y}L${tip.x - Math.cos(angle + .48) * size} ${tip.y - Math.sin(angle + .48) * size}` }));
    }
    return group;
  }
  const {x, y, w, h, kind} = item, tint = `${item.color}0d`;
  const shape = (tag, attrs) => { const node = svg(tag, attrs); group.append(node); return node; };
  let tx = x + w / 2, ty = y + 10, tw = w - 24, th = h - 20, size = kind === 'text' ? 24 : kind === 'diamond' ? 16 : 18;
  if (kind === 'rect') shape('rect', {x, y, width:w, height:h, rx:16, fill:'#fffefa'});
  if (kind === 'ellipse') { shape('ellipse', {cx:tx, cy:y+h/2, rx:w/2, ry:h/2, fill:'#fffefa'}); tw = w * .7; }
  if (kind === 'diamond') { shape('path', {d:`M${tx} ${y}L${x+w} ${y+h/2}L${tx} ${y+h}L${x} ${y+h/2}Z`, fill:'#fffefa'}); tw = w * .6; }
  if (kind === 'sticky') {
    shape('path', {d:`M${x} ${y}H${x+w}V${y+h-24}L${x+w-24} ${y+h}H${x}Z`, fill:'#fff0ac', stroke:'#dfcb7c', 'stroke-width':1});
    shape('path', {d:`M${x+w-24} ${y+h}V${y+h-24}H${x+w}`, fill:'#f2d878', stroke:'#dfcb7c', 'stroke-width':1});
    tx = x + 18; tw = w - 36; ty = y + 12; th = h - 36;
  }
  if (kind === 'database') {
    shape('path', {d:`M${x} ${y+20}V${y+h-20}C${x} ${y+h+7} ${x+w} ${y+h+7} ${x+w} ${y+h-20}V${y+20}`, fill:'#fffefa'});
    shape('ellipse', {cx:tx, cy:y+20, rx:w/2, ry:20, fill:tint});
    shape('path', {d:`M${x} ${y+h-35}C${x} ${y+h-8} ${x+w} ${y+h-8} ${x+w} ${y+h-35}`});
    ty = y+44; th = h-80;
  }
  if (kind === 'folder') {
    shape('path', {d:`M${x} ${y+20}V${y+8}Q${x} ${y} ${x+8} ${y}H${x+w*.4}L${x+w*.52} ${y+20}H${x+w-8}Q${x+w} ${y+20} ${x+w} ${y+28}V${y+h}H${x}Z`, fill:'#fffefa'});
    shape('rect', {x, y:y+32, width:w, height:h-32, rx:8, fill:tint}); ty=y+38; th=h-42;
  }
  if (kind === 'document') {
    shape('path', {d:`M${x} ${y}H${x+w-28}L${x+w} ${y+28}V${y+h}H${x}Z`, fill:'#fffefa'});
    shape('path', {d:`M${x+w-28} ${y}V${y+28}H${x+w}M${x+20} ${y+h-28}H${x+w-20}M${x+20} ${y+h-16}H${x+w-50}`, opacity:.35});
    ty=y+20; th=h-58;
  }
  if (kind === 'server') {
    for (let i=0;i<2;i++) { shape('rect',{x:x+12,y:y+6+i*34,width:w-24,height:28,rx:6,fill:'#fffefa'}); shape('circle',{cx:x+26,cy:y+20+i*34,r:3,fill:item.color,stroke:'none'}); shape('path',{d:`M${x+42} ${y+20+i*34}H${x+w-24}`,opacity:.4}); }
    ty=y+80; th=h-84;
  }
  if (kind === 'actor') {
    shape('circle',{cx:tx,cy:y+24,r:20,fill:tint});
    shape('path',{d:`M${tx-35} ${y+88}V${y+78}C${tx-35} ${y+40} ${tx+35} ${y+40} ${tx+35} ${y+78}V${y+88}Z`,fill:'#fffefa'});
    ty=y+96; th=h-100;
  }
  if (kind === 'text') { tx=x; ty=y; tw=w; th=h; }
  addText(group,item,tx,ty,tw,Math.max(th,26),size,['text','sticky'].includes(kind)?'start':'middle');
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
