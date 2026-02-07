import { describe, expect, test, beforeEach, vi } from "vitest";

// Mock modules at the top level
vi.mock("@/fetch/github", () => ({
  getPullRequestBranches: vi.fn(),
}));

vi.mock("@/fetch/vercel", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@inquirer/prompts", () => ({
  search: vi.fn(),
  checkbox: vi.fn(),
}));

// Import mocked modules
import { getPullRequestBranches } from "@/fetch/github";
import { getProjects } from "@/fetch/vercel";
import { search, checkbox } from "@inquirer/prompts";
import { pickBranchForCheck, pickProjectForRelease } from "@/prompts/vercel";

// Type definitions for mock options
interface SearchChoice {
  name: string;
  value: unknown;
  description?: string;
}

interface SearchMockOptions {
  message: string;
  source: (searchTerm: string) => Promise<SearchChoice[]>;
}

interface CheckboxChoice {
  name: string;
  value: unknown;
  checked?: boolean;
}

interface CheckboxMockOptions {
  message: string;
  loop: boolean;
  choices: CheckboxChoice[];
}

// Type-safe mock helper functions
type SearchMockImpl = (options: SearchMockOptions) => Promise<unknown>;
type CheckboxMockImpl = (options: CheckboxMockOptions) => Promise<unknown[]>;

type MockedSearch = ReturnType<typeof vi.fn> & typeof search;
type MockedCheckbox = ReturnType<typeof vi.fn> & typeof checkbox;

const mockSearchImpl = (impl: SearchMockImpl): void => {
  (search as MockedSearch).mockImplementation(impl as unknown as typeof search);
};

const mockCheckboxImpl = (impl: CheckboxMockImpl): void => {
  (checkbox as MockedCheckbox).mockImplementation(
    impl as unknown as typeof checkbox,
  );
};

const getMockedGetPullRequestBranches = (): ReturnType<typeof vi.fn> =>
  getPullRequestBranches as unknown as ReturnType<typeof vi.fn>;

const getMockedGetProjects = (): ReturnType<typeof vi.fn> =>
  getProjects as unknown as ReturnType<typeof vi.fn>;

describe("vercel-prompts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pickBranchForCheck", () => {
    const mockBranches = [
      { headRefName: "feature/auth", id: "1", title: "Add auth" },
      { headRefName: "feature/dashboard", id: "2", title: "Add dashboard" },
      { headRefName: "fix/login-bug", id: "3", title: "Fix login bug" },
    ];

    test("should call search with correct message and return selected branch", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockBranches);
      getMockedGetPullRequestBranches().mockReturnValue({ get: mockGet });

      const selectedBranch = mockBranches[0];
      mockSearchImpl(async (options) => {
        expect(options.message).toBe("Check which pull request?");
        await options.source("");
        return selectedBranch;
      });

      const result = await pickBranchForCheck();

      expect(result).toEqual(selectedBranch);
      expect(getPullRequestBranches).toHaveBeenCalled();
    });

    test("should filter branches by input", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockBranches);
      getMockedGetPullRequestBranches().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("feature");
        expect(choices).toHaveLength(2);
        expect(choices[0].name).toBe("Add auth");
        expect(choices[1].name).toBe("Add dashboard");
        return mockBranches[0];
      });

      await pickBranchForCheck();
    });

    test("should return all branches when input is empty", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockBranches);
      getMockedGetPullRequestBranches().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        expect(choices).toHaveLength(3);
        return mockBranches[0];
      });

      await pickBranchForCheck();
    });

    test("should cache branches result and not call get multiple times", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockBranches);
      getMockedGetPullRequestBranches().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        // First call
        await options.source("");
        // Second call - should use cached result
        await options.source("feature");
        // Third call - should still use cached result
        await options.source("fix");
        return mockBranches[0];
      });

      await pickBranchForCheck();

      // get should only be called once due to caching
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test("should map branches to correct choice format", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockBranches);
      getMockedGetPullRequestBranches().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        choices.forEach((choice, index) => {
          expect(choice).toMatchObject({
            name: mockBranches[index].title,
            value: mockBranches[index],
          });
        });
        return mockBranches[0];
      });

      await pickBranchForCheck();
    });
  });

  describe("pickProjectForRelease", () => {
    const mockProjects = [
      {
        id: "proj1",
        name: "project-alpha",
        link: {
          deployHooks: [
            { ref: "main", url: "https://api.vercel.com/hook1" },
            { ref: "staging", url: "https://api.vercel.com/hook2" },
          ],
        },
      },
      {
        id: "proj2",
        name: "project-beta",
        link: {
          deployHooks: [{ ref: "main", url: "https://api.vercel.com/hook3" }],
        },
      },
      {
        id: "proj3",
        name: "project-gamma",
        link: {
          deployHooks: [
            { ref: "staging", url: "https://api.vercel.com/hook4" },
          ],
        },
      },
    ];

    test("should call search to select branch and checkbox to select projects", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        expect(options.message).toBe("Release which project?");
        await options.source("");
        return "main";
      });

      const expectedDeployHooks = [
        {
          ref: "main",
          url: "https://api.vercel.com/hook1",
          projectName: "project-alpha",
        },
        {
          ref: "main",
          url: "https://api.vercel.com/hook3",
          projectName: "project-beta",
        },
      ];

      mockCheckboxImpl(async (options) => {
        expect(options.message).toBe("Release which project?");
        expect(options.loop).toBe(false);
        return expectedDeployHooks;
      });

      const result = await pickProjectForRelease();

      expect(result).toEqual(expectedDeployHooks);
      expect(getProjects).toHaveBeenCalled();
    });

    test("should build deployHooks map grouped by branch", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        // Should have 2 branches: main and staging
        expect(choices).toHaveLength(2);

        const mainChoice = choices.find((c) => c.name === "main");
        const stagingChoice = choices.find((c) => c.name === "staging");

        expect(mainChoice).toBeDefined();
        expect(mainChoice?.description).toBe("project-alpha, project-beta");

        expect(stagingChoice).toBeDefined();
        expect(stagingChoice?.description).toBe("project-alpha, project-gamma");

        return "main";
      });

      mockCheckboxImpl(async () => []);

      await pickProjectForRelease();
    });

    test("should filter branches by input (case-insensitive)", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        // Test case-insensitive filter
        const choices = await options.source("MAIN");
        expect(choices).toHaveLength(1);
        expect(choices[0].name).toBe("main");
        return "main";
      });

      mockCheckboxImpl(async () => []);

      await pickProjectForRelease();
    });

    test("should return all branches when input is empty", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        expect(choices).toHaveLength(2); // main and staging
        return "main";
      });

      mockCheckboxImpl(async () => []);

      await pickProjectForRelease();
    });

    test("should sort checkbox choices by project name", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        await options.source("");
        return "main";
      });

      mockCheckboxImpl(async (options) => {
        // Verify choices are sorted alphabetically
        expect(options.choices[0].name).toBe("project-alpha");
        expect(options.choices[1].name).toBe("project-beta");
        return [];
      });

      await pickProjectForRelease();
    });

    test("should set checked to true for all checkbox choices", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        await options.source("");
        return "main";
      });

      mockCheckboxImpl(async (options) => {
        options.choices.forEach((choice) => {
          expect(choice.checked).toBe(true);
        });
        return [];
      });

      await pickProjectForRelease();
    });

    test("should cache projects and map results", async () => {
      const mockGet = vi.fn().mockResolvedValue(mockProjects);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        // Call source multiple times
        await options.source("");
        await options.source("main");
        await options.source("staging");
        return "main";
      });

      mockCheckboxImpl(async () => []);

      await pickProjectForRelease();

      // get should only be called once due to caching
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test("should handle projects without link", async () => {
      const projectsWithNullLink = [
        ...mockProjects,
        {
          id: "proj4",
          name: "project-no-link",
          link: null,
        },
      ];

      const mockGet = vi.fn().mockResolvedValue(projectsWithNullLink);
      getMockedGetProjects().mockReturnValue({ get: mockGet });

      mockSearchImpl(async (options) => {
        const choices = await options.source("");
        // Should still only have 2 branches, project without link is skipped
        expect(choices).toHaveLength(2);
        return "main";
      });

      mockCheckboxImpl(async () => []);

      await pickProjectForRelease();
    });
  });
});
