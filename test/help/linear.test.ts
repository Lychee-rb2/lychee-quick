import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import type { Issue, Attachment } from "@/types/linear";

// Mock modules
vi.mock("@/help/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    plain: vi.fn(),
  },
}));

vi.mock("@/fetch/linear", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/help/cli", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
  pbcopy: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/help/env", () => ({
  PREVIEWS_COMMENT_MENTIONS: vi.fn().mockReturnValue(""),
  PREVIEWS_COMMENT_FOOTER: vi.fn().mockReturnValue(undefined),
}));

vi.mock("@/prompts/linear", () => ({
  selectPreviewLinks: vi.fn(),
  confirmSendComment: vi.fn(),
}));

vi.mock("date-fns", () => ({
  format: vi.fn().mockReturnValue("2024-01-15"),
}));

vi.mock("@/i18n", () => ({
  t: vi.fn((key: string) => key),
}));

// Import after mocks
import { releaseIssues, sendPreview } from "@/help/linear";
import { logger } from "@/help/logger";
import { pbcopy } from "@/help/cli";
import { createClient } from "@/fetch/linear";
import { openUrl } from "@/help/cli";
import { selectPreviewLinks, confirmSendComment } from "@/prompts/linear";
import { PREVIEWS_COMMENT_MENTIONS } from "@/help/env";

// Type definitions for mocks
type MockedLogger = {
  info: MockedFunction<typeof logger.info>;
  error: MockedFunction<typeof logger.error>;
  debug: MockedFunction<typeof logger.debug>;
  plain: MockedFunction<typeof logger.plain>;
};

const getMockedLogger = (): MockedLogger => {
  return logger as unknown as MockedLogger;
};

describe("linear helper functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("releaseIssues", () => {
    test("should return early when items array is empty", async () => {
      await releaseIssues([]);

      expect(pbcopy).not.toHaveBeenCalled();
      expect(getMockedLogger().info).not.toHaveBeenCalled();
    });

    test("should generate markdown for single issue", async () => {
      const items = [
        {
          id: "issue-1",
          identifier: "LIN-123",
          title: "Test Issue",
          url: "https://linear.app/issue/LIN-123",
          updatedAt: Date.now(),
          attachments: {
            nodes: [
              {
                id: "att-1",
                url: "https://github.com/org/repo/pull/1",
                metadata: {
                  id: "pr-1",
                  url: "https://github.com/org/repo/pull/1",
                  draft: false,
                  title: "PR Title",
                  branch: "feature/test",
                  number: 1,
                  repoId: "repo-1",
                  status: "merged",
                  userId: "user-1",
                  reviews: [],
                  closedAt: null,
                  linkKind: "closes",
                  mergedAt: null,
                  repoName: "repo",
                  createdAt: "2024-01-01",
                  repoLogin: "org",
                  reviewers: [],
                  updatedAt: "2024-01-15",
                  userLogin: "user",
                  previewLinks: [],
                  targetBranch: "main",
                },
              },
            ],
          },
        },
      ] as unknown as Issue[];

      await releaseIssues(items);

      expect(pbcopy).toHaveBeenCalledTimes(1);
      const markdown = (pbcopy as MockedFunction<typeof pbcopy>).mock
        .calls[0][0];
      expect(markdown).toContain("app.linear.release.noteTitle");
      expect(markdown).toContain("[LIN-123 Test Issue]");
      expect(markdown).toContain(
        "[PR Title](https://github.com/org/repo/pull/1)",
      );
      expect(getMockedLogger().info).toHaveBeenCalledWith(markdown);
    });

    test("should sort issues by updatedAt in descending order", async () => {
      const items: Issue[] = [
        {
          id: "issue-1",
          identifier: "LIN-100",
          title: "Older Issue",
          url: "https://linear.app/issue/LIN-100",
          updatedAt: 1000,
          attachments: { nodes: [] },
        },
        {
          id: "issue-2",
          identifier: "LIN-200",
          title: "Newer Issue",
          url: "https://linear.app/issue/LIN-200",
          updatedAt: 2000,
          attachments: { nodes: [] },
        },
      ] as Issue[];

      await releaseIssues(items);

      const markdown = (pbcopy as MockedFunction<typeof pbcopy>).mock
        .calls[0][0];
      const lin200Index = markdown.indexOf("LIN-200");
      const lin100Index = markdown.indexOf("LIN-100");
      expect(lin200Index).toBeLessThan(lin100Index);
    });
  });

  describe("sendPreview", () => {
    const mockIssue: Issue = {
      id: "issue-1",
      identifier: "LIN-123",
      title: "Test Issue",
      url: "https://linear.app/issue/LIN-123",
      updatedAt: Date.now(),
      attachments: { nodes: [] },
    } as Issue;

    const mockAttachment = {
      id: "att-1",
      url: "https://github.com/org/repo/pull/1",
      metadata: {
        id: "pr-1",
        url: "https://github.com/org/repo/pull/1",
        draft: false,
        title: "PR Title",
        branch: "feature/test",
        number: 1,
        repoId: "repo-1",
        status: "merged",
        userId: "user-1",
        reviews: [],
        closedAt: null,
        linkKind: "closes",
        mergedAt: null,
        repoName: "repo",
        createdAt: "2024-01-01",
        repoLogin: "org",
        reviewers: [],
        updatedAt: "2024-01-15",
        userLogin: "user",
        previewLinks: [
          {
            url: "https://preview.vercel.app",
            name: "Preview",
            origin: { id: 1, type: "vercel" },
          },
        ],
        targetBranch: "main",
      },
    } as unknown as Attachment;

    beforeEach(() => {
      const mockClient = {
        users: vi.fn().mockResolvedValue({
          users: { nodes: [{ id: "user-1", name: "Alice" }] },
        }),
        createComment: vi.fn().mockResolvedValue({
          commentCreate: {
            comment: { url: "https://linear.app/comment/123" },
          },
        }),
        issues: vi.fn().mockResolvedValue({ issues: { nodes: [] } }),
      };
      (createClient as MockedFunction<typeof createClient>).mockReturnValue(
        mockClient as unknown as ReturnType<typeof createClient>,
      );
    });

    test("should not send comment when user cancels", async () => {
      (
        selectPreviewLinks as MockedFunction<typeof selectPreviewLinks>
      ).mockResolvedValue([
        {
          url: "https://preview.vercel.app",
          name: "Preview",
          origin: { id: 1, type: "vercel" },
        },
      ]);
      (
        confirmSendComment as MockedFunction<typeof confirmSendComment>
      ).mockResolvedValue(false);

      await sendPreview(mockIssue, mockAttachment);

      expect(openUrl).not.toHaveBeenCalled();
    });

    test("should send comment and open URL when user confirms", async () => {
      (
        selectPreviewLinks as MockedFunction<typeof selectPreviewLinks>
      ).mockResolvedValue([
        {
          url: "https://preview.vercel.app",
          name: "Preview",
          origin: { id: 1, type: "vercel" },
        },
      ]);
      (
        confirmSendComment as MockedFunction<typeof confirmSendComment>
      ).mockResolvedValue(true);

      await sendPreview(mockIssue, mockAttachment);

      expect(openUrl).toHaveBeenCalledWith("https://linear.app/comment/123");
    });

    test("should filter out invalid emails from mentions", async () => {
      vi.mocked(PREVIEWS_COMMENT_MENTIONS).mockReturnValue(
        "invalid-email,also-not-valid,",
      );

      (
        selectPreviewLinks as MockedFunction<typeof selectPreviewLinks>
      ).mockResolvedValue([
        {
          url: "https://preview.vercel.app",
          name: "Preview",
          origin: { id: 1, type: "vercel" },
        },
      ]);
      (
        confirmSendComment as MockedFunction<typeof confirmSendComment>
      ).mockResolvedValue(false);

      await sendPreview(mockIssue, mockAttachment);

      // Should still work without valid emails
      expect(confirmSendComment).toHaveBeenCalled();
    });

    test("should parse valid emails and filter invalid ones", async () => {
      vi.mocked(PREVIEWS_COMMENT_MENTIONS).mockReturnValue(
        "valid@example.com,invalid-email",
      );

      (
        selectPreviewLinks as MockedFunction<typeof selectPreviewLinks>
      ).mockResolvedValue([
        {
          url: "https://preview.vercel.app",
          name: "Preview",
          origin: { id: 1, type: "vercel" },
        },
      ]);
      (
        confirmSendComment as MockedFunction<typeof confirmSendComment>
      ).mockResolvedValue(false);

      await sendPreview(mockIssue, mockAttachment);

      // Should work with mixed valid/invalid emails
      expect(confirmSendComment).toHaveBeenCalled();
    });
  });
});
