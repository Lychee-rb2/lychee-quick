import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { upstashCache } from "@/help/redis";

// Mock modules (must be called before imports)
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

const mockRedisInstance = {
  get: mockGet,
  set: mockSet,
  del: mockDel,
};

vi.mock("@/fetch/redis.ts", () => ({
  createRedisClient: vi.fn(() => mockRedisInstance),
}));

// Type definitions for mocks
type MockedRedis = {
  get: MockedFunction<typeof mockGet>;
  set: MockedFunction<typeof mockSet>;
  del: MockedFunction<typeof mockDel>;
};

// Helper function to safely cast redis to MockedRedis
const getMockedRedis = (): MockedRedis => {
  return mockRedisInstance as unknown as MockedRedis;
};

describe("upstashCache", () => {
  const mockUrl = "https://test-redis.upstash.io";
  const mockToken = "test-token";
  const mockFetch = vi.fn();

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  describe("get", () => {
    test("should return cached value when cache exists", async () => {
      const cachedValue = { data: "cached" };
      const mockRedis = getMockedRedis();
      mockRedis.get.mockResolvedValue(cachedValue);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      const result = await cache.get("test-key", 1000);

      expect(result).toEqual(cachedValue);
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    test("should fetch and cache data when cache does not exist", async () => {
      const fetchedValue = { data: "fetched" };
      const mockRedis = getMockedRedis();
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue("OK");
      mockFetch.mockResolvedValue(fetchedValue);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      const result = await cache.get("test-key", 5000);

      expect(result).toEqual(fetchedValue);
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith("test-key", fetchedValue, {
        px: 5000,
      });
    });

    test("should fetch and cache data when cache returns undefined", async () => {
      const fetchedValue = { data: "fetched" };
      const mockRedis = getMockedRedis();
      mockRedis.get.mockResolvedValue(undefined as never);
      mockRedis.set.mockResolvedValue("OK");
      mockFetch.mockResolvedValue(fetchedValue);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      const result = await cache.get("test-key", 3000);

      expect(result).toEqual(fetchedValue);
      expect(mockRedis.get).toHaveBeenCalledWith("test-key");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith("test-key", fetchedValue, {
        px: 3000,
      });
    });

    test("should force fetch and update cache when force is true", async () => {
      const cachedValue = { data: "cached" };
      const fetchedValue = { data: "fetched" };
      const mockRedis = getMockedRedis();
      mockRedis.get.mockResolvedValue(cachedValue);
      mockRedis.set.mockResolvedValue("OK");
      mockFetch.mockResolvedValue(fetchedValue);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      const result = await cache.get("test-key", 2000, true);

      expect(result).toEqual(fetchedValue);
      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith("test-key", fetchedValue, {
        px: 2000,
      });
    });

    test("should use correct cache time (px option)", async () => {
      const fetchedValue = { data: "fetched" };
      const mockRedis = getMockedRedis();
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue("OK");
      mockFetch.mockResolvedValue(fetchedValue);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      await cache.get("test-key", 10000);

      expect(mockRedis.set).toHaveBeenCalledWith("test-key", fetchedValue, {
        px: 10000,
      });
    });

    test("should handle different data types", async () => {
      const stringValue = "test string";
      const mockRedis = getMockedRedis();
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue("OK");
      mockFetch.mockResolvedValue(stringValue);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      const result = await cache.get("string-key", 1000);

      expect(result).toBe(stringValue);
      expect(mockRedis.set).toHaveBeenCalledWith("string-key", stringValue, {
        px: 1000,
      });
    });
  });

  describe("remove", () => {
    test("should delete key from cache", async () => {
      const mockRedis = getMockedRedis();
      mockRedis.del.mockResolvedValue(1);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      await cache.remove("test-key");

      expect(mockRedis.del).toHaveBeenCalledWith("test-key");
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
    });

    test("should handle deletion of non-existent key", async () => {
      const mockRedis = getMockedRedis();
      mockRedis.del.mockResolvedValue(0);

      const cache = upstashCache(mockUrl, mockToken, mockFetch);
      await cache.remove("non-existent-key");

      expect(mockRedis.del).toHaveBeenCalledWith("non-existent-key");
    });
  });
});
