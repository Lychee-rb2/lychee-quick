import { getPullRequestBranches } from "@/fetch/github";
import { getProjects } from "@/fetch/vercel";
import { checkbox, search } from "@inquirer/prompts";
import { t } from "@/i18n";

export const pickBranchForCheck = async () => {
  const { get } = getPullRequestBranches();
  let pullRequests: Awaited<ReturnType<typeof get>>;
  return await search({
    message: t("prompt.vercel.checkPr"),
    source: async (input) => {
      pullRequests = pullRequests || (await get());
      return pullRequests
        .filter((pullRequest) =>
          input ? pullRequest.headRefName.includes(input) : true,
        )
        .map((pullRequest) => ({
          name: pullRequest.title,
          value: pullRequest,
        }));
    },
  });
};
import type { DeployHook as _DeployHook, Project } from "@/types/vercel.ts";

type DeployHook = _DeployHook & {
  projectName: Project["name"];
};
export const pickProjectForRelease = async () => {
  const { get } = getProjects();
  let projects: Awaited<ReturnType<typeof get>>;
  let map: Record<string, DeployHook[]>;
  const branch = await search({
    message: t("prompt.vercel.releaseProject"),
    source: async (input) => {
      projects = projects || (await get());
      map =
        map ||
        projects.reduce<Record<string, DeployHook[]>>((acc, { link, name }) => {
          link?.deployHooks.forEach((deployHook) => {
            const branch = deployHook.ref;
            acc[branch] = acc[branch] || [];
            acc[branch].push({ ...deployHook, projectName: name });
          });
          return acc;
        }, {});
      return Object.entries(map)
        .map(([branch, deployHooks]) => ({
          name: branch,
          value: branch,
          description: deployHooks.map((i) => i.projectName).join(", "),
        }))
        .filter((i) =>
          input ? i.name.toLowerCase().includes(input.toLowerCase()) : true,
        );
    },
  });
  return await checkbox({
    message: t("prompt.vercel.releaseProject"),
    loop: false,
    choices: map[branch]
      .map((deployHook) => ({
        name: `${deployHook.projectName}`,
        value: deployHook,
        checked: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
};
