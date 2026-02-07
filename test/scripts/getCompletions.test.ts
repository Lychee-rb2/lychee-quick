import getCompletions from "@/scripts/utils/getCompletions";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";

vi.mock("/root/foo/meta.ts", () => ({
  completion: () => "function foo",
}));
vi.mock("/root/foo/foo/meta.ts", () => ({
  completion: () => "function foo/foo",
}));
vi.mock("/root/foo/bar/meta.ts", () => ({
  completion: () => "function foo/bar",
}));
vi.mock("/root/bar/meta.ts", () => ({
  completion: () => "function bar",
}));
vi.mock("/root/bar/foo/meta.ts", () => ({
  completion: () => "function bar/foo",
}));
vi.mock("/root/bar/bar/meta.ts", () => ({
  completion: () => "function bar/bar",
}));

interface MockedBun {
  Glob: ReturnType<typeof vi.fn>;
}

const originalGlob = globalThis.Bun.Glob;

const mockScan = vi.fn();

const mockGlob = vi.fn().mockImplementation(() => ({
  scan: mockScan,
}));

describe("getCompletions", () => {
  (globalThis.Bun as unknown as MockedBun).Glob = mockGlob;

  afterEach(() => {
    mockGlob.mockClear();
    mockScan.mockReset();
  });

  afterAll(() => {
    globalThis.Bun.Glob = originalGlob;
  });

  test("should get completions as tree", async () => {
    mockScan.mockImplementation(function* () {
      yield "foo/meta.ts";
      yield "bar/meta.ts";
      yield "foo/foo/meta.ts";
      yield "foo/bar/meta.ts";
      yield "bar/foo/meta.ts";
      yield "bar/bar/meta.ts";
    });

    const result = await getCompletions("/root");

    expect(result).toEqual([
      {
        name: "foo",
        completion: "function foo",
        children: [
          { name: "foo", completion: "function foo/foo", children: [] },
          { name: "bar", completion: "function foo/bar", children: [] },
        ],
      },
      {
        name: "bar",
        completion: "function bar",
        children: [
          { name: "foo", completion: "function bar/foo", children: [] },
          { name: "bar", completion: "function bar/bar", children: [] },
        ],
      },
    ]);
  });

  test("should throw for command name with dash", async () => {
    mockScan.mockImplementation(function* () {
      yield "my-cmd/meta.ts";
    });

    await expect(getCompletions("/root")).rejects.toThrow(
      'Command name cannot contain "-"',
    );
  });

  test("should throw for subcommand name with dash", async () => {
    mockScan.mockImplementation(function* () {
      yield "foo/meta.ts";
      yield "foo/my-sub/meta.ts";
    });

    await expect(getCompletions("/root")).rejects.toThrow(
      'Command name cannot contain "-"',
    );
  });

  test("should skip command without completion", async () => {
    vi.mock("/root/baz/meta.ts", () => ({
      completion: () => "function baz",
    }));
    vi.mock("/root/baz/nope/meta.ts", () => ({
      completion: undefined,
    }));

    mockScan.mockImplementation(function* () {
      yield "baz/meta.ts";
      yield "baz/nope/meta.ts";
    });

    const result = await getCompletions("/root");
    expect(result).toEqual([
      { name: "baz", completion: "function baz", children: [] },
    ]);
  });

  test("should handle subcommand appearing before parent command", async () => {
    mockScan.mockImplementation(function* () {
      // subcommand yields before parent command
      yield "foo/bar/meta.ts";
      yield "foo/meta.ts";
    });

    const result = await getCompletions("/root");
    expect(result).toEqual([
      {
        name: "foo",
        completion: "function foo",
        children: [
          { name: "bar", completion: "function foo/bar", children: [] },
        ],
      },
    ]);
  });

  test("should handle deeply nested meta.ts", async () => {
    vi.mock("/root/foo/bar/baz/meta.ts", () => ({
      completion: () => "function foo/bar/baz",
    }));

    mockScan.mockImplementation(function* () {
      yield "foo/meta.ts";
      yield "foo/bar/meta.ts";
      yield "foo/bar/baz/meta.ts";
    });

    const result = await getCompletions("/root");
    expect(result).toEqual([
      {
        name: "foo",
        completion: "function foo",
        children: [
          {
            name: "bar",
            completion: "function foo/bar",
            children: [
              {
                name: "baz",
                completion: "function foo/bar/baz",
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  test("should skip root meta.ts (no command parts)", async () => {
    vi.mock("/root/meta.ts", () => ({
      completion: () => "root",
    }));

    mockScan.mockImplementation(function* () {
      yield "meta.ts";
      yield "foo/meta.ts";
    });

    const result = await getCompletions("/root");
    expect(result).toEqual([
      { name: "foo", completion: "function foo", children: [] },
    ]);
  });
});
