import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/linear/branch/handler";

const {
  mockPickIssueForBranch,
  mockFindNextBranch,
  mockGitCheckout,
  mockGitPull,
  mockGitCheckoutBranch,
} = vi.hoisted(() => ({
  mockPickIssueForBranch: vi.fn(),
  mockFindNextBranch: vi.fn(),
  mockGitCheckout: vi.fn(),
  mockGitPull: vi.fn(),
  mockGitCheckoutBranch: vi.fn(),
}));

vi.mock("@/prompts/linear", () => ({
  pickIssueForBranch: mockPickIssueForBranch,
}));

vi.mock("@/help", () => ({
  findNextBranch: mockFindNextBranch,
}));

vi.mock("@/help/cli.ts", () => ({
  gitCheckout: mockGitCheckout,
  gitPull: mockGitPull,
  gitCheckoutBranch: mockGitCheckoutBranch,
}));

const mockIssue = {
  id: "issue-1",
  identifier: "TEST-1",
  title: "Fix login bug",
  branchName: "test-1-fix-login-bug",
};

describe("app/linear/branch/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPickIssueForBranch.mockResolvedValue(mockIssue);
    mockFindNextBranch.mockResolvedValue("test-1-fix-login-bug");
    mockGitCheckout.mockResolvedValue(undefined);
    mockGitPull.mockResolvedValue(undefined);
    mockGitCheckoutBranch.mockResolvedValue(undefined);
  });

  test("should call pickIssueForBranch to get user-selected issue", async () => {
    await handler();

    expect(mockPickIssueForBranch).toHaveBeenCalledTimes(1);
  });

  test("should call findNextBranch with the issue branchName", async () => {
    await handler();

    expect(mockFindNextBranch).toHaveBeenCalledWith("test-1-fix-login-bug");
  });

  test("should checkout main, pull, then checkout new branch", async () => {
    await handler();

    expect(mockGitCheckout).toHaveBeenCalledWith("main");
    expect(mockGitPull).toHaveBeenCalledTimes(1);
    expect(mockGitCheckoutBranch).toHaveBeenCalledWith("test-1-fix-login-bug");
  });

  test("should use versioned branch name when original exists", async () => {
    mockFindNextBranch.mockResolvedValue("test-1-fix-login-bug-2");

    await handler();

    expect(mockGitCheckoutBranch).toHaveBeenCalledWith(
      "test-1-fix-login-bug-2",
    );
  });

  test("should execute steps in correct order", async () => {
    const callOrder: string[] = [];
    mockPickIssueForBranch.mockImplementation(async () => {
      callOrder.push("pickIssue");
      return mockIssue;
    });
    mockFindNextBranch.mockImplementation(async () => {
      callOrder.push("findNextBranch");
      return "test-1-fix-login-bug";
    });
    mockGitCheckout.mockImplementation(async () => {
      callOrder.push("gitCheckout");
    });
    mockGitPull.mockImplementation(async () => {
      callOrder.push("gitPull");
    });
    mockGitCheckoutBranch.mockImplementation(async () => {
      callOrder.push("gitCheckoutBranch");
    });

    await handler();

    expect(callOrder).toEqual([
      "pickIssue",
      "findNextBranch",
      "gitCheckout",
      "gitPull",
      "gitCheckoutBranch",
    ]);
  });
});
