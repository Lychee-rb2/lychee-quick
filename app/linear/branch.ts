import { search, Separator } from "@inquirer/prompts";
import { Issue } from "@/types/linear.ts";
import { findNextBranch, iconMap } from "@/help";
import { $ } from "bun";
import { getIssues } from "@/fetch/linear.ts";

const sortBy = {
  Me: 10000,
  None: -1,
};
const issueStateMap = {
  unstarted: "unstarted",
  started: "started",
  completed: "completed",
  canceled: "canceled",
  backlog: "backlog",
} as const;

export default async function () {
  const { get } = getIssues();
  const issue = await search({
    message: "Checkout branch from which issue?",
    source: async (input) => {
      const issues = await get();
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
            (sortBy[b] || bs.length) - (sortBy[a] || as.length),
        )
        .map(([assignee, issues]) => [
          new Separator(assignee),
          ...issues.map((issue) => {
            const icon =
              issueStateMap[issue.state.type as keyof typeof issueStateMap];
            return {
              name: `${iconMap(icon)}[${issue.identifier}] ${issue.title}`,
              value: issue,
            };
          }),
        ])
        .flat();
    },
  });
  const branchName = await findNextBranch(issue.branchName);
  await $`git checkout main`;
  await $`git pull`;
  await $`git checkout -b ${branchName}`;
}
