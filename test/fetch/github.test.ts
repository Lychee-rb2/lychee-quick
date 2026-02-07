import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createClient, getPullRequestBranches, _resetClient } from "@/fetch/github";

// vi.hoisted ensures these are available when vi.mock factory runs
const {
  mockGetSdk,
  mockSdk,
  MockGraphQLClient,
  mockCacheGet,
  mockUpstashCache,
} = vi.hoisted(() => {
  const mockPullRequestFn = vi.fn();
  const mockSdk = { pullRequest: mockPullRequestFn };
  const mockGetSdk = vi.fn(() => mockSdk);
  const MockGraphQLClient = vi.fn();
  const mockCacheGet = vi.fn();
  const mockUpstashCache = vi.fn(() => ({
    get: mockCacheGet,
    remove: vi.fn(),
  }));
  return {
    mockGetSdk,
    mockSdk,
    MockGraphQLClient,
    mockCacheGet,
    mockUpstashCache,
  };
});

vi.mock("@/graphql/github/client.ts", () => ({
  getSdk: mockGetSdk,
}));

vi.mock("graphql-request", () => ({
  GraphQLClient: MockGraphQLClient,
}));

vi.mock("@/help/redis.ts", () => ({
  upstashCache: mockUpstashCache,
}));

vi.mock("@/help/env", () => ({
  GIT_TOKEN: vi.fn(() => "test-github-token"),
  GIT_ORGANIZATION: vi.fn(() => "test-org"),
  GIT_REPO: vi.fn(() => "test-repo"),
}));

const mockPullRequests = [
  {
    title: "Add feature A",
    url: "https://github.com/test-org/test-repo/pull/1",
    headRefName: "feature-a",
    headRefOid: "abc123",
  },
  {
    title: "Fix bug B",
    url: "https://github.com/test-org/test-repo/pull/2",
    headRefName: "fix-bug-b",
    headRefOid: "def456",
  },
];

describe("fetch/github", () => {
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

  describe("createClient", () => {
    test("should create a GraphQL client with correct endpoint and auth header", () => {
      createClient();

      expect(MockGraphQLClient).toHaveBeenCalledWith(
        "https://api.github.com/graphql",
        { headers: { Authorization: "bearer test-github-token" } },
      );
    });

    test("should pass GraphQLClient instance to getSdk", () => {
      const mockClientInstance = {};
      MockGraphQLClient.mockReturnValue(mockClientInstance);

      createClient();

      expect(mockGetSdk).toHaveBeenCalledWith(mockClientInstance);
    });

    test("should return the same instance on subsequent calls (singleton)", () => {
      const client1 = createClient();
      const client2 = createClient();

      expect(client1).toBe(client2);
      expect(mockGetSdk).toHaveBeenCalledTimes(1);
    });

    test("should return the SDK instance from getSdk", () => {
      const client = createClient();

      expect(client).toBe(mockSdk);
    });
  });

  describe("getPullRequestBranches", () => {
    test("should return an object with pullRequest array and get method", () => {
      const result = getPullRequestBranches();

      expect(result).toHaveProperty("pullRequest");
      expect(result).toHaveProperty("get");
      expect(Array.isArray(result.pullRequest)).toBe(true);
      expect(result.pullRequest).toHaveLength(0);
      expect(typeof result.get).toBe("function");
    });

    test("should create upstashCache with a fetch function", () => {
      getPullRequestBranches();

      expect(mockUpstashCache).toHaveBeenCalledWith(expect.any(Function));
    });

    test("get() should call cache.get with correct key and cache time", async () => {
      mockCacheGet.mockResolvedValue(mockPullRequests);

      const branches = getPullRequestBranches();
      await branches.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "github-test-org-test-repo-pr-branches",
        1000 * 60,
        false,
      );
    });

    test("get() should return pull request data from cache", async () => {
      mockCacheGet.mockResolvedValue(mockPullRequests);

      const branches = getPullRequestBranches();
      const result = await branches.get();

      expect(result).toEqual(mockPullRequests);
    });

    test("get() should not re-fetch if pullRequest already has data", async () => {
      mockCacheGet.mockResolvedValue(mockPullRequests);

      const branches = getPullRequestBranches();
      await branches.get(); // first call - fetches from cache
      await branches.get(); // second call - should use existing data

      expect(mockCacheGet).toHaveBeenCalledTimes(1);
    });

    test("get() should pass force=true when Bun.argv contains '-f'", async () => {
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      mockCacheGet.mockResolvedValue(mockPullRequests);

      const branches = getPullRequestBranches();
      await branches.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "github-test-org-test-repo-pr-branches",
        1000 * 60,
        true,
      );
    });

    test("get() should reset pullRequest and re-fetch when force flag is present", async () => {
      const updatedPullRequests = [
        { ...mockPullRequests[0], title: "Updated PR" },
      ];
      mockCacheGet
        .mockResolvedValueOnce(mockPullRequests)
        .mockResolvedValueOnce(updatedPullRequests);

      const branches = getPullRequestBranches();

      // First call without force
      await branches.get();
      expect(mockCacheGet).toHaveBeenCalledTimes(1);

      // Second call with force flag - should re-fetch
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      const result = await branches.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(2);
      expect(result[0].title).toBe("Updated PR");
    });

    test("upstashCache fetch function should call client.pullRequest with correct params", async () => {
      getPullRequestBranches();

      // Get the fetch function passed to upstashCache
      const fetchFn = mockUpstashCache.mock.calls[0][0];

      // Mock the response from client.pullRequest
      const mockResponse = {
        repository: {
          pullRequests: {
            nodes: mockPullRequests,
          },
        },
      };
      mockSdk.pullRequest.mockResolvedValue(mockResponse);

      const result = await fetchFn();

      expect(mockSdk.pullRequest).toHaveBeenCalledWith({
        owner: "test-org",
        name: "test-repo",
      });
      expect(result).toEqual(mockPullRequests);
    });
  });
});
