import { getPullRequestBranches } from "@/fetch/github";
import { getProjects } from "@/fetch/vercel";
import { checkbox, search } from "@inquirer/prompts";

export const pickBranchForCheck = async () => {
  const { get } = getPullRequestBranches();
  let branches: Awaited<ReturnType<typeof get>>;
  return await search({
    message: "Check which branch?",
    source: async (input) => {
      branches = branches || (await get());
      return branches
        .filter((branch) => branch.headRefName.includes(input))
        .map((branch) => ({
          name: branch.headRefName,
          value: branch,
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
    message: "Release which project?",
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
    message: "Release which project?",
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
