import { createClient } from "@/fetch/linear.ts";
import { pbcopy } from "@/help/cli.ts";
import { logger } from "@/help/logger.ts";
import { openUrl } from "@/help/cli.ts";
import { buildCommentBody } from "@/help/linear-content.ts";
import { selectPreviewLinks, confirmSendComment } from "@/prompts/linear";
import type { Attachment, Issue } from "@/types/linear";
import { format } from "date-fns";
import { z } from "zod";
import { PREVIEWS_COMMENT_MENTIONS, PREVIEWS_COMMENT_FOOTER } from "@/help/env";
import { t } from "@/i18n";

export { buildCommentBody } from "@/help/linear-content.ts";

export const sendPreview = async (issue: Issue, attachment: Attachment) => {
  const client = createClient();
  const previewsCommentMentions = PREVIEWS_COMMENT_MENTIONS().split(",");

  const emails = previewsCommentMentions.flatMap((i) => {
    const result = z.string().email().safeParse(i.trim());
    return result.success ? [result.data] : [];
  });

  const mentions = await client
    .users({ filter: { email: { in: emails } } })
    .then((res) => res.users.nodes.map((i) => ({ id: i.id, label: i.name })));

  const previewLinks = await selectPreviewLinks(
    attachment.metadata.previewLinks,
  );

  const body = buildCommentBody(
    issue.identifier,
    mentions,
    previewLinks,
    PREVIEWS_COMMENT_FOOTER(),
  );

  body.markdown.forEach((i) => logger.plain(i));

  const answer = await confirmSendComment(issue.identifier);
  if (!answer) return;

  const res = await client.createComment({
    input: { issueId: issue.id, bodyData: body.linear },
  });
  await openUrl(res.commentCreate.comment.url);
};

export const releaseIssues = async (items: Issue[]) => {
  if (items.length === 0) return;
  const today = format(new Date(), "yyyy-MM-dd");
  const markdown = [
    "",
    t("app.linear.release.noteTitle", { today }),
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
  await pbcopy(markdown);
  logger.info(markdown);
};
