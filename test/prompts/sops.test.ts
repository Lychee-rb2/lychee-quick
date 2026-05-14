import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  confirmCoverDecryptedFile,
  pickCoverFolders,
  pickSopsFile,
} from "@/prompts/sops";
import { checkbox, confirm, search } from "@inquirer/prompts";

const { mockT } = vi.hoisted(() => ({
  mockT: vi.fn((key: string) => key),
}));

vi.mock("@inquirer/prompts", () => ({
  search: vi.fn(),
  confirm: vi.fn(),
  checkbox: vi.fn(),
}));

vi.mock("@/i18n", () => ({
  t: mockT,
}));

interface SearchChoice {
  name: string;
  value: string;
}

interface SearchOptions {
  message: string;
  source: (input?: string) => Promise<SearchChoice[]>;
}

interface ConfirmOptions {
  message: string;
}

interface CheckboxChoice {
  name: string;
  value: string;
}

interface CheckboxOptions {
  message: string;
  loop: boolean;
  choices: CheckboxChoice[];
}

type MockedSearch = ReturnType<typeof vi.fn> & typeof search;
type MockedConfirm = ReturnType<typeof vi.fn> & typeof confirm;
type MockedCheckbox = ReturnType<typeof vi.fn> & typeof checkbox;

const mockSearchImpl = (
  impl: (options: SearchOptions) => Promise<string>,
): void => {
  (search as MockedSearch).mockImplementation(impl as unknown as typeof search);
};

const mockConfirmImpl = (
  impl: (options: ConfirmOptions) => Promise<boolean>,
): void => {
  (confirm as MockedConfirm).mockImplementation(
    impl as unknown as typeof confirm,
  );
};

const mockCheckboxImpl = (
  impl: (options: CheckboxOptions) => Promise<string[]>,
): void => {
  (checkbox as MockedCheckbox).mockImplementation(
    impl as unknown as typeof checkbox,
  );
};

describe("prompts/sops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should call search with decryptFile prompt and return selected file", async () => {
    const files = ["apps/web/.env.sops", "apps/api/.env.sops"];

    mockSearchImpl(async (options) => {
      expect(options.message).toBe("prompt.sops.decryptFile");
      const choices = await options.source();
      expect(choices).toEqual([
        { name: "apps/web/.env.sops", value: "apps/web/.env.sops" },
        { name: "apps/api/.env.sops", value: "apps/api/.env.sops" },
      ]);
      return "apps/web/.env.sops";
    });

    const result = await pickSopsFile(files);

    expect(result).toBe("apps/web/.env.sops");
  });

  test("should filter files by space-separated keywords", async () => {
    const files = [
      "apps/web/.env.sops",
      "apps/api/.env.sops",
      "packages/tool/.env.sops",
    ];

    mockSearchImpl(async (options) => {
      const choices = await options.source("apps web");
      expect(choices).toEqual([
        { name: "apps/web/.env.sops", value: "apps/web/.env.sops" },
      ]);
      return "apps/web/.env.sops";
    });

    await pickSopsFile(files);
  });

  test("should confirm overwrite using translated message", async () => {
    mockConfirmImpl(async (options) => {
      expect(options.message).toBe("prompt.sops.decryptConfirm");
      return true;
    });

    const result = await confirmCoverDecryptedFile("apps/web/.env");

    expect(result).toBe(true);
    expect(mockT).toHaveBeenCalledWith("prompt.sops.decryptConfirm", {
      file: "apps/web/.env",
    });
  });

  test("should show folder checkbox prompt sorted alphabetically", async () => {
    mockCheckboxImpl(async (options) => {
      expect(options.message).toBe("prompt.sops.coverFolders");
      expect(options.loop).toBe(false);
      expect(options.choices).toEqual([
        { name: "apps/api", value: "apps/api" },
        { name: "apps/web", value: "apps/web" },
      ]);
      return ["apps/api"];
    });

    const result = await pickCoverFolders(["apps/web", "apps/api"]);

    expect(result).toEqual(["apps/api"]);
  });
});
