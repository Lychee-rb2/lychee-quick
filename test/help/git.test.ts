import {
  describe,
  expect,
  test,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { findNextBranch } from "@/help/git";

// Mock modules (must be called before imports)
vi.mock("@/help/io", () => ({
  cli: vi.fn(),
}));

// Import mocked modules
import { cli } from "@/help/io";

// Type definitions for mocks
type MockedCli = MockedFunction<typeof cli>;

// Helper function to safely cast cli to MockedCli
const getMockedCli = (): MockedCli => {
  return cli as unknown as MockedCli;
};

// Helper function to create mock process object
const createMockProc = (stdout: string): ReturnType<typeof cli> => {
  const stdoutBuffer = new TextEncoder().encode(stdout);
  // Create a buffer-like object with toString method that returns the original string
  const mockStdout = {
    ...stdoutBuffer,
    toString: () => stdout,
  };
  return {
    success: true,
    stdout: mockStdout,
    stderr: new TextEncoder().encode(""),
    exitCode: 0,
    resourceUsage: {
      userCPUTime: 0,
      systemCPUTime: 0,
      peakMemoryUsage: 0,
    },
  } as unknown as ReturnType<typeof cli>;
};

describe("git helper functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findNextBranch", () => {
    test("should return branch name when branch does not exist", async () => {
      const mockCli = getMockedCli();
      const mockProc = createMockProc("");
      mockCli.mockReturnValue(mockProc);

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
      expect(mockCli).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/my-branch",
      ]);
    });

    test("should return branch-2 when branch exists but branch-2 does not", async () => {
      const mockCli = getMockedCli();
      let callCount = 0;
      mockCli.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: branch exists
          return createMockProc("abc123def456 refs/heads/my-branch\n");
        } else {
          // Second call: branch-2 does not exist
          return createMockProc("");
        }
      });

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch-2");
      expect(mockCli).toHaveBeenCalledTimes(2);
      expect(mockCli).toHaveBeenNthCalledWith(1, [
        "git",
        "show-ref",
        "refs/heads/my-branch",
      ]);
      expect(mockCli).toHaveBeenNthCalledWith(2, [
        "git",
        "show-ref",
        "refs/heads/my-branch-2",
      ]);
    });

    test("should return branch-4 when branch, branch-2, and branch-3 all exist", async () => {
      const mockCli = getMockedCli();
      let callCount = 0;
      mockCli.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          // First three calls: branches exist
          return createMockProc(
            `abc123def456 refs/heads/my-branch${callCount > 1 ? `-${callCount}` : ""}\n`,
          );
        } else {
          // Fourth call: branch-4 does not exist
          return createMockProc("");
        }
      });

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch-4");
      expect(mockCli).toHaveBeenCalledTimes(4);
      expect(mockCli).toHaveBeenNthCalledWith(1, [
        "git",
        "show-ref",
        "refs/heads/my-branch",
      ]);
      expect(mockCli).toHaveBeenNthCalledWith(2, [
        "git",
        "show-ref",
        "refs/heads/my-branch-2",
      ]);
      expect(mockCli).toHaveBeenNthCalledWith(3, [
        "git",
        "show-ref",
        "refs/heads/my-branch-3",
      ]);
      expect(mockCli).toHaveBeenNthCalledWith(4, [
        "git",
        "show-ref",
        "refs/heads/my-branch-4",
      ]);
    });

    test("should start from specified version when version parameter is provided", async () => {
      const mockCli = getMockedCli();
      let callCount = 0;
      mockCli.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: branch-2 exists
          return createMockProc("abc123def456 refs/heads/my-branch-2\n");
        } else {
          // Second call: branch-3 does not exist
          return createMockProc("");
        }
      });

      const result = await findNextBranch("my-branch", 2);

      expect(result).toBe("my-branch-3");
      expect(mockCli).toHaveBeenCalledTimes(2);
      expect(mockCli).toHaveBeenNthCalledWith(1, [
        "git",
        "show-ref",
        "refs/heads/my-branch-2",
      ]);
      expect(mockCli).toHaveBeenNthCalledWith(2, [
        "git",
        "show-ref",
        "refs/heads/my-branch-3",
      ]);
    });

    test("should use default version 1 when version parameter is not provided", async () => {
      const mockCli = getMockedCli();
      const mockProc = createMockProc("");
      mockCli.mockReturnValue(mockProc);

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
      expect(mockCli).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/my-branch",
      ]);
      // Should not be called with branch-1
      expect(mockCli).not.toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/my-branch-1",
      ]);
    });

    test("should treat whitespace-only output as branch not existing", async () => {
      const mockCli = getMockedCli();
      const mockProc = createMockProc("   \n\t  \n");
      mockCli.mockReturnValue(mockProc);

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
      expect(mockCli).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/my-branch",
      ]);
    });

    test("should handle empty string output", async () => {
      const mockCli = getMockedCli();
      const mockProc = createMockProc("");
      mockCli.mockReturnValue(mockProc);

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
    });

    test("should handle branch names with special characters", async () => {
      const mockCli = getMockedCli();
      const mockProc = createMockProc("");
      mockCli.mockReturnValue(mockProc);

      const result = await findNextBranch("feature/my-branch");

      expect(result).toBe("feature/my-branch");
      expect(mockCli).toHaveBeenCalledWith([
        "git",
        "show-ref",
        "refs/heads/feature/my-branch",
      ]);
    });

    test("should handle recursive calls correctly", async () => {
      const mockCli = getMockedCli();
      let callCount = 0;
      mockCli.mockImplementation(() => {
        callCount++;
        // All branches exist until branch-5
        if (callCount <= 4) {
          return createMockProc(
            `abc123 refs/heads/my-branch${callCount > 1 ? `-${callCount}` : ""}\n`,
          );
        } else {
          // branch-5 does not exist
          return createMockProc("");
        }
      });

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch-5");
      expect(mockCli).toHaveBeenCalledTimes(5);
    });
  });
});
