// Original, scale-independent line art. Every tool has its own recognizable glyph.
export const TOOL_GLYPH_PATHS: Record<string, string> = {
  ruler: "M3 10h26v12H3zM7 10v5m4-5v8m4-8v5m4-5v8m4-8v5m4-5v8",
  protractor: "M3 26a13 13 0 0 1 26 0zM8 26a8 8 0 0 1 16 0M16 26V13M16 26 7 17m9 9 9-9",
  setsquare: "M4 27V5l24 22zM10 23v-8l9 8z",
  compass: "M16 3v5m0 0L7 28m9-20 9 20M10 21h12M13 8h6",
  calculator: "M7 3h18v26H7zM10 7h12v5H10zM11 17h2m6 0h2m-10 6h2m6 0h2",
  timer: "M12 2h8m-4 0v5M8 10 5 7m19 3 3-3M16 12v8l5 2",
  stopwatch: "M12 2h8m-4 0v5M24 10l3-3M16 12v8m-5 0h5",
  clock: "M16 8v9l7 3M16 4v2m0 20v2M4 16h2m20 0h2",
  spotlight: "m7 5 8 8-8 8-5-5zM15 13l13-5v20l-13-7",
  magnifier: "M22 22l7 7M4 13a9 9 0 1 0 18 0 9 9 0 1 0-18 0",
  screenshot: "M3 9h7l3-4h6l3 4h7v19H3zM11 18a5 5 0 1 0 10 0 5 5 0 1 0-10 0",
  handwriting: "M5 25 8 17 23 2l7 7-15 15zM8 17l7 7M4 30h24",
  graph: "M5 3v25h24M3 17h26M16 3v25M5 23c4 0 6-15 10-15s6 15 14 15",
  solids: "M16 3 29 10v13l-13 7L3 23V10zM3 10l13 7 13-7M16 17v13",
  chemistry: "M12 3h8m-6 0v10L5 26q-1 3 3 3h16q4 0 3-3L18 13V3M10 20h12M12 24h1m5 1h1",
  periodic: "M3 4h6v24H3zM9 16h14v12H9zM23 4h6v24h-6zM3 10h6m14 0h6M3 22h26M16 16v12",
  physics: "M3 16h7m12 0h7M16 5a11 11 0 1 0 0 22 11 11 0 1 0 0-22M9 9l14 14m0-14L9 23",
  camera: "M3 9h7l3-4h6l3 4h7v19H3zM11 18a5 5 0 1 0 10 0 5 5 0 1 0-10 0",
  curtain: "M3 4h26v23H3zM3 12h26M8 4v8m5-8v8m6-8v8m5-8v8M16 12v10m-3-3 3 3 3-3",
  classroom: "M5 5h22v22H5zM10 10h.01M22 10h.01M16 16h.01M10 22h.01M22 22h.01",
};
export function ToolGlyph({id}:{id:string}) {
  return <svg aria-hidden="true" width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {(id==='timer'||id==='stopwatch')&&<circle cx="16" cy="19" r="10"/>}
    {id==='clock'&&<circle cx="16" cy="16" r="13"/>}
    <path d={TOOL_GLYPH_PATHS[id]??TOOL_GLYPH_PATHS.ruler}/>
  </svg>;
}
