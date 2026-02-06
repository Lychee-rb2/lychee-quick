import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";

// Mock @inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

import { selectPreviewLinks, confirmSendComment } from "@/prompts/linear";
import { checkbox, confirm } from "@inquirer/prompts";

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
});
