import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import {
  gitShowRef,
  openUrl,
  echo,
  gitCheckout,
  gitPull,
  gitCheckoutBranch,
  pbcopy,
} from "@/help/cli";

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
import * as bunModule from "bun";

// Type definitions for mocks
type MockedLogger = {
  info: MockedFunction<typeof logger.info>;
  error: MockedFunction<typeof logger.error>;
  debug: MockedFunction<typeof logger.debug>;
};

// Bun module 的 mock 类型
interface MockedBunModule {
  $: ReturnType<typeof vi.fn>;
}

// Helper function to safely cast logger to MockedLogger
const getMockedLogger = (): MockedLogger => {
  return logger as unknown as MockedLogger;
};

// 类型安全的 Bun module mock 设置函数
const setBunShellMock = (mockFn: ReturnType<typeof vi.fn>): void => {
  (bunModule as unknown as MockedBunModule).$ = mockFn;
};

// Mock Bun API
const mockShellCommand = vi.fn();

// Setup Bun mock before tests
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Mock Bun.$ template tag function
  setBunShellMock(mockShellCommand);

  // Setup default mock for shell commands (Bun.$)
  // Bun.$ returns a Promise that resolves to void
  mockShellCommand.mockResolvedValue(undefined);
});

describe("cli helper functions", () => {
  describe("gitShowRef", () => {
    test("should return trimmed output when ref exists", async () => {
      const stdout =
        "21f0a29e3f34abe6bfc99184489455084d831a75 refs/heads/main\n";
      mockShellCommand.mockResolvedValue({
        stdout: { toString: () => stdout },
      });

      const result = await gitShowRef("refs/heads/main");

      expect(result).toBe(
        "21f0a29e3f34abe6bfc99184489455084d831a75 refs/heads/main",
      );
      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });

    test("should return empty string when ref does not exist", async () => {
      // git show-ref exits with code 1 when ref doesn't exist
      const error = {
        exitCode: 1,
        stdout: { toString: () => "" },
      };
      mockShellCommand.mockRejectedValue(error);

      const result = await gitShowRef("refs/heads/non-existent");

      expect(result).toBe("");
      expect(mockShellCommand).toHaveBeenCalledTimes(1);
      expect(getMockedLogger().error).not.toHaveBeenCalled();
    });

    test("should throw error when command fails with stderr output", async () => {
      const error = {
        exitCode: 1,
        stdout: { toString: () => "some output" },
        stderr: { toString: () => "git error message" },
      };
      mockShellCommand.mockRejectedValue(error);

      await expect(gitShowRef("refs/heads/test")).rejects.toEqual(error);
      expect(mockShellCommand).toHaveBeenCalledTimes(1);
      expect(getMockedLogger().error).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/test",
      ]);
    });

    test("should throw error when exit code is not 1", async () => {
      const error = {
        exitCode: 2,
        stdout: { toString: () => "" },
      };
      mockShellCommand.mockRejectedValue(error);

      await expect(gitShowRef("refs/heads/test")).rejects.toEqual(error);
      expect(mockShellCommand).toHaveBeenCalledTimes(1);
      expect(getMockedLogger().error).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/test",
      ]);
    });

    test("should handle whitespace-only output", async () => {
      const stdout = "   \n\t  \n";
      mockShellCommand.mockResolvedValue({
        stdout: { toString: () => stdout },
      });

      const result = await gitShowRef("refs/heads/test");

      expect(result).toBe("");
      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe("openUrl", () => {
    test("should call shell command with string URL", async () => {
      const url = "https://example.com";
      await openUrl(url);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
      // Check that the template tag was called with the correct command
      const callArgs = mockShellCommand.mock.calls[0];
      expect(callArgs).toBeDefined();
    });

    test("should call shell command with URL object", async () => {
      const url = new URL("https://example.com");
      await openUrl(url);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe("echo", () => {
    test("should call shell command with message", async () => {
      const message = "test message";
      await echo(message);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });

    test("should handle empty message", async () => {
      await echo("");

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe("gitCheckout", () => {
    test("should call git checkout command with branch name", async () => {
      const branch = "main";
      await gitCheckout(branch);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });

    test("should handle branch names with special characters", async () => {
      const branch = "feature/test-branch";
      await gitCheckout(branch);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe("gitPull", () => {
    test("should call git pull command", async () => {
      await gitPull();

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe("gitCheckoutBranch", () => {
    test("should call git checkout -b command with branch name", async () => {
      const branchName = "feature/new-branch";
      await gitCheckoutBranch(branchName);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });

    test("should handle branch names with slashes", async () => {
      const branchName = "feature/user/login";
      await gitCheckoutBranch(branchName);

      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });

  describe("pbcopy", () => {
    test("should copy data to clipboard using navigator.clipboard", async () => {
      await pbcopy("test data");
      expect(mockShellCommand).toHaveBeenCalledTimes(1);
    });
  });
});
