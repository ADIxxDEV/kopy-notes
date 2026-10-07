import type { BoardObject, MediaItem } from "@/db/schema";

export type { BoardObject, MediaItem };

// ---------------------------------------------------------------------------
// Shared client-side constants for the whiteboard.
// ---------------------------------------------------------------------------

export type ActiveTool =
  | "auto-shape"
  | "select"
  | "pan"
  | "pen"
  | "highlighter"
  | "marker"
  | "eraser"
  | "laser"
  | "line"
  | "rect"
  | "ellipse"
  | "arrow"
  | "triangle"
  | "star"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "circle"
  | "righttriangle"
  | "parallelogram"
  | "trapezoid"
  | "text";

export type Pen = {
  stamp?:"smile"|"star"|"heart"|"sun";
  brush?: 'normal' | 'pencil' | 'paint' | 'chinese' | 'crayon' | 'stamp';
  color: string;
  size: number;
  opacity: number;
  smartShapes: boolean;
  shapeFill?: boolean;
  shapeFillColor?: string;
  shapeFillStyle?: "solid" | "hachure" | "crosshatch";
  shapeRoundness?: number;
  shapeWidth?: number;
  shapeDash?: "solid" | "dashed" | "dotted";
  pressure?: boolean;
  touchMode?: "draw" | "reject" | "palm-erase" | "pan";
  gestureMode?: "pan-zoom" | "pan" | "off";
  eraserMode?: "object" | "ink";
};

export const PEN_TOOLS: ActiveTool[] = ["pen", "highlighter", "marker"];
export const SHAPE_TOOLS: ActiveTool[] = ["line", "rect", "ellipse", "arrow", "triangle", "star", "diamond", "pentagon", "hexagon", "circle", "righttriangle", "parallelogram", "trapezoid"];

// Rich palette. Red family is prominent to match the theme, but teachers need
// the full spectrum for diagrams (chemistry, geography, etc.).
export const INK_COLORS = [
  "#ffffff",
  "#f43f5e",
  "#e11d48",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#94a3b8",
  "#1f2937",
];

export const HIGHLIGHTER_COLORS = [
  "#fde047",
  "#fb7185",
  "#4ade80",
  "#38bdf8",
  "#c084fc",
  "#fb923c",
];

export const PEN_SIZES = [2, 4, 6, 10, 16, 24];

export const BOARD_BACKGROUNDS = [
  { label: "Dark", value: "#111214" },
  { label: "Black", value: "#000000" },
  { label: "Slate", value: "#1e293b" },
  { label: "White", value: "#ffffff" },
  { label: "Paper", value: "#f5f1e6" },
  { label: "Green", value: "#7cb342" },
];

export const BOARD_PATTERNS = [
  { label: "None", value: "none" },
  { label: "Grid", value: "grid" },
  { label: "Dots", value: "dots" },
  { label: "Lines", value: "lines" },
  { label: "Music staff", value: "staff" },
  { label: "Handwriting", value: "handwriting" },
  { label: "Isometric", value: "isometric" },
];

export const SUBJECTS = [
  "General",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
  "Geography",
  "Computer Science",
];

export const COVER_COLORS = [
  "#e11d48",
  "#f43f5e",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
];

// Treasure-box subject tools (rendered as floating draggable windows).
export type FloatingToolId =
  | "calculator"
  | "timer"
  | "stopwatch"
  | "clock"
  | "ruler"
  | "protractor"
  | "compass"
  | "setsquare"
  | "spotlight"
  | "magnifier"
  | "screenshot";

export const FLOATING_TOOLS: { id: FloatingToolId; label: string; icon: string; group: string }[] = [
  { id: "ruler", label: "Ruler", icon: "📏", group: "Math" },
  { id: "protractor", label: "Protractor", icon: "📐", group: "Math" },
  { id: "setsquare", label: "Set square", icon: "📊", group: "Math" },
  { id: "compass", label: "Compass", icon: "🧭", group: "Math" },
  { id: "calculator", label: "Calculator", icon: "🧮", group: "Math" },
  { id: "timer", label: "Timer", icon: "⏳", group: "Time" },
  { id: "stopwatch", label: "Stopwatch", icon: "⏱️", group: "Time" },
  { id: "clock", label: "Clock", icon: "🕐", group: "Time" },
  { id: "spotlight", label: "Spotlight", icon: "🔦", group: "Utility" },
  { id: "magnifier", label: "Magnifier", icon: "🔍", group: "Utility" },
  { id: "screenshot", label: "Screen capture", icon: "📷", group: "Utility" },
];

export function uid(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
