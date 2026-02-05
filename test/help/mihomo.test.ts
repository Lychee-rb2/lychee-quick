import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
// Import all exported functions for documentation purposes
// Note: Some functions are re-imported dynamically after mocking to get the mocked versions
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  findProxyChain,
  findCurrentProxy,
  pickProxy,
  getDelay,
} from "@/help/mihomo";
/* eslint-enable @typescript-eslint/no-unused-vars */
import type { MihomoProxy } from "@/types/mihomo";

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
    const originalEnv = process.env.MIHOMO_TOP_PROXY;

    beforeEach(() => {
      process.env.MIHOMO_TOP_PROXY = "TOP_PROXY";
    });

    afterEach(() => {
      process.env.MIHOMO_TOP_PROXY = originalEnv;
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

      const mihomoMock = mock(() => Promise.resolve({ proxies: mockProxies }));

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      // Re-import to get the mocked version
      const { findCurrentProxy: findCurrentProxyMocked } = await import(
        "@/help/mihomo"
      );

      const result = await findCurrentProxyMocked();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(topProxy);
      expect(result[1]).toEqual(childProxy);
      expect(mihomoMock).toHaveBeenCalledTimes(1);
      expect(mihomoMock).toHaveBeenCalledWith(`proxies`);
    });
  });

  describe("pickProxy", () => {
    const originalEnv = process.env.MIHOMO_TOP_PROXY;

    beforeEach(() => {
      process.env.MIHOMO_TOP_PROXY = "TOP_PROXY";
    });

    afterEach(() => {
      process.env.MIHOMO_TOP_PROXY = originalEnv;
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

      let callCount = 0;
      const mihomoMock = mock((uri: string) => {
        if (uri === "proxies") {
          return Promise.resolve({ proxies: mockProxies });
        }
        if (uri.includes("delay")) {
          return Promise.resolve({ delay: 100 });
        }
        return Promise.resolve({});
      });

      const searchProxyMock = mock(() => {
        callCount++;
        if (callCount === 1) {
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

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      // Re-import to get the mocked version
      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      await pickProxyMocked({
        data: { current: topProxy, proxies: mockProxies },
        refresh: true,
      });

      // REFRESH triggers recursive call, so searchProxy should be called at least twice
      expect(searchProxyMock).toHaveBeenCalledTimes(2);
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

      const mihomoMock = mock(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      );

      const searchProxyMock = mock(() => {
        return Promise.resolve({
          answer: "child",
          state: { proxies: mockProxies, current: topProxy },
        });
      });

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      // Call without data.proxies to trigger fetching
      await pickProxyMocked({});

      expect(searchProxyMock).toHaveBeenCalled();
      expect(mihomoMock).toHaveBeenCalledWith(
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
      const mihomoMock = mock((uri: string) => {
        if (uri === "proxies") {
          return Promise.resolve({ proxies: mockProxies });
        }
        if (uri.includes("delay")) {
          return Promise.resolve({ delay: 100 });
        }
        if (uri.includes("proxies/TOP_PROXY") && !uri.includes("delay")) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const searchProxyMock = mock(() => {
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

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      // Re-import to get the mocked version
      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      await pickProxyMocked({
        data: { current: topProxy, proxies: mockProxies },
      });

      // RESET triggers recursive call, so searchProxy should be called at least twice
      expect(searchProxyMock).toHaveBeenCalledTimes(2);
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

      const mihomoMock = mock(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      );

      const searchProxyMock = mock(() =>
        Promise.resolve({
          answer: "child",
          state: { proxies: mockProxies, current: topProxy },
        }),
      );

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      // Re-import to get the mocked version
      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      await pickProxyMocked({
        data: { current: topProxy, proxies: mockProxies },
      });

      expect(searchProxyMock).toHaveBeenCalled();
      expect(mihomoMock).toHaveBeenCalledWith(
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

      const mihomoMock = mock(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      );

      const searchProxyMock = mock(() =>
        Promise.resolve({
          answer: "child2",
          state: { proxies: mockProxies, current: topProxy },
        }),
      );

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      await pickProxyMocked({
        data: { current: topProxy, proxies: mockProxies },
      });

      expect(searchProxyMock).toHaveBeenCalled();
      expect(mihomoMock).toHaveBeenCalledWith(
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

      const mihomoMock = mock(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      );

      const searchProxyMock = mock(() =>
        Promise.resolve({
          answer: "child2",
          state: { proxies: mockProxies, current: topProxy },
        }),
      );

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      await pickProxyMocked({
        data: { current: topProxy, proxies: mockProxies },
      });

      expect(searchProxyMock).toHaveBeenCalled();
      expect(mihomoMock).toHaveBeenCalledWith(
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
      const mihomoMock = mock(
        (
          uri: string,
          options?: Omit<RequestInit, "body"> & { body?: unknown },
        ) => {
          if (uri === "proxies") {
            return Promise.resolve({ proxies: mockProxies });
          }
          if (uri.includes("delay")) {
            return Promise.resolve({ delay: 100 });
          }
          if (uri.includes("proxies/TOP_PROXY") && options?.method === "PUT") {
            return Promise.resolve({});
          }
          if (uri.includes("proxies/child") && options?.method === "PUT") {
            return Promise.resolve({});
          }
          return Promise.resolve({});
        },
      );

      const searchProxyMock = mock(() => {
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

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      mock.module("@/help/mihomo-search", () => ({
        searchProxy: searchProxyMock,
      }));

      const { pickProxy: pickProxyMocked } = await import("@/help/mihomo");

      await pickProxyMocked({
        data: { current: topProxy, proxies: mockProxies },
      });

      // Should be called twice: once for selecting child, once for selecting grandchild
      expect(searchProxyMock).toHaveBeenCalledTimes(2);
      // Should update TOP_PROXY to child
      expect(mihomoMock).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("TOP_PROXY")}`,
        expect.objectContaining({
          body: { name: "child" },
          method: "PUT",
        }),
      );
      // Should update child to grandchild
      expect(mihomoMock).toHaveBeenCalledWith(
        `proxies/${encodeURIComponent("child")}`,
        expect.objectContaining({
          body: { name: "grandchild" },
          method: "PUT",
        }),
      );
    });
  });

  describe("getDelay", () => {
    const originalEnv = process.env.MIHOMO_TOP_PROXY;

    beforeEach(() => {
      process.env.MIHOMO_TOP_PROXY = "TOP_PROXY";
    });

    afterEach(() => {
      process.env.MIHOMO_TOP_PROXY = originalEnv;
    });

    test("should get delay for specific proxy", async () => {
      const mihomoMock = mock((uri: string) => {
        if (uri.includes("proxies/test-proxy/delay")) {
          return Promise.resolve({ delay: 150 });
        }
        return Promise.resolve({});
      });

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      const { getDelay: getDelayMocked } = await import("@/help/mihomo");

      const result = await getDelayMocked({
        proxy: "test-proxy",
        timeout: 2000,
      });

      expect(result).toBe(150);
      expect(mihomoMock).toHaveBeenCalledWith(
        expect.stringContaining("proxies/test-proxy/delay"),
      );
    });

    test("should get delay for all proxies in GLOBAL group", async () => {
      const mihomoMock = mock((uri: string) => {
        if (uri.includes("group/GLOBAL/delay")) {
          return Promise.resolve({
            proxy1: 100,
            proxy2: 200,
            proxy3: 150,
          });
        }
        return Promise.resolve({});
      });

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      const { getDelay: getDelayMocked } = await import("@/help/mihomo");

      const result = await getDelayMocked({ timeout: 3000 });

      expect(result).toEqual({
        proxy1: 100,
        proxy2: 200,
        proxy3: 150,
      });
      expect(mihomoMock).toHaveBeenCalledWith(
        expect.stringContaining("group/GLOBAL/delay"),
      );
    });

    test("should use default timeout when not provided", async () => {
      const mihomoMock = mock((uri: string) => {
        if (uri.includes("group/GLOBAL/delay")) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      mock.module("@/fetch/mihomo", () => ({
        mihomo: mihomoMock,
      }));

      const { getDelay: getDelayMocked } = await import("@/help/mihomo");

      await getDelayMocked();

      expect(mihomoMock).toHaveBeenCalledWith(
        expect.stringContaining("timeout=1000"),
      );
    });
  });
});
