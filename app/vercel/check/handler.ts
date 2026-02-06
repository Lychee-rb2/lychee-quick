import { getDeployments } from "@/fetch/vercel.ts";
import { Deployment } from "@/types/vercel.ts";
import { pickBranchForCheck } from "@/prompts/vercel";

export default async function handle() {
  const branch = await pickBranchForCheck();
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
    if (sha) return pre;
    pre[sha] = pre[sha] || {
      githubCommitMessage: cur.meta.githubCommitMessage,
      deployments: {},
    };

    return pre;
  }, {});
}
