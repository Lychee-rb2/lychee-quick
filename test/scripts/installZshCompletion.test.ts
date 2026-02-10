import { describe, test, expect, vi, afterEach } from "vitest";
import getCompletions from "@/scripts/utils/getCompletions";
import { editZshrc, writeZsh } from "@/scripts/utils/installZshCompletion";
import installZshCompletion from "@/scripts/utils/installZshCompletion";

vi.mock("@/i18n", () => ({
  t: vi.fn((key: string) => key),
}));
vi.mock("@/scripts/utils/getCompletions", () => ({
  default: vi.fn().mockResolvedValue([
    {
      name: "test",
      completion: "test",
      children: [
        { name: "sub-test-test", completion: "sub-test-test", children: [] },
        {
          name: "sub-test-test2",
          completion: "sub-test-test2",
          children: [],
        },
      ],
    },
    {
      name: "test2",
      completion: "test2",
      children: [
        {
          name: "sub-test2-test2",
          completion: "sub-test2-test2",
          children: [],
        },
        {
          name: "sub-test2-test3",
          completion: "sub-test2-test3",
          children: [],
        },
      ],
    },
  ]),
}));
const mockWrite = vi.fn();
const mockFile = vi.fn();

const mockConsoleLog = vi.fn();

describe("installZshCompletion", () => {
  globalThis.Bun.write = mockWrite as unknown as typeof Bun.write;
  globalThis.Bun.file = mockFile as unknown as typeof Bun.file;
  globalThis.console = {
    ...globalThis.console,
    log: mockConsoleLog,
    error: mockConsoleLog,
  } as unknown as Console;

  afterEach(() => {
    mockWrite.mockReset();
    mockFile.mockReset();
    mockFile.mockReturnValue({ text: vi.fn().mockResolvedValue("") });
  });
  describe("editZshrc", () => {
    test("should edit zshrc", async () => {
      mockFile.mockReturnValue({
        text: vi.fn().mockResolvedValue("#zshrc content"),
      });
      await editZshrc("/test/.zshrc", "source /test/completions/init.zsh");
      expect(mockWrite).toHaveBeenCalledWith(
        "/test/.zshrc",
        "#zshrc content\nsource /test/completions/init.zsh\n",
      );
    });
    test("should not edit zshrc if already configured", async () => {
      mockFile.mockReturnValue({
        text: vi
          .fn()
          .mockResolvedValue(
            "#zshrc content\nsource /test/completions/init.zsh",
          ),
      });
      await editZshrc("/test/.zshrc", "source /test/completions/init.zsh");
      expect(mockWrite).not.toHaveBeenCalled();
    });
    test("should throw error if failed to get zshrc", async () => {
      mockFile.mockReturnValue({
        text: vi.fn().mockRejectedValue(new Error("Failed to get zshrc")),
      });
      await expect(
        editZshrc("/test/.zshrc", "source /test/completions/init.zsh"),
      ).rejects.toThrow("Failed to get zshrc");
    });
    test("should throw error if failed to write zshrc", async () => {
      mockWrite.mockRejectedValue(new Error("Failed to write zshrc"));
      await expect(
        editZshrc("/test/.zshrc", "source /test/completions/init.zsh"),
      ).rejects.toThrow("Failed to write zshrc");
    });
  });
  describe("writeZsh", () => {
    test("should write zsh", async () => {
      await writeZsh("/test", "/test/completions/init.zsh");
      const expectedScript = [
        "# Lychee Quick CLI completion",
        "_lychee_quick_completion() {",
        "  if (( CURRENT == 2 )); then",
        "    local -a completions=('test:test' 'test2:test2')",
        "    _describe 'command' completions",
        "  elif (( CURRENT == 3 )); then",
        "    local -a completions",
        '    case "${words[2]}" in',
        "      test) completions=('sub-test-test:sub-test-test' 'sub-test-test2:sub-test-test2') ;;",
        "      test2) completions=('sub-test2-test2:sub-test2-test2' 'sub-test2-test3:sub-test2-test3') ;;",
        "    esac",
        "    _describe 'subcommand' completions",
        "  fi",
        "}",
        "compdef _lychee_quick_completion ly",
        "",
      ].join("\n");
      expect(mockWrite).toHaveBeenCalledWith(
        "/test/completions/init.zsh",
        expectedScript,
      );
    });

    test("should write zsh with deeply nested commands", async () => {
      vi.mocked(getCompletions).mockResolvedValueOnce([
        {
          name: "cmd",
          completion: "top command",
          children: [
            {
              name: "sub",
              completion: "sub command",
              children: [
                {
                  name: "deep",
                  completion: "deep command",
                  children: [],
                },
              ],
            },
          ],
        },
      ]);

      await writeZsh("/test", "/test/completions/init.zsh");
      const expectedScript = [
        "# Lychee Quick CLI completion",
        "_lychee_quick_completion() {",
        "  if (( CURRENT == 2 )); then",
        "    local -a completions=('cmd:top command')",
        "    _describe 'command' completions",
        "  elif (( CURRENT == 3 )); then",
        "    local -a completions",
        '    case "${words[2]}" in',
        "      cmd) completions=('sub:sub command') ;;",
        "    esac",
        "    _describe 'subcommand' completions",
        "  elif (( CURRENT == 4 )); then",
        "    local -a completions",
        '    case "${words[2]}/${words[3]}" in',
        "      cmd/sub) completions=('deep:deep command') ;;",
        "    esac",
        "    _describe 'subcommand' completions",
        "  fi",
        "}",
        "compdef _lychee_quick_completion ly",
        "",
      ].join("\n");
      expect(mockWrite).toHaveBeenCalledWith(
        "/test/completions/init.zsh",
        expectedScript,
      );
    });
  });
  describe("installZshCompletion", () => {
    test("should install zsh completion", async () => {
      mockFile.mockReturnValue({
        exists: vi.fn().mockResolvedValue(true),
        text: vi.fn().mockResolvedValue(""),
      });
      const result = await installZshCompletion("/test");
      expect(result).toBe(1);
    });
    test("should not install zsh completion if zshrc does not exist", async () => {
      mockFile.mockReturnValue({
        exists: vi.fn().mockResolvedValue(false),
      });
      const result = await installZshCompletion("/test");
      expect(result).toBe(0);
    });
  });
});
