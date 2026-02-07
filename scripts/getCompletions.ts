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

export const getCompletions = async (appDir: string) => {
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

    const folderPath = `${appDir}/${folderName}`;

    // Get folder completion from meta.ts
    const metaFile = `${folderPath}/meta.ts`;
    const mod = await import(metaFile);
    commands.push({ name: folderName, completion: mod.completion });

    // Get subcommand completions from subdirectories
    subcommands[folderName] = [];
    const subGlob = new Bun.Glob("*/meta.ts");
    for await (const subPath of subGlob.scan({ cwd: folderPath })) {
      const subFolderName = subPath.split("/")[0];
      // 检测子命令名称是否包含 "-"
      validateCommandName(subFolderName, `app/${folderName}/${subFolderName}`);

      const metaPath = `${folderPath}/${subFolderName}/meta.ts`;
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
