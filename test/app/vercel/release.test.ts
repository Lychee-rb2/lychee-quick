import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import handler from "@/app/vercel/release/handler";

const {
  mockPickProjectForRelease,
  mockOpenUrl,
  mockVercelTeam,
  mockSubMinutes,
  mockAddMinutes,
} = vi.hoisted(() => ({
  mockPickProjectForRelease: vi.fn(),
  mockOpenUrl: vi.fn(),
  mockVercelTeam: vi.fn(() => "team_acme"),
  mockSubMinutes: vi.fn(
    () => new Date("2026-02-07T10:50:00.000Z"),
  ),
  mockAddMinutes: vi.fn(
    () => new Date("2026-02-07T11:10:00.000Z"),
  ),
}));

vi.mock("@/prompts/vercel", () => ({
  pickProjectForRelease: mockPickProjectForRelease,
}));

vi.mock("@/help/cli.ts", () => ({
  openUrl: mockOpenUrl,
}));

vi.mock("@/help/env", () => ({
  VERCEL_TEAM: mockVercelTeam,
}));

vi.mock("date-fns", () => ({
  subMinutes: mockSubMinutes,
  addMinutes: mockAddMinutes,
}));

const mockDeployHooks = [
  {
    ref: "main",
    url: "https://api.vercel.com/v1/deploy/hook-1",
    projectName: "project-alpha",
  },
  {
    ref: "main",
    url: "https://api.vercel.com/v1/deploy/hook-2",
    projectName: "project-beta",
  },
];

describe("app/vercel/release/handler", () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockPickProjectForRelease.mockResolvedValue(mockDeployHooks);
    mockFetch.mockResolvedValue(new Response("ok"));
    mockOpenUrl.mockResolvedValue(undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("should call pickProjectForRelease to get deploy hooks", async () => {
    await handler();

    expect(mockPickProjectForRelease).toHaveBeenCalledTimes(1);
  });

  test("should fetch all deploy hook URLs in parallel", async () => {
    await handler();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.vercel.com/v1/deploy/hook-1",
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.vercel.com/v1/deploy/hook-2",
    );
  });

  test("should construct Vercel deployments URL with team and time range", async () => {
    await handler();

    expect(mockOpenUrl).toHaveBeenCalledTimes(1);
    const url = mockOpenUrl.mock.calls[0][0] as string;
    expect(url).toContain("https://vercel.com/team_acme/~/deployments?");
    expect(url).toContain("range=");

    // Parse the URL to check the range parameter
    const parsed = new URL(url);
    const range = JSON.parse(parsed.searchParams.get("range")!);
    expect(range).toHaveProperty("start");
    expect(range).toHaveProperty("end");
  });

  test("should use subMinutes and addMinutes for time range", async () => {
    await handler();

    expect(mockSubMinutes).toHaveBeenCalledWith(expect.any(Date), 10);
    expect(mockAddMinutes).toHaveBeenCalledWith(expect.any(Date), 10);
  });

  test("should open the deployments URL after triggering hooks", async () => {
    const callOrder: string[] = [];
    mockFetch.mockImplementation(async () => {
      callOrder.push("fetch");
      return new Response("ok");
    });
    mockOpenUrl.mockImplementation(async () => {
      callOrder.push("openUrl");
    });

    await handler();

    // fetch calls happen in parallel via Promise.all, then openUrl
    expect(callOrder.filter((c) => c === "fetch")).toHaveLength(2);
    expect(callOrder.at(-1)).toBe("openUrl");
  });
});
