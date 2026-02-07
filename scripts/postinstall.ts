import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const appDir = resolve(root, "app");
const home = Bun.env.HOME!;

const cliName = Bun.env.CLI_NAME || "ly";

// Generate global-env.d.ts from .env keys
const buildGlobalEnv = async () => {
  const envContent = await Bun.file(resolve(root, ".env")).text();
  const envKeys = envContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0].trim())
    .filter(Boolean);

  const content = `
declare namespace NodeJS {
  export interface ProcessEnv {
    ${envKeys.map((key) => `${key}?: string;`).join("\n    ")}
  }
}
`;
  await Bun.write(resolve(root, "global-env.d.ts"), content);
  console.log(`global-env.d.ts generated with ${envKeys.length} env keys`);
};

// Install CLI with custom name from CLI_NAME env var (default: ly)
const installCli = async () => {
  const pkgPath = resolve(root, "package.json");
  const pkg = await Bun.file(pkgPath).json();

  // Remove old CLI link if name changed
  const oldName = pkg.bin ? Object.keys(pkg.bin)[0] : undefined;
  if (oldName && oldName !== cliName) {
    const oldLinkPath = resolve(home, ".bun", "bin", oldName);
    await Bun.$`rm -f ${oldLinkPath}`.quiet();
    console.log(`Removed old CLI link: ${oldName}`);
  }

  // Dynamically set bin field based on CLI_NAME
  const expectedBin = { [cliName]: "./bin.ts" };
  if (JSON.stringify(pkg.bin) !== JSON.stringify(expectedBin)) {
    pkg.bin = expectedBin;
    await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`package.json bin updated: ${cliName} -> ./bin.ts`);
  }

  // Use bun link to install globally
  try {
    await Bun.$`bun link`.quiet();
    console.log(`CLI installed via bun link: ${cliName}`);
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

  const glob = new Bun.Glob("*/meta.ts");
  const folderNames: string[] = [];
  for await (const path of glob.scan({ cwd: appDir })) {
    folderNames.push(path.split("/")[0]);
  }

  for (const folderName of folderNames) {
    // 检测命令名称是否包含 "-"
    validateCommandName(folderName, `app/${folderName}`);

    const folderPath = resolve(appDir, folderName);

    // Get folder completion from meta.ts
    const metaFile = resolve(folderPath, "meta.ts");
    const mod = await import(metaFile);
    commands.push({ name: folderName, completion: mod.completion });

    // Get subcommand completions from subdirectories
    subcommands[folderName] = [];
    const subGlob = new Bun.Glob("*/meta.ts");
    for await (const subPath of subGlob.scan({ cwd: folderPath })) {
      const subFolderName = subPath.split("/")[0];
      // 检测子命令名称是否包含 "-"
      validateCommandName(subFolderName, `app/${folderName}/${subFolderName}`);

      const metaPath = resolve(folderPath, subFolderName, "meta.ts");
      const subMod = await import(metaPath);
      if (subMod.completion) {
        subcommands[folderName].push({
          name: subFolderName,
          completion: subMod.completion,
        });
      }
    }
  }

  return { commands, subcommands };
};

// Install zsh completion
const installZshCompletion = async () => {
  const zshrcPath = resolve(home, ".zshrc");

  if (!(await Bun.file(zshrcPath).exists())) {
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
    const zshrcContent = await Bun.file(zshrcPath).text();

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
      console.log("Removed old completion config");
    }

    // Write with old patterns removed + new source line appended
    await Bun.write(zshrcPath, newContent + `\n${sourceLine}\n`);
    console.log(`Zsh completion installed for: ${cliName}`);
  } catch (err) {
    console.error("Failed to install zsh completion:", err);
  }

  // Print source command for user to run
  console.log(
    `\nRun this to enable completion now:\n  source ${completionFile}\n`,
  );
};

await buildGlobalEnv();
await installCli();
await installZshCompletion();
