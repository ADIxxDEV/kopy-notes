import type { SVGProps } from "react";

// Feather-style 24x24 stroke icons, keyed by name, so toolbars stay crisp at
// any size without shipping an icon dependency.
export const ICON_PATHS = {
  select: ["M3 3l7.5 18 2.5-7 7-2.5L3 3z"],
  pen: [
    "M12 19l7-7 3 3-7 7-3-3z",
    "M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z",
    "M2 2l7.586 7.586",
  ],
  highlighter: ["M9 11l-6 6v3h3l6-6", "M22 5l-4-4-9 9 4 4 9-9z", "M14 4l6 6"],
  eraser: ["M20 20H8.5L3 14.5 13.5 4l6.5 6.5L20 20z", "M7 10l6 6"],
  laser: ["M5 3l4 4", "M19 3l-4 4", "M12 8v6", "M9 20h6", "M12 14a4 4 0 1 0 0-8 4 4 0 1 0 0 8z"],
  line: ["M4 20L20 4"],
  rect: ["M4 6h16v12H4z"],
  ellipse: ["M12 4a8 8 0 100 16 8 8 0 000-16z"],
  arrow: ["M5 19L19 5", "M11 5h8v8"],
  circle: ["M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z"],
  righttriangle: ["M3 3v18h18z", "M3 17h4v4"],
  parallelogram: ["M7 5h15l-5 14H2z"],
  trapezoid: ["M7 5h10l5 14H2z"],
  triangle: ["M12 3L22 21H2z"],
  star: ["M12 2l3 6.3 7 .9-5 4.8 1.3 7-6.3-3.3L5.7 21 7 14 2 9.2l7-.9z"],
  diamond: ["M12 2l10 10-10 10L2 12z"],
  pentagon: ["M12 2l10 7-4 12H6L2 9z"],
  hexagon: ["M7 3h10l5 9-5 9H7L2 12z"],
  shapes: ["M3 3h8v8H3z", "M18 3l4 8h-8z", "M10 18a5 5 0 1 1-10 0 5 5 0 1 1 10 0", "M13 15h9v7h-9z"],
  text: ["M4 6V4h16v2", "M12 4v16", "M8 20h8"],
  undo: ["M3 4v6h6", "M3 10c2-4 6-6 10-5 5 1 8 5 8 9 0 4-3 7-7 7"],
  redo: ["M21 4v6h-6", "M21 10c-2-4-6-6-10-5-5 1-8 5-8 9 0 4 3 7 7 7"],
  plus: ["M12 5v14", "M5 12h14"],
  minus: ["M5 12h14"],
  trash: ["M3 6h18", "M8 6V4h8v2", "M6 6l1 14h10l1-14"],
  menu: ["M3 6h18", "M3 12h18", "M3 18h18"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  chevronLeft: ["M15 18l-6-6 6-6"],
  chevronRight: ["M9 18l6-6-6-6"],
  chevronDown: ["M6 9l6 6 6-6"],
  settings: [
    "M12 15a3 3 0 100-6 3 3 0 000 6z",
    "M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  ],
  import: ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  export: ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  print: ["M6 9V2h12v7", "M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2", "M6 14h12v8H6z"],
  help: ["M12 17h.01", "M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4", "M12 22a10 10 0 100-20 10 10 0 000 20z"],
  save: ["M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z", "M17 21v-8H7v8", "M7 3v5h8"],
  folder: ["M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"],
  board: ["M3 4h18v12H3z", "M8 20h8", "M12 16v4"],
  toolbox: ["M2 9h20v10a2 2 0 01-2 2H4a2 2 0 01-2-2V9z", "M2 9a2 2 0 012-2h4l2-3h4l2 3h4a2 2 0 012 2", "M9 13h6v4H9z"],
  zoomIn: ["M11 19a8 8 0 100-16 8 8 0 000 16z", "M21 21l-4.3-4.3", "M11 8v6", "M8 11h6"],
  zoomOut: ["M11 19a8 8 0 100-16 8 8 0 000 16z", "M21 21l-4.3-4.3", "M8 11h6"],
  fit: ["M8 3H5a2 2 0 00-2 2v3", "M16 3h3a2 2 0 012 2v3", "M21 16v3a2 2 0 01-2 2h-3", "M3 16v3a2 2 0 002 2h3"],
  image: ["M3 5h18v14H3z", "M3 15l5-5 4 4 3-3 6 6", "M8.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"],
  doc: ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6"],
  back: ["M19 12H5", "M12 19l-7-7 7-7"],
  grid: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  layers: ["M12 2l9 5-9 5-9-5 9-5z", "M3 12l9 5 9-5", "M3 17l9 5 9-5"],
  check: ["M20 6L9 17l-5-5"],
  copy: ["M8 8h12v12H8z", "M4 16V4h12"],
  eye: ["M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z", "M12 15a3 3 0 100-6 3 3 0 000 6z"],
  hand: ["M18 11V6a2 2 0 00-4 0v5", "M14 10V4a2 2 0 00-4 0v6", "M10 10.5V6a2 2 0 00-4 0v8", "M18 8a2 2 0 014 0v6a8 8 0 01-8 8h-2a8 8 0 01-8-8v-2a2 2 0 014 0"],
  play: ["M6 4l14 8-14 8V4z"],
  pause: ["M6 4h4v16H6z", "M14 4h4v16h-4z"],
  reset: ["M3 12a9 9 0 109-9 9 9 0 00-9 9z", "M3 3v6h6"],
  pages: ["M4 4h9l3 3v13H4z", "M11 4v3h3"],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({
  name,
  className,
  filled,
  ...props
}: { name: IconName; className?: string; filled?: boolean } & SVGProps<SVGSVGElement>) {
  const paths = ICON_PATHS[name] ?? ICON_PATHS.close;
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill={filled ? "currentColor" : "none"} />
      ))}
    </svg>
  );
}
