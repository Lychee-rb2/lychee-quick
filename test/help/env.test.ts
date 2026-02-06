import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { ZodError } from "zod";
import {
  MIHOMO_URL,
  MIHOMO_TOKEN,
  MIHOMO_TOP_PROXY,
  MIHOMO_BOARD,
  VERCEL_PERSONAL_TOKEN,
  VERCEL_TEAM,
  REDIS_URL,
  REDIS_TOKEN,
  LINEAR_API_KEY,
  LINEAR_TEAM,
  GIT_TOKEN,
  GIT_ORGANIZATION,
  GIT_REPO,
  LOG_LEVEL,
  CLI_NAME,
  LOCALE,
  RELEASE_NOTE_PAGE,
  PREVIEWS_COMMENT_MENTIONS,
  PREVIEWS_COMMENT_FOOTER,
} from "@/help/env";

describe("help/env", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("required env vars", () => {
    const requiredEnvCases: [string, () => string][] = [
      ["MIHOMO_URL", MIHOMO_URL],
      ["MIHOMO_TOKEN", MIHOMO_TOKEN],
      ["MIHOMO_TOP_PROXY", MIHOMO_TOP_PROXY],
      ["MIHOMO_BOARD", MIHOMO_BOARD],
      ["VERCEL_PERSONAL_TOKEN", VERCEL_PERSONAL_TOKEN],
      ["VERCEL_TEAM", VERCEL_TEAM],
      ["REDIS_URL", REDIS_URL],
      ["REDIS_TOKEN", REDIS_TOKEN],
      ["LINEAR_API_KEY", LINEAR_API_KEY],
      ["LINEAR_TEAM", LINEAR_TEAM],
      ["GIT_TOKEN", GIT_TOKEN],
      ["GIT_ORGANIZATION", GIT_ORGANIZATION],
      ["GIT_REPO", GIT_REPO],
    ];

    test.each(requiredEnvCases)(
      "%s should return value when set",
      (name, getter) => {
        vi.stubEnv(name, "test-value");
        expect(getter()).toBe("test-value");
      },
    );

    test.each(requiredEnvCases)(
      "%s should throw ZodError when not set",
      (name, getter) => {
        delete Bun.env[name];
        expect(() => getter()).toThrow(ZodError);
      },
    );

    test("ZodError should contain env var name in message", () => {
      delete Bun.env.MIHOMO_URL;
      try {
        MIHOMO_URL();
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.issues[0].message).toContain("MIHOMO_URL");
      }
    });
  });

  describe("env vars with defaults", () => {
    test("LOG_LEVEL should return value when set", () => {
      vi.stubEnv("LOG_LEVEL", "debug");
      expect(LOG_LEVEL()).toBe("debug");
    });

    test("LOG_LEVEL should return 'info' when not set", () => {
      delete Bun.env.LOG_LEVEL;
      expect(LOG_LEVEL()).toBe("info");
    });

    test("LOG_LEVEL should return 'info' when empty string", () => {
      vi.stubEnv("LOG_LEVEL", "");
      expect(LOG_LEVEL()).toBe("info");
    });

    test("CLI_NAME should return value when set", () => {
      vi.stubEnv("CLI_NAME", "my-cli");
      expect(CLI_NAME()).toBe("my-cli");
    });

    test("CLI_NAME should return 'ly' when not set", () => {
      delete Bun.env.CLI_NAME;
      expect(CLI_NAME()).toBe("ly");
    });

    test("LOCALE should return value when set", () => {
      vi.stubEnv("LOCALE", "en");
      expect(LOCALE()).toBe("en");
    });

    test("LOCALE should return 'zh' when not set", () => {
      delete Bun.env.LOCALE;
      expect(LOCALE()).toBe("zh");
    });
  });

  describe("optional env vars", () => {
    test("RELEASE_NOTE_PAGE should return value when set", () => {
      vi.stubEnv("RELEASE_NOTE_PAGE", "https://example.com/release");
      expect(RELEASE_NOTE_PAGE()).toBe("https://example.com/release");
    });

    test("RELEASE_NOTE_PAGE should return undefined when not set", () => {
      delete Bun.env.RELEASE_NOTE_PAGE;
      expect(RELEASE_NOTE_PAGE()).toBeUndefined();
    });

    test("PREVIEWS_COMMENT_MENTIONS should return value when set", () => {
      vi.stubEnv("PREVIEWS_COMMENT_MENTIONS", "a@b.com,c@d.com");
      expect(PREVIEWS_COMMENT_MENTIONS()).toBe("a@b.com,c@d.com");
    });

    test("PREVIEWS_COMMENT_MENTIONS should return empty string when not set", () => {
      delete Bun.env.PREVIEWS_COMMENT_MENTIONS;
      expect(PREVIEWS_COMMENT_MENTIONS()).toBe("");
    });

    test("PREVIEWS_COMMENT_FOOTER should return value when set", () => {
      vi.stubEnv("PREVIEWS_COMMENT_FOOTER", "footer text");
      expect(PREVIEWS_COMMENT_FOOTER()).toBe("footer text");
    });

    test("PREVIEWS_COMMENT_FOOTER should return undefined when not set", () => {
      delete Bun.env.PREVIEWS_COMMENT_FOOTER;
      expect(PREVIEWS_COMMENT_FOOTER()).toBeUndefined();
    });
  });
});
