import { describe, expect, test } from "vitest";
import { typedBoolean } from "@/help";

describe("typedBoolean", () => {
  describe("falsy values", () => {
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
  });

  describe("truthy values", () => {
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

  describe("practical usage with filter", () => {
    test("should filter out falsy values from array", () => {
      const input = ["a", "", "b", null, "c", undefined, 0, 1];
      const result = input.filter(typedBoolean);
      expect(result).toEqual(["a", "b", "c", 1]);
    });
  });
});
