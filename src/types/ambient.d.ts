// Ambient declarations for asset/module imports that Next resolves at build
// time but TypeScript doesn't know about by default.

declare module "*?url" {
  const content: string;
  export default content;
}

declare module "*?worker" {
  const content: string;
  export default content;
}
