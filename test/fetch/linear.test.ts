import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createClient, getIssues, _resetClient } from "@/fetch/linear";

// vi.hoisted ensures these are available when vi.mock factory runs
const {
  mockGetSdk,
  mockSdk,
  MockGraphQLClient,
  mockCacheGet,
  mockUpstashCache,
} = vi.hoisted(() => {
  const mockIssuesFn = vi.fn();
  const mockSdk = { issues: mockIssuesFn };
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

vi.mock("@/graphql/linear/client.ts", () => ({
  getSdk: mockGetSdk,
}));

vi.mock("graphql-request", () => ({
  GraphQLClient: MockGraphQLClient,
}));

vi.mock("@/help/redis.ts", () => ({
  upstashCache: mockUpstashCache,
}));

vi.mock("@/help/env", () => ({
  LINEAR_API_KEY: vi.fn(() => "lin_api_test_key"),
  LINEAR_TEAM: vi.fn(() => "TEST_TEAM"),
}));

const mockIssues = [
  {
    id: "issue-1",
    title: "Fix login bug",
    identifier: "TEST-1",
    branchName: "fix/login-bug",
    attachments: { nodes: [] },
  },
  {
    id: "issue-2",
    title: "Add dark mode",
    identifier: "TEST-2",
    branchName: "feat/dark-mode",
    attachments: { nodes: [] },
  },
];

describe("fetch/linear", () => {
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
        "https://api.linear.app/graphql",
        { headers: { Authorization: "lin_api_test_key" } },
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

  describe("getIssues", () => {
    test("should return an object with empty issues array and get method", () => {
      const result = getIssues();

      expect(result).toHaveProperty("issues");
      expect(result).toHaveProperty("get");
      expect(result.issues).toEqual([]);
      expect(typeof result.get).toBe("function");
    });

    test("should create upstashCache with a fetch function", () => {
      getIssues();

      expect(mockUpstashCache).toHaveBeenCalledWith(expect.any(Function));
    });

    test("get() should call cache.get with correct key and 30min cache time", async () => {
      mockCacheGet.mockResolvedValue(mockIssues);

      const issues = getIssues();
      await issues.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "linear-TEST_TEAM-issues",
        1000 * 60 * 30,
        false,
      );
    });

    test("get() should return issues data from cache", async () => {
      mockCacheGet.mockResolvedValue(mockIssues);

      const issues = getIssues();
      const result = await issues.get();

      expect(result).toEqual(mockIssues);
    });

    test("get() should not re-fetch if issues already has data", async () => {
      mockCacheGet.mockResolvedValue(mockIssues);

      const issues = getIssues();
      await issues.get();
      await issues.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(1);
    });

    test("get() should pass force=true when Bun.argv contains '-f'", async () => {
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      mockCacheGet.mockResolvedValue(mockIssues);

      const issues = getIssues();
      await issues.get();

      expect(mockCacheGet).toHaveBeenCalledWith(
        "linear-TEST_TEAM-issues",
        1000 * 60 * 30,
        true,
      );
    });

    test("get() should reset and re-fetch when force flag is present", async () => {
      const updatedIssues = [{ ...mockIssues[0], title: "Updated issue" }];
      mockCacheGet
        .mockResolvedValueOnce(mockIssues)
        .mockResolvedValueOnce(updatedIssues);

      const issues = getIssues();
      await issues.get();
      expect(mockCacheGet).toHaveBeenCalledTimes(1);

      // Set force flag and fetch again
      globalThis.Bun = {
        ...globalThis.Bun,
        argv: ["bun", "run", "script.ts", "-f"],
      } as typeof Bun;
      const result = await issues.get();

      expect(mockCacheGet).toHaveBeenCalledTimes(2);
      expect(result[0].title).toBe("Updated issue");
    });

    test("upstashCache fetch function should call client.issues with team param", async () => {
      getIssues();

      const fetchFn = mockUpstashCache.mock.calls[0][0];

      const mockResponse = {
        issues: { nodes: mockIssues },
      };
      mockSdk.issues.mockResolvedValue(mockResponse);

      const result = await fetchFn();

      expect(mockSdk.issues).toHaveBeenCalledWith({ team: "TEST_TEAM" });
      expect(result).toEqual(mockIssues);
    });
  });
});
