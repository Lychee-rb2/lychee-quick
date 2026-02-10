import { describe, expect, test, beforeEach, vi } from "vitest";
import { typedBoolean } from "@/help/util";

// Mock modules (must be called before imports)
vi.mock("@/help/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("util helper functions", () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("typedBoolean", () => {
    test("should return false for empty string", () => {
      expect(typedBoolean("")).toBe(false);
    });

    test("should return false for 0", () => {
      expect(typedBoolean(0)).toBe(false);
    });

    test("should return false for false", () => {
      expect(typedBoolean(false)).toBe(false);
    });

    test("should return false for null", () => {
      expect(typedBoolean(null)).toBe(false);
    });

    test("should return false for undefined", () => {
      expect(typedBoolean(undefined)).toBe(false);
    });

    test("should return true for non-empty string", () => {
      expect(typedBoolean("hello")).toBe(true);
    });

    test("should return true for non-zero number", () => {
      expect(typedBoolean(1)).toBe(true);
      expect(typedBoolean(-1)).toBe(true);
      expect(typedBoolean(0.5)).toBe(true);
    });

    test("should return true for true", () => {
      expect(typedBoolean(true)).toBe(true);
    });

    test("should return true for empty object", () => {
      expect(typedBoolean({})).toBe(true);
    });

    test("should return true for empty array", () => {
      expect(typedBoolean([])).toBe(true);
    });

    test("should return true for function", () => {
      expect(typedBoolean(() => {})).toBe(true);
    });
  });
});
