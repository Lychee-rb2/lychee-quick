interface PackageJson {
  bin: Record<string, string>;
}

export const cleanOldCliLink = async (oldName: string, cliName: string) => {
  if (oldName && oldName !== cliName) {
    try {
      const oldLinkPath = await Bun.$`which ${oldName}`.quiet().text();
      const trimmedPath = oldLinkPath.trim();
      if (trimmedPath) {
        await Bun.$`rm -f ${trimmedPath}`.quiet();
        return 1;
      }
    } catch {
      // which failed means old command not found, nothing to remove
      return 0;
    }
  }
};

export const rewritePackageJson = async (
  cliName: string,
  pkgPath: string,
  pkg: PackageJson,
) => {
  // Dynamically set bin field based on CLI_NAME
  const expectedBin = { [cliName]: "./bin.ts" };
  if (JSON.stringify(pkg.bin) !== JSON.stringify(expectedBin)) {
    try {
      await Bun.write(
        pkgPath,
        JSON.stringify({ ...pkg, bin: expectedBin }, null, 2),
      );
      console.log(`package.json bin updated: ${cliName} -> ./bin.ts`);
    } catch (err) {
      console.error(`Failed to write package.json:`, err);
      throw err;
    }
  }
};
export const linkCli = async () => {
  // Use bun link to install globally
  try {
    await Bun.$`bun link`.quiet();
    console.log(`CLI installed via bun link`);
  } catch (err) {
    console.error(`Failed to install CLI:`, err);
    throw err;
  }
};
// Install CLI with custom name from CLI_NAME env var (default: ly)
const installCli = async (root: string) => {
  const cliName = Bun.env.CLI_NAME || "ly";
  const pkgPath = `${root}/package.json`;
  const pkg = (await Bun.file(pkgPath).json()) as PackageJson;
  // Remove old CLI link if name changed
  const oldName = pkg.bin ? Object.keys(pkg.bin)[0] : undefined;
  await cleanOldCliLink(oldName, cliName);
  await rewritePackageJson(cliName, pkgPath, pkg);
  await linkCli();
  return 1;
};

export default installCli;
