import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  copyEnvToFolders,
  decryptSopsFile,
  getCoverFolders,
  getDecryptedOutputPath,
  getSopsFiles,
  printCoverResults,
} from "@/app/sops/decrypt/service";

const {
  mockAppendLine,
  mockCopyFile,
  mockEcho,
  mockListFolders,
  mockSopsDecrypt,
  mockT,
} = vi.hoisted(() => ({
  mockAppendLine: vi.fn(),
  mockCopyFile: vi.fn(),
  mockEcho: vi.fn(),
  mockListFolders: vi.fn(),
  mockSopsDecrypt: vi.fn(),
  mockT: vi.fn((key: string) => key),
}));

vi.mock("@/help", () => ({
  appendLine: mockAppendLine,
  copyFile: mockCopyFile,
  echo: mockEcho,
  listFolders: mockListFolders,
  sopsDecrypt: mockSopsDecrypt,
}));

vi.mock("@/i18n", () => ({
  t: mockT,
}));

type BunGlobConstructor = new (pattern: string) => {
  scan: (options: { cwd: string; dot: boolean }) => AsyncIterable<string>;
};

interface MockedBunWithGlob {
  Glob: BunGlobConstructor;
  env: Record<string, string | undefined>;
}

describe("app/sops/decrypt/service", () => {
  const originalBunGlob = Bun.Glob;
  const originalCoverFolderEnv = Bun.env.SOPS_DECRYPT_COVER_ENV_FOLDER;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (Bun as unknown as MockedBunWithGlob).Glob = originalBunGlob;
    Bun.env.SOPS_DECRYPT_COVER_ENV_FOLDER = originalCoverFolderEnv;
  });

  test("should strip trailing .sops from decrypted output path", () => {
    expect(getDecryptedOutputPath("app/.env.sops")).toBe("app/.env");
    expect(getDecryptedOutputPath("app/.env")).toBe("app/.env");
  });

  test("should get sops files from Bun.Glob scan", async () => {
    class MockGlob {
      scan(_options: { cwd: string; dot: boolean }): AsyncIterable<string> {
        const files = ["a/.env.sops", "b/.secret.sops"];
        return (async function* () {
          for (const file of files) {
            yield file;
          }
        })();
      }
    }

    (Bun as unknown as MockedBunWithGlob).Glob =
      MockGlob as unknown as BunGlobConstructor;

    const result = await getSopsFiles("/repo");

    expect(result).toEqual(["a/.env.sops", "b/.secret.sops"]);
  });

  test("should decrypt file and append decrypted timestamp", async () => {
    const dateSpy = vi
      .spyOn(Date.prototype, "toLocaleString")
      .mockReturnValue("2026/5/14 16:10:00");

    const result = await decryptSopsFile("app/.env.sops");

    expect(result).toBe("app/.env");
    expect(mockSopsDecrypt).toHaveBeenCalledWith("app/.env.sops", "app/.env");
    expect(mockAppendLine).toHaveBeenCalledWith(
      "app/.env",
      "LYCHEE_QUICK_CLI_DECRYPTED_TIME=2026/5/14 16:10:00",
    );

    dateSpy.mockRestore();
  });

  test("should pass configured cover folder pattern to listFolders", async () => {
    Bun.env.SOPS_DECRYPT_COVER_ENV_FOLDER = "apps/*";
    mockListFolders.mockResolvedValue(["apps/web", "apps/admin"]);

    const result = await getCoverFolders("/repo");

    expect(result).toEqual(["apps/web", "apps/admin"]);
    expect(mockListFolders).toHaveBeenCalledWith("apps/*", "/repo");
  });

  test("should fallback to empty pattern when cover env is missing", async () => {
    Bun.env.SOPS_DECRYPT_COVER_ENV_FOLDER = undefined;
    mockListFolders.mockResolvedValue([]);

    await getCoverFolders("/repo");

    expect(mockListFolders).toHaveBeenCalledWith("", "/repo");
  });

  test("should copy env file into folders and return success or error", async () => {
    mockCopyFile
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("copy failed"));

    const result = await copyEnvToFolders("app/.env", ["apps/web", "apps/api"]);

    expect(result).toEqual([
      { action: "success", target: "apps/web/.env" },
      { action: "error", target: "apps/api/.env" },
    ]);
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
    expect(mockCopyFile).toHaveBeenNthCalledWith(
      1,
      "app/.env",
      "apps/web/.env",
    );
    expect(mockCopyFile).toHaveBeenNthCalledWith(
      2,
      "app/.env",
      "apps/api/.env",
    );
  });

  test("should print cover results with success and error messages", async () => {
    await printCoverResults([
      { action: "success", target: "apps/web/.env" },
      { action: "error", target: "apps/api/.env" },
    ]);

    expect(mockT).toHaveBeenCalledWith("prompt.sops.decryptCoverSuccess", {
      file: "apps/web/.env",
    });
    expect(mockT).toHaveBeenCalledWith("prompt.sops.decryptCoverError", {
      file: "apps/api/.env",
    });
    expect(mockEcho).toHaveBeenCalledTimes(2);
    expect(mockEcho).toHaveBeenNthCalledWith(
      1,
      "prompt.sops.decryptCoverSuccess",
    );
    expect(mockEcho).toHaveBeenNthCalledWith(
      2,
      "prompt.sops.decryptCoverError",
    );
  });
});
