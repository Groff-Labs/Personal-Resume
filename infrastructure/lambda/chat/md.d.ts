// `resume.md` is inlined into the bundle by esbuild's `loader: { '.md': 'text' }`.
// Without this declaration `tsc` has no idea what importing a .md file yields.
declare module '*.md' {
  const content: string;
  export default content;
}
