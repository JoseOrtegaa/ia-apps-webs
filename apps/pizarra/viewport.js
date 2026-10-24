import { clamp, distance } from './model.js';
export const VIEW = { minZoom: .05, maxZoom: 8, limit: 1000000 };
export function worldPoint(camera, point) { return { x: (point.x - camera.x) / camera.z, y: (point.y - camera.y) / camera.z }; }
export function zoomCamera(camera, zoom, anchor) {
  const point = worldPoint(camera, anchor), z = clamp(zoom, VIEW.minZoom, VIEW.maxZoom);
  return { x: anchor.x - point.x * z, y: anchor.y - point.y * z, z };
}
export function startPinch(camera, a, b) {
  return { startDistance: Math.max(1, distance(a, b)), startZoom: camera.z,
    anchor: worldPoint(camera, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) };
}
export function pinchCamera(start, a, b) {
  const z = clamp(start.startZoom * distance(a, b) / start.startDistance, VIEW.minZoom, VIEW.maxZoom);
  return { x: (a.x + b.x) / 2 - start.anchor.x * z, y: (a.y + b.y) / 2 - start.anchor.y * z, z };
}
export function installPageZoomGuard(doc) {
  const prevent = event => { if (event.cancelable) event.preventDefault(); };
  // iOS gesture events are separate from the Pointer Events used by the canvas.
  for (const name of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(name, prevent, { passive: false });
  doc.addEventListener('touchmove', event => { if (event.touches.length > 1) prevent(event); }, { passive: false });
  doc.addEventListener('dblclick', event => { if (!event.target.closest('input,textarea,[contenteditable]')) prevent(event); });
  doc.addEventListener('wheel', event => {
    if ((event.ctrlKey || event.metaKey) && !event.target.closest('#board')) prevent(event);
  }, { passive: false });
}
