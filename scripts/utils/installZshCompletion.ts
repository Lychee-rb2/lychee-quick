import getCompletions, {
  type CommandNode,
} from "@/scripts/utils/getCompletions";

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

const buildDescribe = (nodes: CommandNode[]) =>
  nodes.map((c) => `'${c.name}:${c.completion}'`).join(" ");

/**
 * Collect nodes by depth level for zsh completion generation.
 * Each entry maps a parent path (e.g. "clash/proxy") to the children at that path.
 */
const collectByDepth = (
  nodes: CommandNode[],
  depth: number,
  parentPath: string,
  result: Map<number, Map<string, CommandNode[]>>,
) => {
  if (!result.has(depth)) result.set(depth, new Map());
  result.get(depth)!.set(parentPath, nodes);
  for (const node of nodes) {
    if (node.children.length > 0) {
      const path = parentPath ? `${parentPath}/${node.name}` : node.name;
      collectByDepth(node.children, depth + 1, path, result);
    }
  }
};

export const writeZsh = async (root: string, completionFile: string) => {
  const completions = await getCompletions(`${root}/app`);

  const depthMap = new Map<number, Map<string, CommandNode[]>>();
  collectByDepth(completions, 0, "", depthMap);

  const blocks: string[] = [];

  for (const [depth, pathMap] of [...depthMap.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    const condition = depth === 0 ? "if" : "elif";
    const currentIndex = depth + 2; // CURRENT == 2 for depth 0, 3 for depth 1, etc.

    if (depth === 0) {
      // Top-level: no case statement needed
      const [, nodes] = [...pathMap.entries()][0];
      blocks.push(
        `  ${condition} (( CURRENT == ${currentIndex} )); then\n` +
          `    local -a completions=(${buildDescribe(nodes)})\n` +
          `    _describe 'command' completions`,
      );
    } else {
      // Deeper levels: use case with words path as key
      const wordsKey = Array.from(
        { length: depth },
        (_, i) => `\${words[${i + 2}]}`,
      ).join("/");
      const caseEntries = [...pathMap.entries()]
        .map(([path, nodes]) => {
          return `      ${path}) completions=(${buildDescribe(nodes)}) ;;`;
        })
        .join("\n");
      blocks.push(
        `  ${condition} (( CURRENT == ${currentIndex} )); then\n` +
          `    local -a completions\n` +
          `    case "${wordsKey}" in\n` +
          `${caseEntries}\n` +
          `    esac\n` +
          `    _describe 'subcommand' completions`,
      );
    }
  }

  const completionScript =
    `# Lychee Quick CLI completion\n` +
    `_lychee_quick_completion() {\n` +
    `${blocks.join("\n")}\n` +
    `  fi\n` +
    `}\n` +
    `compdef _lychee_quick_completion ${cliName}\n`;

  await Bun.write(completionFile, completionScript);
};
// Install zsh completion
const installZshCompletion = async (root: string) => {
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

export default installZshCompletion;
