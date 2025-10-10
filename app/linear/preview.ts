import { getIssues } from "@@/fetch/linear.ts";
import { iconMap } from "@@/help";
import { sendPreview } from "@@/help/linear.ts";
import { search, Separator } from "@inquirer/prompts";

export default async function () {
  const { get } = getIssues();

  const value = await search({
    message: "Send preview comment from which pr?",
    source: async (input) => {
      const issues = await get();
      return issues
        .filter((i) => i.attachments?.nodes && i.attachments.nodes.length)
        .filter((i) => {
          if (!input) return true;
          return (
            i.title.includes(input) ||
            i.identifier.includes(input) ||
            i.attachments.nodes.some((node) =>
              node.metadata.title.includes(input),
            )
          );
        })
        .map((issue) => [
          new Separator(issue.identifier),
          ...issue.attachments.nodes.map((attachment) => {
            return {
              name: `${iconMap(attachment.metadata.status)} ${attachment.metadata.title}`,
              value: { attachment, issue },
            };
          }),
        ])
        .flat();
    },
  });
  await sendPreview(value.issue, value.attachment);
}
