import { Vercel } from "@vercel/sdk";

import mapValues from "lodash-es/mapValues";
import pick from "lodash-es/pick";
import { Deployment, Project } from "@/types/vercel.ts";
import { upstashCache } from "@/help/redis.ts";
import { VERCEL_PERSONAL_TOKEN, VERCEL_TEAM } from "@/help/env";

let vercel: Vercel | null = null;
export const createVercelClient = () => {
  if (vercel) return vercel;
  const bearerToken = VERCEL_PERSONAL_TOKEN();
  vercel = new Vercel({ bearerToken, timeoutMs: 5000 });
  return vercel;
};

/** @internal 仅用于测试重置单例状态 */
export const _resetClient = () => {
  vercel = null;
};

export const getProjects = () => {
  const teamId = VERCEL_TEAM();
  let project: Project[] = [];

  const cache = upstashCache(() =>
    createVercelClient()
      .projects.getProjects({ teamId })
      .then((res) =>
        res.projects
          .filter((project) => project.link)
          .map((project) => ({
            ...pick(project, ["id", "name"]),
            link: {
              deployHooks: project.link.deployHooks.map((deployHook) =>
                pick(deployHook, ["ref", "url"]),
              ),
            },
            targets: mapValues(project.targets, (target) =>
              pick(target, ["id"]),
            ),
          })),
      ),
  );
  return {
    project,
    get: async () => {
      const force = Bun.argv.some((i) => i === "-f");
      project = force ? [] : project;
      if (!project.length) {
        project = await cache.get(
          `vercel-${teamId}-projects`,
          1000 * 60 * 30,
          force,
        );
      }
      return project;
    },
  };
};

export const getDeployments = (branch: string, sha: string) => {
  const teamId = VERCEL_TEAM();
  const cache = upstashCache(
    async () =>
      await createVercelClient()
        .deployments.getDeployments({ teamId, branch, sha })
        .then((res) =>
          res.deployments.map((deployment) => ({
            ...pick(deployment, [
              "created",
              "buildingAt",
              "ready",
              "state",
              "uid",
              "inspectorUrl",
            ]),
            meta: pick(deployment.meta, [
              "githubCommitRef",
              "githubCommitMessage",
              "branchAlias",
              "githubCommitSha",
            ]),
          })),
        ),
  );
  let deployments: Deployment[] = [];
  return {
    deployments,
    get: async () => {
      const force = Bun.argv.some((i) => i === "-f");
      deployments = force ? [] : deployments;
      if (!deployments.length) {
        deployments = await cache.get(
          `vercel-${teamId}-${branch}-deployments`,
          1000 * 60,
          force,
        );
      }
      return deployments;
    },
  };
};
