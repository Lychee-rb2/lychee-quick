import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import type { Issue, Attachment } from "@/types/linear";

// Mock @inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  search: vi.fn(),
  Separator: vi.fn().mockImplementation((text: string) => ({
    type: "separator",
    separator: text,
  })),
}));

// Mock @/fetch/linear
vi.mock("@/fetch/linear", () => ({
  getIssues: vi.fn(),
}));

import {
  selectPreviewLinks,
  confirmSendComment,
  pickIssueForBranch,
  pickIssueForPreview,
  pickIssueForRelease,
} from "@/prompts/linear";
import { checkbox, confirm, search, Separator } from "@inquirer/prompts";
import { getIssues } from "@/fetch/linear";

// Type definitions for mock options
interface SearchChoice {
  name: string;
  value: unknown;
}

interface SearchMockOptions {
  message: string;
  source: (
    searchTerm: string,
  ) => Promise<(SearchChoice | { type: string; separator: string })[]>;
}

// Type-safe mock helper functions
type SearchMockImpl = (options: SearchMockOptions) => Promise<unknown>;
type MockedSearch = ReturnType<typeof vi.fn> & typeof search;

const mockSearchImpl = (impl: SearchMockImpl): void => {
  (search as MockedSearch).mockImplementation(impl as unknown as typeof search);
};

const getMockedGetIssues = (): ReturnType<typeof vi.fn> =>
  getIssues as unknown as ReturnType<typeof vi.fn>;

describe("linear-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("selectPreviewLinks", () => {
    const mockPreviewLinks = [
      {
        url: "https://preview1.vercel.app",
        name: "Preview 1",
        origin: { id: 1, type: "vercel" },
      },
      {
        url: "https://preview2.vercel.app",
        name: "Preview 2",
        origin: { id: 2, type: "vercel" },
      },
    ];

    test("should call checkbox with correct options", async () => {
      const selectedLinks = [mockPreviewLinks[0]];
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue(
        selectedLinks,
      );

      const result = await selectPreviewLinks(mockPreviewLinks);

      expect(checkbox).toHaveBeenCalledWith({
        message: "Send which preview link?",
        loop: false,
        choices: [
          {
            name: "https://preview1.vercel.app",
            value: mockPreviewLinks[0],
            short: "https://preview1.vercel.app",
            checked: true,
          },
          {
            name: "https://preview2.vercel.app",
            value: mockPreviewLinks[1],
            short: "https://preview2.vercel.app",
            checked: true,
          },
        ],
      });
      expect(result).toEqual(selectedLinks);
    });

    test("should return user selected preview links", async () => {
      const selectedLinks = mockPreviewLinks;
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue(
        selectedLinks,
      );

      const result = await selectPreviewLinks(mockPreviewLinks);

      expect(result).toEqual(selectedLinks);
    });

    test("should handle empty selection", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      const result = await selectPreviewLinks(mockPreviewLinks);

      expect(result).toEqual([]);
    });
  });

  describe("confirmSendComment", () => {
    test("should call confirm with correct message", async () => {
      (confirm as MockedFunction<typeof confirm>).mockResolvedValue(true);

      await confirmSendComment("LIN-123");

      expect(confirm).toHaveBeenCalledWith({
        message: "Do you want to send preview comment to Linear issue LIN-123?",
      });
    });

    test("should return true when user confirms", async () => {
      (confirm as MockedFunction<typeof confirm>).mockResolvedValue(true);

      const result = await confirmSendComment("LIN-123");

      expect(result).toBe(true);
    });

    test("should return false when user cancels", async () => {
      (confirm as MockedFunction<typeof confirm>).mockResolvedValue(false);

      const result = await confirmSendComment("LIN-123");

      expect(result).toBe(false);
    });
  });

  describe("pickIssueForBranch", () => {
    const createMockState = (type: string) => ({
      type,
      color: "#000",
      position: 0,
    });

    const createMockIssue = (
      overrides: Partial<Issue> & { identifier: string; title: string },
    ): Issue =>
      ({
        identifier: overrides.identifier,
        title: overrides.title,
        state: overrides.state || createMockState("started"),
        assignee: overrides.assignee,
        attachments: overrides.attachments || { nodes: [] },
      }) as Issue;

    const mockIssues: Issue[] = [
      createMockIssue({
        identifier: "LIN-1",
        title: "My Issue",
        state: createMockState("started"),
        assignee: { isMe: true, displayName: "Me" },
      }),
      createMockIssue({
        identifier: "LIN-2",
        title: "Unassigned Issue",
        state: createMockState("unstarted"),
        assignee: null,
      }),
      createMockIssue({
        identifier: "LIN-3",
        title: "Other Issue",
        state: createMockState("completed"),
        assignee: { isMe: false, displayName: "John" },
      }),
      createMockIssue({
        identifier: "LIN-4",
        title: "Another John Issue",
        state: createMockState("backlog"),
        assignee: { isMe: false, displayName: "John" },
      }),
    ];

    test("should call search with correct message", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        expect(options.message).toBe("Checkout branch from which issue?");
        await options.source("");
        return mockIssues[0];
      });

      await pickIssueForBranch();
    });

    test("should group issues by assignee (Me, None, others)", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        // Should have separators and issues
        // Groups: Me (highest priority), John (2 issues), None (lowest priority)
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        );
        expect(separators).toHaveLength(3); // Me, John, None
        return mockIssues[0];
      });

      await pickIssueForBranch();
      expect(Separator).toHaveBeenCalled();
    });

    test("should filter by M shortcut to show only my issues", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("M");
        // Only my issues should be returned
        const issueChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        );
        expect(issueChoices).toHaveLength(1);
        expect((issueChoices[0] as SearchChoice).value).toMatchObject({
          identifier: "LIN-1",
        });
        return mockIssues[0];
      });

      await pickIssueForBranch();
    });

    test("should filter by N shortcut to show only unassigned issues", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("N");
        // Only unassigned issues should be returned
        const issueChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        );
        expect(issueChoices).toHaveLength(1);
        expect((issueChoices[0] as SearchChoice).value).toMatchObject({
          identifier: "LIN-2",
        });
        return mockIssues[1];
      });

      await pickIssueForBranch();
    });

    test("should filter by identifier", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("LIN-3");
        const issueChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        );
        expect(issueChoices).toHaveLength(1);
        expect((issueChoices[0] as SearchChoice).value).toMatchObject({
          identifier: "LIN-3",
        });
        return mockIssues[2];
      });

      await pickIssueForBranch();
    });

    test("should filter by title", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("Unassigned");
        const issueChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        );
        expect(issueChoices).toHaveLength(1);
        expect((issueChoices[0] as SearchChoice).value).toMatchObject({
          identifier: "LIN-2",
        });
        return mockIssues[1];
      });

      await pickIssueForBranch();
    });

    test("should display issue with state icon", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        const issueChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        ) as SearchChoice[];
        // Check that name contains identifier and title
        const myIssue = issueChoices.find(
          (c) => (c.value as Issue).identifier === "LIN-1",
        );
        expect(myIssue?.name).toContain("[LIN-1]");
        expect(myIssue?.name).toContain("My Issue");
        return mockIssues[0];
      });

      await pickIssueForBranch();
    });

    test("should cache issues and not call get multiple times", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        await options.source("");
        await options.source("M");
        await options.source("N");
        return mockIssues[0];
      });

      await pickIssueForBranch();

      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test("should sort groups by priority (Me first, None last)", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssues);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        ) as { type: string; separator: string }[];
        // Me should be first, None should be last
        expect(separators[0].separator).toBe("Me");
        expect(separators[separators.length - 1].separator).toBe("None");
        return mockIssues[0];
      });

      await pickIssueForBranch();
    });

    test("should sort non-special groups by issue count (length fallback)", async () => {
      // Test case where both groups are not in SORT_BY, covering the || fallback branch
      const issuesWithMultipleOtherAssignees: Issue[] = [
        createMockIssue({
          identifier: "LIN-10",
          title: "Alice Issue 1",
          state: createMockState("started"),
          assignee: { isMe: false, displayName: "Alice" },
        }),
        createMockIssue({
          identifier: "LIN-11",
          title: "Alice Issue 2",
          state: createMockState("started"),
          assignee: { isMe: false, displayName: "Alice" },
        }),
        createMockIssue({
          identifier: "LIN-12",
          title: "Alice Issue 3",
          state: createMockState("started"),
          assignee: { isMe: false, displayName: "Alice" },
        }),
        createMockIssue({
          identifier: "LIN-20",
          title: "Bob Issue 1",
          state: createMockState("started"),
          assignee: { isMe: false, displayName: "Bob" },
        }),
      ];
      const mockGet = vi
        .fn()
        .mockResolvedValue(issuesWithMultipleOtherAssignees);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        ) as { type: string; separator: string }[];
        // Alice has 3 issues, Bob has 1 issue
        // When both groups are not in SORT_BY, sort by length (more issues first)
        expect(separators[0].separator).toBe("Alice");
        expect(separators[1].separator).toBe("Bob");
        return issuesWithMultipleOtherAssignees[0];
      });

      await pickIssueForBranch();
    });
  });

  describe("pickIssueForPreview", () => {
    const createMockAttachment = (
      overrides: Partial<Attachment> & { title: string; status: string },
    ): Attachment =>
      ({
        metadata: {
          title: overrides.title,
          status: overrides.status,
        },
      }) as Attachment;

    const createMockIssue = (
      overrides: Partial<Issue> & { identifier: string; title: string },
    ): Issue =>
      ({
        identifier: overrides.identifier,
        title: overrides.title,
        state: overrides.state || { type: "started" },
        attachments: overrides.attachments || { nodes: [] },
      }) as Issue;

    const mockIssuesWithAttachments: Issue[] = [
      createMockIssue({
        identifier: "LIN-1",
        title: "Issue with PR",
        attachments: {
          nodes: [
            createMockAttachment({ title: "feat: add auth", status: "open" }),
            createMockAttachment({ title: "fix: login bug", status: "merged" }),
          ],
        },
      }),
      createMockIssue({
        identifier: "LIN-2",
        title: "Another Issue",
        attachments: {
          nodes: [
            createMockAttachment({
              title: "feat: dashboard",
              status: "draft",
            }),
          ],
        },
      }),
      createMockIssue({
        identifier: "LIN-3",
        title: "No Attachments",
        attachments: { nodes: [] },
      }),
    ];

    test("should call search with correct message", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        expect(options.message).toBe("Send preview comment from which pr?");
        await options.source("");
        return { attachment: {}, issue: mockIssuesWithAttachments[0] };
      });

      await pickIssueForPreview();
    });

    test("should only show issues with attachments", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        // LIN-3 has no attachments, should not be included
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        ) as { separator: string }[];
        const identifiers = separators.map((s) => s.separator);
        expect(identifiers).toContain("LIN-1");
        expect(identifiers).toContain("LIN-2");
        expect(identifiers).not.toContain("LIN-3");
        return { attachment: {}, issue: mockIssuesWithAttachments[0] };
      });

      await pickIssueForPreview();
    });

    test("should filter by issue title", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("Another");
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        ) as { separator: string }[];
        expect(separators).toHaveLength(1);
        expect(separators[0].separator).toBe("LIN-2");
        return { attachment: {}, issue: mockIssuesWithAttachments[1] };
      });

      await pickIssueForPreview();
    });

    test("should filter by issue identifier", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("LIN-1");
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        ) as { separator: string }[];
        expect(separators).toHaveLength(1);
        expect(separators[0].separator).toBe("LIN-1");
        return { attachment: {}, issue: mockIssuesWithAttachments[0] };
      });

      await pickIssueForPreview();
    });

    test("should filter by attachment title", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("dashboard");
        const separators = choices.filter(
          (c) => "type" in c && c.type === "separator",
        ) as { separator: string }[];
        expect(separators).toHaveLength(1);
        expect(separators[0].separator).toBe("LIN-2");
        return { attachment: {}, issue: mockIssuesWithAttachments[1] };
      });

      await pickIssueForPreview();
    });

    test("should display attachment with status icon", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        const attachmentChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        ) as SearchChoice[];
        // Check that name contains attachment title
        const authAttachment = attachmentChoices.find((c) =>
          c.name.includes("feat: add auth"),
        );
        expect(authAttachment).toBeDefined();
        return { attachment: {}, issue: mockIssuesWithAttachments[0] };
      });

      await pickIssueForPreview();
    });

    test("should return attachment and issue as value", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        const attachmentChoices = choices.filter(
          (c) => !("type" in c && c.type === "separator"),
        ) as SearchChoice[];
        const firstChoice = attachmentChoices[0];
        expect(firstChoice.value).toHaveProperty("attachment");
        expect(firstChoice.value).toHaveProperty("issue");
        return firstChoice.value;
      });

      await pickIssueForPreview();
    });

    test("should cache issues and not call get multiple times", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockIssuesWithAttachments);
      getMockedGetIssues().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        await options.source("");
        await options.source("LIN-1");
        await options.source("dashboard");
        return { attachment: {}, issue: mockIssuesWithAttachments[0] };
      });

      await pickIssueForPreview();

      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe("pickIssueForRelease", () => {
    const createMockState = (type: string) => ({
      type,
      color: "#000",
      position: 0,
    });

    const createMockIssue = (
      overrides: Partial<Issue> & { identifier: string; title: string },
    ): Issue =>
      ({
        identifier: overrides.identifier,
        title: overrides.title,
        state: overrides.state || createMockState("started"),
      }) as Issue;

    const mockIssues: Issue[] = [
      createMockIssue({
        identifier: "LIN-1",
        title: "Started Issue",
        state: createMockState("started"),
      }),
      createMockIssue({
        identifier: "LIN-2",
        title: "Completed Issue",
        state: createMockState("completed"),
      }),
      createMockIssue({
        identifier: "LIN-3",
        title: "Backlog Issue",
        state: createMockState("backlog"),
      }),
      createMockIssue({
        identifier: "LIN-4",
        title: "Canceled Issue",
        state: createMockState("canceled"),
      }),
    ];

    test("should call checkbox with correct message", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease(mockIssues);

      expect(checkbox).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Release which issue?",
          loop: false,
        }),
      );
    });

    interface IssueChoice {
      name: string;
      value: Issue;
      short: string;
    }

    test("should only show started and completed issues", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease(mockIssues);

      const callArgs = (checkbox as MockedFunction<typeof checkbox>).mock
        .calls[0][0] as unknown as { choices: IssueChoice[] };
      expect(callArgs.choices).toHaveLength(2);
      expect(callArgs.choices.map((c) => c.value.identifier)).toEqual([
        "LIN-1",
        "LIN-2",
      ]);
    });

    test("should filter out backlog and canceled issues", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease(mockIssues);

      const callArgs = (checkbox as MockedFunction<typeof checkbox>).mock
        .calls[0][0] as unknown as { choices: IssueChoice[] };
      const identifiers = callArgs.choices.map((c) => c.value.identifier);
      expect(identifiers).not.toContain("LIN-3");
      expect(identifiers).not.toContain("LIN-4");
    });

    test("should display issue with state icon", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease(mockIssues);

      const callArgs = (checkbox as MockedFunction<typeof checkbox>).mock
        .calls[0][0] as unknown as { choices: IssueChoice[] };
      const startedChoice = callArgs.choices.find(
        (c) => c.value.identifier === "LIN-1",
      );
      expect(startedChoice?.name).toContain("[LIN-1]");
      expect(startedChoice?.name).toContain("Started Issue");
    });

    test("should set short to issue identifier", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease(mockIssues);

      const callArgs = (checkbox as MockedFunction<typeof checkbox>).mock
        .calls[0][0] as unknown as { choices: IssueChoice[] };
      callArgs.choices.forEach((choice) => {
        expect(choice.short).toBe(choice.value.identifier);
      });
    });

    test("should return selected issues", async () => {
      const selectedIssues = [mockIssues[0]];
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue(
        selectedIssues,
      );

      const result = await pickIssueForRelease(mockIssues);

      expect(result).toEqual(selectedIssues);
    });

    test("should handle empty issues array", async () => {
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease([]);

      const callArgs = (checkbox as MockedFunction<typeof checkbox>).mock
        .calls[0][0] as unknown as { choices: IssueChoice[] };
      expect(callArgs.choices).toHaveLength(0);
    });

    test("should handle all issues being filtered out", async () => {
      const onlyBacklogIssues = [
        createMockIssue({
          identifier: "LIN-5",
          title: "Backlog Only",
          state: createMockState("backlog"),
        }),
      ];
      (checkbox as MockedFunction<typeof checkbox>).mockResolvedValue([]);

      await pickIssueForRelease(onlyBacklogIssues);

      const callArgs = (checkbox as MockedFunction<typeof checkbox>).mock
        .calls[0][0] as unknown as { choices: IssueChoice[] };
      expect(callArgs.choices).toHaveLength(0);
    });
  });
});
