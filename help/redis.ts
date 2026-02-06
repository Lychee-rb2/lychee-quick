import { createRedisClient } from "@/fetch/redis.ts";

export const upstashCache = <T>(fetch: () => Promise<T>) => {
  const redis = createRedisClient();
  return {
    get: async (key: string, cacheTime: number, force = false) => {
      if (force) {
        const data = await fetch();
        await redis.set(key, data, { px: cacheTime });
        return data;
      }
      const value = await redis.get<T>(key);
      if (value) {
        return value;
      }
      const data = await fetch();
      await redis.set(key, data, { px: cacheTime });
      return data;
    },
    remove: async (key: string) => {
      await redis.del(key);
    },
  };
};
