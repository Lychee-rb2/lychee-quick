import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import {
  getProxyDelay,
  delayLevel,
  choices,
  getChildren,
  searchProxy,
} from "@/help/mihomo-select";
import type { MihomoProxy } from "@/types/mihomo";

type Choice = { name: string; value: string };

// search mock 的选项类型
interface SearchMockOptions {
  message: string;
  source: (searchTerm: string) => Promise<Choice[]>;
}

// search mock 实现类型
type SearchMockImpl = (options: SearchMockOptions) => Promise<string>;

// Mock modules at the top level
vi.mock("@/fetch/mihomo", () => ({
  mihomo: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({
  search: vi.fn(),
}));

vi.mock("@/help/mihomo", () => ({
  getDelay: vi.fn(),
}));

// Import mocked modules
import { mihomo } from "@/fetch/mihomo";
import { search } from "@inquirer/prompts";
import { getDelay } from "@/help/mihomo";

// search mock 的类型转换
type MockedSearch = ReturnType<typeof vi.fn> & typeof search;

// 类型安全的 search mock 设置函数
const mockSearchImpl = (impl: SearchMockImpl): void => {
  (search as MockedSearch).mockImplementation(impl as unknown as typeof search);
};

// 获取 mocked 函数的辅助函数
const getMockedSearch = (): MockedSearch => search as MockedSearch;
const getMockedMihomo = (): ReturnType<typeof vi.fn> =>
  mihomo as unknown as ReturnType<typeof vi.fn>;
const getMockedGetDelay = (): ReturnType<typeof vi.fn> =>
  getDelay as unknown as ReturnType<typeof vi.fn>;

describe("mihomo-select helper functions", () => {
  describe("getProxyDelay", () => {
    test("should return delay from last history entry", () => {
      const proxy: MihomoProxy = {
        name: "proxy1",
        now: undefined,
        alive: true,
        type: "URLTest",
        history: [
          { delay: 100, time: "2024-01-01T00:00:00Z" },
          { delay: 200, time: "2024-01-01T00:01:00Z" },
          { delay: 50, time: "2024-01-01T00:02:00Z" },
        ],
      };

      const result = getProxyDelay(proxy);

      expect(result).toBe(50);
    });

    test("should return undefined when no history", () => {
      const proxy: MihomoProxy = {
        name: "proxy1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };

      const result = getProxyDelay(proxy);

      expect(result).toBeUndefined();
    });

    test("should return undefined when history is empty array", () => {
      const proxy: MihomoProxy = {
        name: "proxy1",
        now: undefined,
        alive: true,
        type: "URLTest",
        history: [],
      };

      const result = getProxyDelay(proxy);

      expect(result).toBeUndefined();
    });
  });

  describe("delayLevel", () => {
    test("should return very_bad for delay 0", () => {
      expect(delayLevel(0)).toBe("mihomo_delay_very_bad");
    });

    test("should return good for delay less than 100", () => {
      expect(delayLevel(50)).toBe("mihomo_delay_good");
      expect(delayLevel(99)).toBe("mihomo_delay_good");
    });

    test("should return normal for delay between 100 and 299", () => {
      expect(delayLevel(100)).toBe("mihomo_delay_normal");
      expect(delayLevel(200)).toBe("mihomo_delay_normal");
      expect(delayLevel(299)).toBe("mihomo_delay_normal");
    });

    test("should return bad for delay 300 or more", () => {
      expect(delayLevel(300)).toBe("mihomo_delay_bad");
      expect(delayLevel(500)).toBe("mihomo_delay_bad");
      expect(delayLevel(1000)).toBe("mihomo_delay_bad");
    });
  });

  describe("choices", () => {
    test("should generate choices for URLTest proxy", () => {
      const proxies = [
        {
          proxy: {
            name: "test-proxy",
            now: "selected-child",
            alive: true,
            type: "URLTest" as const,
          } as MihomoProxy,
          delay: 50,
          index: 0,
        },
      ];

      const result = choices(proxies);

      expect(result).toHaveLength(3); // 1 proxy + Refresh + Reset
      expect(result[0]).toMatchObject({
        value: "test-proxy",
      });
      expect(result[0].name).toContain("test-proxy");
      expect(result[0].name).toContain("-> selected-child");
      expect(result[0].name).toContain("(50ms)");
      expect(result[1]).toMatchObject({
        value: "REFRESH",
      });
      expect(result[2]).toMatchObject({
        value: "RESET",
      });
    });

    test("should generate choices for non-URLTest proxy", () => {
      const proxies = [
        {
          proxy: {
            name: "regular-proxy",
            now: undefined,
            alive: true,
            type: "Selector",
          } as unknown as MihomoProxy,
          delay: 150,
          index: 0,
        },
      ];

      const result = choices(proxies);

      expect(result[0]).toMatchObject({
        value: "regular-proxy",
      });
      expect(result[0].name).toContain("regular-proxy");
      expect(result[0].name).not.toContain("->");
      expect(result[0].name).toContain("(150ms)");
    });

    test("should include Refresh and Reset options", () => {
      const proxies: { proxy: MihomoProxy; delay: number; index: number }[] =
        [];

      const result = choices(proxies);

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe("REFRESH");
      expect(result[1].value).toBe("RESET");
    });

    test("should handle multiple proxies", () => {
      const proxies = [
        {
          proxy: {
            name: "proxy1",
            now: undefined,
            alive: true,
            type: "URLTest" as const,
          } as MihomoProxy,
          delay: 50,
          index: 0,
        },
        {
          proxy: {
            name: "proxy2",
            now: undefined,
            alive: true,
            type: "URLTest" as const,
          } as MihomoProxy,
          delay: 200,
          index: 1,
        },
      ];

      const result = choices(proxies);

      expect(result).toHaveLength(4); // 2 proxies + Refresh + Reset
      expect(result[0].value).toBe("proxy1");
      expect(result[1].value).toBe("proxy2");
      expect(result[2].value).toBe("REFRESH");
      expect(result[3].value).toBe("RESET");
    });
  });

  describe("getChildren", () => {
    test("should return children with delay and index", () => {
      const parentProxy: MihomoProxy = {
        name: "parent",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1", "child2"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
        history: [{ delay: 50, time: "2024-01-01T00:00:00Z" }],
      };
      const child2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
        history: [{ delay: 200, time: "2024-01-01T00:00:00Z" }],
      };
      const proxies = {
        parent: parentProxy,
        child1,
        child2,
      };

      const result = getChildren(parentProxy, proxies);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        proxy: child1,
        delay: 50,
        index: 0,
      });
      expect(result[1]).toMatchObject({
        proxy: child2,
        delay: 200,
        index: 1,
      });
    });

    test("should handle children without history", () => {
      const parentProxy: MihomoProxy = {
        name: "parent",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        parent: parentProxy,
        child1,
      };

      const result = getChildren(parentProxy, proxies);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        proxy: child1,
        delay: undefined,
        index: 0,
      });
    });

    test("should handle empty all array", () => {
      const parentProxy: MihomoProxy = {
        name: "parent",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: [],
      };
      const proxies = {
        parent: parentProxy,
      };

      const result = getChildren(parentProxy, proxies);

      expect(result).toHaveLength(0);
    });

    test("should handle undefined all", () => {
      const parentProxy: MihomoProxy = {
        name: "parent",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: undefined,
      };
      const proxies = {
        parent: parentProxy,
      };

      const result = getChildren(parentProxy, proxies);

      expect(result).toHaveLength(0);
    });
  });

  describe("searchProxy", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Use stubEnv to properly manage environment variable
      vi.stubEnv("MIHOMO_TOP_PROXY", "TOP_PROXY");
    });

    afterEach(() => {
      // Clear environment variable stubs to prevent memory leaks
      vi.unstubAllEnvs();
    });

    test("should use provided proxies and return selected answer", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1", "child2"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
        history: [{ delay: 50, time: "2024-01-01T00:00:00Z" }],
      };
      const child2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
        history: [{ delay: 200, time: "2024-01-01T00:00:00Z" }],
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
        child2,
      };

      const searchMock = getMockedSearch();
      searchMock.mockResolvedValue("child1");

      const result = await searchProxy({
        proxies,
        current: currentProxy,
      });

      expect(result.answer).toBe("child1");
      expect(result.state.proxies).toEqual(proxies);
      expect(result.state.current).toEqual(currentProxy);
      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Pick a proxy TOP_PROXY",
        }),
      );
    });

    test("should fetch proxies when proxies is null", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
      };

      const mihomoMock = getMockedMihomo();
      mihomoMock.mockResolvedValue({ proxies });

      // Mock the source function to simulate user interaction
      mockSearchImpl(async (options) => {
        // Call source with empty string to trigger proxy loading
        await options.source("");
        return "child1";
      });

      const result = await searchProxy({
        proxies: null,
        current: undefined,
      });

      expect(result.answer).toBe("child1");
      expect(result.state.proxies).toEqual(proxies);
      expect(result.state.current).toEqual(currentProxy);
      expect(mihomoMock).toHaveBeenCalledWith("proxies");
    });

    test("should call getDelay when refresh option is true", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
      };

      const getDelayMock = getMockedGetDelay();
      getDelayMock.mockResolvedValue({});

      mockSearchImpl(async (options) => {
        // Call source with empty string to trigger refresh
        await options.source("");
        return "child1";
      });

      await searchProxy(
        {
          proxies,
          current: currentProxy,
        },
        { refresh: true },
      );

      expect(getDelayMock).toHaveBeenCalled();
    });

    test("should filter by index number when search term is a number", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1", "child2", "child3"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const child2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const child3: MihomoProxy = {
        name: "child3",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
        child2,
        child3,
      };

      mockSearchImpl(async (options) => {
        // Simulate searching by index "1"
        const choices = await options.source("1");
        expect(choices).toHaveLength(3); // 1 proxy + Refresh + Reset
        expect(choices[0].value).toBe("child2"); // index 1
        return "child2";
      });

      const result = await searchProxy({
        proxies,
        current: currentProxy,
      });

      expect(result.answer).toBe("child2");
    });

    test("should filter by proxy name when search term is a string", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1", "child2", "another-proxy"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const child2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const anotherProxy: MihomoProxy = {
        name: "another-proxy",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
        child2,
        "another-proxy": anotherProxy,
      };

      mockSearchImpl(async (options) => {
        // Simulate searching by name "child"
        const choices = await options.source("child");
        // Should match child1 and child2
        expect(choices.length).toBeGreaterThanOrEqual(2);
        const proxyValues = choices.map((c) => c.value);
        expect(proxyValues).toContain("child1");
        expect(proxyValues).toContain("child2");
        return "child1";
      });

      const result = await searchProxy({
        proxies,
        current: currentProxy,
      });

      expect(result.answer).toBe("child1");
    });

    test("should use environment variable when current is undefined", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
      };

      const mihomoMock = getMockedMihomo();
      mihomoMock.mockResolvedValue({ proxies });

      mockSearchImpl(async (options) => {
        expect(options.message).toContain("TOP_PROXY");
        await options.source("");
        return "child1";
      });

      await searchProxy({
        proxies: null,
        current: undefined,
      });

      expect(getMockedSearch()).toHaveBeenCalled();
    });

    test("should throw error when proxies cannot be loaded", async () => {
      const mihomoMock = getMockedMihomo();
      mihomoMock.mockResolvedValue({ proxies: {} }); // Empty proxies - TOP_PROXY won't exist

      mockSearchImpl(async (options) => {
        // This should throw because TOP_PROXY doesn't exist in empty proxies
        try {
          await options.source("");
          throw new Error("Should have thrown");
        } catch (error: unknown) {
          expect((error as Error).message).toBe("Failed to load proxies");
          throw error;
        }
      });

      await expect(
        searchProxy({
          proxies: null,
          current: undefined,
        }),
      ).rejects.toThrow("Failed to load proxies");
    });

    test("should return all choices when search term is empty", async () => {
      const currentProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: undefined,
        alive: true,
        type: "URLTest",
        all: ["child1", "child2"],
      };
      const child1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const child2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        TOP_PROXY: currentProxy,
        child1,
        child2,
      };

      mockSearchImpl(async (options) => {
        // Call with empty string - should return all choices
        const choices = await options.source("");
        expect(choices).toHaveLength(4); // 2 proxies + Refresh + Reset
        expect(choices[0].value).toBe("child1");
        expect(choices[1].value).toBe("child2");
        expect(choices[2].value).toBe("REFRESH");
        expect(choices[3].value).toBe("RESET");
        return "child1";
      });

      const result = await searchProxy({
        proxies,
        current: currentProxy,
      });

      expect(result.answer).toBe("child1");
    });

    test("should throw error when proxies or current is not available after search returns", async () => {
      // This test covers lines 95-96: the error check after search returns
      // We need to simulate a scenario where search returns but proxies/current are still null/undefined
      const searchMock = getMockedSearch();
      // Mock search to return immediately without calling source
      // This simulates an edge case where search returns but proxies weren't loaded
      searchMock.mockResolvedValue("some-answer");

      // Since proxies is null and current is undefined, and search doesn't call source,
      // the function should throw "Proxies or current proxy is not available"
      await expect(
        searchProxy({
          proxies: null,
          current: undefined,
        }),
      ).rejects.toThrow("Proxies or current proxy is not available");
    });
  });
});
