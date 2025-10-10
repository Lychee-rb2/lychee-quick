import { getIssues } from "@@/fetch/linear.ts";
import { iconMap } from "@@/help";
import { releaseIssues } from "@@/help/linear.ts";
import { checkbox } from "@inquirer/prompts";
import { $ } from "bun";

const issueStateMap = {
  started: "started",
  completed: "completed",
} as const;

export default async function () {
  const { get } = getIssues();

  const issues = await get();
  const answer = await checkbox({
    message: "Release which issue?",
    loop: false,
    choices: issues
      .filter((i) => ["started", "completed"].includes(i.state.type))
      .map((issue) => {
        const icon =
          issueStateMap[issue.state.type as keyof typeof issueStateMap];
        return {
          name: `${iconMap(icon)}[${issue.identifier}] ${issue.title}`,
          value: issue,
          short: issue.identifier,
        };
      }),
  });
  releaseIssues(answer);
  const releaseNote = process.env.RELEASE_NOTE_PAGE;
  if (releaseNote) {
    await $`open ${releaseNote}`;
  }
}
