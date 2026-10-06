const paths: Record<string, string> = {
  plus: "M12 5v14 M5 12h14",
  image: "M4 4h16v16H4z M4 15l5-5 4 4 3-3 4 4 M15 8h.01",
  scan: "M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M7 8h10v8H7z",
  merge: "M6 3v5c0 3 6 2 6 6 M18 3v5c0 3-6 2-6 6 M12 14v7 M8 17l4 4 4-4",
  split: "M12 21V11 M12 11L5 4 M12 11l7-7 M5 10V4h6 M13 4h6v6",
  extract: "M5 3h10l4 4v7 M5 3v18h8 M9 8h4 M9 12h3 M14 18h7 M18 15l3 3-3 3",
  trash: "M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
  sort: "M8 3v18 M4 7l4-4 4 4 M16 21V3 M12 17l4 4 4-4",
  rotate: "M20 10a8 8 0 1 0 0 5 M20 3v7h-7",
  number: "M9 3L7 21 M17 3l-2 18 M3 9h18 M2 15h18",
  water: "M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12z M9 15a3 3 0 0 0 3 3",
  crop: "M6 3v15h15 M3 6h15v15",
  arrow: "M5 12h14 M14 7l5 5-5 5",
  back: "M19 12H5 M10 7l-5 5 5 5",
  lock: "M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3",
  search: "M21 21l-5-5 M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0",
  upload: "M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6",
  download: "M12 3v13 M7 11l5 5 5-5 M4 17v4h16v-4",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12 M18 6L6 18",
  file: "M5 3h9l5 5v13H5z M14 3v6h5 M9 13h6 M9 17h6",
  grip: "M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01",
  up: "M6 14l6-6 6 6",
  down: "M6 10l6 6 6-6",
  spark: "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
};
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.file} />
    </svg>
  );
}
