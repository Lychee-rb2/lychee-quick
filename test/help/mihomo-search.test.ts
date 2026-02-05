import { describe, expect, test } from "vitest";
import {
  getProxyDelay,
  delayLevel,
  choices,
  getChildren,
} from "@/help/mihomo-search";
import type { MihomoProxy } from "@/types/mihomo";

describe("mihomo-search helper functions", () => {
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
});
