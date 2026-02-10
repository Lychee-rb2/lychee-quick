import installCli, {
  cleanOldCliLink,
  linkCli,
  rewritePackageJson,
} from "@/scripts/utils/installCli";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("@/i18n", () => ({
  t: vi.fn((key: string) => key),
}));

const mockWrite = vi.fn();
const mockFile = vi.fn();
const mockShell = vi.fn();
const mockConsoleLog = vi.fn();
describe("installCli", () => {
  globalThis.Bun.write = mockWrite as unknown as typeof Bun.write;
  globalThis.Bun.file = mockFile as unknown as typeof Bun.file;
  globalThis.Bun.$ = mockShell as unknown as typeof Bun.$;
  globalThis.console = {
    ...globalThis.console,
    log: mockConsoleLog,
    error: mockConsoleLog,
  } as unknown as Console;

  afterEach(() => {
    mockWrite.mockReset();
    mockFile.mockReset();
    mockShell.mockReset();
  });
  describe("cleanOldCliLink", () => {
    test("clean old cli link", async () => {
      mockShell.mockReturnValue({
        quiet: () => ({ text: () => Promise.resolve(`/test/old`) }),
      });
      const result = await cleanOldCliLink("old", "new");
      expect(mockShell).toHaveBeenCalledTimes(2);
      expect(mockShell).toHaveBeenCalledWith(["which ", ""], "old");
      expect(mockShell).toHaveBeenCalledWith(["rm -f ", ""], "/test/old");
      expect(result).toBe(1);
    });
    test("no action if old name is the same as new name", async () => {
      await cleanOldCliLink("new", "new");
      expect(mockShell).not.toHaveBeenCalled();
    });
    test("no action if old name is not found", async () => {
      mockShell.mockReturnValue({
        quiet: () => ({
          text: () => {
            throw new Error("Not found");
          },
        }),
      });
      await cleanOldCliLink("non-existent-path", "new");
      expect(mockShell).toHaveBeenCalledWith(
        ["which ", ""],
        "non-existent-path",
      );
    });
    test("remove fail", async () => {
      const quiet = vi
        .fn()
        .mockReturnValueOnce({
          text: vi.fn().mockResolvedValue(`/test/old`),
        })
        .mockRejectedValue(new Error("Remove failed"));
      mockShell.mockReturnValue({ quiet });
      const result = await cleanOldCliLink("old", "new");
      expect(result).toBe(0);
      expect(mockShell).toHaveBeenCalledWith(["which ", ""], "old");
      expect(mockShell).toHaveBeenCalledWith(["rm -f ", ""], "/test/old");
    });
  });

  describe("rewritePackageJson", () => {
    test("rewrite package.json", async () => {
      await rewritePackageJson("new", "/test/package.json", {
        bin: { old: "./bin.ts" },
      });
      expect(mockWrite).toHaveBeenCalledWith(
        "/test/package.json",
        JSON.stringify({ bin: { new: "./bin.ts" } }, null, 2),
      );
    });
    test("no action if bin is the same", async () => {
      await rewritePackageJson("new", "/test/package.json", {
        bin: { new: "./bin.ts" },
      });
      expect(mockWrite).not.toHaveBeenCalled();
    });
    test("throw error if write failed", async () => {
      mockWrite.mockRejectedValue(new Error("Write failed"));
      await expect(
        rewritePackageJson("new", "/test/package.json", {
          bin: { old: "./bin.ts" },
        }),
      ).rejects.toThrow("Write failed");
    });
  });
  describe("linkCli", () => {
    test("link cli", async () => {
      mockShell.mockReturnValue({
        quiet: () => ({ text: vi.fn().mockResolvedValue(0) }),
      });
      await linkCli();
      expect(mockShell).toHaveBeenCalledWith(["bun link"]);
    });
    test("throw error if link failed", async () => {
      mockShell.mockReturnValue({
        quiet: vi.fn().mockRejectedValue(new Error("Link failed")),
      });
      await expect(linkCli()).rejects.toThrow("Link failed");
    });
  });
  describe("installCli", () => {
    test("install cli", async () => {
      mockFile.mockReturnValue({
        json: vi.fn().mockResolvedValue({ bin: { old: "./bin.ts" } }),
      });
      mockShell.mockReturnValue({
        quiet: () => ({ text: vi.fn().mockResolvedValue(0) }),
      });
      const result = await installCli("/root");
      expect(result).toBe(1);
    });
    test("no bin before install", async () => {
      mockFile.mockReturnValue({ json: vi.fn().mockResolvedValue({}) });
      mockShell.mockReturnValue({
        quiet: () => ({ text: vi.fn().mockResolvedValue(0) }),
      });
      const result = await installCli("/root");
      expect(result).toBe(1);
    });
  });
});
