import type { GithubAttachmentMeta } from "@/types/linear";
import { createClient } from "@@/fetch/linear.ts";
import { pbcopy } from "@@/help/io.ts";
import { logger } from "@@/help/logger.ts";
import type { Attachment, Issue } from "@@/types/linear";
import { checkbox, confirm } from "@inquirer/prompts";
import { $ } from "bun";
import { format } from "date-fns";
import { z } from "zod";

const buildMention = (mention: { id: string; label: string }) => [
  {
    type: "suggestion_userMentions",
    attrs: { id: mention.id, label: mention.label },
  },
  { type: "text", text: ", " },
];
const buildHello = (mentions: { id: string; label: string }[]) => [
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Hello " },
      ...mentions.flatMap(buildMention),
      { type: "text", text: "preview links👇" },
    ],
  },
  { type: "horizontal_rule" },
];

const buildPreviews = (
  previews: Pick<
    GithubAttachmentMeta["previewLinks"][number],
    // "url" | "name"
    "url"
  >[],
  issueIdentifier: string,
) => ({
  type: "bullet_list",
  content: previews.map((preview) => ({
    type: "list_item",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "link", attrs: { href: preview.url } }],
            text: `${issueIdentifier} ${preview.url}`,
          },
        ],
      },
    ],
  })),
});
const buildFooter = (footer: string) => [
  { type: "horizontal_rule" },
  { type: "paragraph", content: [{ type: "text", text: footer }] },
];
export const buildCommentBody = (
  issueIdentifier: string,
  mentions: { id: string; label: string }[],
  previews: Pick<
    GithubAttachmentMeta["previewLinks"][number],
    // "url" | "name"
    "url"
  >[],
  footer?: string,
) => {
  return {
    linear: {
      type: "doc",
      content: [
        ...buildHello(mentions),
        buildPreviews(previews, issueIdentifier),
        ...(footer ? buildFooter(footer) : []),
      ],
    },
    markdown: [
      `# Hello ${mentions.map((i) => i.label).join(",")}, preview links👇`,
      `---`,
      ...previews.map((i) => `- [${issueIdentifier} ${i.url}](${i.url})`),
      ...(footer ? [`---`, footer] : []),
    ],
  };
};

export const sendPreview = async (issue: Issue, attachment: Attachment) => {
  const client = createClient();
  const previewsCommentMentions = (
    Bun.env.PREVIEWS_COMMENT_MENTIONS || ""
  ).split(",");
  const emails =
    previewsCommentMentions
      ?.map((i) => z.string().email().safeParse(i.trim()))
      ?.filter((i) => i.success)
      ?.map((i) => i.data) || [];

  const mentions = await client
    .users({ filter: { email: { in: emails } } })
    .then((res) => res.users.nodes.map((i) => ({ id: i.id, label: i.name })));
  const name = attachment.metadata.previewLinks[0]?.name;
  if (name) {
    console.log("name is fixed", name);
  }
  const previewLinks = await checkbox({
    message: "Send which preview link?",
    loop: false,
    choices: attachment.metadata.previewLinks.map((issue) => {
      return {
        name: `${issue.url}`,
        value: issue,
        short: issue.url,
        checked: true,
      };
    }),
  });
  const body = buildCommentBody(
    issue.identifier,
    mentions,
    previewLinks,
    Bun.env.PREVIEWS_COMMENT_FOOTER,
  );
  body.markdown.forEach((i) => console.log(i));
  const answer = await confirm({
    message: `Do you want to send preview comment to Linear issue ${issue.identifier}?`,
  });
  if (!answer) return;
  const res = await client.createComment({
    input: { issueId: issue.id, bodyData: body.linear },
  });
  await $`open ${res.commentCreate.comment.url}`;
};

export const releaseIssues = (items: Issue[]) => {
  if (items.length === 0) return;
  const today = format(new Date(), "yyyy-MM-dd");
  const markdown = [
    "",
    `# Release note: ${today}`,
    items
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ identifier, url, attachments, title }) => ({
        title: `${identifier} ${title}`,
        url: url,
        prs: attachments.nodes.map(({ metadata: { title, url } }) => ({
          title,
          url,
        })),
      }))
      .map(({ title, url, prs }) =>
        [
          `## [${title}](${url})`,
          prs.map(({ title, url }) => `- [${title}](${url})`).join("\n"),
        ].join("\n"),
      )
      .join("\n"),
  ].join("\n");
  pbcopy(markdown);
  logger.info(markdown);
};
