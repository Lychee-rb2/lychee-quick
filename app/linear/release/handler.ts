import { getIssues } from "@/fetch/linear.ts";
import { openUrl } from "@/help/cli.ts";
import { RELEASE_NOTE_PAGE } from "@/help/env";
import { releaseIssues } from "@/help/linear.ts";
import { pickIssueForRelease } from "@/prompts/linear";

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
