import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted ensures these are available when vi.mock factory runs (both are hoisted)
const { mockRedisInstance, MockRedisClass } = vi.hoisted(() => {
  const mockRedisInstance = { get: vi.fn(), set: vi.fn() };
  const MockRedisClass = vi.fn(() => mockRedisInstance);
  return { mockRedisInstance, MockRedisClass };
});

vi.mock("@upstash/redis", () => ({
  Redis: MockRedisClass,
}));

describe("fetch/redis - createRedisClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("REDIS_URL", "https://redis.upstash.io");
    vi.stubEnv("REDIS_TOKEN", "test-token-123");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("should create a new Redis instance with env variables", async () => {
    const { createRedisClient } = await import("@/fetch/redis");
    const client = createRedisClient();

    expect(client).toBeDefined();
    expect(MockRedisClass).toHaveBeenCalledWith({
      url: "https://redis.upstash.io",
      token: "test-token-123",
    });
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });

  test("should return the same instance on subsequent calls (singleton)", async () => {
    const { createRedisClient } = await import("@/fetch/redis");
    const client1 = createRedisClient();
    const client2 = createRedisClient();

    expect(client1).toBe(client2);
    expect(client1).toBe(mockRedisInstance);
    // Constructor should only have been called once
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });

  test("should throw error when REDIS_URL is missing", async () => {
    vi.stubEnv("REDIS_URL", "");
    vi.resetModules();
    const { createRedisClient } = await import("@/fetch/redis");

    expect(() => createRedisClient()).toThrow(
      "REDIS_URL and REDIS_TOKEN are required",
    );
  });

  test("should throw error when REDIS_TOKEN is missing", async () => {
    vi.stubEnv("REDIS_TOKEN", "");
    vi.resetModules();
    const { createRedisClient } = await import("@/fetch/redis");

    expect(() => createRedisClient()).toThrow(
      "REDIS_URL and REDIS_TOKEN are required",
    );
  });

  test("should throw error when both env vars are missing", async () => {
    vi.stubEnv("REDIS_URL", "");
    vi.stubEnv("REDIS_TOKEN", "");
    vi.resetModules();
    const { createRedisClient } = await import("@/fetch/redis");

    expect(() => createRedisClient()).toThrow(
      "REDIS_URL and REDIS_TOKEN are required",
    );
  });
});
