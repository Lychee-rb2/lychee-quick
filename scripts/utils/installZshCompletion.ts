import getCompletions from "@/scripts/utils/getCompletions";
const home = Bun.env.HOME!;
const cliName = Bun.env.CLI_NAME || "ly";

export const editZshrc = async (zshrcPath: string, sourceLine: string) => {
  try {
    const zshrcContent = await Bun.file(zshrcPath).text();

    // Check if already configured
    if (zshrcContent.includes(sourceLine)) {
      console.log("Zsh completion already configured");
      return 0;
    }

    await Bun.write(zshrcPath, zshrcContent + `\n${sourceLine}\n`);
    console.log(`Zsh completion installed for: ${cliName}`);
  } catch (err) {
    console.error("Failed to install zsh completion:", err);
    throw err;
  }
};
export const writeZsh = async (root: string, completionFile: string) => {
  const { commands, subcommands } = await getCompletions(`${root}/app`);

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
};
// Install zsh completion
export const installZshCompletion = async (root: string) => {
  const zshrcPath = `${home}/.zshrc`;

  if (!(await Bun.file(zshrcPath).exists())) {
    console.log("Zsh not detected, skipping completion setup");
    return 0;
  }

  const completionFile = `${root}/completions/init.zsh`;
  const sourceLine = `source ${completionFile}`;

  await writeZsh(root, completionFile);
  await editZshrc(zshrcPath, sourceLine);

  // Print source command for user to run
  console.log(
    `\nRun this to enable completion now:\n  source ${completionFile}\n`,
  );
  return 1;
};
