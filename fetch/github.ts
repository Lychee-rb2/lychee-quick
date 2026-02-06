import { getSdk, Sdk } from "@/graphql/github/client.ts";
import { GraphQLClient } from "graphql-request";
import { upstashCache } from "@/help/redis.ts";
import { PullRequest } from "@/types/github.ts";
import { GIT_TOKEN, GIT_ORGANIZATION, GIT_REPO } from "@/help/env";

let client: Sdk | null = null;

export const createClient = (): Sdk => {
  if (client) return client;
  const gitToken = GIT_TOKEN();
  client = getSdk(
    new GraphQLClient("https://api.github.com/graphql", {
      headers: { Authorization: `bearer ${gitToken}` },
    }),
  );
  return client;
};

export const getPullRequestBranches = () => {
  const githubOwner = GIT_ORGANIZATION();
  const githubRepo = GIT_REPO();
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
