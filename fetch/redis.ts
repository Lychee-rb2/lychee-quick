import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export const createRedisClient = () => {
  const url = Bun.env.REDIS_URL;
  const token = Bun.env.REDIS_TOKEN;
  if (!url || !token) throw new Error("REDIS_URL and REDIS_TOKEN are required");
  if (redis) return redis;
  redis = new Redis({ url, token });
  return redis;
};
