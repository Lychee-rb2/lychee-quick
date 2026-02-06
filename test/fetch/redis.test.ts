import { describe, expect, test, vi } from "vitest";

// vi.hoisted ensures these are available when vi.mock factory runs (both are hoisted)
const { mockRedisInstance, MockRedisClass } = vi.hoisted(() => {
  const mockRedisInstance = { get: vi.fn(), set: vi.fn() };
  const MockRedisClass = vi.fn(() => mockRedisInstance);
  return { mockRedisInstance, MockRedisClass };
});

vi.mock("@upstash/redis", () => ({
  Redis: MockRedisClass,
}));

import { createRedisClient } from "@/fetch/redis";

describe("fetch/redis - createRedisClient", () => {
  test("should create a new Redis instance with correct parameters", () => {
    const client = createRedisClient(
      "https://redis.upstash.io",
      "test-token-123",
    );

    expect(client).toBeDefined();
    expect(MockRedisClass).toHaveBeenCalledWith({
      url: "https://redis.upstash.io",
      token: "test-token-123",
    });
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });

  test("should return the same instance on subsequent calls (singleton)", () => {
    const client = createRedisClient(
      "https://other-redis.upstash.io",
      "other-token",
    );

    // Should return the instance created in the previous test, not a new one
    expect(client).toBe(mockRedisInstance);
    // Constructor should still only have been called once (from the first test)
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });
});
