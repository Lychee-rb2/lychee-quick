import { getIssues } from "@/fetch/linear.ts";
import { releaseIssues } from "@/help/linear.ts";
import { openUrl } from "@/help/cli.ts";
import { pickIssueForRelease } from "@/prompts/linear";
import { RELEASE_NOTE_PAGE } from "@/help/env";

export default async function handle() {
  const { get } = getIssues();

  const issues = await get();
  const answer = await pickIssueForRelease(issues);

  await releaseIssues(answer);
  const releaseNote = RELEASE_NOTE_PAGE();
  if (releaseNote) {
    await openUrl(releaseNote);
  }
}
