const paths = {
  select: '<path d="m5 3 14 10-7 1-3 7Z"/>', hand: '<path d="M8 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-4a2 2 0 0 1 4 0v9c0 4-3 6-7 6-3 0-5-2-7-5l-3-5a2 2 0 0 1 3-2l2 3Z"/>',
  pen: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>', marker: '<path d="m9 3 10 10-8 8-8-8ZM13 7l4-4 4 4-4 4M3 21l4-4"/>', highlight: '<path d="m8 4 12 12-5 5L3 9ZM5 11l6-6M4 16l4 4M2 22h11"/>',
  eraser: '<path d="m15 3 6 6a2 2 0 0 1 0 3L11 22H6l-5-5a2 2 0 0 1 0-3L12 3a2 2 0 0 1 3 0ZM6 10l9 9M11 22h11"/>',
  arrow: '<path d="M4 20 20 4M7 4h13v13"/>', line: '<path d="M4 20 20 4"/>', text: '<path d="M4 5V3h16v2M12 3v18M8 21h8"/>',
  shapes: '<rect x="3" y="3" width="11" height="11" rx="2"/><circle cx="16" cy="16" r="6"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
  undo: '<path d="m8 3-5 5 5 5M3 8h11a6 6 0 0 1 0 12h-3"/>', redo:'<path d="m16 3 5 5-5 5M21 8H10a6 6 0 0 0 0 12h3"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>', more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>', fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  check:'<path d="m5 12 4 4L19 6"/>', sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>', folder:'<path d="M3 6V4h7l3 3h8v14H3Z"/><path d="M3 9h18"/>', document:'<path d="M14 2H4v20h16V8ZM14 2v6h6M8 12h8m-8 4h8"/>', server:'<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/><path d="M7 7h.01M7 17h.01m4-10h6m-6 10h6"/>', actor:'<circle cx="12" cy="6" r="4"/><path d="M5 21v-3a7 7 0 0 1 14 0v3"/>',
  sticky:'<path d="M3 3h18v12l-6 6H3ZM15 21v-6h6"/>', rect:'<rect x="3" y="5" width="18" height="14" rx="2"/>', ellipse:'<ellipse cx="12" cy="12" rx="10" ry="7"/>', diamond:'<path d="m12 2 10 10-10 10L2 12Z"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>', copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>', edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14Z"/>',
  grid:'<circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="18" r="1"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>', help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3h.01"/>', back:'<path d="m10 5-7 7 7 7M3 12h18"/>', image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 16 5-4 4 3 4-6 5 8"/>', layers:'<path d="m12 3 10 5-10 5L2 8ZM2 12l10 5 10-5M2 16l10 5 10-5"/>'
};
export const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pen}</svg>`;
export function fillIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
