import { logger } from "./logger";

export const cli = (cmd: string[]) => {
  const proc = Bun.spawnSync(cmd);
  if (!proc.success) {
    logger.error(cmd);
    throw new Error(proc.stderr.toString());
  }
  return proc;
};

export const gitShowRef = (ref: string): string => {
  const proc = Bun.spawnSync(["git", "show-ref", ref]);
  // git show-ref returns exit code 1 when ref doesn't exist, which is expected
  // We return empty string instead of throwing an error
  if (!proc.success && proc.stdout.length === 0) {
    return "";
  }
  if (!proc.success) {
    logger.error(["git", "show-ref", ref]);
    throw new Error(new TextDecoder().decode(proc.stderr));
  }
  return new TextDecoder().decode(proc.stdout).trim();
};
