import { describe, expect, test, vi, beforeEach } from "vitest";
import handler from "@/app/linear/preview/handler";

const { mockPickIssueForPreview, mockSendPreview } = vi.hoisted(() => ({
  mockPickIssueForPreview: vi.fn(),
  mockSendPreview: vi.fn(),
}));

vi.mock("@/prompts/linear", () => ({
  pickIssueForPreview: mockPickIssueForPreview,
}));

vi.mock("@/help/linear.ts", () => ({
  sendPreview: mockSendPreview,
}));

const mockIssue = {
  id: "issue-1",
  identifier: "TEST-1",
  title: "Add dark mode",
};

const mockAttachment = {
  id: "att-1",
  metadata: {
    title: "feat: dark mode toggle",
    url: "https://github.com/org/repo/pull/42",
    status: "open",
    previewLinks: [{ url: "https://preview.example.com", name: "Preview" }],
  },
};

describe("app/linear/preview/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPickIssueForPreview.mockResolvedValue({
      issue: mockIssue,
      attachment: mockAttachment,
    });
    mockSendPreview.mockResolvedValue(undefined);
  });

  test("should call pickIssueForPreview to get issue and attachment", async () => {
    await handler();

    expect(mockPickIssueForPreview).toHaveBeenCalledTimes(1);
  });

  test("should call sendPreview with the selected issue and attachment", async () => {
    await handler();

    expect(mockSendPreview).toHaveBeenCalledWith(mockIssue, mockAttachment);
  });

  test("should call pickIssueForPreview before sendPreview", async () => {
    const callOrder: string[] = [];
    mockPickIssueForPreview.mockImplementation(async () => {
      callOrder.push("pickIssue");
      return { issue: mockIssue, attachment: mockAttachment };
    });
    mockSendPreview.mockImplementation(async () => {
      callOrder.push("sendPreview");
    });

    await handler();

    expect(callOrder).toEqual(["pickIssue", "sendPreview"]);
  });
});
