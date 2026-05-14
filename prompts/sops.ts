import { checkbox, confirm, search } from "@inquirer/prompts";
import { t } from "@/i18n";

export const pickSopsFile = async (files: string[]): Promise<string> => {
  return search({
    message: t("prompt.sops.decryptFile"),
    source: async (input) => {
      const keywords = input?.split(" ").filter(Boolean) || [];
      return files
        .filter((file) =>
          keywords.length
            ? keywords.every((keyword) => file.includes(keyword))
            : true,
        )
        .map((file) => ({ name: file, value: file }));
    },
  });
};

export const confirmCoverDecryptedFile = async (
  outputFile: string,
): Promise<boolean> => {
  return confirm({
    message: t("prompt.sops.decryptConfirm", { file: outputFile }),
  });
};

export const pickCoverFolders = async (
  folders: string[],
): Promise<string[]> => {
  return checkbox({
    message: t("prompt.sops.coverFolders"),
    loop: false,
    choices: folders
      .map((folder) => ({
        name: folder,
        value: folder,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
};
