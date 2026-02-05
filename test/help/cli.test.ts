import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { cli, gitShowRef } from "@/help/cli";

// Mock modules (must be called before imports)
vi.mock("@/help/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import mocked modules
import { logger } from "@/help/logger";

// Type definitions for mocks
type MockedLogger = {
  info: MockedFunction<typeof logger.info>;
  error: MockedFunction<typeof logger.error>;
  debug: MockedFunction<typeof logger.debug>;
};

type MockedBun = typeof Bun & {
  spawnSync: ReturnType<typeof vi.fn>;
};

// Helper function to safely cast logger to MockedLogger
const getMockedLogger = (): MockedLogger => {
  return logger as unknown as MockedLogger;
};

// Mock Bun API
const mockSpawnSync = vi.fn();

// Setup Bun mock before tests
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Override Bun methods and properties directly
  // Bun is already defined in test/setup.ts, so we modify its properties
  if (globalThis.Bun) {
    const bun = globalThis.Bun as unknown as MockedBun;
    bun.spawnSync = mockSpawnSync;
  }
});

describe("cli helper functions", () => {
  describe("cli", () => {
    test("should return process object when command succeeds", () => {
      const mockProc = {
        success: true,
        stdout: new TextEncoder().encode("output"),
        stderr: new TextEncoder().encode(""),
      };
      mockSpawnSync.mockReturnValue(mockProc);

      const result = cli(["echo", "test"]);

      expect(result).toBe(mockProc);
      expect(mockSpawnSync).toHaveBeenCalledWith(["echo", "test"]);
    });

    test("should throw error and log when command fails", () => {
      const stderrBuffer = new TextEncoder().encode("command failed");
      // Create a buffer-like object with toString method
      const mockStderr = {
        ...stderrBuffer,
        toString: () => "command failed",
      };
      const mockProc = {
        success: false,
        stdout: new TextEncoder().encode(""),
        stderr: mockStderr,
      };
      mockSpawnSync.mockReturnValue(mockProc);

      expect(() => cli(["invalid", "command"])).toThrow("command failed");
      expect(mockSpawnSync).toHaveBeenCalledWith(["invalid", "command"]);
      expect(getMockedLogger().error).toHaveBeenCalledWith([
        "invalid",
        "command",
      ]);
    });
  });

  describe("gitShowRef", () => {
    test("should return trimmed output when ref exists", () => {
      const stdoutBuffer = new TextEncoder().encode(
        "21f0a29e3f34abe6bfc99184489455084d831a75 refs/heads/main\n",
      );
      const mockProc = {
        success: true,
        stdout: stdoutBuffer,
        stderr: new TextEncoder().encode(""),
      };
      mockSpawnSync.mockReturnValue(mockProc);

      const result = gitShowRef("refs/heads/main");

      expect(result).toBe(
        "21f0a29e3f34abe6bfc99184489455084d831a75 refs/heads/main",
      );
      expect(mockSpawnSync).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/main",
      ]);
    });

    test("should return empty string when ref does not exist", () => {
      const mockProc = {
        success: false,
        stdout: new TextEncoder().encode(""),
        stderr: new TextEncoder().encode(""),
      };
      mockSpawnSync.mockReturnValue(mockProc);

      const result = gitShowRef("refs/heads/non-existent");

      expect(result).toBe("");
      expect(mockSpawnSync).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/non-existent",
      ]);
      expect(getMockedLogger().error).not.toHaveBeenCalled();
    });

    test("should throw error when command fails with stderr output", () => {
      const stderrBuffer = new TextEncoder().encode("git error message");
      const mockProc = {
        success: false,
        stdout: new TextEncoder().encode("some output"),
        stderr: stderrBuffer,
      };
      mockSpawnSync.mockReturnValue(mockProc);

      expect(() => gitShowRef("refs/heads/test")).toThrow("git error message");
      expect(mockSpawnSync).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/test",
      ]);
      expect(getMockedLogger().error).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/test",
      ]);
    });

    test("should handle whitespace-only output", () => {
      const stdoutBuffer = new TextEncoder().encode("   \n\t  \n");
      const mockProc = {
        success: true,
        stdout: stdoutBuffer,
        stderr: new TextEncoder().encode(""),
      };
      mockSpawnSync.mockReturnValue(mockProc);

      const result = gitShowRef("refs/heads/test");

      expect(result).toBe("");
      expect(mockSpawnSync).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/test",
      ]);
    });
  });
});
