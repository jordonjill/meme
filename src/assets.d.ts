// Text files bundled into the single file with `import … with { type: "text" }`.
declare module "*.md" {
  const text: string;
  export default text;
}
