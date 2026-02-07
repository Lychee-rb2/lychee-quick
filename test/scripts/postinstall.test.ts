import { describe, expect, test, vi } from "vitest";
import postinstall from "@/scripts/postinstall";

const { mockBuildGlobalEnv, mockInstallCli, mockInstallZshCompletion } =
  vi.hoisted(() => ({
    mockBuildGlobalEnv: vi.fn(),
    mockInstallCli: vi.fn(),
    mockInstallZshCompletion: vi.fn(),
  }));
vi.mock("@/scripts/utils/buildGlobalEnv", () => ({
  default: mockBuildGlobalEnv,
}));
vi.mock("@/scripts/utils/installCli", () => ({
  default: mockInstallCli,
}));
vi.mock("@/scripts/utils/installZshCompletion", () => ({
  default: mockInstallZshCompletion,
}));

describe("postinstall", () => {
  test("should install cli", async () => {
    await postinstall("file:///fake/project/scripts/postinstall.ts");
    expect(mockBuildGlobalEnv).toHaveBeenCalledWith("/fake/project");
    expect(mockInstallCli).toHaveBeenCalledWith("/fake/project");
    expect(mockInstallZshCompletion).toHaveBeenCalledWith("/fake/project");
  });
});
