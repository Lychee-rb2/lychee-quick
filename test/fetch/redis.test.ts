import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { ZodError } from "zod";
import { createRedisClient, _resetRedisClient } from "@/fetch/redis";

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
    _resetRedisClient();
    // Ensure env vars are clean before each test
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("should create a new Redis instance with env variables", () => {
    vi.stubEnv("REDIS_URL", "https://redis.upstash.io");
    vi.stubEnv("REDIS_TOKEN", "test-token-123");
    const client = createRedisClient();

    expect(client).toBeDefined();
    expect(MockRedisClass).toHaveBeenCalledWith({
      url: "https://redis.upstash.io",
      token: "test-token-123",
    });
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });

  test("should return the same instance on subsequent calls (singleton)", () => {
    vi.stubEnv("REDIS_URL", "https://redis.upstash.io");
    vi.stubEnv("REDIS_TOKEN", "test-token-123");
    const client1 = createRedisClient();
    const client2 = createRedisClient();

    expect(client1).toBe(client2);
    expect(client1).toBe(mockRedisInstance);
    // Constructor should only have been called once
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });

  test("should throw ZodError when REDIS_URL is missing", () => {
    vi.stubEnv("REDIS_TOKEN", "test-token-123");

    expect(() => createRedisClient()).toThrow(ZodError);
  });

  test("should throw ZodError when REDIS_TOKEN is missing", () => {
    vi.stubEnv("REDIS_URL", "https://redis.upstash.io");

    expect(() => createRedisClient()).toThrow(ZodError);
  });

  test("should throw ZodError when both env vars are missing", () => {
    expect(() => createRedisClient()).toThrow(ZodError);
  });
});
