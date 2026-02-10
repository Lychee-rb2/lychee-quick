import { t } from "@/i18n";

export interface CommandNode {
  name: string;
  completion: string;
  children: CommandNode[];
}

const assertCommandName = (name: string, path: string) => {
  if (name.includes("-")) {
    throw new Error(t("script.getCompletions.dashInName", { name, path }));
  }
};

const ensureNode = (nodes: CommandNode[], name: string): CommandNode => {
  let node = nodes.find((n) => n.name === name);
  if (!node) {
    node = { name, completion: "", children: [] };
    nodes.push(node);
  }
  return node;
};

const getCompletions = async (appDir: string): Promise<CommandNode[]> => {
  const root: CommandNode[] = [];

  const glob = new Bun.Glob("**/meta.ts");
  for await (const path of glob.scan({ cwd: appDir })) {
    const parts = path.split("/");
    const commandParts = parts.slice(0, -1); // remove trailing "meta.ts"
    if (commandParts.length === 0) continue;

    for (const part of commandParts) {
      assertCommandName(part, `app/${commandParts.join("/")}`);
    }

    const mod = await import(`${appDir}/${path}`);
    const completion =
      typeof mod.completion === "function" ? mod.completion() : mod.completion;
    if (!completion) continue;

    // Navigate down the tree, ensuring intermediate nodes exist
    let currentLevel = root;
    for (let i = 0; i < commandParts.length - 1; i++) {
      currentLevel = ensureNode(currentLevel, commandParts[i]).children;
    }

    // Set the leaf node's completion
    const leaf = ensureNode(currentLevel, commandParts.at(-1)!);
    leaf.completion = completion;
  }

  return root;
};

export default getCompletions;
