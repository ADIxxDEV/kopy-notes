import type {ThemePack} from '../lib/theme-pack';
import type {BoardPreset} from '../lib/board-presets';
export type Point = { x: number; y: number; p?: number };

export type PenTool = "pen" | "highlighter" | "marker" | "laser";

export type StrokeObject = {
  id: string;
  kind: "stroke";
  tool: PenTool;
  brush?: import('../lib/brush-presets').BrushKind;
  brushSettings?:import('../lib/brush-presets').BrushSettings;
  color: string;
  width: number;
  opacity?:number;
  points: Point[];
  stamp?:"smile"|"star"|"heart"|"sun";
  laserExpiresAt?:number;
  laserCreatedAt?:number;
};

export type ShapeObject = {
  solid?:import("../lib/solid-shapes").SolidData;
  chemistry?:import("../lib/chemistry-equipment").EquipmentData;
  mirrorX?:boolean;mirrorY?:boolean;
  id: string;
  kind: "shape";
  shape: "line" | "rect" | "ellipse" | "arrow" | "triangle" | "star" | "diamond" | "pentagon" | "hexagon" | "circle" | "righttriangle" | "parallelogram" | "trapezoid";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  width: number;
  filled: boolean;
  /** Legacy filled shapes use their stroke color when this is omitted. */
  fillColor?: string;
  fillStyle?: "solid" | "hachure" | "crosshatch";
  /** Radius in board pixels; only rectangles use rounded corners. */
  roundness?: number;
  dash?: "solid" | "dashed" | "dotted";
  rotation: number;
};

export type TextObject = {
  rotation?:number;mirrorX?:boolean;mirrorY?:boolean;
  id: string;
  kind: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic?:boolean;
};

export type BoardObject = StrokeObject | ShapeObject | TextObject;

export type MediaItem = {
  mirrorX?:boolean;mirrorY?:boolean;
  locked?:boolean;
  id: string;
  title?:string;sourceUrl?:string;videoId?:string;playback?:number;sheet?:import('../lib/spreadsheet').Spreadsheet;
  kind: "image" | "pdf" | "docx" | "audio" | "video" | "youtube" | "link" | "spreadsheet";
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  /** For PDFs: which page is currently shown. */
  pageNumber: number;
  /** For PDFs: total pages (cached so we don't reload to navigate). */
  numPages?: number;
};


export type Watermark = {enabled:boolean;text:string;position:'center'|'top-left'|'top-right'|'bottom-left'|'bottom-right';opacity:number};
export type ImportFrame = {x:number;y:number;width:number;height:number};
export type AppProfile = { boardCredits?:import('../lib/store-credits').StoreCredits; ui?:import('../lib/interface-settings').InterfaceSettings; theme?:ThemePack; themePacks?:ThemePack[]; boardImage?:string; boardPresets?:BoardPreset[]; id: number; appName: string; teacherName: string; institution: string; accent: string; boardBg: string; boardPattern: string; defaultPenColor: string; onboarded: number; createdAt: Date; updatedAt: Date; iconData?: string; splashText?: string; watermark?:Watermark; calibrationPxPerMm?:number; ai?:{enabled:boolean;endpoint:string;model:string} };
export type Notebook = { id: string; title: string; subject: string; coverColor: string; pageCount: number; createdAt: Date; updatedAt: Date };
export type Page = { backgroundImage?:string; importFrame?:ImportFrame; id: string; notebookId: string; position: number; background: string; pattern: string; objects: BoardObject[]; media: MediaItem[]; createdAt: Date; updatedAt: Date };
