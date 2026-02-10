import { buildType, getEnvKeys } from "@/scripts/utils/buildGlobalEnv";
import buildGlobalEnv from "@/scripts/utils/buildGlobalEnv";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/i18n", () => ({
  t: vi.fn((key: string) => key),
}));

interface MockedBun {
  file: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
}

const setBunMock = <K extends keyof MockedBun>(
  key: K,
  value: MockedBun[K],
): void => {
  (globalThis.Bun as unknown as MockedBun)[key] = value;
};

describe("buildGlobalEnv", () => {
  describe("getEnvKeys", () => {
    test("parse env keys from env content", () => {
      const envContent = `
      TEST_KEY=test
      TEST_KEY2=test2
      `;
      const envKeys = getEnvKeys(envContent);
      expect(envKeys).toEqual(["TEST_KEY", "TEST_KEY2"]);
    });
    test("parse env keys from env content with comments", () => {
      const envContent = `
      TEST_KEY=test
      #TEST_KEY2=test2
      `;
      const envKeys = getEnvKeys(envContent);
      expect(envKeys).toEqual(["TEST_KEY"]);
    });
  });
  describe("buildType", () => {
    test("build type from env keys", () => {
      const envKeys = ["TEST_KEY", "TEST_KEY2"];
      const type = buildType(envKeys);
      expect(type).toContain(`TEST_KEY?: string`);
      expect(type).toContain(`TEST_KEY2?: string`);
    });
  });
  describe("buildGlobalEnv", () => {
    const originalBunProperties: Partial<MockedBun> = {};

    beforeEach(() => {
      if (globalThis.Bun) {
        originalBunProperties.file = (
          globalThis.Bun as unknown as MockedBun
        ).file;
        originalBunProperties.write = (
          globalThis.Bun as unknown as MockedBun
        ).write;
      }
    });

    afterEach(() => {
      if (originalBunProperties.file !== undefined) {
        setBunMock("file", originalBunProperties.file);
      }
      if (originalBunProperties.write !== undefined) {
        setBunMock("write", originalBunProperties.write);
      }
    });

    test("build global-env.d.ts from .env keys", async () => {
      const mockText = vi
        .fn()
        .mockResolvedValue(`TEST_KEY=test\nTEST_KEY2=test2`);
      const mockFile = vi.fn(() => ({ text: mockText }));
      const mockWrite = vi.fn().mockResolvedValue(undefined);

      setBunMock("file", mockFile);
      setBunMock("write", mockWrite);

      const result = await buildGlobalEnv("/root");

      expect(mockFile).toHaveBeenCalledWith("/root/.env");
      expect(mockWrite).toHaveBeenCalledWith(
        "/root/global-env.d.ts",
        buildType(["TEST_KEY", "TEST_KEY2"]),
      );
      expect(result).toBe(1);
    });
  });
});
