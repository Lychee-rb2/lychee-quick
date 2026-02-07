import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/linear/release/handler";

const {
  mockGet,
  mockGetIssues,
  mockReleaseIssues,
  mockOpenUrl,
  mockPickIssueForRelease,
  mockReleaseNotePage,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  return {
    mockGet,
    mockGetIssues: vi.fn(() => ({ get: mockGet })),
    mockReleaseIssues: vi.fn(),
    mockOpenUrl: vi.fn(),
    mockPickIssueForRelease: vi.fn(),
    mockReleaseNotePage: vi.fn(),
  };
});

vi.mock("@/fetch/linear.ts", () => ({
  getIssues: mockGetIssues,
}));

vi.mock("@/help/linear.ts", () => ({
  releaseIssues: mockReleaseIssues,
}));

vi.mock("@/help/cli.ts", () => ({
  openUrl: mockOpenUrl,
}));

vi.mock("@/prompts/linear", () => ({
  pickIssueForRelease: mockPickIssueForRelease,
}));

vi.mock("@/help/env", () => ({
  RELEASE_NOTE_PAGE: mockReleaseNotePage,
}));

const allIssues = [
  { id: "issue-1", identifier: "TEST-1", title: "Feature A" },
  { id: "issue-2", identifier: "TEST-2", title: "Feature B" },
];

const selectedIssues = [allIssues[0]];

describe("app/linear/release/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(allIssues);
    mockPickIssueForRelease.mockResolvedValue(selectedIssues);
    mockReleaseIssues.mockResolvedValue(undefined);
    mockOpenUrl.mockResolvedValue(undefined);
    mockReleaseNotePage.mockReturnValue(undefined);
  });

  test("should fetch issues via getIssues().get()", async () => {
    await handler();

    expect(mockGetIssues).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  test("should pass all fetched issues to pickIssueForRelease", async () => {
    await handler();

    expect(mockPickIssueForRelease).toHaveBeenCalledWith(allIssues);
  });

  test("should call releaseIssues with user-selected issues", async () => {
    await handler();

    expect(mockReleaseIssues).toHaveBeenCalledWith(selectedIssues);
  });

  test("should open release note page when RELEASE_NOTE_PAGE is set", async () => {
    mockReleaseNotePage.mockReturnValue("https://notes.example.com/release");

    await handler();

    expect(mockOpenUrl).toHaveBeenCalledWith(
      "https://notes.example.com/release",
    );
  });

  test("should not open URL when RELEASE_NOTE_PAGE is undefined", async () => {
    mockReleaseNotePage.mockReturnValue(undefined);

    await handler();

    expect(mockOpenUrl).not.toHaveBeenCalled();
  });

  test("should execute steps in correct order", async () => {
    mockReleaseNotePage.mockReturnValue("https://notes.example.com");
    const callOrder: string[] = [];
    mockGet.mockImplementation(async () => {
      callOrder.push("getIssues");
      return allIssues;
    });
    mockPickIssueForRelease.mockImplementation(async () => {
      callOrder.push("pickIssue");
      return selectedIssues;
    });
    mockReleaseIssues.mockImplementation(async () => {
      callOrder.push("releaseIssues");
    });
    mockOpenUrl.mockImplementation(async () => {
      callOrder.push("openUrl");
    });

    await handler();

    expect(callOrder).toEqual([
      "getIssues",
      "pickIssue",
      "releaseIssues",
      "openUrl",
    ]);
  });
});
