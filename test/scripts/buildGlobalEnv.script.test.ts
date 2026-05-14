import { describe, expect, test, vi } from "vitest";
import buildGlobalEnv, { resolveRoot } from "@/scripts/buildGlobalEnv";

const { mockBuildGlobalEnv } = vi.hoisted(() => ({
	mockBuildGlobalEnv: vi.fn(),
}));

vi.mock("@/scripts/utils/buildGlobalEnv", () => ({
	default: mockBuildGlobalEnv,
}));

describe("scripts/buildGlobalEnv", () => {
	test("resolveRoot should resolve workspace root from script url", () => {
		expect(resolveRoot("file:///fake/project/scripts/buildGlobalEnv.ts")).toBe(
			"/fake/project",
		);
	});

	test("main should call util with resolved root", async () => {
		await buildGlobalEnv("file:///fake/project/scripts/buildGlobalEnv.ts");
		expect(mockBuildGlobalEnv).toHaveBeenCalledWith("/fake/project");
	});
});
