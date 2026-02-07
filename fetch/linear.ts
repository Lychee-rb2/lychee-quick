import { getSdk, type Sdk } from "@/graphql/linear/client.ts";
import { GraphQLClient } from "graphql-request";
import { upstashCache } from "@/help/redis.ts";
import { Issue } from "@/types/linear.ts";
import { LINEAR_API_KEY, LINEAR_TEAM } from "@/help/env";

let client: Sdk | null = null;

export const createClient = (): Sdk => {
  if (client) return client;
  const key = LINEAR_API_KEY();
  client = getSdk(
    new GraphQLClient("https://api.linear.app/graphql", {
      headers: { Authorization: key },
    }),
  );
  return client;
};

/** @internal 仅用于测试重置单例状态 */
export const _resetClient = () => {
  client = null;
};

export const getIssues = () => {
  const team = LINEAR_TEAM();
  const cache = upstashCache(
    async () =>
      await createClient()
        .issues({ team })
        .then((res) => res.issues.nodes),
  );
  let issues: Issue[] = [];
  return {
    issues,
    get: async () => {
      const force = Bun.argv.some((i) => i === "-f");
      issues = force ? [] : issues;
      if (!issues.length || force) {
        issues = await cache.get(
          `linear-${team}-issues`,
          1000 * 60 * 30,
          force,
        );
      }
      return issues;
    },
  };
};
