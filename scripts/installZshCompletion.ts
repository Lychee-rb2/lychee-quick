const home = Bun.env.HOME!;
const cliName = Bun.env.CLI_NAME || "ly";
import { resolve } from "node:path";
import { getCompletions } from "./getCompletions";

// Install zsh completion
export const installZshCompletion = async (root: string) => {
  const zshrcPath = resolve(home, ".zshrc");

  if (!(await Bun.file(zshrcPath).exists())) {
    console.log("Zsh not detected, skipping completion setup");
    return;
  }

  const completionFile = resolve(root, "completions", "init.zsh");
  const sourceLine = `source ${completionFile}`;

  // Get completions from ts files
  const { commands, subcommands } = await getCompletions(resolve(root, "app"));

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
