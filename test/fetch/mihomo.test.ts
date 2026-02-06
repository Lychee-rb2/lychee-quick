import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { mihomo } from "@/fetch/mihomo";

// Helper to create a mock Response
const createMockResponse = (
  body: unknown,
  options: { ok?: boolean; status?: number; statusText?: string } = {},
): Response => {
  const { ok = true, status = 200, statusText = "OK" } = options;
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);

  return {
    ok,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(bodyStr),
  } as unknown as Response;
};

describe("fetch/mihomo", () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    vi.stubEnv("MIHOMO_URL", "http://127.0.0.1:9090");
    vi.stubEnv("MIHOMO_TOKEN", "test-secret-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe("successful responses", () => {
    test("should fetch with correct URL and authorization header", async () => {
      const mockData = { proxies: { proxy1: { name: "proxy1" } } };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      await mihomo("proxies");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:9090/proxies",
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: "Bearer test-secret-token",
          }),
          body: undefined,
        }),
      );
    });

    test("should return parsed JSON response", async () => {
      const mockData = { mode: "rule" };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await mihomo<{ mode: string }>("configs");

      expect(result).toEqual({ mode: "rule" });
    });

    test("should merge custom headers with authorization", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true }));

      await mihomo("proxies", {
        body: undefined,
        headers: { "Content-Type": "application/json" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:9090/proxies",
        expect.objectContaining({
          headers: {
            authorization: "Bearer test-secret-token",
            "Content-Type": "application/json",
          },
        }),
      );
    });

    test("should stringify body when provided", async () => {
      const bodyData = { name: "test-proxy" };
      mockFetch.mockResolvedValue(createMockResponse({ ok: true }));

      await mihomo("proxies/test", {
        body: bodyData,
        method: "PUT",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:9090/proxies/test",
        expect.objectContaining({
          body: JSON.stringify(bodyData),
          method: "PUT",
        }),
      );
    });

    test("should not stringify body when body is undefined", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true }));

      await mihomo("configs");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:9090/configs",
        expect.objectContaining({
          body: undefined,
        }),
      );
    });

    test("should pass through additional request options", async () => {
      mockFetch.mockResolvedValue(createMockResponse({ ok: true }));

      await mihomo("proxies", {
        body: undefined,
        method: "PATCH",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:9090/proxies",
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });
  });

  describe("HTTP error responses", () => {
    test("should throw with status code for generic errors", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse("Internal Server Error", {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        }),
      );

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求失败 (500): Internal Server Error",
      );
    });

    test("should throw with error message from JSON response body", async () => {
      const errorBody = { message: "Unauthorized access" };
      mockFetch.mockResolvedValue(
        createMockResponse(errorBody, {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
        }),
      );

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求失败 (401): Unauthorized access",
      );
    });

    test("should throw timeout error for 504 status", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse("Gateway Timeout", {
          ok: false,
          status: 504,
          statusText: "Gateway Timeout",
        }),
      );

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求超时: Gateway Timeout",
      );
    });

    test("should throw timeout error for 408 status", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse("Request Timeout", {
          ok: false,
          status: 408,
          statusText: "Request Timeout",
        }),
      );

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求超时: Request Timeout",
      );
    });

    test("should throw service unavailable error for 503 status", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse("Service Unavailable", {
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        }),
      );

      await expect(mihomo("proxies")).rejects.toThrow(
        "服务不可用: Service Unavailable",
      );
    });

    test("should throw resource not found error for 404 status", async () => {
      mockFetch.mockResolvedValue(
        createMockResponse("Not Found", {
          ok: false,
          status: 404,
          statusText: "Not Found",
        }),
      );

      await expect(mihomo("proxies/unknown")).rejects.toThrow(
        "资源未找到: proxies/unknown",
      );
    });

    test("should use statusText when error body is empty", async () => {
      const response = {
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        text: vi.fn().mockResolvedValue(""),
        json: vi.fn(),
      } as unknown as Response;

      mockFetch.mockResolvedValue(response);

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求失败 (502): Bad Gateway",
      );
    });

    test("should extract message from JSON error body", async () => {
      const errorJson = { message: "Rate limit exceeded" };
      const response = {
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: vi.fn().mockResolvedValue(JSON.stringify(errorJson)),
        json: vi.fn(),
      } as unknown as Response;

      mockFetch.mockResolvedValue(response);

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求失败 (429): Rate limit exceeded",
      );
    });

    test("should use raw text when JSON body has no message field", async () => {
      const errorJson = { error: "something went wrong", code: 123 };
      const errorText = JSON.stringify(errorJson);
      const response = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: vi.fn().mockResolvedValue(errorText),
        json: vi.fn(),
      } as unknown as Response;

      mockFetch.mockResolvedValue(response);

      await expect(mihomo("proxies")).rejects.toThrow(
        `请求失败 (400): ${errorText}`,
      );
    });

    test("should handle non-JSON error body gracefully", async () => {
      const response = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: vi.fn().mockResolvedValue("<html>Server Error</html>"),
        json: vi.fn(),
      } as unknown as Response;

      mockFetch.mockResolvedValue(response);

      await expect(mihomo("proxies")).rejects.toThrow(
        "请求失败 (500): <html>Server Error</html>",
      );
    });
  });

  describe("network and other errors", () => {
    test("should re-throw Error instances", async () => {
      mockFetch.mockRejectedValue(new Error("Network connection refused"));

      await expect(mihomo("proxies")).rejects.toThrow(
        "Network connection refused",
      );
    });

    test("should wrap non-Error exceptions", async () => {
      mockFetch.mockRejectedValue("connection timeout");

      await expect(mihomo("proxies")).rejects.toThrow(
        "网络请求失败: connection timeout",
      );
    });

    test("should wrap non-Error objects", async () => {
      mockFetch.mockRejectedValue({ code: "ECONNREFUSED" });

      await expect(mihomo("proxies")).rejects.toThrow(
        "网络请求失败: [object Object]",
      );
    });

    test("should wrap null/undefined exceptions", async () => {
      mockFetch.mockRejectedValue(null);

      await expect(mihomo("proxies")).rejects.toThrow("网络请求失败: null");
    });
  });

  describe("default parameters", () => {
    test("should work with no options argument", async () => {
      const mockData = { result: "ok" };
      mockFetch.mockResolvedValue(createMockResponse(mockData));

      const result = await mihomo<{ result: string }>("configs");

      expect(result).toEqual({ result: "ok" });
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:9090/configs",
        expect.objectContaining({
          headers: {
            authorization: "Bearer test-secret-token",
          },
          body: undefined,
        }),
      );
    });
  });
});
