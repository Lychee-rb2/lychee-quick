import { Separator, checkbox, confirm, search } from "@inquirer/prompts";
import type { GithubAttachmentMeta, Issue } from "@/types/linear";
import { getIssues } from "@/fetch/linear";
import { iconMap, typedBoolean } from "@/help";
import { t } from "@/i18n";

type PreviewLinkItem = GithubAttachmentMeta["previewLinks"][number];

export const selectPreviewLinks = async (
  previewLinks: PreviewLinkItem[],
): Promise<PreviewLinkItem[]> => {
  return checkbox({
    message: t("prompt.linear.sendPreviewLink"),
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
    message: t("prompt.linear.confirmSendComment", {
      identifier: issueIdentifier,
    }),
  });
};

export const pickIssueForBranch = async (): Promise<Issue> => {
  const { get } = getIssues();
  let issues: Issue[];
  const SORT_BY = {
    Me: 10000,
    None: -1,
  };
  const ISSUE_STATE_MAP = {
    unstarted: "unstarted",
    started: "started",
    completed: "completed",
    canceled: "canceled",
    backlog: "backlog",
  } as const;
  return await search({
    message: t("prompt.linear.checkoutBranch"),
    source: async (input) => {
      issues = issues || (await get());
      const group = issues
        .filter((i) => {
          if (input === "M") return i.assignee?.isMe;
          if (input === "N") return !i.assignee;
          return input
            ? i.identifier.includes(input) || i.title.includes(input)
            : true;
        })
        .reduce<Record<string, Issue[]>>((map, issue) => {
          const group = !issue.assignee
            ? "None"
            : issue.assignee.isMe
              ? "Me"
              : issue.assignee.displayName;
          map[group] = map[group] || [];
          map[group].push(issue);
          return map;
        }, {});
      return Object.entries(group)
        .sort(
          ([a, as], [b, bs]) =>
            (SORT_BY[b] || bs.length) - (SORT_BY[a] || as.length),
        )
        .map(([assignee, issues]) => [
          new Separator(assignee),
          ...issues.map((issue) => {
            const icon =
              ISSUE_STATE_MAP[issue.state.type as keyof typeof ISSUE_STATE_MAP];
            return {
              name: `${iconMap(icon)}[${issue.identifier}] ${issue.title}`,
              value: issue,
            };
          }),
        ])
        .flat();
    },
  });
};

export const pickIssueForPreview = async () => {
  const { get } = getIssues();
  let issues: Issue[];
  return await search({
    message: t("prompt.linear.sendPreviewComment"),
    source: async (input) => {
      issues = issues || (await get());
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
};

export const pickIssueForRelease = async (issues: Issue[]) => {
  const ISSUE_STATE_MAP = {
    started: "started",
    completed: "completed",
  } as const;
  return await checkbox({
    message: t("prompt.linear.releaseIssue"),
    loop: false,
    choices: issues
      .map((issue) => {
        if (Object.keys(ISSUE_STATE_MAP).includes(issue.state.type)) {
          const icon = ISSUE_STATE_MAP[issue.state.type];
          return {
            name: `${iconMap(icon)}[${issue.identifier}] ${issue.title}`,
            value: issue,
            short: issue.identifier,
          };
        }
        return null;
      })
      .filter(typedBoolean),
  });
};
