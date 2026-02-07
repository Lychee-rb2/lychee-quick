import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/clash/board/handler";

const { mockGetDelay, mockOpenUrl, mockLogger } = vi.hoisted(() => ({
  mockGetDelay: vi.fn(),
  mockOpenUrl: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/help/mihomo", () => ({
  getDelay: mockGetDelay,
}));

vi.mock("@/help/cli.ts", () => ({
  openUrl: mockOpenUrl,
}));

vi.mock("@/help", () => ({
  logger: mockLogger,
}));

vi.mock("@/help/env", () => ({
  MIHOMO_URL: vi.fn(() => "http://127.0.0.1:9090"),
  MIHOMO_TOKEN: vi.fn(() => "test-secret"),
  MIHOMO_BOARD: vi.fn(() => "https://board.example.com"),
}));

describe("app/clash/board/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDelay.mockResolvedValue({});
    mockOpenUrl.mockResolvedValue(undefined);
  });

  test("should construct URL with hostname, port, secret and hash", async () => {
    await handler();

    const calledUrl = mockOpenUrl.mock.calls[0][0] as URL;
    expect(calledUrl.origin).toBe("https://board.example.com");
    expect(calledUrl.searchParams.get("hostname")).toBe("127.0.0.1");
    expect(calledUrl.searchParams.get("port")).toBe("9090");
    expect(calledUrl.searchParams.get("secret")).toBe("test-secret");
    expect(calledUrl.hash).toBe("#/proxies");
  });

  test("should log info message with the URL", async () => {
    await handler();

    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info.mock.calls[0][0]).toContain("Opening");
  });

  test("should call getDelay before opening the URL", async () => {
    const callOrder: string[] = [];
    mockGetDelay.mockImplementation(async () => {
      callOrder.push("getDelay");
      return {};
    });
    mockOpenUrl.mockImplementation(async () => {
      callOrder.push("openUrl");
    });

    await handler();

    expect(callOrder).toEqual(["getDelay", "openUrl"]);
  });

  test("should call openUrl with a URL instance", async () => {
    await handler();

    expect(mockOpenUrl).toHaveBeenCalledTimes(1);
    expect(mockOpenUrl.mock.calls[0][0]).toBeInstanceOf(URL);
  });
});
