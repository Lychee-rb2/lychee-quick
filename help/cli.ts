import { logger } from "./logger";
import { $ } from "bun";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

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

export const pbcopy = async (data: string): Promise<void> => {
  await $`echo ${data} | pbcopy`;
};

export const sopsDecrypt = async (file: string, output: string) => {
  await $`sops -d --input-type dotenv --output-type dotenv --output ${output} ${file}`;
};

export const listFolders = async (pattern: string, root?: string) => {
  if (!pattern) return [];

  const cwd = root ?? process.cwd();
  const prefix = pattern.split(/[*?[{]/)[0].replace(/\/+$/, "");
  const basePath = join(cwd, prefix || ".");

  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(basePath, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => (prefix ? `${prefix}/${entry.name}` : entry.name))
    .sort();
};

export const copyFile = async (source: string, target: string) => {
  await $`cp ${source} ${target}`;
};

export const appendLine = async (file: string, line: string) => {
  await $`echo ${line} >> ${file}`;
};
