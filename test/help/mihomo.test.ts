import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
// Import all exported functions for documentation purposes

import {
  findProxyChain,
  findCurrentProxy,
  pickProxy,
  getDelay,
} from "@/help/mihomo";

import type { MihomoProxy } from "@/types/mihomo";

// Mock modules at the top level
// vi.mock() must be called before imports - it declares which modules to mock
// The factory function provides default mock implementations (vi.fn() creates empty mocks)
vi.mock("@/fetch/mihomo", () => ({
  mihomo: vi.fn(),
}));

vi.mock("@/prompts/mihomo", () => ({
  searchProxy: vi.fn(),
}));

// Import mocked modules
import { mihomo } from "@/fetch/mihomo";
import { searchProxy } from "@/prompts/mihomo";

// Note: We use vi.mocked() helper for type-safe access to mock functions
// This is better than type assertions because it preserves the original function signature
// Each test uses mockImplementation/mockResolvedValue to set test-specific behavior

describe("mihomo helper functions", () => {
  describe("findProxyChain", () => {
    test("should return single proxy when no child proxy", () => {
      const proxy: MihomoProxy = {
        name: "proxy1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const proxies = { proxy1: proxy };

      const result = findProxyChain(proxy, proxies);

      expect(result).toEqual([proxy]);
    });

    test("should return proxy chain with one child", () => {
      const childProxy: MihomoProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const parentProxy: MihomoProxy = {
        name: "parent",
        now: "child",
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        parent: parentProxy,
        child: childProxy,
      };

      const result = findProxyChain(parentProxy, proxies);

      expect(result).toEqual([parentProxy, childProxy]);
    });

    test("should return nested proxy chain", () => {
      const grandchildProxy: MihomoProxy = {
        name: "grandchild",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const childProxy: MihomoProxy = {
        name: "child",
        now: "grandchild",
        alive: true,
        type: "URLTest",
      };
      const parentProxy: MihomoProxy = {
        name: "parent",
        now: "child",
        alive: true,
        type: "URLTest",
      };
      const proxies = {
        parent: parentProxy,
        child: childProxy,
        grandchild: grandchildProxy,
      };

      const result = findProxyChain(parentProxy, proxies);

      expect(result).toEqual([parentProxy, childProxy, grandchildProxy]);
    });
  });

  describe("findCurrentProxy", () => {
    beforeEach(() => {
      // Use stubEnv to properly manage environment variable
      vi.stubEnv("MIHOMO_TOP_PROXY", "TOP_PROXY");
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Clear environment variable stubs to prevent memory leaks
      vi.unstubAllEnvs();
    });

    test("should find current proxy chain", async () => {
      const childProxy: MihomoProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child",
        alive: true,
        type: "URLTest",
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child: childProxy,
      };

      // Use mockImplementation or mockResolvedValue to set test-specific behavior
      // This is called AFTER vi.mock() declaration - each test can have different implementations
      vi.mocked(mihomo).mockResolvedValue({
        proxies: mockProxies,
      } as { proxies: Record<string, MihomoProxy> });

      const result = await findCurrentProxy();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(topProxy);
      expect(result[1]).toEqual(childProxy);
      expect(mihomo).toHaveBeenCalledTimes(1);
      expect(mihomo).toHaveBeenCalledWith(`proxies`);
    });
  });

  describe("pickProxy", () => {
    beforeEach(() => {
      // Use stubEnv to properly manage environment variable
      vi.stubEnv("MIHOMO_TOP_PROXY", "TOP_PROXY");
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Clear environment variable stubs to prevent memory leaks
      vi.unstubAllEnvs();
    });

    test("should handle REFRESH option", async () => {
      const childProxy: MihomoProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child",
        alive: true,
        type: "URLTest",
        all: ["child"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child: childProxy,
      };

      vi.mocked(mihomo).mockImplementation((uri: string) => {
        if (uri === "proxies") {
          return Promise.resolve({ proxies: mockProxies } as {
            proxies: Record<string, MihomoProxy>;
          });
        }
        if (uri.includes("delay")) {
          return Promise.resolve({ delay: 100 } as { delay: number });
        }
        return Promise.resolve({} as Record<string, never>);
      });

      let searchCallCount = 0;
      vi.mocked(searchProxy).mockImplementation(() => {
        searchCallCount++;
        if (searchCallCount === 1) {
          return Promise.resolve({
            answer: "REFRESH",
            state: { proxies: mockProxies, current: topProxy },
          });
        }
        // Second call (from recursive pickProxy) returns a proxy name to exit
        return Promise.resolve({
          answer: "child",
          state: { proxies: mockProxies, current: topProxy },
        });
      });

      await pickProxy({
        data: { current: topProxy, proxies: mockProxies },
        refresh: true,
      });

      // REFRESH triggers recursive call, so searchProxy should be called at least twice
      expect(searchProxy).toHaveBeenCalledTimes(2);
    });

    test("should fetch proxies when proxies is null", async () => {
      const childProxy: MihomoProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child",
        alive: true,
        type: "URLTest",
        all: ["child"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child: childProxy,
      };

      vi.mocked(mihomo).mockImplementation(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies } as {
              proxies: Record<string, MihomoProxy>;
            });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 } as { delay: number });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({} as Record<string, never>);
          }
          return Promise.resolve({} as Record<string, never>);
        },
      );

      vi.mocked(searchProxy).mockResolvedValue({
        answer: "child",
        state: { proxies: mockProxies, current: topProxy },
      });

      // Call without data.proxies to trigger fetching
      await pickProxy({});

      expect(searchProxy).toHaveBeenCalled();
      expect(mihomo).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("TOP_PROXY")}`,
        expect.objectContaining({
          body: { name: "child" },
          method: "PUT",
        }),
      );
    });

    test("should handle RESET option", async () => {
      const childProxy: MihomoProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child",
        alive: true,
        type: "URLTest",
        all: ["child"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child: childProxy,
      };

      let searchCallCount = 0;
      vi.mocked(mihomo).mockImplementation((uri: string) => {
        if (uri === "proxies") {
          return Promise.resolve({ proxies: mockProxies } as {
            proxies: Record<string, MihomoProxy>;
          });
        }
        if (uri.includes("delay")) {
          return Promise.resolve({ delay: 100 } as { delay: number });
        }
        if (uri.includes("proxies/TOP_PROXY") && !uri.includes("delay")) {
          return Promise.resolve({} as Record<string, never>);
        }
        return Promise.resolve({} as Record<string, never>);
      });

      vi.mocked(searchProxy).mockImplementation(() => {
        searchCallCount++;
        // First call returns RESET, which triggers recursive call to pickProxy({ refresh: true })
        // Second call (from recursive pickProxy) should return a valid proxy name
        if (searchCallCount === 1) {
          return Promise.resolve({
            answer: "RESET",
            state: { proxies: mockProxies, current: topProxy },
          });
        }
        return Promise.resolve({
          answer: "child",
          state: { proxies: mockProxies, current: topProxy },
        });
      });

      await pickProxy({
        data: { current: topProxy, proxies: mockProxies },
      });

      // RESET triggers recursive call, so searchProxy should be called at least twice
      expect(searchProxy).toHaveBeenCalledTimes(2);
    });

    test("should select proxy and update", async () => {
      const childProxy: MihomoProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child",
        alive: true,
        type: "URLTest",
        all: ["child"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child: childProxy,
      };

      vi.mocked(mihomo).mockImplementation(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies } as {
              proxies: Record<string, MihomoProxy>;
            });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 } as { delay: number });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({} as Record<string, never>);
          }
          return Promise.resolve({} as Record<string, never>);
        },
      );

      vi.mocked(searchProxy).mockResolvedValue({
        answer: "child",
        state: { proxies: mockProxies, current: topProxy },
      });

      await pickProxy({
        data: { current: topProxy, proxies: mockProxies },
      });

      expect(searchProxy).toHaveBeenCalled();
      expect(mihomo).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("TOP_PROXY")}`,
        expect.objectContaining({
          body: { name: "child" },
          method: "PUT",
        }),
      );
    });

    test("should handle search by index number", async () => {
      const childProxy1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const childProxy2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child1",
        alive: true,
        type: "URLTest",
        all: ["child1", "child2"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child1: childProxy1,
        child2: childProxy2,
      };

      vi.mocked(mihomo).mockImplementation(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies } as {
              proxies: Record<string, MihomoProxy>;
            });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 } as { delay: number });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({} as Record<string, never>);
          }
          return Promise.resolve({} as Record<string, never>);
        },
      );

      vi.mocked(searchProxy).mockResolvedValue({
        answer: "child2",
        state: { proxies: mockProxies, current: topProxy },
      });

      await pickProxy({
        data: { current: topProxy, proxies: mockProxies },
      });

      expect(searchProxy).toHaveBeenCalled();
      expect(mihomo).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("TOP_PROXY")}`,
        expect.objectContaining({
          body: { name: "child2" },
          method: "PUT",
        }),
      );
    });

    test("should handle search by proxy name", async () => {
      const childProxy1: MihomoProxy = {
        name: "child1",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const childProxy2: MihomoProxy = {
        name: "child2",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child1",
        alive: true,
        type: "URLTest",
        all: ["child1", "child2"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child1: childProxy1,
        child2: childProxy2,
      };

      vi.mocked(mihomo).mockImplementation(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies } as {
              proxies: Record<string, MihomoProxy>;
            });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 } as { delay: number });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({} as Record<string, never>);
          }
          return Promise.resolve({} as Record<string, never>);
        },
      );

      vi.mocked(searchProxy).mockResolvedValue({
        answer: "child2",
        state: { proxies: mockProxies, current: topProxy },
      });

      await pickProxy({
        data: { current: topProxy, proxies: mockProxies },
      });

      expect(searchProxy).toHaveBeenCalled();
      expect(mihomo).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("TOP_PROXY")}`,
        expect.objectContaining({
          body: { name: "child2" },
          method: "PUT",
        }),
      );
    });

    test("should recursively call pickProxy when selected proxy has all and type is not URLTest", async () => {
      const grandchildProxy: MihomoProxy = {
        name: "grandchild",
        now: undefined,
        alive: true,
        type: "URLTest",
      };
      const childProxy = {
        name: "child",
        now: undefined,
        alive: true,
        type: "Selector" as const,
        all: ["grandchild"],
      } as unknown as MihomoProxy;
      const topProxy: MihomoProxy = {
        name: "TOP_PROXY",
        now: "child",
        alive: true,
        type: "URLTest",
        all: ["child"],
      };
      const mockProxies = {
        TOP_PROXY: topProxy,
        child: childProxy,
        grandchild: grandchildProxy,
      };

      let searchCallCount = 0;
      vi.mocked(mihomo).mockImplementation(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies } as {
              proxies: Record<string, MihomoProxy>;
            });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 } as { delay: number });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({} as Record<string, never>);
          }
          if (uri.includes("proxies/child") && options?.method === "PUT") {
            return Promise.resolve({} as Record<string, never>);
          }
          return Promise.resolve({} as Record<string, never>);
        },
      );

      vi.mocked(searchProxy).mockImplementation(() => {
        searchCallCount++;
        // First call selects "child" proxy
        if (searchCallCount === 1) {
          return Promise.resolve({
            answer: "child",
            state: { proxies: mockProxies, current: topProxy },
          });
        }
        // Second call (recursive) selects "grandchild" proxy
        return Promise.resolve({
          answer: "grandchild",
          state: { proxies: mockProxies, current: childProxy },
        });
      });

      await pickProxy({
        data: { current: topProxy, proxies: mockProxies },
      });

      // Should be called twice: once for selecting child, once for selecting grandchild
      expect(searchProxy).toHaveBeenCalledTimes(2);
      // Should update TOP_PROXY to child
      expect(mihomo).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("TOP_PROXY")}`,
        expect.objectContaining({
          body: { name: "child" },
          method: "PUT",
        }),
      );
      // Should update child to grandchild
      expect(mihomo).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("child")}`,
        expect.objectContaining({
          body: { name: "grandchild" },
          method: "PUT",
        }),
      );
    });
  });

  describe("getDelay", () => {
    beforeEach(() => {
      // Use stubEnv to properly manage environment variable
      vi.stubEnv("MIHOMO_TOP_PROXY", "TOP_PROXY");
      vi.clearAllMocks();
    });

    afterEach(() => {
      // Clear environment variable stubs to prevent memory leaks
      vi.unstubAllEnvs();
    });

    test("should get delay for specific proxy", async () => {
      vi.mocked(mihomo).mockImplementation((uri: string) => {
        if (uri.includes("proxies/test-proxy/delay")) {
          return Promise.resolve({ delay: 150 } as { delay: number });
        }
        return Promise.resolve({} as Record<string, never>);
      });

      const result = await getDelay({
        proxy: "test-proxy",
        timeout: 2000,
      });

      expect(result).toBe(150);
      expect(mihomo).toHaveBeenCalledWith(
        expect.stringContaining("proxies/test-proxy/delay"),
      );
    });

    test("should get delay for all proxies in GLOBAL group", async () => {
      vi.mocked(mihomo).mockImplementation((uri: string) => {
        if (uri.includes("group/GLOBAL/delay")) {
          return Promise.resolve({
            proxy1: 100,
            proxy2: 200,
            proxy3: 150,
          } as Record<string, number>);
        }
        return Promise.resolve({} as Record<string, never>);
      });

      const result = await getDelay({ timeout: 3000 });

      expect(result).toEqual({
        proxy1: 100,
        proxy2: 200,
        proxy3: 150,
      });
      expect(mihomo).toHaveBeenCalledWith(
        expect.stringContaining("group/GLOBAL/delay"),
      );
    });

    test("should use default timeout when not provided", async () => {
      vi.mocked(mihomo).mockImplementation((uri: string) => {
        if (uri.includes("group/GLOBAL/delay")) {
          return Promise.resolve({} as Record<string, never>);
        }
        return Promise.resolve({} as Record<string, never>);
      });

      await getDelay();

      expect(mihomo).toHaveBeenCalledWith(
        expect.stringContaining("timeout=1000"),
      );
    });
  });
});
