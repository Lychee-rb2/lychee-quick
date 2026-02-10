import { t } from "@/i18n";

export const getEnvKeys = (envContent: string) => {
  return envContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim())
    .filter(Boolean);
};
export const buildType = (envKeys: string[]) => {
  return `declare module "bun" {
  interface Env {
    ${envKeys.map((key) => `${key}?: string;`).join("\n    ")}
  }
}
`;
};
// Generate global-env.d.ts from .env keys
const buildGlobalEnv = async (root: string) => {
  const envContent = await Bun.file(`${root}/.env`).text();
  const envKeys = getEnvKeys(envContent);
  const content = buildType(envKeys);
  await Bun.write(`${root}/global-env.d.ts`, content);
  console.log(
    t("script.buildGlobalEnv.generated", { count: String(envKeys.length) }),
  );
  return 1;
};

export default buildGlobalEnv;
