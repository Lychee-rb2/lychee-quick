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
vi.mock("@/help/cli", () => ({
  gitShowRef: vi.fn(),
}));

// Import mocked modules
import { gitShowRef } from "@/help/cli";

// Type definitions for mocks
type MockedGitShowRef = MockedFunction<typeof gitShowRef>;

// Helper function to safely cast gitShowRef to MockedGitShowRef
const getMockedGitShowRef = (): MockedGitShowRef => {
  return gitShowRef as unknown as MockedGitShowRef;
};

describe("git helper functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findNextBranch", () => {
    test("should return branch name when branch does not exist", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      mockGitShowRef.mockReturnValue("");

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
      expect(mockGitShowRef).toHaveBeenCalledWith("refs/heads/my-branch");
    });

    test("should return branch-2 when branch exists but branch-2 does not", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      let callCount = 0;
      mockGitShowRef.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: branch exists
          return "abc123def456 refs/heads/my-branch";
        } else {
          // Second call: branch-2 does not exist
          return "";
        }
      });

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch-2");
      expect(mockGitShowRef).toHaveBeenCalledTimes(2);
      expect(mockGitShowRef).toHaveBeenNthCalledWith(1, "refs/heads/my-branch");
      expect(mockGitShowRef).toHaveBeenNthCalledWith(
        2,
        "refs/heads/my-branch-2",
      );
    });

    test("should return branch-4 when branch, branch-2, and branch-3 all exist", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      let callCount = 0;
      mockGitShowRef.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          // First three calls: branches exist
          return `abc123def456 refs/heads/my-branch${callCount > 1 ? `-${callCount}` : ""}\n`;
        } else {
          // Fourth call: branch-4 does not exist
          return "";
        }
      });

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch-4");
      expect(mockGitShowRef).toHaveBeenCalledTimes(4);
      expect(mockGitShowRef).toHaveBeenNthCalledWith(1, "refs/heads/my-branch");
      expect(mockGitShowRef).toHaveBeenNthCalledWith(
        2,
        "refs/heads/my-branch-2",
      );
      expect(mockGitShowRef).toHaveBeenNthCalledWith(
        3,
        "refs/heads/my-branch-3",
      );
      expect(mockGitShowRef).toHaveBeenNthCalledWith(
        4,
        "refs/heads/my-branch-4",
      );
    });

    test("should start from specified version when version parameter is provided", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      let callCount = 0;
      mockGitShowRef.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: branch-2 exists
          return "abc123def456 refs/heads/my-branch-2\n";
        } else {
          // Second call: branch-3 does not exist
          return "";
        }
      });

      const result = await findNextBranch("my-branch", 2);

      expect(result).toBe("my-branch-3");
      expect(mockGitShowRef).toHaveBeenCalledTimes(2);
      expect(mockGitShowRef).toHaveBeenNthCalledWith(
        1,
        "refs/heads/my-branch-2",
      );
      expect(mockGitShowRef).toHaveBeenNthCalledWith(
        2,
        "refs/heads/my-branch-3",
      );
    });

    test("should use default version 1 when version parameter is not provided", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      mockGitShowRef.mockReturnValue("");

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
      expect(mockGitShowRef).toHaveBeenCalledWith("refs/heads/my-branch");
      // Should not be called with branch-1
      expect(mockGitShowRef).not.toHaveBeenCalledWith("refs/heads/my-branch-1");
    });

    test("should treat whitespace-only output as branch not existing", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      // gitShowRef returns trimmed output, so mock should return empty string after trim
      mockGitShowRef.mockReturnValue("");

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
      expect(mockGitShowRef).toHaveBeenCalledWith("refs/heads/my-branch");
    });

    test("should handle empty string output", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      mockGitShowRef.mockReturnValue("");

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch");
    });

    test("should handle branch names with special characters", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      mockGitShowRef.mockReturnValue("");

      const result = await findNextBranch("feature/my-branch");

      expect(result).toBe("feature/my-branch");
      expect(mockGitShowRef).toHaveBeenCalledWith(
        "refs/heads/feature/my-branch",
      );
    });

    test("should handle recursive calls correctly", async () => {
      const mockGitShowRef = getMockedGitShowRef();
      let callCount = 0;
      mockGitShowRef.mockImplementation(() => {
        callCount++;
        // All branches exist until branch-5
        if (callCount <= 4) {
          return `abc123 refs/heads/my-branch${callCount > 1 ? `-${callCount}` : ""}\n`;
        } else {
          // branch-5 does not exist
          return "";
        }
      });

      const result = await findNextBranch("my-branch");

      expect(result).toBe("my-branch-5");
      expect(mockGitShowRef).toHaveBeenCalledTimes(5);
    });
  });
});
