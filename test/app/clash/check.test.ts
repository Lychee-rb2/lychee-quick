import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/clash/check/handler";

const { mockFindCurrentProxy, mockGetDelay, mockEcho, mockLogger, mockT } =
  vi.hoisted(() => ({
    mockFindCurrentProxy: vi.fn(),
    mockGetDelay: vi.fn(),
    mockEcho: vi.fn(),
    mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    mockT: vi.fn((key: string) => key),
  }));

vi.mock("@/help/mihomo", () => ({
  findCurrentProxy: mockFindCurrentProxy,
  getDelay: mockGetDelay,
}));

vi.mock("@/help/cli.ts", () => ({
  echo: mockEcho,
}));

vi.mock("@/help", () => ({
  logger: mockLogger,
}));

vi.mock("@/i18n", () => ({
  t: mockT,
}));

const mockProxyChain = [
  { name: "GLOBAL", now: "Proxy Group" },
  { name: "Proxy Group", now: "Hong Kong 01" },
  { name: "Hong Kong 01" },
];

describe("app/clash/check/handler", () => {
  let mockExit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEcho.mockResolvedValue(undefined);
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
  });

  test("should display proxy chain and delay on success", async () => {
    mockFindCurrentProxy.mockResolvedValue(mockProxyChain);
    mockGetDelay.mockResolvedValue(150);

    await handler();

    expect(mockEcho).toHaveBeenCalledWith(
      "proxy: GLOBAL -> Proxy Group -> Hong Kong 01",
    );
    expect(mockEcho).toHaveBeenCalledWith("delay: 150ms");
  });

  test("should get delay for the last proxy in the chain", async () => {
    mockFindCurrentProxy.mockResolvedValue(mockProxyChain);
    mockGetDelay.mockResolvedValue(200);

    await handler();

    expect(mockGetDelay).toHaveBeenCalledWith({ proxy: "Hong Kong 01" });
  });

  test("should log error and return when no proxy found (empty chain)", async () => {
    mockFindCurrentProxy.mockResolvedValue([]);

    await handler();

    expect(mockT).toHaveBeenCalledWith("app.clash.check.noProxy");
    expect(mockLogger.error).toHaveBeenCalledWith("app.clash.check.noProxy");
    expect(mockEcho).not.toHaveBeenCalled();
  });

  test("should log Error message and exit with code 1 on Error", async () => {
    mockFindCurrentProxy.mockRejectedValue(new Error("Connection refused"));

    await handler();

    expect(mockLogger.error).toHaveBeenCalledWith("Connection refused");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("should log non-Error exception and exit with code 1", async () => {
    mockFindCurrentProxy.mockRejectedValue("unexpected failure");

    await handler();

    expect(mockT).toHaveBeenCalledWith("app.clash.check.unknownError", {
      error: "unexpected failure",
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      "app.clash.check.unknownError",
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
