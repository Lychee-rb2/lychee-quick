import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/clash/toggle/handler";

const { mockMihomo, mockPickProxy, mockPickMode, mockLogger, mockT } =
  vi.hoisted(() => ({
    mockMihomo: vi.fn(),
    mockPickProxy: vi.fn(),
    mockPickMode: vi.fn(),
    mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    mockT: vi.fn((key: string) => key),
  }));

vi.mock("@/fetch/mihomo", () => ({
  mihomo: mockMihomo,
}));

vi.mock("@/help/mihomo", () => ({
  pickProxy: mockPickProxy,
}));

vi.mock("@/prompts/mihomo", () => ({
  pickMode: mockPickMode,
}));

vi.mock("@/help", () => ({
  logger: mockLogger,
}));

vi.mock("@/i18n", () => ({
  t: mockT,
}));

describe("app/clash/toggle/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPickProxy.mockResolvedValue(undefined);
  });

  test("should call pickMode to get user-selected mode", async () => {
    mockPickMode.mockResolvedValue("direct");
    mockMihomo.mockResolvedValue({ mode: "direct" });

    await handler();

    expect(mockPickMode).toHaveBeenCalledTimes(1);
  });

  test("should PATCH configs with the selected mode", async () => {
    mockPickMode.mockResolvedValue("global");
    mockMihomo.mockResolvedValue({ mode: "global" });

    await handler();

    expect(mockMihomo).toHaveBeenCalledWith("configs", {
      body: { mode: "global" },
      method: "PATCH",
    });
  });

  test("should GET configs after PATCH to verify the new mode", async () => {
    mockPickMode.mockResolvedValue("direct");
    mockMihomo
      .mockResolvedValueOnce(undefined) // PATCH response
      .mockResolvedValueOnce({ mode: "direct" }); // GET response

    await handler();

    expect(mockMihomo).toHaveBeenNthCalledWith(1, "configs", {
      body: { mode: "direct" },
      method: "PATCH",
    });
    expect(mockMihomo).toHaveBeenNthCalledWith(2, "configs");
  });

  test("should call pickProxy with refresh when mode is 'rule'", async () => {
    mockPickMode.mockResolvedValue("rule");
    mockMihomo.mockResolvedValue({ mode: "rule" });

    await handler();

    expect(mockPickProxy).toHaveBeenCalledWith({ refresh: true });
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  test("should log info when mode is 'direct' (not 'rule')", async () => {
    mockPickMode.mockResolvedValue("direct");
    mockMihomo.mockResolvedValue({ mode: "direct" });

    await handler();

    expect(mockT).toHaveBeenCalledWith("app.clash.toggle.modeChanged", {
      mode: "direct",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      "app.clash.toggle.modeChanged",
    );
    expect(mockPickProxy).not.toHaveBeenCalled();
  });

  test("should log info when mode is 'global' (not 'rule')", async () => {
    mockPickMode.mockResolvedValue("global");
    mockMihomo.mockResolvedValue({ mode: "global" });

    await handler();

    expect(mockT).toHaveBeenCalledWith("app.clash.toggle.modeChanged", {
      mode: "global",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      "app.clash.toggle.modeChanged",
    );
    expect(mockPickProxy).not.toHaveBeenCalled();
  });
});
