import { Redis } from "@upstash/redis";
import { z } from "zod";

let redis: Redis | null = null;

export const createRedisClient = () => {
  if (redis) return redis;
  const validate = z.object({ url: z.string(), token: z.string() });
  const { url, token } = validate.parse({
    url: Bun.env.REDIS_URL,
    token: Bun.env.REDIS_TOKEN,
  });
  redis = new Redis({ url, token });
  return redis;
};
