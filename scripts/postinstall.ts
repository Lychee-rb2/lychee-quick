import dotenv from "dotenv";
import { resolve } from "node:path";
import {
  existsSync,
  unlinkSync,
  symlinkSync,
  readFileSync,
  appendFileSync,
  readdirSync,
} from "node:fs";
import { homedir } from "node:os";

const root = resolve(import.meta.dir, "..");
const appDir = resolve(root, "app");
const envFile = await Bun.file(resolve(root, ".env")).text();
const envVars = dotenv.parse(envFile);
const cliName = envVars.CLI_NAME || "ly";

// Generate global-env.d.ts
const content = `
declare namespace NodeJS {
  export interface ProcessEnv {
    ${Object.keys(envVars)
      .map((key) => `${key}?: string;`)
      .join("\n    ")}
  }
}
`;
await Bun.write(resolve(root, "global-env.d.ts"), content);

// Install CLI with custom name from CLI_NAME env var (default: ly)
const installCli = () => {
  const binPath = resolve(root, "bin.ts");
  const bunBinDir = resolve(homedir(), ".bun", "bin");
  const linkPath = resolve(bunBinDir, cliName);

  try {
    // Remove existing symlink if exists
    if (existsSync(linkPath)) {
      unlinkSync(linkPath);
    }
    // Create new symlink
    symlinkSync(binPath, linkPath);
    console.log(`CLI installed: ${cliName} -> ${binPath}`);
  } catch (err) {
    console.error(`Failed to install CLI:`, err);
  }
};

// Validate command names don't contain "-" (reserved for alias shortcuts)
const validateCommandName = (name: string, path: string) => {
  if (name.includes("-")) {
    console.error(
      `\n❌ 命令名称不能包含 "-": ${name}\n   路径: ${path}\n   原因: "-" 用于缩写指令分隔符（如 c-c -> clash check）\n`,
    );
    process.exit(1);
  }
};

// Scan app directory and get completions from folder structure
const getCompletions = async () => {
  const commands: { name: string; completion: string }[] = [];
  const subcommands: Record<string, { name: string; completion: string }[]> =
    {};

  const folders = readdirSync(appDir, { withFileTypes: true }).filter((d) =>
    d.isDirectory(),
  );

  for (const folder of folders) {
    // 检测命令名称是否包含 "-"
    validateCommandName(folder.name, `app/${folder.name}`);

    const folderPath = resolve(appDir, folder.name);

    // Get folder completion from meta.ts
    const metaFile = resolve(folderPath, "meta.ts");
    const mod = await import(metaFile);
    commands.push({ name: folder.name, completion: mod.completion });

    // Get subcommand completions from subdirectories
    subcommands[folder.name] = [];
    const subFolders = readdirSync(folderPath, { withFileTypes: true }).filter(
      (d) => d.isDirectory(),
    );

    for (const subFolder of subFolders) {
      // 检测子命令名称是否包含 "-"
      validateCommandName(
        subFolder.name,
        `app/${folder.name}/${subFolder.name}`,
      );

      const metaPath = resolve(folderPath, subFolder.name, "meta.ts");
      const mod = await import(metaPath);
      if (mod.completion) {
        subcommands[folder.name].push({
          name: subFolder.name,
          completion: mod.completion,
        });
      }
    }
  }

  return { commands, subcommands };
};

// Install zsh completion
const installZshCompletion = async () => {
  const zshrcPath = resolve(homedir(), ".zshrc");

  if (!existsSync(zshrcPath)) {
    console.log("Zsh not detected, skipping completion setup");
    return;
  }

  const completionFile = resolve(root, "completions", "init.zsh");
  const sourceLine = `source ${completionFile}`;

  // Get completions from ts files
  const { commands, subcommands } = await getCompletions();

  // Generate completion init file
  const commandsLine = commands
    .map((c) => `'${c.name}:${c.completion}'`)
    .join(" ");

  const subcommandCases = Object.entries(subcommands)
    .map(([cmd, subs]) => {
      const subsLine = subs.map((s) => `'${s.name}:${s.completion}'`).join(" ");
      return `      ${cmd}) subcommands=(${subsLine}) ;;`;
    })
    .join("\n");

  const completionScript = `# Lychee Quick CLI completion
_lychee_quick_completion() {
  local cmd="\${words[2]}"
  if (( CURRENT == 2 )); then
    local -a commands=(${commandsLine})
    _describe 'command' commands
  elif (( CURRENT == 3 )); then
    local -a subcommands
    case "$cmd" in
${subcommandCases}
    esac
    _describe 'subcommand' subcommands
  fi
}
compdef _lychee_quick_completion ${cliName}
`;
  await Bun.write(completionFile, completionScript);

  try {
    const zshrcContent = readFileSync(zshrcPath, "utf-8");

    // Check if already configured
    if (zshrcContent.includes(sourceLine)) {
      console.log("Zsh completion already configured");
      return;
    }

    // Remove old config patterns
    const oldPatterns = [
      /# lychee-quick-completion-start[\s\S]*?# lychee-quick-completion-end\n?/g,
      /# lychee-quick-completion\nfpath=.*\nautoload.*\ncompdef.*\n?/g,
    ];
    let newContent = zshrcContent;
    for (const pattern of oldPatterns) {
      newContent = newContent.replace(pattern, "");
    }
    if (newContent !== zshrcContent) {
      await Bun.write(zshrcPath, newContent);
      console.log("Removed old completion config");
    }

    appendFileSync(zshrcPath, `\n${sourceLine}\n`);
    console.log(`Zsh completion installed for: ${cliName}`);
  } catch (err) {
    console.error("Failed to install zsh completion:", err);
  }

  // Print source command for user to run
  console.log(
    `\nRun this to enable completion now:\n  source ${completionFile}\n`,
  );
};

installCli();
await installZshCompletion();
