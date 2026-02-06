import { getSdk, Sdk } from "@/graphql/github/client.ts";
import { GraphQLClient } from "graphql-request";
import { z } from "zod";
import { upstashCache } from "@/help/redis.ts";
import { PullRequest } from "@/types/github.ts";

let client: Sdk | null = null;

export const createClient = (): Sdk => {
  if (client) return client;
  const gitToken = Bun.env.GIT_TOKEN;
  if (!gitToken) throw new Error("GIT_TOKEN is not set");
  client = getSdk(
    new GraphQLClient("https://api.github.com/graphql", {
      headers: { Authorization: `bearer ${gitToken}` },
    }),
  );
  return client;
};

export const getPullRequestBranches = () => {
  const validate = z.object({
    githubToken: z.string(),
    githubOwner: z.string(),
    githubRepo: z.string(),
  });
  const { githubOwner, githubRepo } = validate.parse({
    githubToken: Bun.env.GIT_TOKEN,
    githubOwner: Bun.env.GIT_ORGANIZATION,
    githubRepo: Bun.env.GIT_REPO,
  });
  let pullRequest: PullRequest[] = [];
  const cache = upstashCache(() =>
    createClient()
      .pullRequest({ owner: githubOwner, name: githubRepo })
      .then((res) => res.repository.pullRequests.nodes),
  );
  return {
    pullRequest,
    get: async () => {
      const force = Bun.argv.some((i) => i === "-f");
      pullRequest = force ? [] : pullRequest;
      if (!pullRequest.length) {
        pullRequest = await cache.get(
          `github-${githubOwner}-${githubRepo}-pr-branches`,
          1000 * 60,
          force,
        );
      }
      return pullRequest;
    },
  };
};
