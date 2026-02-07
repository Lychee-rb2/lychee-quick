import { describe, test, expect, vi, afterEach } from "vitest";
import {
  editZshrc,
  installZshCompletion,
  writeZsh,
} from "@/scripts/utils/installZshCompletion";
vi.mock("@/scripts/utils/getCompletions", () => ({
  default: vi.fn().mockResolvedValue({
    commands: [
      { name: "test", completion: "test" },
      { name: "test2", completion: "test2" },
    ],
    subcommands: {
      test: [
        { name: "sub-test-test", completion: "sub-test-test" },
        { name: "sub-test-test2", completion: "sub-test-test2" },
      ],
      test2: [
        { name: "sub-test2-test2", completion: "sub-test2-test2" },
        { name: "sub-test2-test3", completion: "sub-test2-test3" },
      ],
    },
  }),
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
      expect(mockWrite).toHaveBeenCalledWith(
        "/test/completions/init.zsh",
        "# Lychee Quick CLI completion\n_lychee_quick_completion() {\n  local cmd=\"${words[2]}\"\n  if (( CURRENT == 2 )); then\n    local -a commands=('test:test' 'test2:test2')\n    _describe 'command' commands\n  elif (( CURRENT == 3 )); then\n    local -a subcommands\n    case \"$cmd\" in\n      test) subcommands=('sub-test-test:sub-test-test' 'sub-test-test2:sub-test-test2') ;;\n      test2) subcommands=('sub-test2-test2:sub-test2-test2' 'sub-test2-test3:sub-test2-test3') ;;\n    esac\n    _describe 'subcommand' subcommands\n  fi\n}\ncompdef _lychee_quick_completion ly\n",
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
