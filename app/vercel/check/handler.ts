import { getPullRequestBranches } from "@/fetch/github.ts";
import { select } from "@inquirer/prompts";
import { getDeployments } from "@/fetch/vercel.ts";
import { Deployment } from "@/types/vercel.ts";

export default async function handle() {
  const { get } = getPullRequestBranches();
  const branches = await get();
  const branch = await select({
    message: "Check which branch?",
    choices: branches.map((branch) => ({
      name: branch.headRefName,
      value: branch,
      description: branch.title,
      short: branch.headRefName,
    })),
    loop: false,
  });
  const deploymentCache = getDeployments(branch.headRefName);
  const deployments = await deploymentCache.get();
  deployments.reduce<
    Record<
      string,
      {
        githubCommitMessage: Deployment["meta"]["githubCommitMessage"];
        deployments: Record<string, Deployment[]>;
      }
    >
  >((pre, cur) => {
    const sha = cur.meta?.githubCommitRef;
    if (sha) {
      return pre;
    }
    pre[sha] = pre[sha] || {
      githubCommitMessage: cur.meta.githubCommitMessage,
      deployments: {},
    };

    return pre;
  }, {});
}
