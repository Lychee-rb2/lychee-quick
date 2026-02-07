// Generate global-env.d.ts from .env keys
export const buildGlobalEnv = async (root: string) => {
  const envContent = await Bun.file(`${root}/.env`).text();
  const envKeys = envContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim())
    .filter(Boolean);

  const content = `declare module "bun" {
  interface Env {
    ${envKeys.map((key) => `${key}?: string;`).join("\n    ")}
  }
}
`;
  await Bun.write(`${root}/global-env.d.ts`, content);
  console.log(`global-env.d.ts generated with ${envKeys.length} env keys`);
};
