/** Markdown imported as text (`with { type: "text" }`): Bun builds it into the single file. */
declare module "*.md" {
  const text: string;
  export default text;
}
