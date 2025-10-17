import { getSdk, type Sdk } from "@/graphql/linear/client.ts";
import { GraphQLClient } from "graphql-request";
import { upstashCache } from "@/help/redis.ts";
import { z } from "zod";
import { Issue } from "@/types/linear.ts";

let client: Sdk | null = null;

export const createClient = (): Sdk => {
  if (client) return client;
  const key = Bun.env.LINEAR_API_KEY;
  if (!key) throw new Error("LINEAR_API_KEY is not set");
  client = getSdk(
    new GraphQLClient("https://api.linear.app/graphql", {
      headers: { Authorization: key },
    }),
  );
  return client;
};

export const getIssues = () => {
  const validate = z.object({
    team: z.string(),
    redisUrl: z.string(),
    redisToken: z.string(),
  });
  const { team, redisToken, redisUrl } = validate.parse({
    team: Bun.env.LINEAR_TEAM,
    redisUrl: Bun.env.REDIS_URL,
    redisToken: Bun.env.REDIS_TOKEN,
  });
  const cache = upstashCache(
    redisUrl,
    redisToken,
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
