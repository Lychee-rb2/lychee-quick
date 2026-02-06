import { checkbox, confirm } from "@inquirer/prompts";
import type { GithubAttachmentMeta } from "@/types/linear";

type PreviewLinkItem = GithubAttachmentMeta["previewLinks"][number];

export const selectPreviewLinks = async (
  previewLinks: PreviewLinkItem[],
): Promise<PreviewLinkItem[]> => {
  return checkbox({
    message: "Send which preview link?",
    loop: false,
    choices: previewLinks.map((link) => ({
      name: link.url,
      value: link,
      short: link.url,
      checked: true,
    })),
  });
};

export const confirmSendComment = async (
  issueIdentifier: string,
): Promise<boolean> => {
  return confirm({
    message: `Do you want to send preview comment to Linear issue ${issueIdentifier}?`,
  });
};
