import { getDeployments } from "@/fetch/vercel.ts";
import { iconMap, logger } from "@/help";
import { pickBranchForCheck } from "@/prompts/vercel";
import { GetDeploymentsState } from "@vercel/sdk/models/getdeploymentsop.js";
import { formatDistanceToNow } from "date-fns";
import { t } from "@/i18n";

export default async function handle() {
  const pullRequest = await pickBranchForCheck();
  const deploymentCache = getDeployments(
    pullRequest.headRefName,
    pullRequest.headRefOid,
  );
  const deployments = await deploymentCache.get().then((deployments) =>
    deployments.map((deployment) => {
      return {
        vercel: deployment.inspectorUrl,
        preview: `https://${deployment.meta.branchAlias}`,
        readyAt: formatDistanceToNow(new Date(deployment.ready), {
          addSuffix: true,
        }),
        state: deployment.state.toLowerCase() as Lowercase<GetDeploymentsState>,
      };
    }),
  );
  logger.plain("--------------------------------");
  logger.plain(t("app.vercel.check.branch", { branch: pullRequest.headRefName }));
  logger.plain("--------------------------------");
  logger.table(
    deployments.map((i) => [
      iconMap(`vercel_${i.state}`),
      i.preview,
      i.readyAt,
    ]),
  );
}
