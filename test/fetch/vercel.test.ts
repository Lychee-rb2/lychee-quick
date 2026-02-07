import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import {
  createVercelClient,
  getProjects,
  getDeployments,
  _resetClient,
} from "@/fetch/vercel";

// vi.hoisted ensures these are available when vi.mock factory runs
const {
  MockVercel,
  mockGetProjectsFn,
  mockGetDeploymentsFn,
  mockCacheGet,
  mockUpstashCache,
} = vi.hoisted(() => {
  const mockGetProjectsFn = vi.fn();
  const mockGetDeploymentsFn = vi.fn();
  const MockVercel = vi.fn(() => ({
    projects: { getProjects: mockGetProjectsFn },
    deployments: { getDeployments: mockGetDeploymentsFn },
  }));
  const mockCacheGet = vi.fn();
  const mockUpstashCache = vi.fn((_fetch: () => Promise<unknown>) => ({
    get: mockCacheGet,
    remove: vi.fn(),
  }));
  return {
    MockVercel,
    mockGetProjectsFn,
    mockGetDeploymentsFn,
    mockCacheGet,
    mockUpstashCache,
  };
});

vi.mock("@vercel/sdk", () => ({
  Vercel: MockVercel,
}));

vi.mock("@/help/redis.ts", () => ({
  upstashCache: mockUpstashCache,
}));

vi.mock("@/help/env", () => ({
  VERCEL_PERSONAL_TOKEN: vi.fn(() => "test-vercel-token"),
  VERCEL_TEAM: vi.fn(() => "team_test"),
}));

// Sample data matching the Project type after transformation
const mockProjects = [
  {
    id: "prj_1",
    name: "project-alpha",
    link: {
      deployHooks: [{ ref: "main", url: "https://api.vercel.com/hook/1" }],
    },
    targets: {
      production: { id: "target_prod_1" },
    },
  },
];

// Sample data matching the Deployment type after transformation
const mockDeployments = [
  {
    created: 1700000000000,
    buildingAt: 1700000001000,
    ready: 1700000060000,
    state: "READY",
    uid: "dpl_abc123",
    inspectorUrl: "https://vercel.com/inspect/abc123",
    meta: {
      githubCommitRef: "main",
      githubCommitMessage: "feat: add feature",
      branchAlias: "main",
      githubCommitSha: "abc123def",
    },
  },
];

describe("fetch/vercel", () => {
  let savedArgv: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    _resetClient();
    savedArgv = globalThis.Bun?.argv ?? [];
    globalThis.Bun = {
      ...globalThis.Bun,
      argv: ["bun", "run", "script.ts"],
    } as typeof Bun;
  });

  afterEach(() => {
    globalThis.Bun = { ...globalThis.Bun, argv: savedArgv } as typeof Bun;
  });

  describe("createVercelClient", () => {
    test("should create a Vercel client with correct token and timeout", () => {
      createVercelClient();

      expect(MockVercel).toHaveBeenCalledWith({
        bearerToken: "test-vercel-token",
        timeoutMs: 5000,
      });
    });

    test("should return the same instance on subsequent calls (singleton)", () => {
      const client1 = createVercelClient();
      const client2 = createVercelClient();

      expect(client1).toBe(client2);
      expect(MockVercel).toHaveBeenCalledTimes(1);
    });
  });

  describe("getProjects", () => {
    test("should return an object with empty project array and get method", () => {
      const result = getProjects();

      expect(result).toHaveProperty("project");
      expect(result).toHaveProperty("get");
      expect(result.project).toEqual([]);
      expect(typeof result.get).toBe("function");
    });

    test("should create upstashCache with a fetch function", () => {
      getProjects();

      expect(mockUpstashCache).toHaveBeenCalledWith(expect.any(Function));
    });

    test("get() should call cache.get with correct key and 30min cache time", async () => {
      mockCacheGet.mockResolvedValue(mockProjects);

      const projects = getProjects();
      await projects.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "vercel-team_test-projects",
        1000 * 60 * 30,
        false,
      );
    });

    test("get() should return project data from cache", async () => {
      mockCacheGet.mockResolvedValue(mockProjects);

      const projects = getProjects();
      const result = await projects.get();

      expect(result).toEqual(mockProjects);
    });

    test("get() should not re-fetch if project already has data", async () => {
      mockCacheGet.mockResolvedValue(mockProjects);

      const projects = getProjects();
      await projects.get();
      await projects.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(1);
    });

    test("get() should pass force=true when Bun.argv contains '-f'", async () => {
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      mockCacheGet.mockResolvedValue(mockProjects);

      const projects = getProjects();
      await projects.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "vercel-team_test-projects",
        1000 * 60 * 30,
        true,
      );
    });

    test("get() should reset and re-fetch when force flag is present", async () => {
      const updatedProjects = [{ ...mockProjects[0], name: "project-beta" }];
      mockCacheGet
        .mockResolvedValueOnce(mockProjects)
        .mockResolvedValueOnce(updatedProjects);

      const projects = getProjects();
      await projects.get();
      expect(mockCacheGet).toHaveBeenCalledTimes(1);

      // Set force flag and fetch again
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      const result = await projects.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(2);
      expect(result[0].name).toBe("project-beta");
    });

    test("upstashCache fetch function should transform project data correctly", async () => {
      getProjects();

      const fetchFn = mockUpstashCache.mock.calls[0]![0];

      // Mock raw Vercel SDK response with extra fields
      const rawResponse = {
        projects: [
          {
            id: "prj_1",
            name: "project-alpha",
            createdAt: 1234567890,
            updatedAt: 1234567890,
            link: {
              type: "github",
              deployHooks: [
                {
                  ref: "main",
                  url: "https://api.vercel.com/hook/1",
                  id: "hook_1",
                  name: "Production",
                },
              ],
            },
            targets: {
              production: {
                id: "target_prod_1",
                alias: ["prod.example.com"],
              },
            },
          },
          {
            id: "prj_2",
            name: "project-no-link",
            link: null,
          },
        ],
      };
      mockGetProjectsFn.mockResolvedValue(rawResponse);

      const result = await fetchFn();

      // Should filter out project without link
      expect(result).toHaveLength(1);
      // Should only have picked fields
      expect(result[0]).toEqual({
        id: "prj_1",
        name: "project-alpha",
        link: {
          deployHooks: [{ ref: "main", url: "https://api.vercel.com/hook/1" }],
        },
        targets: {
          production: { id: "target_prod_1" },
        },
      });
    });

    test("upstashCache fetch function should call SDK with teamId", async () => {
      getProjects();

      const fetchFn = mockUpstashCache.mock.calls[0]![0];

      mockGetProjectsFn.mockResolvedValue({ projects: [] });
      await fetchFn();

      expect(mockGetProjectsFn).toHaveBeenCalledWith({ teamId: "team_test" });
    });
  });

  describe("getDeployments", () => {
    test("should return an object with empty deployments array and get method", () => {
      const result = getDeployments("main", "abc123");

      expect(result).toHaveProperty("deployments");
      expect(result).toHaveProperty("get");
      expect(result.deployments).toEqual([]);
      expect(typeof result.get).toBe("function");
    });

    test("should create upstashCache with a fetch function", () => {
      getDeployments("main", "abc123");

      expect(mockUpstashCache).toHaveBeenCalledWith(expect.any(Function));
    });

    test("get() should call cache.get with correct key and 1min cache time", async () => {
      mockCacheGet.mockResolvedValue(mockDeployments);

      const deps = getDeployments("feature-branch", "sha456");
      await deps.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "vercel-team_test-feature-branch-deployments",
        1000 * 60,
        false,
      );
    });

    test("get() should return deployment data from cache", async () => {
      mockCacheGet.mockResolvedValue(mockDeployments);

      const deps = getDeployments("main", "abc123");
      const result = await deps.get();

      expect(result).toEqual(mockDeployments);
    });

    test("get() should not re-fetch if deployments already has data", async () => {
      mockCacheGet.mockResolvedValue(mockDeployments);

      const deps = getDeployments("main", "abc123");
      await deps.get();
      await deps.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(1);
    });

    test("get() should pass force=true when Bun.argv contains '-f'", async () => {
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      mockCacheGet.mockResolvedValue(mockDeployments);

      const deps = getDeployments("main", "abc123");
      await deps.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "vercel-team_test-main-deployments",
        1000 * 60,
        true,
      );
    });

    test("get() should reset and re-fetch when force flag is present", async () => {
      const updatedDeployments = [{ ...mockDeployments[0], state: "BUILDING" }];
      mockCacheGet
        .mockResolvedValueOnce(mockDeployments)
        .mockResolvedValueOnce(updatedDeployments);

      const deps = getDeployments("main", "abc123");
      await deps.get();
      expect(mockCacheGet).toHaveBeenCalledTimes(1);

      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      const result = await deps.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(2);
      expect(result[0].state).toBe("BUILDING");
    });

    test("upstashCache fetch function should transform deployment data correctly", async () => {
      getDeployments("main", "abc123");

      const fetchFn = mockUpstashCache.mock.calls[0]![0];

      // Mock raw Vercel SDK response with extra fields
      const rawResponse = {
        deployments: [
          {
            created: 1700000000000,
            buildingAt: 1700000001000,
            ready: 1700000060000,
            state: "READY",
            uid: "dpl_abc123",
            inspectorUrl: "https://vercel.com/inspect/abc123",
            name: "deployment-name",
            url: "deployment.vercel.app",
            meta: {
              githubCommitRef: "main",
              githubCommitMessage: "feat: add feature",
              branchAlias: "main",
              githubCommitSha: "abc123def",
              githubCommitAuthorLogin: "user1",
              githubOrg: "test-org",
              githubRepo: "test-repo",
            },
          },
        ],
      };
      mockGetDeploymentsFn.mockResolvedValue(rawResponse);

      const result = await fetchFn();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        created: 1700000000000,
        buildingAt: 1700000001000,
        ready: 1700000060000,
        state: "READY",
        uid: "dpl_abc123",
        inspectorUrl: "https://vercel.com/inspect/abc123",
        meta: {
          githubCommitRef: "main",
          githubCommitMessage: "feat: add feature",
          branchAlias: "main",
          githubCommitSha: "abc123def",
        },
      });
      // Verify extra fields are not included
      expect(result[0]).not.toHaveProperty("name");
      expect(result[0]).not.toHaveProperty("url");
      expect(result[0].meta).not.toHaveProperty("githubCommitAuthorLogin");
      expect(result[0].meta).not.toHaveProperty("githubOrg");
    });

    test("upstashCache fetch function should call SDK with teamId, branch and sha", async () => {
      getDeployments("feature-x", "sha789");

      const fetchFn = mockUpstashCache.mock.calls[0]![0];

      mockGetDeploymentsFn.mockResolvedValue({ deployments: [] });
      await fetchFn();

      expect(mockGetDeploymentsFn).toHaveBeenCalledWith({
        teamId: "team_test",
        branch: "feature-x",
        sha: "sha789",
      });
    });
  });
});
