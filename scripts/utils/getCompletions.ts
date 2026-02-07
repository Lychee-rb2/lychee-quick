const assertCommandName = (name: string, path: string) => {
  if (name.includes("-")) {
    throw new Error(`Command name cannot contain "-": ${name} (at ${path})`);
  }
};

const getCompletions = async (appDir: string) => {
  const commands: { name: string; completion: string }[] = [];
  const subcommands: Record<string, { name: string; completion: string }[]> =
    {};

  const ensureSubcommands = (name: string) => {
    if (!subcommands[name]) {
      subcommands[name] = [];
    }
  };

  const glob = new Bun.Glob("**/meta.ts");
  for await (const path of glob.scan({ cwd: appDir })) {
    const parts = path.split("/");
    // parts: ["cmd", "meta.ts"] or ["cmd", "sub", "meta.ts"]
    if (parts.length === 2) {
      // Top-level command: cmd/meta.ts
      const folderName = parts[0];
      assertCommandName(folderName, `app/${folderName}`);
      const mod = await import(`${appDir}/${path}`);
      commands.push({ name: folderName, completion: mod.completion });
      ensureSubcommands(folderName);
    } else if (parts.length === 3) {
      // Subcommand: cmd/sub/meta.ts
      const folderName = parts[0];
      const subFolderName = parts[1];
      assertCommandName(subFolderName, `app/${folderName}/${subFolderName}`);
      const subMod = await import(`${appDir}/${path}`);
      if (subMod.completion) {
        ensureSubcommands(folderName);
        subcommands[folderName].push({
          name: subFolderName,
          completion: subMod.completion,
        });
      }
    }
  }

  return { commands, subcommands };
};
export default getCompletions;
