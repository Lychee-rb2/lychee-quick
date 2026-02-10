import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/vercel/check/handler";

const {
  mockDeploymentGet,
  mockGetDeployments,
  mockPickBranchForCheck,
  mockLogger,
  mockIconMap,
  mockFormatDistanceToNow,
  mockT,
} = vi.hoisted(() => {
  const mockDeploymentGet = vi.fn();
  return {
    mockDeploymentGet,
    mockGetDeployments: vi.fn(() => ({ get: mockDeploymentGet })),
    mockPickBranchForCheck: vi.fn(),
    mockLogger: {
      info: vi.fn(),
      error: vi.fn(),
      plain: vi.fn(),
      table: vi.fn(),
    },
    mockIconMap: vi.fn((key: string) => `[${key}]`),
    mockFormatDistanceToNow: vi.fn(() => "5 minutes ago"),
    mockT: vi.fn((key: string) => key),
  };
});

vi.mock("@/fetch/vercel.ts", () => ({
  getDeployments: mockGetDeployments,
}));

vi.mock("@/help", () => ({
  iconMap: mockIconMap,
  logger: mockLogger,
}));

vi.mock("@/prompts/vercel", () => ({
  pickBranchForCheck: mockPickBranchForCheck,
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: mockFormatDistanceToNow,
}));

vi.mock("@vercel/sdk/models/getdeploymentsop.js", () => ({}));

vi.mock("@/i18n", () => ({
  t: mockT,
}));

const mockPullRequest = {
  title: "feat: add dark mode",
  url: "https://github.com/org/repo/pull/42",
  headRefName: "feature-dark-mode",
  headRefOid: "abc123def",
};

const mockDeployments = [
  {
    created: 1700000000000,
    buildingAt: 1700000001000,
    ready: 1700000060000,
    state: "READY",
    uid: "dpl_1",
    inspectorUrl: "https://vercel.com/inspect/dpl_1",
    meta: {
      githubCommitRef: "feature-dark-mode",
      githubCommitMessage: "feat: dark mode",
      branchAlias: "feature-dark-mode-org-repo.vercel.app",
      githubCommitSha: "abc123def",
    },
  },
  {
    created: 1700000100000,
    buildingAt: 1700000101000,
    ready: 1700000160000,
    state: "BUILDING",
    uid: "dpl_2",
    inspectorUrl: "https://vercel.com/inspect/dpl_2",
    meta: {
      githubCommitRef: "feature-dark-mode",
      githubCommitMessage: "fix: dark mode toggle",
      branchAlias: "feature-dark-mode-2-org-repo.vercel.app",
      githubCommitSha: "def456ghi",
    },
  },
];

describe("app/vercel/check/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPickBranchForCheck.mockResolvedValue(mockPullRequest);
    mockDeploymentGet.mockResolvedValue(mockDeployments);
  });

  test("should call pickBranchForCheck to get user-selected PR", async () => {
    await handler();

    expect(mockPickBranchForCheck).toHaveBeenCalledTimes(1);
  });

  test("should call getDeployments with headRefName and headRefOid", async () => {
    await handler();

    expect(mockGetDeployments).toHaveBeenCalledWith(
      "feature-dark-mode",
      "abc123def",
    );
  });

  test("should fetch deployments via cache.get()", async () => {
    await handler();

    expect(mockDeploymentGet).toHaveBeenCalledTimes(1);
  });

  test("should log branch name with separators", async () => {
    await handler();

    expect(mockLogger.plain).toHaveBeenCalledWith(
      "--------------------------------",
    );
    expect(mockT).toHaveBeenCalledWith("app.vercel.check.branch", {
      branch: "feature-dark-mode",
    });
    expect(mockLogger.plain).toHaveBeenCalledWith("app.vercel.check.branch");
  });

  test("should format deployments and display as table", async () => {
    await handler();

    expect(mockLogger.table).toHaveBeenCalledTimes(1);
    const tableData = mockLogger.table.mock.calls[0][0];
    expect(tableData).toHaveLength(2);

    // First deployment - READY
    expect(tableData[0][0]).toBe("[vercel_ready]");
    expect(tableData[0][1]).toContain(
      "feature-dark-mode-org-repo.vercel.app",
    );
    expect(tableData[0][2]).toBe("5 minutes ago");

    // Second deployment - BUILDING
    expect(tableData[1][0]).toBe("[vercel_building]");
  });

  test("should construct preview URL from branchAlias", async () => {
    await handler();

    const tableData = mockLogger.table.mock.calls[0][0];
    expect(tableData[0][1]).toBe(
      "https://feature-dark-mode-org-repo.vercel.app",
    );
  });

  test("should lowercase the deployment state for icon lookup", async () => {
    await handler();

    expect(mockIconMap).toHaveBeenCalledWith("vercel_ready");
    expect(mockIconMap).toHaveBeenCalledWith("vercel_building");
  });
});
