import { beforeEach, describe, expect, test, vi } from "vitest";
import handler from "@/app/sops/decrypt/handler";

const {
  mockEcho,
  mockT,
  mockGetSopsFiles,
  mockPickSopsFile,
  mockDecryptSopsFile,
  mockConfirmCoverDecryptedFile,
  mockGetCoverFolders,
  mockPickCoverFolders,
  mockCopyEnvToFolders,
  mockPrintCoverResults,
} = vi.hoisted(() => ({
  mockEcho: vi.fn(),
  mockT: vi.fn((key: string) => key),
  mockGetSopsFiles: vi.fn(),
  mockPickSopsFile: vi.fn(),
  mockDecryptSopsFile: vi.fn(),
  mockConfirmCoverDecryptedFile: vi.fn(),
  mockGetCoverFolders: vi.fn(),
  mockPickCoverFolders: vi.fn(),
  mockCopyEnvToFolders: vi.fn(),
  mockPrintCoverResults: vi.fn(),
}));

vi.mock("@/help", () => ({
  echo: mockEcho,
}));

vi.mock("@/i18n", () => ({
  t: mockT,
}));

vi.mock("@/app/sops/decrypt/service", () => ({
  getSopsFiles: mockGetSopsFiles,
  decryptSopsFile: mockDecryptSopsFile,
  getCoverFolders: mockGetCoverFolders,
  copyEnvToFolders: mockCopyEnvToFolders,
  printCoverResults: mockPrintCoverResults,
}));

vi.mock("@/prompts/sops", () => ({
  pickSopsFile: mockPickSopsFile,
  confirmCoverDecryptedFile: mockConfirmCoverDecryptedFile,
  pickCoverFolders: mockPickCoverFolders,
}));

describe("app/sops/decrypt/handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSopsFiles.mockResolvedValue(["apps/web/.env.sops"]);
    mockPickSopsFile.mockResolvedValue("apps/web/.env.sops");
    mockDecryptSopsFile.mockResolvedValue("apps/web/.env");
    mockConfirmCoverDecryptedFile.mockResolvedValue(true);
    mockGetCoverFolders.mockResolvedValue(["apps/web", "apps/api"]);
    mockPickCoverFolders.mockResolvedValue(["apps/web"]);
    mockCopyEnvToFolders.mockResolvedValue([
      { action: "success", target: "apps/web/.env" },
    ]);
    mockPrintCoverResults.mockResolvedValue(undefined);
    mockEcho.mockResolvedValue(undefined);
  });

  test("should stop after confirmation step when user does not cover", async () => {
    mockConfirmCoverDecryptedFile.mockResolvedValue(false);

    await handler();

    expect(mockGetSopsFiles).toHaveBeenCalledWith(process.cwd());
    expect(mockPickSopsFile).toHaveBeenCalledWith(["apps/web/.env.sops"]);
    expect(mockDecryptSopsFile).toHaveBeenCalledWith("apps/web/.env.sops");
    expect(mockT).toHaveBeenCalledWith("prompt.sops.decryptSuccess", {
      file: "apps/web/.env",
    });
    expect(mockEcho).toHaveBeenCalledWith("prompt.sops.decryptSuccess");
    expect(mockConfirmCoverDecryptedFile).toHaveBeenCalledWith("apps/web/.env");

    expect(mockGetCoverFolders).not.toHaveBeenCalled();
    expect(mockPickCoverFolders).not.toHaveBeenCalled();
    expect(mockCopyEnvToFolders).not.toHaveBeenCalled();
    expect(mockPrintCoverResults).not.toHaveBeenCalled();
  });

  test("should run full cover flow after user confirms", async () => {
    await handler();

    expect(mockGetSopsFiles).toHaveBeenCalledWith(process.cwd());
    expect(mockPickSopsFile).toHaveBeenCalledWith(["apps/web/.env.sops"]);
    expect(mockDecryptSopsFile).toHaveBeenCalledWith("apps/web/.env.sops");
    expect(mockConfirmCoverDecryptedFile).toHaveBeenCalledWith("apps/web/.env");

    expect(mockGetCoverFolders).toHaveBeenCalledWith(process.cwd());
    expect(mockPickCoverFolders).toHaveBeenCalledWith(["apps/web", "apps/api"]);
    expect(mockCopyEnvToFolders).toHaveBeenCalledWith("apps/web/.env", [
      "apps/web",
    ]);
    expect(mockPrintCoverResults).toHaveBeenCalledWith([
      { action: "success", target: "apps/web/.env" },
    ]);
  });
});
