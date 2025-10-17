import dotenv from "dotenv";
import { logger, typedBoolean } from "help";

export const cli = (cmd: string[]) => {
  const proc = Bun.spawnSync(cmd);
  if (!proc.success) {
    logger.error(cmd);
    throw new Error(proc.stderr.toString());
  }
  return proc;
};

export const pbcopy = (data: string) => {
  const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
  proc.stdin.write(data);
  proc.stdin.end();
  logger.info(`\n`);
};

const _require = (actionName: string[]) => {
  const actionPath = `@/app/${actionName.join("/")}`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(actionPath);
  } catch (_) {
    throw new Error(`Can't find action "${actionName.join(" ")}"`);
  }
};

export const main = async (meta: ImportMeta) => {
  dotenv.config({ path: `${meta.dir}/.env` });
  const binIndex = Bun.argv.findIndex((i) => i === meta.path);
  if (binIndex === -1) {
    throw new Error("Parse argv fail");
  }
  const actionName = Bun.argv
    .slice(binIndex + 1)
    .filter(typedBoolean)
    .filter((i) => !i.includes("-"));
  const action = await _require(actionName);
  if (action.default) {
    logger.debug(`Start run "${actionName.join(" ")}"`);
    await action.default({ from: "cli" });
    logger.debug(`End run "${actionName.join(" ")}"`);
  } else {
    logger.error(`Does not find "${actionName.join(" ")}"`);
  }
};
