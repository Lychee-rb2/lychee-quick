import { findNextBranch } from "@/help";
import { gitCheckout, gitPull, gitCheckoutBranch } from "@/help/cli.ts";
import { pickIssueForBranch } from "@/prompts/linear";

export default async function handle() {
  const issue = await pickIssueForBranch();
  const branchName = await findNextBranch(issue.branchName);
  await gitCheckout("main");
  await gitPull();
  await gitCheckoutBranch(branchName);
}
