import { Redis } from "@upstash/redis";
import { REDIS_URL, REDIS_TOKEN } from "@/help/env";

let redis: Redis | null = null;

export const createRedisClient = () => {
  if (redis) return redis;
  const url = REDIS_URL();
  const token = REDIS_TOKEN();
  redis = new Redis({ url, token });
  return redis;
};

/** @internal 仅用于测试重置单例状态 */
export const _resetRedisClient = () => {
  redis = null;
};
