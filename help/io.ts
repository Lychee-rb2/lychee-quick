import dotenv from "dotenv";
import { logger, typedBoolean } from "help";
import type { ModuleLoader, FileSystem } from "@/types/io";

// 默认的 ModuleLoader 实现（内联，不分离到新文件）
const defaultModuleLoader: ModuleLoader = {
  loadMeta(path: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(path);
    } catch {
      return null;
    }
  },
  loadHandler(path: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(path);
    } catch {
      return null;
    }
  },
};

// 默认的 FileSystem 实现（内联，不分离到新文件）
const createDefaultFileSystem = (_baseDir: string): FileSystem => {
  return {
    getAppDir(baseDir: string) {
      return `${baseDir}/../app`;
    },
    async *scanMetaFiles(dir: string) {
      const glob = new Bun.Glob("*/meta.ts");
      for await (const path of glob.scan({ cwd: dir })) {
        yield path;
      }
    },
    async fileExists(path: string) {
      const file = Bun.file(path);
      return await file.exists();
    },
  };
};

/**
 * 解析缩写命令，例如 "c-c" -> ["clash", "check"]
 * 支持用 "-" 分隔的缩写格式，每个部分使用前缀匹配
 */
export const expandAlias = async (
  alias: string,
  fileSystem?: FileSystem,
): Promise<string[] | null> => {
  // 如果不包含 "-"，不是缩写格式
  if (!alias.includes("-")) return null;

  const parts = alias.split("-");
  const fs = fileSystem || createDefaultFileSystem(import.meta.dir);
  const appDir = fs.getAppDir(import.meta.dir);
  const result: string[] = [];

  // 扫描并匹配命令
  const scanAndMatch = async (
    dir: string,
    prefix: string,
  ): Promise<string | null> => {
    const matches: string[] = [];

    for await (const path of fs.scanMetaFiles(dir)) {
      const name = path.split("/")[0];
      if (name.startsWith(prefix)) {
        matches.push(name);
      }
    }

    // 只有唯一匹配时才返回
    if (matches.length === 1) {
      return matches[0];
    } else if (matches.length > 1) {
      logger.debug(
        `缩写 "${prefix}" 匹配多个命令: ${matches.join(", ")}，请使用更长的前缀`,
      );
      return null;
    }
    return null;
  };

  let currentDir = appDir;
  for (const part of parts) {
    const match = await scanAndMatch(currentDir, part);
    if (!match) return null;
    result.push(match);
    currentDir = `${currentDir}/${match}`;
  }

  // If we reach here, result must have at least one element
  // because each iteration pushes a match, and we return null early if no match
  return result;
};

export const showAvailableActions = async (
  cliName: string,
  moduleLoader: ModuleLoader = defaultModuleLoader,
  fileSystem?: FileSystem,
) => {
  const fs = fileSystem || createDefaultFileSystem(import.meta.dir);
  const appDir = fs.getAppDir(import.meta.dir);
  const apps: { name: string; description: string }[] = [];

  for await (const path of fs.scanMetaFiles(appDir)) {
    const name = path.split("/")[0];
    const mod = moduleLoader.loadMeta(`@/app/${name}/meta`);
    const description = mod?.completion || "";
    if (!mod && name) {
      logger.error(`Error reading meta.ts for ${name}`);
    }
    apps.push({ name, description });
  }
  logger.info(`Usage: ${cliName} <command> [subcommand] [options]\n`);
  logger.info("Available commands:\n");
  for (const app of apps) {
    const desc = app.description ? ` - ${app.description}` : "";
    logger.info(`  ${app.name}${desc}`);
  }
  logger.info(`\nRun '${cliName} <command>' to see available subcommands.`);
};

export const showSubcommands = async (
  actionName: string[],
  cliName: string,
  moduleLoader: ModuleLoader = defaultModuleLoader,
  fileSystem?: FileSystem,
) => {
  const fs = fileSystem || createDefaultFileSystem(import.meta.dir);
  const appDir = fs.getAppDir(import.meta.dir);
  const subDir = `${appDir}/${actionName.join("/")}`;
  const subcommands: { name: string; description: string }[] = [];

  const mainMod = moduleLoader.loadMeta(`@/app/${actionName.join("/")}/meta`);
  const mainDescription = mainMod?.completion || "";

  for await (const path of fs.scanMetaFiles(subDir)) {
    const name = path.split("/")[0];
    const mod = moduleLoader.loadMeta(
      `@/app/${actionName.join("/")}/${name}/meta`,
    );
    const description = mod?.completion || "";
    subcommands.push({ name, description });
  }

  const cmdName = actionName.join(" ");
  logger.info(`Usage: ${cliName} ${cmdName} <subcommand>\n`);
  if (mainDescription) {
    logger.info(`${mainDescription}\n`);
  }
  logger.info("Available subcommands:\n");
  for (const cmd of subcommands) {
    const desc = cmd.description ? ` - ${cmd.description}` : "";
    logger.info(`  ${cmd.name}${desc}`);
  }
};

export const _require = (
  actionName: string[],
  moduleLoader: ModuleLoader = defaultModuleLoader,
) => {
  const actionPath = `@/app/${actionName.join("/")}/handler`;
  return moduleLoader.loadHandler(actionPath);
};

export const showHelp = async (
  actionName: string[],
  moduleLoader: ModuleLoader = defaultModuleLoader,
) => {
  const metaPath = `@/app/${actionName.join("/")}/meta`;
  const mod = moduleLoader.loadMeta(metaPath);
  if (!mod) {
    logger.error(`Can't find help for "${actionName.join(" ")}"`);
    return;
  }
  if (mod.help) {
    logger.info(mod.help);
  } else if (mod.completion) {
    logger.info(mod.completion);
  } else {
    logger.info(`No help available for "${actionName.join(" ")}"`);
  }
};

export const main = async (
  meta: ImportMeta,
  moduleLoader: ModuleLoader = defaultModuleLoader,
  fileSystem?: FileSystem,
) => {
  dotenv.config({ path: `${meta.dir}/.env` });
  const cliName = process.env.CLI_NAME || "ly";
  const binIndex = Bun.argv.findIndex((i) => i === meta.path);
  if (binIndex === -1) {
    throw new Error("Parse argv fail");
  }
  const args = Bun.argv.slice(binIndex + 1).filter(typedBoolean);
  const hasHelp = args.includes("-h") || args.includes("--help");
  let actionName = args.filter((i) => !i.startsWith("-"));

  const fs = fileSystem || createDefaultFileSystem(meta.dir);

  // 尝试展开缩写命令，例如 "c-c" -> ["clash", "check"]
  if (actionName.length === 1 && actionName[0].includes("-")) {
    const expanded = await expandAlias(actionName[0], fs);
    if (expanded) {
      logger.info(`→ ${cliName} ${expanded.join(" ")}`);
      actionName = expanded;
    }
  }

  // 如果有 -h 或 --help 参数，显示帮助信息
  if (hasHelp) {
    if (actionName.length === 0) {
      // 显示根目录帮助
      const mod = moduleLoader.loadMeta("@/app/meta");
      if (mod) {
        logger.info(mod.help || mod.completion || "");
      } else {
        await showAvailableActions(cliName, moduleLoader, fs);
      }
    } else {
      await showHelp(actionName, moduleLoader);
    }
    return;
  }

  if (actionName.length === 0) {
    await showAvailableActions(cliName, moduleLoader, fs);
    return;
  }

  const action = _require(actionName, moduleLoader);
  if (action?.default) {
    logger.debug(`Start run "${actionName.join(" ")}"`);
    await action.default({ from: "cli" });
    logger.debug(`End run "${actionName.join(" ")}"`);
  } else {
    // 检查是否是目录，如果是则显示子命令
    const appDir = fs.getAppDir(meta.dir);
    const subDir = `${appDir}/${actionName.join("/")}`;
    if (await fs.fileExists(`${subDir}/meta.ts`)) {
      await showSubcommands(actionName, cliName, moduleLoader, fs);
    } else {
      logger.error(`Can't find action "${actionName.join(" ")}"`);
    }
  }
};
