import { Vercel } from "@vercel/sdk";

import mapValues from "lodash-es/mapValues";
import pick from "lodash-es/pick";
import { z } from "zod";
import { Deployment, Project } from "@/types/vercel.ts";
import { upstashCache } from "@/help/redis.ts";

let vercel: Vercel | null = null;
export const createVercelClient = () => {
  if (vercel) return vercel;
  vercel = new Vercel({
    bearerToken: Bun.env.VERCEL_PERSONAL_TOKEN,
    timeoutMs: 5000,
  });
  return vercel;
};

export const getProjects = () => {
  const validate = z.object({
    teamId: z.string(),
    token: z.string(),
    redisUrl: z.string(),
    redisToken: z.string(),
  });
  const { teamId, redisToken, redisUrl } = validate.parse({
    teamId: Bun.env.VERCEL_TEAM,
    token: Bun.env.VERCEL_PERSONAL_TOKEN,
    redisUrl: Bun.env.REDIS_URL,
    redisToken: Bun.env.REDIS_TOKEN,
  });
  let project: Project[] = [];

  const cache = upstashCache(redisUrl, redisToken, () =>
    createVercelClient()
      .projects.getProjects({ teamId })
      .then((res) =>
        res.projects.map((project) => ({
          ...pick(project, ["id", "name"]),
          link: {
            deployHooks: project.link.deployHooks.map((deployHook) =>
              pick(deployHook, ["ref", "url"]),
            ),
          },
          targets: mapValues(project.targets, (target) => pick(target, ["id"])),
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

export const getDeployments = (branch: string) => {
  const validate = z.object({
    teamId: z.string(),
    redisUrl: z.string(),
    redisToken: z.string(),
  });
  const { teamId, redisToken, redisUrl } = validate.parse({
    teamId: Bun.env.VERCEL_TEAM,
    token: Bun.env.VERCEL_PERSONAL_TOKEN,
    redisUrl: Bun.env.REDIS_URL,
    redisToken: Bun.env.REDIS_TOKEN,
  });
  const cache = upstashCache(
    redisUrl,
    redisToken,
    async () =>
      await createVercelClient()
        .deployments.getDeployments({ teamId, branch })
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
