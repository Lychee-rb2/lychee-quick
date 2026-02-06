import { describe, expect, test, vi, beforeEach } from "vitest";
import { createRedisClient, _resetRedisClient } from "@/fetch/redis";
import { REDIS_URL, REDIS_TOKEN } from "@/help/env";

// vi.hoisted ensures these are available when vi.mock factory runs (both are hoisted)
const { mockRedisInstance, MockRedisClass } = vi.hoisted(() => {
  const mockRedisInstance = { get: vi.fn(), set: vi.fn() };
  const MockRedisClass = vi.fn(() => mockRedisInstance);
  return { mockRedisInstance, MockRedisClass };
});

vi.mock("@upstash/redis", () => ({
  Redis: MockRedisClass,
}));

vi.mock("@/help/env", () => ({
  REDIS_URL: vi.fn(),
  REDIS_TOKEN: vi.fn(),
}));

const mockedRedisUrl = vi.mocked(REDIS_URL);
const mockedRedisToken = vi.mocked(REDIS_TOKEN);

describe("fetch/redis - createRedisClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetRedisClient();
  });

  test("should create a new Redis instance with env variables", () => {
    mockedRedisUrl.mockReturnValue("https://redis.upstash.io");
    mockedRedisToken.mockReturnValue("test-token-123");
    const client = createRedisClient();

    expect(client).toBeDefined();
    expect(MockRedisClass).toHaveBeenCalledWith({
      url: "https://redis.upstash.io",
      token: "test-token-123",
    });
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });

  test("should return the same instance on subsequent calls (singleton)", () => {
    mockedRedisUrl.mockReturnValue("https://redis.upstash.io");
    mockedRedisToken.mockReturnValue("test-token-123");
    const client1 = createRedisClient();
    const client2 = createRedisClient();

    expect(client1).toBe(client2);
    expect(client1).toBe(mockRedisInstance);
    // Constructor should only have been called once
    expect(MockRedisClass).toHaveBeenCalledTimes(1);
  });
});
