// Install CLI with custom name from CLI_NAME env var (default: ly)
export const installCli = async (root: string) => {
  const cliName = Bun.env.CLI_NAME || "ly";
  const pkgPath = `${root}/package.json`;
  const pkg = await Bun.file(pkgPath).json();

  // Remove old CLI link if name changed
  const oldName = pkg.bin ? Object.keys(pkg.bin)[0] : undefined;
  if (oldName && oldName !== cliName) {
    try {
      const oldLinkPath = await Bun.$`which ${oldName}`.quiet().text();
      const trimmedPath = oldLinkPath.trim();
      if (trimmedPath) {
        await Bun.$`rm -f ${trimmedPath}`.quiet();
        console.log(`Removed old CLI link: ${oldName} (${trimmedPath})`);
      }
    } catch {
      // which failed means old command not found, nothing to remove
    }
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
