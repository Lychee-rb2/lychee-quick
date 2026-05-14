import { describe, expect, test, vi } from "vitest";
import installZshCompletion, {
	resolveRoot,
} from "@/scripts/installZshCompletion";

const { mockInstallZshCompletion } = vi.hoisted(() => ({
	mockInstallZshCompletion: vi.fn(),
}));

vi.mock("@/scripts/utils/installZshCompletion", () => ({
	default: mockInstallZshCompletion,
}));

describe("scripts/installZshCompletion", () => {
	test("resolveRoot should resolve workspace root from script url", () => {
		expect(
			resolveRoot("file:///fake/project/scripts/installZshCompletion.ts"),
		).toBe("/fake/project");
	});

	test("main should call util with resolved root", async () => {
		await installZshCompletion(
			"file:///fake/project/scripts/installZshCompletion.ts",
		);
		expect(mockInstallZshCompletion).toHaveBeenCalledWith("/fake/project");
	});
});
