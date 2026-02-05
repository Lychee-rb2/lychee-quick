import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { getNestedValue, type NestedMessages } from "@/i18n";

// Mock the JSON imports
vi.mock("@/i18n/zh.json", () => ({
  default: {
    "flat key": "扁平键值",
    nested: {
      level1: {
        level2: "嵌套值",
      },
      withVar: "你好 {name}",
    },
    withVar: "变量 {value}",
  },
}));

vi.mock("@/i18n/en.json", () => ({
  default: {
    "flat key": "flat value",
    nested: {
      level1: {
        level2: "nested value",
      },
      withVar: "hello {name}",
    },
    withVar: "variable {value}",
  },
}));

describe("i18n", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getNestedValue", () => {
    const testMessages: NestedMessages = {
      simple: "simple value",
      level1: {
        level2: {
          level3: "deep value",
        },
        direct: "direct value",
      },
      empty: {},
    };

    test("should return value for flat key", () => {
      expect(getNestedValue(testMessages, "simple")).toBe("simple value");
    });

    test("should return value for nested key with two levels", () => {
      expect(getNestedValue(testMessages, "level1.direct")).toBe(
        "direct value",
      );
    });

    test("should return value for deeply nested key", () => {
      expect(getNestedValue(testMessages, "level1.level2.level3")).toBe(
        "deep value",
      );
    });

    test("should return undefined for non-existent key", () => {
      expect(getNestedValue(testMessages, "nonexistent")).toBeUndefined();
    });

    test("should return undefined for non-existent nested key", () => {
      expect(
        getNestedValue(testMessages, "level1.nonexistent.key"),
      ).toBeUndefined();
    });

    test("should return undefined when path points to object", () => {
      expect(getNestedValue(testMessages, "level1.level2")).toBeUndefined();
    });

    test("should return undefined when path goes through string value", () => {
      expect(getNestedValue(testMessages, "simple.nested")).toBeUndefined();
    });

    test("should return undefined for empty object path", () => {
      expect(getNestedValue(testMessages, "empty.key")).toBeUndefined();
    });

    test("should handle single key path correctly", () => {
      expect(getNestedValue(testMessages, "level1")).toBeUndefined();
    });
  });

  describe("t", () => {
    test("should return flat key value with default zh locale", async () => {
      vi.stubEnv("LOCALE", "zh");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("flat key")).toBe("扁平键值");
    });

    test("should return flat key value with en locale", async () => {
      vi.stubEnv("LOCALE", "en");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("flat key")).toBe("flat value");
    });

    test("should return nested key value", async () => {
      vi.stubEnv("LOCALE", "zh");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("nested.level1.level2")).toBe("嵌套值");
    });

    test("should return nested key value with en locale", async () => {
      vi.stubEnv("LOCALE", "en");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("nested.level1.level2")).toBe("nested value");
    });

    test("should return key itself when key not found", async () => {
      vi.stubEnv("LOCALE", "zh");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("nonexistent.key")).toBe("nonexistent.key");
    });

    test("should interpolate variables", async () => {
      vi.stubEnv("LOCALE", "zh");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("withVar", { value: "测试" })).toBe("变量 测试");
    });

    test("should interpolate variables in nested key", async () => {
      vi.stubEnv("LOCALE", "en");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("nested.withVar", { name: "World" })).toBe("hello World");
    });

    test("should keep placeholder when variable not provided", async () => {
      vi.stubEnv("LOCALE", "zh");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("withVar", {})).toBe("变量 {value}");
    });

    test("should work without args parameter", async () => {
      vi.stubEnv("LOCALE", "zh");
      vi.resetModules();
      const { t } = await import("@/i18n");

      expect(t("flat key")).toBe("扁平键值");
    });

    test("should use zh locale when LOCALE env is not set", async () => {
      vi.stubEnv("LOCALE", "");
      vi.resetModules();
      const { t } = await import("@/i18n");

      // Empty string is falsy, so it should default to zh
      expect(t("flat key")).toBe("扁平键值");
    });
  });
});
