import { appendLine, copyFile, echo, listFolders, sopsDecrypt } from "@/help";
import { t } from "@/i18n";

export type CoverEnvResult = {
  action: "success" | "error";
  target: string;
};

export const getSopsFiles = async (root: string): Promise<string[]> => {
  const sopsFiles = new Bun.Glob("**/*.sops").scan({ cwd: root, dot: true });
  return Array.fromAsync(sopsFiles);
};

export const getDecryptedOutputPath = (sopsFile: string): string => {
  return sopsFile.replace(/\.sops$/, "");
};

export const decryptSopsFile = async (sopsFile: string): Promise<string> => {
  const output = getDecryptedOutputPath(sopsFile);
  await sopsDecrypt(sopsFile, output);
  await appendLine(
    output,
    `LYCHEE_QUICK_CLI_DECRYPTED_TIME=${new Date().toLocaleString()}`,
  );
  return output;
};

export const getCoverFolders = async (root: string): Promise<string[]> => {
  const rawPattern = Bun.env.SOPS_DECRYPT_COVER_ENV_FOLDER;
  const targetPattern =
    rawPattern && rawPattern !== "undefined" ? rawPattern : "";
  return listFolders(targetPattern, root);
};

export const copyEnvToFolders = async (
  source: string,
  folders: string[],
): Promise<CoverEnvResult[]> => {
  return Promise.all(
    folders.map(async (folder) => {
      const target = `${folder}/.env`;
      try {
        await copyFile(source, target);
        return { action: "success", target } as const;
      } catch {
        return { action: "error", target } as const;
      }
    }),
  );
};

export const printCoverResults = async (
  results: CoverEnvResult[],
): Promise<void> => {
  for (const result of results) {
    if (result.action === "success") {
      await echo(t("prompt.sops.decryptCoverSuccess", { file: result.target }));
      continue;
    }
    await echo(t("prompt.sops.decryptCoverError", { file: result.target }));
  }
};
