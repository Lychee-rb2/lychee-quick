import dotenv from "dotenv";
import { logger, typedBoolean } from "help";

const showAvailableActions = async () => {
  const appDir = `${import.meta.dir}/../app`;
  const glob = new Bun.Glob("*/meta.ts");
  const apps: { name: string; description: string }[] = [];

  for await (const path of glob.scan({ cwd: appDir })) {
    const name = path.split("/")[0];
    let description = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`@/app/${name}/meta`);
      description = mod.completion || "";
    } catch (e) {
      logger.error(`Error reading meta.ts: ${e}`);
    }
    apps.push({ name, description });
  }

  logger.info("Usage: bun <command> [subcommand] [options]\n");
  logger.info("Available commands:\n");
  for (const app of apps) {
    const desc = app.description ? ` - ${app.description}` : "";
    logger.info(`  ${app.name}${desc}`);
  }
  logger.info("\nRun 'bun <command>' to see available subcommands.");
};

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

const showSubcommands = async (actionName: string[]) => {
  const appDir = `${import.meta.dir}/../app`;
  const subDir = `${appDir}/${actionName.join("/")}`;
  const glob = new Bun.Glob("*/meta.ts");
  const subcommands: { name: string; description: string }[] = [];

  let mainDescription = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(`@/app/${actionName.join("/")}/meta`);
    mainDescription = mod.completion || "";
  } catch {
    // ignore
  }

  for await (const path of glob.scan({ cwd: subDir })) {
    const name = path.split("/")[0];
    let description = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`@/app/${actionName.join("/")}/${name}/meta`);
      description = mod.completion || "";
    } catch {
      // ignore
    }
    subcommands.push({ name, description });
  }

  const cmdName = actionName.join(" ");
  logger.info(`Usage: ly ${cmdName} <subcommand>\n`);
  if (mainDescription) {
    logger.info(`${mainDescription}\n`);
  }
  logger.info("Available subcommands:\n");
  for (const cmd of subcommands) {
    const desc = cmd.description ? ` - ${cmd.description}` : "";
    logger.info(`  ${cmd.name}${desc}`);
  }
};

const _require = (actionName: string[]) => {
  const actionPath = `@/app/${actionName.join("/")}/handler`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(actionPath);
  } catch {
    return null;
  }
};

const showHelp = async (actionName: string[]) => {
  const metaPath = `@/app/${actionName.join("/")}/meta`;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(metaPath);
    if (mod.help) {
      logger.info(mod.help);
    } else if (mod.completion) {
      logger.info(mod.completion);
    } else {
      logger.info(`No help available for "${actionName.join(" ")}"`);
    }
  } catch {
    logger.error(`Can't find help for "${actionName.join(" ")}"`);
  }
};

export const main = async (meta: ImportMeta) => {
  dotenv.config({ path: `${meta.dir}/.env` });
  const binIndex = Bun.argv.findIndex((i) => i === meta.path);
  if (binIndex === -1) {
    throw new Error("Parse argv fail");
  }
  const args = Bun.argv.slice(binIndex + 1).filter(typedBoolean);
  const hasHelp = args.includes("-h") || args.includes("--help");
  const actionName = args.filter((i) => !i.startsWith("-"));

  if (actionName.length === 0) {
    await showAvailableActions();
    return;
  }

  // 如果有 -h 或 --help 参数，显示帮助信息
  if (hasHelp) {
    await showHelp(actionName);
    return;
  }

  const action = await _require(actionName);
  if (action?.default) {
    logger.debug(`Start run "${actionName.join(" ")}"`);
    await action.default({ from: "cli" });
    logger.debug(`End run "${actionName.join(" ")}"`);
  } else {
    // 检查是否是目录，如果是则显示子命令
    const appDir = `${import.meta.dir}/../app`;
    const subDir = `${appDir}/${actionName.join("/")}`;
    const file = Bun.file(`${subDir}/meta.ts`);
    if (await file.exists()) {
      await showSubcommands(actionName);
    } else {
      logger.error(`Can't find action "${actionName.join(" ")}"`);
    }
  }
};
