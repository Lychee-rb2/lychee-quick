import { logger } from "./logger";
import { $ } from "bun";

interface ShellError extends Error {
  exitCode: number;
  stdout: { toString: () => string };
}
export const gitShowRef = async (ref: string): Promise<string> => {
  try {
    // git show-ref returns exit code 1 when ref doesn't exist, which is expected
    // We return empty string instead of throwing an error
    const result = await $`git show-ref ${ref}`;
    return result.stdout.toString().trim();
  } catch (_error) {
    const error = _error as unknown as ShellError | Error;
    // Check if it's a ShellError with exit code 1
    // This means the ref doesn't exist, which is expected
    if (error && typeof error === "object" && "exitCode" in error) {
      if (error.exitCode === 1) {
        // Check if stdout is empty (ref doesn't exist)
        const stdout = error.stdout?.toString() || "";
        if (!stdout.trim()) {
          return "";
        }
      }
    }
    // For other errors, log and throw
    logger.error(["git", "show-ref", ref]);
    throw error;
  }
};

export const openUrl = async (url: string | URL): Promise<void> => {
  await $`open ${url}`;
};

export const echo = async (message: string): Promise<void> => {
  await $`echo ${message}`;
};

export const gitCheckout = async (branch: string): Promise<void> => {
  await $`git checkout ${branch}`;
};

export const gitPull = async (): Promise<void> => {
  await $`git pull`;
};

export const gitCheckoutBranch = async (branchName: string): Promise<void> => {
  await $`git checkout -b ${branchName}`;
};
