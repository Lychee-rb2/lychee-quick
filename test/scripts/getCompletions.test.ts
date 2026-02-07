import getCompletions from "@/scripts/utils/getCompletions";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";

vi.mock("/root/foo/meta.ts", () => ({
  completion: "function foo",
}));
vi.mock("/root/foo/foo/meta.ts", () => ({
  completion: "function foo/foo",
}));
vi.mock("/root/foo/bar/meta.ts", () => ({
  completion: "function foo/bar",
}));
vi.mock("/root/bar/meta.ts", () => ({
  completion: "function bar",
}));
vi.mock("/root/bar/foo/meta.ts", () => ({
  completion: "function bar/foo",
}));
vi.mock("/root/bar/bar/meta.ts", () => ({
  completion: "function bar/bar",
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

  // biome-ignore lint/correctness/noUndeclaredVariables: vitest global
  afterAll(() => {
    globalThis.Bun.Glob = originalGlob;
  });

  test("should get completions", async () => {
    mockScan.mockImplementation(function* () {
      yield "foo/meta.ts";
      yield "bar/meta.ts";
      yield "foo/foo/meta.ts";
      yield "foo/bar/meta.ts";
      yield "bar/foo/meta.ts";
      yield "bar/bar/meta.ts";
    });

    const result = await getCompletions("/root");

    expect(result.commands).toEqual([
      { name: "foo", completion: "function foo" },
      { name: "bar", completion: "function bar" },
    ]);
    expect(result.subcommands.foo).toEqual([
      { name: "foo", completion: "function foo/foo" },
      { name: "bar", completion: "function foo/bar" },
    ]);
    expect(result.subcommands.bar).toEqual([
      { name: "foo", completion: "function bar/foo" },
      { name: "bar", completion: "function bar/bar" },
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

  test("should skip subcommand without completion", async () => {
    vi.mock("/root/baz/meta.ts", () => ({
      completion: "function baz",
    }));
    vi.mock("/root/baz/nope/meta.ts", () => ({
      completion: undefined,
    }));

    mockScan.mockImplementation(function* () {
      yield "baz/meta.ts";
      yield "baz/nope/meta.ts";
    });

    const result = await getCompletions("/root");
    expect(result.subcommands.baz).toEqual([]);
  });

  test("should handle subcommand appearing before parent command", async () => {
    mockScan.mockImplementation(function* () {
      // subcommand yields before parent command
      yield "foo/bar/meta.ts";
      yield "foo/meta.ts";
    });

    const result = await getCompletions("/root");
    expect(result.commands).toEqual([
      { name: "foo", completion: "function foo" },
    ]);
    expect(result.subcommands.foo).toEqual([
      { name: "bar", completion: "function foo/bar" },
    ]);
  });

  test("should ignore deeply nested meta.ts", async () => {
    mockScan.mockImplementation(function* () {
      yield "foo/meta.ts";
      yield "foo/bar/baz/meta.ts"; // depth 3, should be ignored
    });

    vi.mock("/root/foo/bar/baz/meta.ts", () => ({
      completion: "should be ignored",
    }));

    const result = await getCompletions("/root");
    expect(result.commands).toEqual([
      { name: "foo", completion: "function foo" },
    ]);
    expect(result.subcommands.foo).toEqual([]);
  });
});
